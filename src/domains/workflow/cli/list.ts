import { Command } from 'commander';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { WorkflowApi } from '../api.js';
import { formatWorkflowListJson, workflowToJson } from '../formatters/json.js';
import { formatWorkflowListText } from '../formatters/text.js';

interface ListOptions {
  all?: boolean | undefined;
  limit?: string | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
  repo?: string | undefined;
}

export function createListCommand(output: Output, workflowApi: WorkflowApi): Command {
  return new Command('list')
    .alias('ls')
    .description('List workflow files, hiding disabled workflows by default')
    .option('-a, --all', 'Include disabled workflows')
    .option('-L, --limit <number>', 'Maximum number of workflows to fetch', '50')
    .option('--json [fields]', 'Output JSON with the specified fields (id, name, path, state)')
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

        let workflows = await workflowApi.listWorkflows({
          owner,
          repo,
          perPage: Number.parseInt(options.limit ?? '50', 10),
        });

        // Filter out disabled workflows unless --all is specified
        if (!options.all) {
          workflows = workflows.filter((w) => w.state === 'active');
        }

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            output.printError('Example: gh-vault workflow list --json id,name --jq ".[].name"');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = workflows.map((w) => workflowToJson(w));
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
          output.print(formatWorkflowListText(workflows, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatWorkflowListJson(workflows, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
