import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import { createPrComment, deleteBranch, getPr, listPrs, updatePrState } from '../api.js';
import { formatPrStateChangeText } from '../formatters/text.js';

interface CloseOptions {
  comment?: string | undefined;
  deleteBranch?: boolean | undefined;
  repo?: string | undefined;
}

export function createCloseCommand(output: Output): Command {
  return new Command('close')
    .description('Close a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('-c, --comment <text>', 'Add a closing comment')
    .option('-d, --delete-branch', 'Delete the branch after closing')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: CloseOptions) => {
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
        const prData = await getPr({ owner, repo, pullNumber });
        const prBranch = prData.head.ref;

        if (options.comment) {
          await createPrComment({
            owner,
            repo,
            issueNumber: pullNumber,
            body: options.comment,
          });
        }

        const pr = await updatePrState({
          owner,
          repo,
          pullNumber,
          state: 'closed',
        });

        if (options.deleteBranch && prBranch) {
          try {
            await deleteBranch({ owner, repo, branch: prBranch });
          } catch {
            // Expected: branch may already be deleted, be protected, or user lacks permission
          }
        }

        const useColor = process.stdout.isTTY;
        output.print(formatPrStateChangeText(pr, 'closed', useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
