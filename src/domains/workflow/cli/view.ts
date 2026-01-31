import { Command } from 'commander';
import open from 'open';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { WorkflowApi } from '../api.js';
import { formatWorkflowViewText, formatWorkflowYamlText } from '../formatters/text.js';

interface ViewOptions {
  ref?: string | undefined;
  web?: boolean | undefined;
  yaml?: boolean | undefined;
  repo?: string | undefined;
}

export function createViewCommand(output: Output, workflowApi: WorkflowApi): Command {
  return new Command('view')
    .description('View the summary of a workflow')
    .argument('[workflow]', 'Workflow ID, name, or filename')
    .option('-r, --ref <branch>', 'The branch or tag name which contains the workflow file')
    .option('-w, --web', 'Open workflow in the browser')
    .option('-y, --yaml', 'View the workflow yaml file')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (workflowArg: string | undefined, options: ViewOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        if (!workflowArg) {
          output.printError('Error: workflow argument is required');
          output.printError('Usage: gh-vault workflow view <workflow-id|workflow-name|filename>');
          process.exitCode = 1;
          return;
        }

        // Find the workflow by ID, name, or filename
        const workflow = await workflowApi.findWorkflow({
          owner,
          repo,
          identifier: workflowArg,
        });

        if (!workflow) {
          output.printError(`Error: workflow '${workflowArg}' not found`);
          process.exitCode = 1;
          return;
        }

        if (options.web) {
          await open(workflow.htmlUrl);
          return;
        }

        if (options.yaml) {
          const yaml = await workflowApi.getWorkflowYaml({
            owner,
            repo,
            workflowId: workflow.id,
            ...(options.ref && { ref: options.ref }),
          });
          output.print(formatWorkflowYamlText(yaml));
          return;
        }

        const useColor = process.stdout.isTTY;
        output.print(formatWorkflowViewText(workflow, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
