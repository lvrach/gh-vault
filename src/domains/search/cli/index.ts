import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import type { SearchApi } from '../api.js';
import { createCodeCommand } from './code.js';
import { createCommitsCommand } from './commits.js';
import { createIssuesCommand } from './issues.js';
import { createPrsCommand } from './prs.js';
import { createReposCommand } from './repos.js';

/**
 * Creates and returns the search command with all subcommands registered.
 * Follows the domain registration pattern for CLI commands.
 */
export function createSearchCommand(output: Output, searchApi: SearchApi): Command {
  return new Command('search')
    .description('Search for repositories, issues, PRs, commits, and code on GitHub')
    .addCommand(createCodeCommand(output, searchApi))
    .addCommand(createCommitsCommand(output, searchApi))
    .addCommand(createIssuesCommand(output, searchApi))
    .addCommand(createPrsCommand(output, searchApi))
    .addCommand(createReposCommand(output, searchApi));
}
