import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import { formatPrStateChangeText } from '../formatters/text.js';

interface ReopenOptions {
  comment?: string | undefined;
  repo?: string | undefined;
}

export function createReopenCommand(output: Output, prApi: PrApi): Command {
  return new Command('reopen')
    .description('Reopen a pull request')
    .argument('<pr>', 'PR number or URL')
    .option('-c, --comment <text>', 'Add a comment when reopening')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string, options: ReopenOptions) => {
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

        if (options.comment) {
          await prApi.createPrComment({
            owner,
            repo,
            issueNumber: pullNumber,
            body: options.comment,
          });
        }

        const pr = await prApi.updatePrState({
          owner,
          repo,
          pullNumber,
          state: 'open',
        });

        const useColor = process.stdout.isTTY;
        output.print(formatPrStateChangeText(pr, 'reopened', useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
