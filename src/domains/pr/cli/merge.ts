import { readFile } from 'node:fs/promises';

import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import { formatAutoMergeText, formatMergeResultText } from '../formatters/text.js';
import type { MergeMethod } from '../types.js';

interface MergeOptions {
  merge?: boolean | undefined;
  squash?: boolean | undefined;
  rebase?: boolean | undefined;
  auto?: boolean | undefined;
  disableAuto?: boolean | undefined;
  deleteBranch?: boolean | undefined;
  subject?: string | undefined;
  body?: string | undefined;
  bodyFile?: string | undefined;
  matchHeadCommit?: string | undefined;
  admin?: boolean | undefined;
  authorEmail?: string | undefined;
  repo?: string | undefined;
}

export function createMergeCommand(output: Output, prApi: PrApi): Command {
  return new Command('merge')
    .description('Merge a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('-m, --merge', 'Merge the commits with a merge commit')
    .option('-s, --squash', 'Squash the commits into one commit')
    .option('-r, --rebase', 'Rebase the commits onto the base branch')
    .option('--auto', 'Enable auto-merge')
    .option('--disable-auto', 'Disable auto-merge')
    .option('-d, --delete-branch', 'Delete the local and remote branch after merge')
    .option('-t, --subject <text>', 'Subject text for the merge commit')
    .option('-b, --body <text>', 'Body text for the merge commit')
    .option('-F, --body-file <file>', 'Read body text from file')
    .option('--match-head-commit <sha>', 'Commit SHA that the pull request HEAD must match')
    .option('--admin', 'Use administrator privileges to merge (bypass requirements)')
    .option('-A, --author-email <email>', 'Email text for merge commit author')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: MergeOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        let mergeMethod: MergeMethod = 'merge';
        const methodCount = [options.merge, options.squash, options.rebase].filter(Boolean).length;

        if (methodCount > 1) {
          output.printError('Error: Only one of --merge, --squash, or --rebase can be specified');
          process.exitCode = 1;
          return;
        }

        if (options.squash) {
          mergeMethod = 'squash';
        } else if (options.rebase) {
          mergeMethod = 'rebase';
        }

        const prResult = await resolvePrNumber(prArg, owner, repo, prApi.listPrs.bind(prApi));
        if (!prResult.success) {
          output.printError(`Error: ${prResult.error}`);
          process.exitCode = 1;
          return;
        }
        const pullNumber = prResult.pullNumber;
        const pr = await prApi.getPr({ owner, repo, pullNumber });

        if (options.disableAuto) {
          await prApi.disableAutoMerge({ owner, repo, pullNumber });
          const useColor = process.stdout.isTTY;
          output.print(formatAutoMergeText(false, pullNumber, mergeMethod, useColor));
          return;
        }

        if (options.auto) {
          let commitMessage: string | undefined;
          if (options.bodyFile) {
            // CLI tool - user specifies file path via -F flag
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            commitMessage = await readFile(options.bodyFile, 'utf8');
          } else if (options.body) {
            commitMessage = options.body;
          }

          await prApi.enableAutoMerge({
            owner,
            repo,
            pullNumber,
            mergeMethod,
            commitTitle: options.subject,
            commitMessage,
          });

          const useColor = process.stdout.isTTY;
          output.print(formatAutoMergeText(true, pullNumber, mergeMethod, useColor));
          return;
        }

        let commitMessage: string | undefined;
        if (options.bodyFile) {
          // CLI tool - user specifies file path via -F flag
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          commitMessage = await readFile(options.bodyFile, 'utf8');
        } else if (options.body) {
          commitMessage = options.body;
        }

        // Note: --admin and --author-email have limited API support
        // Admin bypass depends on user permissions, not a specific API flag
        if (options.admin) {
          output.printError(
            'Note: --admin uses your existing admin permissions to bypass merge requirements'
          );
        }

        const result = await prApi.mergePr({
          owner,
          repo,
          pullNumber,
          mergeMethod,
          commitTitle: options.subject,
          commitMessage,
          sha: options.matchHeadCommit,
          authorEmail: options.authorEmail,
        });

        let deletedBranch: string | undefined;
        if (options.deleteBranch) {
          try {
            await prApi.deleteBranch({ owner, repo, branch: pr.head.ref });
            deletedBranch = pr.head.ref;
          } catch {
            // Expected: branch may already be deleted, be protected, or user lacks permission
          }
        }

        const useColor = process.stdout.isTTY;
        output.print(
          formatMergeResultText(
            result,
            { number: pr.number, title: pr.title },
            deletedBranch,
            useColor
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
