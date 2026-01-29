import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import { getJob, getRun, rerunFailedJobs, rerunJob, rerunRun } from '../api.js';
import { formatRunRerunText } from '../formatters/text.js';

interface RerunOptions {
  debug?: boolean | undefined;
  failed?: boolean | undefined;
  job?: string | undefined;
  repo?: string | undefined;
}

export function createRerunCommand(output: Output): Command {
  return new Command('rerun')
    .description('Rerun a workflow run')
    .argument('<run-id>', 'ID of the workflow run to rerun')
    .option('-d, --debug', 'Enable debug logging for this rerun')
    .option('--failed', 'Rerun only failed jobs')
    .option('-j, --job <job-id>', 'Rerun a specific job by database ID')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (runIdArg: string, options: RerunOptions) => {
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

        // Get run info for display
        const run = await getRun({ owner, repo, runId });

        const useColor = process.stdout.isTTY;

        // Rerun specific job
        if (options.job) {
          const jobId = Number.parseInt(options.job, 10);
          if (Number.isNaN(jobId)) {
            output.printError(`Error: Invalid job ID "${options.job}"`);
            process.exitCode = 1;
            return;
          }

          const job = await getJob({ owner, repo, jobId });

          await rerunJob({
            owner,
            repo,
            jobId,
            enableDebugLogging: options.debug,
          });

          output.print(formatRunRerunText(run, 'job', job.name, useColor));
          return;
        }

        // Rerun failed jobs only
        if (options.failed) {
          await rerunFailedJobs({
            owner,
            repo,
            runId,
            enableDebugLogging: options.debug,
          });

          output.print(formatRunRerunText(run, 'failed', undefined, useColor));
          return;
        }

        // Full rerun
        await rerunRun({
          owner,
          repo,
          runId,
          enableDebugLogging: options.debug,
        });

        output.print(formatRunRerunText(run, 'full', undefined, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
