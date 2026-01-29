import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import { cancelRun, getRun } from '../api.js';
import { formatRunCancelledText } from '../formatters/text.js';

interface CancelOptions {
  repo?: string | undefined;
}

export function createCancelCommand(output: Output): Command {
  return new Command('cancel')
    .description('Cancel a workflow run')
    .argument('<run-id>', 'ID of the workflow run to cancel')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (runIdArg: string, options: CancelOptions) => {
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

        // Get run info first for display
        const run = await getRun({ owner, repo, runId });

        // Check if run is already completed
        if (run.status === 'completed') {
          output.printError(`Error: Run #${String(run.runNumber)} is already completed`);
          process.exitCode = 1;
          return;
        }

        await cancelRun({ owner, repo, runId });

        const useColor = process.stdout.isTTY;
        output.print(formatRunCancelledText(run, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        // Handle 409 Conflict (run already completed)
        if (message.includes('409') || message.includes('conflict')) {
          output.printError('Error: Cannot cancel - run has already completed');
        } else {
          output.printError(`Error: ${message}`);
        }
        process.exitCode = 1;
      }
    });
}
