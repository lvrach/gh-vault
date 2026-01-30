#!/usr/bin/env node
import { Console } from 'node:console';

import { program } from 'commander';

import { PrApi } from '../domains/pr/api.js';
import { createPrCommand } from '../domains/pr/cli/index.js';
import { RunApi } from '../domains/run/api.js';
import { createRunCommand } from '../domains/run/cli/index.js';
import { SearchApi } from '../domains/search/api.js';
import { createSearchCommand } from '../domains/search/cli/index.js';
import { createGitHubClient } from '../shared/github.js';
import { Output } from '../shared/output.js';
import { createApiCommand } from './commands/api.js';
import { createAuthCommand } from './commands/auth/index.js';
import { startMcpServer } from './mcp.js';

// Create output with real console (DI composition root)
const output = new Output(new Console({ stdout: process.stdout, stderr: process.stderr }));

try {
  program
    .name('gh-vault')
    .description('GitHub CLI for Pull Request operations with secure token storage')
    .version('0.1.0');

  // Create GitHub client and API instances (DI composition root)
  const client = await createGitHubClient();
  const prApi = new PrApi(client);
  const runApi = new RunApi(client);
  const searchApi = new SearchApi(client);

  program.addCommand(createPrCommand(output, prApi));
  program.addCommand(createRunCommand(output, runApi));
  program.addCommand(createSearchCommand(output, searchApi));
  program.addCommand(createApiCommand(output));
  program.addCommand(createAuthCommand(output));

  program
    .command('mcp')
    .description('Start the MCP server for Claude Code integration')
    .action(() => {
      startMcpServer();
    });

  program.parse();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  output.printError(`Error: ${message}`);
  process.exitCode = 1;
}
