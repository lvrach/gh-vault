#!/usr/bin/env node
import { Console } from 'node:console';

import { program } from 'commander';

import { createPrCommand } from '../domains/pr/cli/index.js';
import { createRunCommand } from '../domains/run/cli/index.js';
import { createSearchCommand } from '../domains/search/cli/index.js';
import { Output } from '../shared/output.js';
import { createApiCommand } from './commands/api.js';
import { createAuthCommand } from './commands/auth/index.js';
import { startMcpServer } from './mcp.js';

// Create output with real console (DI composition root)
const output = new Output(new Console({ stdout: process.stdout, stderr: process.stderr }));

program
  .name('gh-vault')
  .description('GitHub CLI for Pull Request operations with secure token storage')
  .version('0.1.0');

program.addCommand(createPrCommand(output));
program.addCommand(createRunCommand(output));
program.addCommand(createSearchCommand(output));
program.addCommand(createApiCommand(output));
program.addCommand(createAuthCommand(output));

program
  .command('mcp')
  .description('Start the MCP server for Claude Code integration')
  .action(() => {
    startMcpServer();
  });

program.parse();
