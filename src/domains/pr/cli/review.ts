import { readFile } from 'node:fs/promises';

import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import { createPrReview, listPrs } from '../api.js';
import { formatReviewSubmittedText } from '../formatters/text.js';
import type { ReviewEvent } from '../types.js';

interface ReviewOptions {
  approve?: boolean | undefined;
  requestChanges?: boolean | undefined;
  comment?: boolean | undefined;
  body?: string | undefined;
  bodyFile?: string | undefined;
  repo?: string | undefined;
}

export function createReviewCommand(output: Output): Command {
  return new Command('review')
    .description('Add a review to a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('-a, --approve', 'Approve the pull request')
    .option('-r, --request-changes', 'Request changes on the pull request')
    .option('-c, --comment', 'Leave a review comment')
    .option('-b, --body <text>', 'Review body text')
    .option('-F, --body-file <file>', 'Read review body from file')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: ReviewOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        let event: ReviewEvent;
        if (options.approve) {
          event = 'APPROVE';
        } else if (options.requestChanges) {
          event = 'REQUEST_CHANGES';
        } else if (options.comment) {
          event = 'COMMENT';
        } else {
          output.printError('Error: Specify --approve, --request-changes, or --comment');
          process.exitCode = 1;
          return;
        }

        let body: string;
        if (options.bodyFile) {
          // CLI tool - user specifies file path via -F flag
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          body = await readFile(options.bodyFile, 'utf8');
        } else if (options.body) {
          body = options.body;
        } else if (event === 'REQUEST_CHANGES') {
          output.printError('Error: --request-changes requires a body (-b or -F)');
          process.exitCode = 1;
          return;
        } else {
          body = '';
        }

        const prResult = await resolvePrNumber(prArg, owner, repo, listPrs);
        if (!prResult.success) {
          output.printError(`Error: ${prResult.error}`);
          process.exitCode = 1;
          return;
        }
        const pullNumber = prResult.pullNumber;

        const review = await createPrReview({
          owner,
          repo,
          pullNumber,
          body,
          event,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatReviewSubmittedText(review, event, pullNumber, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
