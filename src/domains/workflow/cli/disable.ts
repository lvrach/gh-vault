import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { WorkflowApi } from '../api.js';
import { formatWorkflowDisableText } from '../formatters/text.js';

interface DisableOptions {
  repo?: string | undefined;
}

export function createDisableCommand(output: Output, workflowApi: WorkflowApi): Command {
  return new Command('disable')
    .description('Disable a workflow')
    .argument('<workflow>', 'Workflow ID, name, or filename')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (workflowArg: string, options: DisableOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        // Find the workflow
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

        // Disable the workflow
        await workflowApi.disableWorkflow({
          owner,
          repo,
          workflowId: workflow.id,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatWorkflowDisableText(workflow, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
