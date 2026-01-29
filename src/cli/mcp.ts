import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createMcpServer } from '../mcp/server.js';

/**
 * Log to stderr for MCP mode.
 * CRITICAL: Never use console.log in MCP mode - corrupts STDIO JSON-RPC
 */
function log(msg: string): void {
  process.stderr.write(`[gh-vault] ${msg}\n`);
}

/**
 * Start the MCP server for Claude Code integration.
 */
export function startMcpServer(): void {
  const server = createMcpServer();

  const transport = new StdioServerTransport();
  server
    .connect(transport)
    .then(() => {
      log('MCP server started');
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`Fatal: ${message}`);
      throw error;
    });
}
