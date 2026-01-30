import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import { formatPrCommentsJson, formatPrViewJson, prToJson } from '../formatters/json.js';
import { formatPrCommentsText, formatPrViewText } from '../formatters/text.js';

interface ViewOptions {
  comments?: boolean | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
  web?: boolean | undefined;
  repo?: string | undefined;
}

export function createViewCommand(output: Output, prApi: PrApi): Command {
  return new Command('view')
    .description('View a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('-c, --comments', 'View comments on the pull request')
    .option('--json [fields]', 'Output JSON (optionally specify fields)')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the pull request in the browser')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: ViewOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        const prResult = await resolvePrNumber(prArg, owner, repo, prApi.listPrs.bind(prApi));
        if (!prResult.success) {
          output.printError(`Error: ${prResult.error}`);
          process.exitCode = 1;
          return;
        }
        const pullNumber = prResult.pullNumber;

        if (options.web) {
          const url = `https://github.com/${owner}/${repo}/pull/${String(pullNumber)}`;
          await open(url);
          return;
        }

        const pr = await prApi.getPr({ owner, repo, pullNumber });
        const useColor = process.stdout.isTTY;

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            output.printError('Example: gh-vault pr view 123 --json title,state --jq ".title"');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = prToJson(pr);
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
          output.print(formatPrViewText(pr, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatPrViewJson(pr, fields));
        }

        if (options.comments) {
          const comments = await prApi.listPrComments({ owner, repo, issueNumber: pullNumber });
          output.print('');

          if (options.json === undefined) {
            output.print(formatPrCommentsText(comments, useColor));
          } else {
            output.print(formatPrCommentsJson(comments));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
