import { setTimeout } from 'node:timers/promises';

import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import { listPrChecks, listPrs } from '../api.js';
import { formatPrChecksText } from '../formatters/text.js';
import type { PrChecksResult } from '../types.js';

interface ChecksOptions {
  watch?: boolean | undefined;
  interval?: string | undefined;
  failFast?: boolean | undefined;
  required?: boolean | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
  web?: boolean | undefined;
  repo?: string | undefined;
}

export function createChecksCommand(output: Output): Command {
  return new Command('checks')
    .description('Show CI status for a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('--watch', 'Watch for status changes')
    .option('-i, --interval <seconds>', 'Refresh interval in seconds', '10')
    .option('--fail-fast', 'Exit as soon as any check fails')
    .option('--required', 'Only show required checks')
    .option('--json [fields]', 'Output JSON (optionally specify fields)')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the checks in the browser')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: ChecksOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        const prResult = await resolvePrNumber(prArg, owner, repo, listPrs);
        if (!prResult.success) {
          output.printError(`Error: ${prResult.error}`);
          process.exitCode = 1;
          return;
        }
        const pullNumber = prResult.pullNumber;

        if (options.web) {
          const url = `https://github.com/${owner}/${repo}/pull/${String(pullNumber)}/checks`;
          await open(url);
          return;
        }

        const intervalMs = Number.parseInt(options.interval ?? '10', 10) * 1000;

        const displayChecks = async (): Promise<PrChecksResult> => {
          const checks = await listPrChecks({
            owner,
            repo,
            pullNumber,
            required: options.required,
          });

          if (options.watch) {
            process.stdout.write('\x1b[2J\x1b[H');
          }

          if (options.jq) {
            if (options.json === undefined) {
              output.printError('Error: --jq requires --json to be specified');
              process.exitCode = 1;
              throw new Error('Exit');
            }

            try {
              const filtered = await filterWithJq(checksToJson(checks), options.jq);
              output.print(filtered);
            } catch (error) {
              if (error instanceof JqError) {
                output.printError('jq error: ' + error.message);
              } else {
                throw error;
              }
              process.exitCode = 1;
              throw new Error('Exit');
            }
            return checks;
          }

          if (options.json === undefined) {
            const useColor = process.stdout.isTTY;
            output.print(formatPrChecksText(checks, useColor));
          } else {
            const fields =
              typeof options.json === 'string'
                ? options.json.split(',').map((f) => f.trim())
                : undefined;
            output.print(JSON.stringify(filterFields(checksToJson(checks), fields), null, 2));
          }

          return checks;
        };

        let checks = await displayChecks();

        if (options.watch) {
          while (checks.pending > 0) {
            if (options.failFast && checks.failing > 0) {
              process.exitCode = 1;
              return;
            }

            await setTimeout(intervalMs);
            checks = await displayChecks();
          }

          if (checks.failing > 0) {
            process.exitCode = 1;
          }
        } else if (checks.failing > 0) {
          process.exitCode = 1;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Exit') {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}

interface CheckRunJson {
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string | null;
}

interface StatusJson {
  context: string;
  state: string;
  description: string | null;
  targetUrl: string | null;
}

interface ChecksJson {
  sha: string;
  overallState: string;
  passing: number;
  failing: number;
  pending: number;
  total: number;
  checkRuns: CheckRunJson[];
  statuses: StatusJson[];
}

function checksToJson(checks: PrChecksResult): ChecksJson {
  return {
    sha: checks.sha,
    overallState: checks.overallState,
    passing: checks.passing,
    failing: checks.failing,
    pending: checks.pending,
    total: checks.total,
    checkRuns: checks.checkRuns.map((c) => ({
      name: c.name,
      status: c.status,
      conclusion: c.conclusion,
      detailsUrl: c.detailsUrl,
    })),
    statuses: checks.statuses.map((s) => ({
      context: s.context,
      state: s.state,
      description: s.description,
      targetUrl: s.targetUrl,
    })),
  };
}

function filterFields(obj: ChecksJson, fields?: string[]): Record<string, unknown> {
  const entries = Object.entries(obj);
  if (!fields) {
    return Object.fromEntries(entries);
  }
  const fieldSet = new Set(fields);
  return Object.fromEntries(entries.filter(([key]) => fieldSet.has(key)));
}
