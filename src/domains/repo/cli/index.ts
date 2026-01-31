import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import type { RepoApi } from '../api.js';
import { createArchiveCommand, createUnarchiveCommand } from './archive.js';
import { createCloneCommand } from './clone.js';
import { createCreateCommand } from './create.js';
import { createDeleteCommand } from './delete.js';
import { createEditCommand } from './edit.js';
import { createForkCommand } from './fork.js';
import { createListCommand } from './list.js';
import { createViewCommand } from './view.js';

/**
 * Creates and returns the repo command with all subcommands registered.
 * Follows the domain registration pattern for CLI commands.
 */
export function createRepoCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('repo')
    .description('Work with GitHub repositories')
    .addCommand(createArchiveCommand(output, repoApi))
    .addCommand(createCloneCommand(output, repoApi))
    .addCommand(createCreateCommand(output, repoApi))
    .addCommand(createDeleteCommand(output, repoApi))
    .addCommand(createEditCommand(output, repoApi))
    .addCommand(createForkCommand(output, repoApi))
    .addCommand(createListCommand(output, repoApi))
    .addCommand(createUnarchiveCommand(output, repoApi))
    .addCommand(createViewCommand(output, repoApi));
}
