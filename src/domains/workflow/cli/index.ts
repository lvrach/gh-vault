import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import type { WorkflowApi } from '../api.js';
import { createDisableCommand } from './disable.js';
import { createEnableCommand } from './enable.js';
import { createListCommand } from './list.js';
import { createRunCommand } from './run.js';
import { createViewCommand } from './view.js';

/**
 * Creates and returns the workflow command with all subcommands registered.
 * Follows the domain registration pattern for CLI commands.
 */
export function createWorkflowCommand(output: Output, workflowApi: WorkflowApi): Command {
  return new Command('workflow')
    .description('List, view, and run workflows in GitHub Actions')
    .addCommand(createDisableCommand(output, workflowApi))
    .addCommand(createEnableCommand(output, workflowApi))
    .addCommand(createListCommand(output, workflowApi))
    .addCommand(createRunCommand(output, workflowApi))
    .addCommand(createViewCommand(output, workflowApi));
}
