/**
 * MCP server factory - creates and configures the MCP server with all domain tools.
 * This is the central place where all domain tool registrations are combined.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerPrTools } from '../domains/pr/mcp/tools.js';
import { registerRunTools } from '../domains/run/mcp/tools.js';
import { registerSearchTools } from '../domains/search/mcp/tools.js';
import { createGitHubClient } from '../shared/github.js';

/**
 * Shared client factory for all domains - creates authenticated Octokit on demand.
 * Defined at module level to satisfy unicorn/consistent-function-scoping.
 */
const getClient = (): ReturnType<typeof createGitHubClient> => createGitHubClient();

/**
 * Create a new MCP server with all tools registered.
 * Each domain exports a registerXxxTools function that adds its tools to the server.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'gh-vault',
    version: '0.1.0',
  });

  registerPrTools(server, getClient);
  registerRunTools(server, getClient);
  registerSearchTools(server, getClient);

  return server;
}
