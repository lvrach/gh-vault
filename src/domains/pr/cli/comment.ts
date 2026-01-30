import { readFile } from 'node:fs/promises';
import * as readline from 'node:readline';

import { Command } from 'commander';
import open from 'open';

import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import {
  formatCommentCreatedText,
  formatCommentDeletedText,
  formatCommentUpdatedText,
} from '../formatters/text.js';

async function confirmDelete(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Are you sure you want to delete this comment? [y/N] ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

interface CommentOptions {
  body?: string | undefined;
  bodyFile?: string | undefined;
  web?: boolean | undefined;
  editLast?: boolean | undefined;
  deleteLast?: boolean | undefined;
  yes?: boolean | undefined;
  repo?: string | undefined;
}

export function createCommentCommand(output: Output, prApi: PrApi): Command {
  return new Command('comment')
    .description('Add a comment to a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('-b, --body <text>', 'Comment body')
    .option('-F, --body-file <file>', 'Read comment body from file')
    .option('-w, --web', 'Open the web browser to add a comment')
    .option('--edit-last', 'Edit the last comment of the current user')
    .option('--delete-last', 'Delete the last comment of the current user')
    .option('--yes', 'Skip the delete confirmation prompt')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: CommentOptions) => {
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
          const url = `https://github.com/${owner}/${repo}/pull/${String(pullNumber)}#issuecomment-new`;
          await open(url);
          return;
        }

        const useColor = process.stdout.isTTY;

        if (options.editLast || options.deleteLast) {
          const currentUser = await prApi.getCurrentUser();
          const comments = await prApi.listPrComments({
            owner,
            repo,
            issueNumber: pullNumber,
            perPage: 100,
          });

          const userComments = comments.filter((c) => c.user?.login === currentUser);
          const lastComment = userComments.at(-1);

          if (!lastComment) {
            output.printError(`Error: No comments found by @${currentUser} on this pull request`);
            process.exitCode = 1;
            return;
          }

          if (options.deleteLast) {
            if (!options.yes) {
              output.print(`Comment by @${currentUser}:`);
              output.print(
                lastComment.body.slice(0, 200) + (lastComment.body.length > 200 ? '...' : '')
              );
              output.print('');

              const confirmed = await confirmDelete();
              if (!confirmed) {
                output.print('Cancelled.');
                return;
              }
            }

            await prApi.deletePrComment({
              owner,
              repo,
              commentId: lastComment.id,
            });

            output.print(formatCommentDeletedText(pullNumber, useColor));
            return;
          }

          if (options.editLast) {
            let newBody: string;
            if (options.bodyFile) {
              // CLI tool - user specifies file path via -F flag
              // eslint-disable-next-line security/detect-non-literal-fs-filename
              newBody = await readFile(options.bodyFile, 'utf8');
            } else if (options.body) {
              newBody = options.body;
            } else {
              output.printError(
                'Error: New comment body is required (-b or -F) when using --edit-last'
              );
              process.exitCode = 1;
              return;
            }

            const updatedComment = await prApi.updatePrComment({
              owner,
              repo,
              commentId: lastComment.id,
              body: newBody,
            });

            output.print(formatCommentUpdatedText(updatedComment, pullNumber, useColor));
            return;
          }
        }

        let body: string;
        if (options.bodyFile) {
          // CLI tool - user specifies file path via -F flag
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          body = await readFile(options.bodyFile, 'utf8');
        } else if (options.body) {
          body = options.body;
        } else {
          output.printError('Error: Comment body is required (-b or -F)');
          process.exitCode = 1;
          return;
        }

        const comment = await prApi.createPrComment({
          owner,
          repo,
          issueNumber: pullNumber,
          body,
        });

        output.print(formatCommentCreatedText(comment, pullNumber, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
