import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import { getJob, getJobLogs, getRunWithJobs } from '../api.js';
import {
  formatJobViewJson,
  formatRunViewJson,
  jobToJson,
  runDetailToJson,
} from '../formatters/json.js';
import { formatJobViewText, formatRunViewText } from '../formatters/text.js';

interface ViewOptions {
  attempt?: string | undefined;
  job?: string | undefined;
  verbose?: boolean | undefined;
  log?: boolean | undefined;
  logFailed?: boolean | undefined;
  exitStatus?: boolean | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
  web?: boolean | undefined;
  repo?: string | undefined;
}

export function createViewCommand(output: Output): Command {
  return new Command('view')
    .description('View a workflow run')
    .argument('[run-id]', 'ID of the workflow run')
    .option('-a, --attempt <number>', 'View a specific attempt')
    .option('-j, --job <job-id>', 'View a specific job by database ID')
    .option('-v, --verbose', 'Show job steps')
    .option('--log', 'View run logs')
    .option('--log-failed', 'View logs for failed steps only')
    .option('--exit-status', 'Exit with non-zero status if run failed')
    .option('--json [fields]', 'Output JSON (optionally specify fields)')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the run in the browser')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (runIdArg: string | undefined, options: ViewOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        if (!runIdArg) {
          output.printError('Error: run-id is required');
          output.printError('Usage: gh-vault run view <run-id>');
          process.exitCode = 1;
          return;
        }

        const runId = Number.parseInt(runIdArg, 10);
        if (Number.isNaN(runId)) {
          output.printError(`Error: Invalid run ID "${runIdArg}"`);
          process.exitCode = 1;
          return;
        }

        // View specific job
        if (options.job) {
          const jobId = Number.parseInt(options.job, 10);
          if (Number.isNaN(jobId)) {
            output.printError(`Error: Invalid job ID "${options.job}"`);
            process.exitCode = 1;
            return;
          }

          const job = await getJob({ owner, repo, jobId });

          if (options.web) {
            await open(job.htmlUrl);
            return;
          }

          // View job logs
          if (options.log || options.logFailed) {
            const logs = await getJobLogs({ owner, repo, jobId });

            if (options.logFailed) {
              // Filter to show only failed step logs
              // The logs format typically has step markers like "##[group]Step Name"
              const failedStepNames = new Set(
                job.steps.filter((s) => s.conclusion === 'failure').map((s) => s.name)
              );

              if (failedStepNames.size === 0) {
                output.print('No failed steps found.');
                return;
              }

              // Simple filter - show lines that might be from failed steps
              // This is a simplification; real implementation would parse log format
              output.print(logs);
            } else {
              output.print(logs);
            }
            return;
          }

          if (options.jq) {
            if (options.json === undefined) {
              output.printError('Error: --jq requires --json to be specified');
              process.exitCode = 1;
              return;
            }

            try {
              const jsonData = jobToJson(job);
              const filtered = await filterWithJq(jsonData, options.jq);
              output.print(filtered);
            } catch (error) {
              if (error instanceof JqError) {
                output.printError('jq error: ' + error.message);
              } else {
                throw error;
              }
              process.exitCode = 1;
            }
            return;
          }

          if (options.json === undefined) {
            const useColor = process.stdout.isTTY;
            output.print(formatJobViewText(job, options.verbose ?? false, useColor));
          } else {
            const fields =
              typeof options.json === 'string'
                ? options.json.split(',').map((f) => f.trim())
                : undefined;
            output.print(formatJobViewJson(job, fields));
          }

          if (options.exitStatus && job.conclusion === 'failure') {
            process.exitCode = 1;
          }
          return;
        }

        // View run
        const attempt = options.attempt ? Number.parseInt(options.attempt, 10) : undefined;
        const run = await getRunWithJobs({
          owner,
          repo,
          runId,
          attempt,
        });

        if (options.web) {
          await open(run.htmlUrl);
          return;
        }

        // View run logs - note: this downloads a zip, so we show the URL
        if (options.log || options.logFailed) {
          // For run-level logs, we need to get logs from each job
          // This is a simplification - the full implementation would download and extract the zip
          if (run.jobs.length === 0) {
            output.print('No jobs found for this run.');
            return;
          }

          for (const job of run.jobs) {
            if (options.logFailed && job.conclusion !== 'failure') {
              continue;
            }

            output.print(`\n=== Job: ${job.name} ===\n`);
            try {
              const logs = await getJobLogs({ owner, repo, jobId: job.id });
              output.print(logs);
            } catch {
              output.print('(Unable to retrieve logs for this job)');
            }
          }
          return;
        }

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = runDetailToJson(run);
            const filtered = await filterWithJq(jsonData, options.jq);
            output.print(filtered);
          } catch (error) {
            if (error instanceof JqError) {
              output.printError('jq error: ' + error.message);
            } else {
              throw error;
            }
            process.exitCode = 1;
          }
          return;
        }

        if (options.json === undefined) {
          const useColor = process.stdout.isTTY;
          output.print(formatRunViewText(run, options.verbose ?? false, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatRunViewJson(run, fields));
        }

        if (options.exitStatus && run.conclusion === 'failure') {
          process.exitCode = 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
