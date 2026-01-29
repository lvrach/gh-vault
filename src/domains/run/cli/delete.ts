import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import { deleteRun } from '../api.js';
import { formatRunDeletedText } from '../formatters/text.js';

interface DeleteOptions {
  repo?: string | undefined;
}

export function createDeleteCommand(output: Output): Command {
  return new Command('delete')
    .description('Delete a workflow run')
    .argument('<run-id>', 'ID of the workflow run to delete')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (runIdArg: string, options: DeleteOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        const runId = Number.parseInt(runIdArg, 10);
        if (Number.isNaN(runId)) {
          output.printError(`Error: Invalid run ID "${runIdArg}"`);
          process.exitCode = 1;
          return;
        }

        await deleteRun({ owner, repo, runId });

        const useColor = process.stdout.isTTY;
        output.print(formatRunDeletedText(runId, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
