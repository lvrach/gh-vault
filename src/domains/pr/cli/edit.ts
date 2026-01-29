import { readFile } from 'node:fs/promises';

import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import { editPr, getCurrentUser, listPrs } from '../api.js';
import { formatEditResultText } from '../formatters/text.js';

interface EditOptions {
  title?: string | undefined;
  body?: string | undefined;
  bodyFile?: string | undefined;
  base?: string | undefined;
  addLabel?: string[] | undefined;
  removeLabel?: string[] | undefined;
  addAssignee?: string[] | undefined;
  removeAssignee?: string[] | undefined;
  addReviewer?: string[] | undefined;
  removeReviewer?: string[] | undefined;
  milestone?: string | undefined;
  removeMilestone?: boolean | undefined;
  repo?: string | undefined;
}

export function createEditCommand(output: Output): Command {
  return new Command('edit')
    .description('Edit a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('-t, --title <string>', 'Set the new title')
    .option('-b, --body <string>', 'Set the new body')
    .option('-F, --body-file <file>', 'Read body from file')
    .option('-B, --base <branch>', 'Change the base branch')
    .option('--add-label <label>', 'Add a label (can be specified multiple times)', collect, [])
    .option(
      '--remove-label <label>',
      'Remove a label (can be specified multiple times)',
      collect,
      []
    )
    .option('--add-assignee <login>', 'Add an assignee (@me for yourself)', collect, [])
    .option('--remove-assignee <login>', 'Remove an assignee', collect, [])
    .option('--add-reviewer <login>', 'Request a reviewer', collect, [])
    .option('--remove-reviewer <login>', 'Remove a reviewer request', collect, [])
    .option('-m, --milestone <name>', 'Set the milestone')
    .option('--remove-milestone', 'Remove the milestone')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: EditOptions) => {
      try {
        // Resolve repository
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        // Resolve PR number
        const prResult = await resolvePrNumber(prArg, owner, repo, listPrs);
        if (!prResult.success) {
          output.printError(`Error: ${prResult.error}`);
          process.exitCode = 1;
          return;
        }
        const pullNumber = prResult.pullNumber;

        // Get body from file if specified
        let body: string | undefined;
        if (options.bodyFile) {
          // CLI tool - user specifies file path via -F flag
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          body = await readFile(options.bodyFile, 'utf8');
        } else if (options.body !== undefined) {
          body = options.body;
        }

        // Resolve @me to actual username for assignees
        let addAssignees = options.addAssignee;
        if (addAssignees?.includes('@me')) {
          const currentUser = await getCurrentUser();
          addAssignees = addAssignees.map((a) => (a === '@me' ? currentUser : a));
        }

        // Check if any edits were specified
        const hasEdits =
          options.title !== undefined ||
          body !== undefined ||
          options.base !== undefined ||
          (options.addLabel?.length ?? 0) > 0 ||
          (options.removeLabel?.length ?? 0) > 0 ||
          (addAssignees?.length ?? 0) > 0 ||
          (options.removeAssignee?.length ?? 0) > 0 ||
          (options.addReviewer?.length ?? 0) > 0 ||
          (options.removeReviewer?.length ?? 0) > 0 ||
          options.milestone !== undefined ||
          options.removeMilestone;

        if (!hasEdits) {
          output.printError('Error: No changes specified. Use --help to see available options.');
          process.exitCode = 1;
          return;
        }

        // Edit the PR
        const result = await editPr({
          owner,
          repo,
          pullNumber,
          title: options.title,
          body,
          base: options.base,
          addLabels: options.addLabel && options.addLabel.length > 0 ? options.addLabel : undefined,
          removeLabels:
            options.removeLabel && options.removeLabel.length > 0 ? options.removeLabel : undefined,
          addAssignees: addAssignees && addAssignees.length > 0 ? addAssignees : undefined,
          removeAssignees:
            options.removeAssignee && options.removeAssignee.length > 0
              ? options.removeAssignee
              : undefined,
          addReviewers:
            options.addReviewer && options.addReviewer.length > 0 ? options.addReviewer : undefined,
          removeReviewers:
            options.removeReviewer && options.removeReviewer.length > 0
              ? options.removeReviewer
              : undefined,
          milestone: options.milestone,
          removeMilestone: options.removeMilestone,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatEditResultText(result, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}

/**
 * Collect multiple flag values into an array.
 */
function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
