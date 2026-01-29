import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { createCodeCommand } from './code.js';
import { createCommitsCommand } from './commits.js';
import { createIssuesCommand } from './issues.js';
import { createPrsCommand } from './prs.js';
import { createReposCommand } from './repos.js';

/**
 * Creates and returns the search command with all subcommands registered.
 * Follows the domain registration pattern for CLI commands.
 */
export function createSearchCommand(output: Output): Command {
  return new Command('search')
    .description('Search for repositories, issues, PRs, commits, and code on GitHub')
    .addCommand(createCodeCommand(output))
    .addCommand(createCommitsCommand(output))
    .addCommand(createIssuesCommand(output))
    .addCommand(createPrsCommand(output))
    .addCommand(createReposCommand(output));
}
