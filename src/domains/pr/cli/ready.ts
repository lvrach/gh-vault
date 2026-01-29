import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import { listPrs, updatePrDraft } from '../api.js';
import { formatPrStateChangeText } from '../formatters/text.js';

interface ReadyOptions {
  undo?: boolean | undefined;
  repo?: string | undefined;
}

export function createReadyCommand(output: Output): Command {
  return new Command('ready')
    .description('Mark a pull request as ready for review')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('--undo', 'Convert a pull request to draft')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: ReadyOptions) => {
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

        const pr = await updatePrDraft({
          owner,
          repo,
          pullNumber,
          draft: options.undo ?? false,
        });

        const action = options.undo ? 'draft' : 'ready';
        const useColor = process.stdout.isTTY;
        output.print(formatPrStateChangeText(pr, action, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
