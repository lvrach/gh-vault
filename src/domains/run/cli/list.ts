import { Command } from 'commander';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { RunApi } from '../api.js';
import { formatRunListJson, runListItemToJson } from '../formatters/json.js';
import { formatRunListText } from '../formatters/text.js';
import type { RunStatus } from '../types.js';

interface ListOptions {
  branch?: string | undefined;
  status?: RunStatus | undefined;
  event?: string | undefined;
  user?: string | undefined;
  workflow?: string | undefined;
  commit?: string | undefined;
  created?: string | undefined;
  limit?: string | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
  repo?: string | undefined;
}

const VALID_STATUSES: RunStatus[] = [
  'queued',
  'in_progress',
  'completed',
  'waiting',
  'requested',
  'pending',
  'action_required',
];

export function createListCommand(output: Output, runApi: RunApi): Command {
  return new Command('list')
    .alias('ls')
    .description('List recent workflow runs')
    .option('-b, --branch <branch>', 'Filter by branch')
    .option(
      '-s, --status <status>',
      'Filter by status: queued, in_progress, completed, waiting, requested, pending, action_required'
    )
    .option(
      '-e, --event <event>',
      'Filter by event type (push, pull_request, schedule, workflow_dispatch, etc.)'
    )
    .option('-u, --user <user>', 'Filter by user who triggered the run')
    .option('-w, --workflow <name|id>', 'Filter by workflow name or file name')
    .option('-c, --commit <sha>', 'Filter by commit SHA')
    .option('--created <date>', 'Filter by creation date (e.g., >2023-01-01, <=2023-12-31)')
    .option('-L, --limit <number>', 'Maximum number of runs to fetch', '20')
    .option('--json [fields]', 'Output JSON (optionally specify fields)')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (options: ListOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        // Validate status if provided
        if (options.status && !VALID_STATUSES.includes(options.status)) {
          output.printError(
            `Error: Invalid status "${options.status}". Valid values: ${VALID_STATUSES.join(', ')}`
          );
          process.exitCode = 1;
          return;
        }

        // Resolve workflow name to ID if needed
        let workflowId: number | string | undefined;
        if (options.workflow) {
          const numericId = Number.parseInt(options.workflow, 10);
          if (Number.isNaN(numericId)) {
            // Try to find workflow by name
            const foundId = await runApi.getWorkflowIdByName({
              owner,
              repo,
              name: options.workflow,
            });
            if (foundId === null) {
              output.printError(`Error: Workflow "${options.workflow}" not found`);
              process.exitCode = 1;
              return;
            }
            workflowId = foundId;
          } else {
            workflowId = numericId;
          }
        }

        const runs = await runApi.listRuns({
          owner,
          repo,
          branch: options.branch,
          status: options.status,
          event: options.event,
          actor: options.user,
          workflowId,
          headSha: options.commit,
          created: options.created,
          perPage: Number.parseInt(options.limit ?? '20', 10),
        });

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            output.printError('Example: gh-vault run list --json number,status --jq ".[].status"');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = runs.map((run) => runListItemToJson(run));
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
          output.print(formatRunListText(runs, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatRunListJson(runs, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
