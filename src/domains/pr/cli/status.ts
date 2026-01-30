import { Command } from 'commander';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { getCurrentBranch, resolveRepository } from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import { formatPrStatusText } from '../formatters/text.js';

interface StatusOptions {
  conflictStatus?: boolean | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
  repo?: string | undefined;
}

export function createStatusCommand(output: Output, prApi: PrApi): Command {
  return new Command('status')
    .description('Show status of relevant pull requests')
    .option('-c, --conflict-status', 'Display merge conflict status (slower)')
    .option('--json [fields]', 'Output JSON (optionally specify fields)')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (options: StatusOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;
        const username = await prApi.getCurrentUser();
        const currentBranch = (await getCurrentBranch()) ?? undefined;

        const status = await prApi.getPrStatus({
          owner,
          repo,
          username,
          currentBranch,
          includeConflictStatus: options.conflictStatus,
        });

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            output.printError('Example: gh-vault pr status --json createdByYou --jq ".[].number"');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = statusToJson(status);
            const filtered = await filterWithJq(jsonData, options.jq);
            output.print(filtered);
          } catch (error) {
            if (error instanceof JqError) {
              output.printError('jq error: ' + error.message);
            } else {
              throw error;
            }
            process.exitCode = 1;
          }
          return;
        }

        if (options.json === undefined) {
          const useColor = process.stdout.isTTY;
          output.print(formatPrStatusText(status, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          const jsonData = statusToJson(status);
          output.print(JSON.stringify(filterFields(jsonData, fields), null, 2));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}

interface PrJson {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  mergeable?: boolean | null;
  mergeableState?: string;
}

interface PrStatusJson {
  currentBranchPr: PrJson | null;
  createdByYou: PrJson[];
  reviewRequested: PrJson[];
  assignedToYou: PrJson[];
}

interface PrListItemInput {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  user: { login: string } | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  mergeable?: boolean | null | undefined;
  mergeableState?: string | undefined;
}

function statusToJson(status: {
  currentBranchPr: PrListItemInput | null;
  createdByYou: PrListItemInput[];
  reviewRequested: PrListItemInput[];
  assignedToYou: PrListItemInput[];
}): PrStatusJson {
  const prToJson = (pr: PrListItemInput): PrJson => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    author: pr.user?.login ?? null,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    url: pr.htmlUrl,
    ...(pr.mergeable !== undefined && { mergeable: pr.mergeable }),
    ...(pr.mergeableState !== undefined && { mergeableState: pr.mergeableState }),
  });

  return {
    currentBranchPr: status.currentBranchPr ? prToJson(status.currentBranchPr) : null,
    createdByYou: status.createdByYou.map((pr) => prToJson(pr)),
    reviewRequested: status.reviewRequested.map((pr) => prToJson(pr)),
    assignedToYou: status.assignedToYou.map((pr) => prToJson(pr)),
  };
}

function filterFields(obj: PrStatusJson, fields?: string[]): Record<string, unknown> {
  const entries = Object.entries(obj);
  if (!fields) {
    return Object.fromEntries(entries);
  }
  const fieldSet = new Set(fields);
  return Object.fromEntries(entries.filter(([key]) => fieldSet.has(key)));
}
