import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { getCurrentBranch } from '../../../shared/repo.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { WorkflowApi } from '../api.js';
import { formatWorkflowRunText } from '../formatters/text.js';

interface RunOptions {
  ref?: string | undefined;
  field?: string[] | undefined;
  rawField?: string[] | undefined;
  json?: boolean | undefined;
  repo?: string | undefined;
}

function parseFields(fields: string[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fields) return result;

  for (const field of fields) {
    const eqIndex = field.indexOf('=');
    if (eqIndex === -1) {
      throw new Error(`Invalid field format: '${field}'. Expected key=value`);
    }
    const key = field.slice(0, eqIndex);
    const value = field.slice(eqIndex + 1);
    result[key] = value;
  }

  return result;
}

export function createRunCommand(output: Output, workflowApi: WorkflowApi): Command {
  return new Command('run')
    .description('Run a workflow by creating a workflow_dispatch event')
    .argument('[workflow]', 'Workflow ID, name, or filename')
    .option('-r, --ref <branch>', 'Branch or tag name which contains the workflow file')
    .option(
      '-F, --field <key=value...>',
      'Add a string parameter in key=value format, respecting @ syntax'
    )
    .option('-f, --raw-field <key=value...>', 'Add a string parameter in key=value format')
    .option('--json', 'Read workflow inputs as JSON via STDIN')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (workflowArg: string | undefined, options: RunOptions) => {
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
          output.printError('Usage: gh-vault workflow run <workflow-id|workflow-name|filename>');
          process.exitCode = 1;
          return;
        }

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

        // Determine the ref (branch/tag)
        let ref = options.ref;
        if (!ref) {
          const currentBranch = await getCurrentBranch();
          if (!currentBranch) {
            output.printError('Error: could not determine current branch. Use --ref to specify.');
            process.exitCode = 1;
            return;
          }
          ref = currentBranch;
        }

        // Parse inputs
        let inputs: Record<string, string> = {};

        if (options.json) {
          // Read JSON from stdin
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk as Buffer);
          }
          const stdinContent = Buffer.concat(chunks).toString('utf8');
          inputs = JSON.parse(stdinContent) as Record<string, string>;
        } else {
          // Parse -f and -F options
          const rawFields = parseFields(options.rawField);
          const fields = parseFields(options.field);
          inputs = { ...rawFields, ...fields };
        }

        // Trigger the workflow
        await workflowApi.runWorkflow({
          owner,
          repo,
          workflowId: workflow.id,
          ref,
          inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatWorkflowRunText(workflow, ref, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
