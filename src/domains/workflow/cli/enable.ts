import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { WorkflowApi } from '../api.js';
import { formatWorkflowEnableText } from '../formatters/text.js';

interface EnableOptions {
  repo?: string | undefined;
}

export function createEnableCommand(output: Output, workflowApi: WorkflowApi): Command {
  return new Command('enable')
    .description('Enable a workflow')
    .argument('<workflow>', 'Workflow ID, name, or filename')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (workflowArg: string, options: EnableOptions) => {
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

        // Enable the workflow
        await workflowApi.enableWorkflow({
          owner,
          repo,
          workflowId: workflow.id,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatWorkflowEnableText(workflow, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
