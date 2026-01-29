import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { createCancelCommand } from './cancel.js';
import { createDeleteCommand } from './delete.js';
import { createListCommand } from './list.js';
import { createRerunCommand } from './rerun.js';
import { createViewCommand } from './view.js';

/**
 * Creates and returns the run command with all subcommands registered.
 * Follows the domain registration pattern for CLI commands.
 */
export function createRunCommand(output: Output): Command {
  return new Command('run')
    .description('View and manage GitHub Actions workflow runs')
    .addCommand(createCancelCommand(output))
    .addCommand(createDeleteCommand(output))
    .addCommand(createListCommand(output))
    .addCommand(createRerunCommand(output))
    .addCommand(createViewCommand(output));
}
