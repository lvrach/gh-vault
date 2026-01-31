#!/usr/bin/env node
/**
 * CLI Entry Point
 *
 * This is the composition root where dependencies are wired together.
 * It has the SINGLE exit point - the only place that sets process.exitCode.
 */

import { Console } from 'node:console';

import { program } from 'commander';

import { PrApi } from '../domains/pr/api.js';
import { createPrCommand } from '../domains/pr/cli/index.js';
import { RepoApi } from '../domains/repo/api.js';
import { createRepoCommand } from '../domains/repo/cli/index.js';
import { RunApi } from '../domains/run/api.js';
import { createRunCommand } from '../domains/run/cli/index.js';
import { SearchApi } from '../domains/search/api.js';
import { createSearchCommand } from '../domains/search/cli/index.js';
import { WorkflowApi } from '../domains/workflow/api.js';
import { createWorkflowCommand } from '../domains/workflow/cli/index.js';
import { createGitHubClient } from '../shared/github.js';
import { Output } from '../shared/output.js';
import { createApiCommand } from './commands/api.js';
import { createAuthCommand } from './commands/auth/index.js';
import { handleError } from './error-handler.js';

// Create output with real console (DI composition root)
const output = new Output(new Console({ stdout: process.stdout, stderr: process.stderr }));

/**
 * Main entry point - the SINGLE place that sets process.exitCode.
 */
async function main(): Promise<void> {
  program
    .name('gh-vault')
    .description('GitHub CLI for Pull Request operations with secure token storage')
    .version('0.1.0');

  // Auth commands don't need a GitHub client - always register
  program.addCommand(createAuthCommand(output));

  // Check if this is an auth command (doesn't need client)
  const isAuthCommand = process.argv[2] === 'auth';

  if (!isAuthCommand) {
    // Create client and APIs for non-auth commands
    // This will throw AuthenticationError if no token - caught at exit point
    const client = await createGitHubClient();
    const prApi = new PrApi(client);
    const repoApi = new RepoApi(client);
    const runApi = new RunApi(client);
    const searchApi = new SearchApi(client);
    const workflowApi = new WorkflowApi(client);

    program.addCommand(createPrCommand(output, prApi));
    program.addCommand(createRepoCommand(output, repoApi));
    program.addCommand(createRunCommand(output, runApi));
    program.addCommand(createSearchCommand(output, searchApi));
    program.addCommand(createWorkflowCommand(output, workflowApi));
    program.addCommand(createApiCommand(output));
  }

  await program.parseAsync();
}

// SINGLE EXIT POINT - only place that sets process.exitCode
// eslint-disable-next-line unicorn/prefer-top-level-await -- intentional: catch pattern for single exit point
main().catch((error: unknown) => {
  handleError(error, output);
  process.exitCode = 1;
});
