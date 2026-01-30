/**
 * MCP tool registrations for the run domain.
 * All workflow run related tools are defined here.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { Octokit } from '../../../shared/github.js';
import { RunApi } from '../api.js';
import {
  formatRunCancelledMarkdown,
  formatRunDeletedMarkdown,
  formatRunListMarkdown,
  formatRunLogsMarkdown,
  formatRunRerunMarkdown,
  formatRunViewMarkdown,
} from '../formatters/markdown.js';

/** Return type for MCP tool handler callbacks */
interface ToolResult {
  [x: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

// Schema shape definitions with .describe() for parameter documentation

const listWorkflowRunsShape = {
  owner: z.string().describe('Repository owner (user or org)'),
  repo: z.string().describe('Repository name'),
  branch: z.string().optional().describe('Filter by branch name'),
  status: z
    .enum([
      'queued',
      'in_progress',
      'completed',
      'waiting',
      'requested',
      'pending',
      'action_required',
    ])
    .optional()
    .describe('Filter by run status'),
  event: z
    .string()
    .optional()
    .describe('Filter by event type (push, pull_request, schedule, etc.)'),
  user: z.string().optional().describe('Filter by actor username'),
  workflow: z.string().optional().describe('Filter by workflow name or ID'),
  limit: z.number().min(1).max(100).default(20).describe('Maximum results (default 20)'),
};

const getWorkflowRunShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  run_id: z.number().describe('Workflow run ID'),
  attempt: z.number().optional().describe('Specific attempt number'),
};

const getWorkflowRunLogsShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  run_id: z.number().optional().describe('Workflow run ID (provide either run_id or job_id)'),
  job_id: z.number().optional().describe('Job ID to get logs for a specific job'),
  failed_only: z.boolean().optional().describe('Only show logs for failed steps'),
};

const cancelWorkflowRunShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  run_id: z.number().describe('Workflow run ID to cancel'),
};

const rerunWorkflowRunShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  run_id: z.number().describe('Workflow run ID to rerun'),
  debug: z.boolean().optional().describe('Enable debug logging'),
  failed_only: z.boolean().optional().describe('Only rerun failed jobs'),
  job_id: z.number().optional().describe('Specific job ID to rerun'),
};

const deleteWorkflowRunShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  run_id: z.number().describe('Workflow run ID to delete'),
};

/**
 * Format an error into a user-friendly message with recovery steps.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('not found')) {
      return `Error: Resource not found

Action Required:
1. Verify the repository owner and name are correct
2. Check that the workflow run ID exists
3. Ensure your token has access to this repository`;
    }

    if (message.includes('bad credentials') || message.includes('401')) {
      return `Error: Authentication failed

Action Required:
1. Verify your GitHub token is valid
2. Run: gh-vault auth login
3. Ensure the token has not expired`;
    }

    if (message.includes('403') || message.includes('forbidden')) {
      return `Error: Access denied

Action Required:
1. Check your token has the required scopes (repo, workflow)
2. Verify you have access to this repository
3. For private repos, ensure your token includes private repo access`;
    }

    if (message.includes('rate limit')) {
      return `Error: GitHub API rate limit exceeded

Action Required:
1. Wait a few minutes before retrying
2. Consider using a token with higher rate limits
3. Check your rate limit status at: https://api.github.com/rate_limit`;
    }

    if (message.includes('409') || message.includes('conflict')) {
      return `Error: Conflict - the run may have already completed or been cancelled

Action Required:
1. Check the current status of the workflow run
2. The operation may have already been performed`;
    }

    return `Error: ${error.message}

Action Required:
1. Check your inputs are correct
2. Verify your token has the required permissions
3. Try again in a few moments`;
  }

  return `Error: An unexpected error occurred

Action Required:
1. Check your inputs
2. Verify token permissions
3. Try again`;
}

/**
 * Register all workflow run tools with the MCP server.
 * @param server The MCP server instance
 * @param getClient Function that returns a Promise resolving to an authenticated Octokit client
 */
export function registerRunTools(server: McpServer, getClient: () => Promise<Octokit>): void {
  server.registerTool(
    'list_workflow_runs',
    {
      description:
        'List recent workflow runs for a repository with optional filtering by branch, status, event, user, or workflow',
      inputSchema: listWorkflowRunsShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const client = await getClient();
        const runApi = new RunApi(client);

        // Resolve workflow name to ID if provided
        let workflowId: number | string | undefined;
        if (input.workflow) {
          const numericId = Number.parseInt(input.workflow, 10);
          if (Number.isNaN(numericId)) {
            const foundId = await runApi.getWorkflowIdByName({
              owner: input.owner,
              repo: input.repo,
              name: input.workflow,
            });
            if (foundId === null) {
              return {
                content: [{ type: 'text', text: `Error: Workflow "${input.workflow}" not found` }],
                isError: true,
              };
            }
            workflowId = foundId;
          } else {
            workflowId = numericId;
          }
        }

        const runs = await runApi.listRuns({
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          status: input.status,
          event: input.event,
          actor: input.user,
          workflowId,
          perPage: input.limit,
        });

        return { content: [{ type: 'text', text: formatRunListMarkdown(runs) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_workflow_run',
    {
      description:
        'Get detailed information about a specific workflow run including its jobs and steps',
      inputSchema: getWorkflowRunShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const client = await getClient();
        const runApi = new RunApi(client);

        const run = await runApi.getRunWithJobs({
          owner: input.owner,
          repo: input.repo,
          runId: input.run_id,
          attempt: input.attempt,
        });

        return { content: [{ type: 'text', text: formatRunViewMarkdown(run) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_workflow_run_logs',
    {
      description:
        'Get logs for a workflow run or specific job. Provide either run_id (for all job logs) or job_id (for specific job logs).',
      inputSchema: getWorkflowRunLogsShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const client = await getClient();
        const runApi = new RunApi(client);

        if (input.run_id === undefined && input.job_id === undefined) {
          return {
            content: [{ type: 'text', text: 'Error: Either run_id or job_id is required' }],
            isError: true,
          };
        }

        // Get logs for specific job
        if (input.job_id !== undefined) {
          const job = await runApi.getJob({
            owner: input.owner,
            repo: input.repo,
            jobId: input.job_id,
          });

          const logs = await runApi.getJobLogs({
            owner: input.owner,
            repo: input.repo,
            jobId: input.job_id,
          });

          return { content: [{ type: 'text', text: formatRunLogsMarkdown(logs, job.name) }] };
        }

        // Get logs for all jobs in run - we know run_id exists because we checked above
        const runId = input.run_id;
        if (runId === undefined) {
          return {
            content: [
              { type: 'text', text: 'Error: run_id is required when job_id is not provided' },
            ],
            isError: true,
          };
        }

        const run = await runApi.getRunWithJobs({
          owner: input.owner,
          repo: input.repo,
          runId,
        });

        if (run.jobs.length === 0) {
          return { content: [{ type: 'text', text: 'No jobs found for this run.' }] };
        }

        const allLogs: string[] = [];

        for (const job of run.jobs) {
          if (input.failed_only && job.conclusion !== 'failure') {
            continue;
          }

          try {
            const logs = await runApi.getJobLogs({
              owner: input.owner,
              repo: input.repo,
              jobId: job.id,
            });
            allLogs.push(`\n=== Job: ${job.name} ===\n\n${logs}`);
          } catch {
            allLogs.push(`\n=== Job: ${job.name} ===\n\n(Unable to retrieve logs)`);
          }
        }

        if (allLogs.length === 0) {
          return { content: [{ type: 'text', text: 'No matching job logs found.' }] };
        }

        return {
          content: [{ type: 'text', text: formatRunLogsMarkdown(allLogs.join('\n')) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'cancel_workflow_run',
    {
      description: 'Cancel a running workflow. Only works for runs that are in progress.',
      inputSchema: cancelWorkflowRunShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const client = await getClient();
        const runApi = new RunApi(client);

        const run = await runApi.getRunWithJobs({
          owner: input.owner,
          repo: input.repo,
          runId: input.run_id,
        });

        if (run.status === 'completed') {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Run #${String(run.runNumber)} is already completed (${run.conclusion ?? 'unknown'})`,
              },
            ],
            isError: true,
          };
        }

        await runApi.cancelRun({
          owner: input.owner,
          repo: input.repo,
          runId: input.run_id,
        });

        return { content: [{ type: 'text', text: formatRunCancelledMarkdown(run) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'rerun_workflow_run',
    {
      description:
        'Rerun a workflow run. Can rerun the entire workflow, only failed jobs, or a specific job.',
      inputSchema: rerunWorkflowRunShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const client = await getClient();
        const runApi = new RunApi(client);

        const run = await runApi.getRunWithJobs({
          owner: input.owner,
          repo: input.repo,
          runId: input.run_id,
        });

        // Rerun specific job
        if (input.job_id !== undefined) {
          const job = await runApi.getJob({
            owner: input.owner,
            repo: input.repo,
            jobId: input.job_id,
          });

          await runApi.rerunJob({
            owner: input.owner,
            repo: input.repo,
            jobId: input.job_id,
            enableDebugLogging: input.debug,
          });

          return {
            content: [{ type: 'text', text: formatRunRerunMarkdown(run, 'job', job.name) }],
          };
        }

        // Rerun failed jobs
        if (input.failed_only) {
          await runApi.rerunFailedJobs({
            owner: input.owner,
            repo: input.repo,
            runId: input.run_id,
            enableDebugLogging: input.debug,
          });

          return { content: [{ type: 'text', text: formatRunRerunMarkdown(run, 'failed') }] };
        }

        // Full rerun
        await runApi.rerunRun({
          owner: input.owner,
          repo: input.repo,
          runId: input.run_id,
          enableDebugLogging: input.debug,
        });

        return { content: [{ type: 'text', text: formatRunRerunMarkdown(run, 'full') }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'delete_workflow_run',
    {
      description: 'Delete a workflow run permanently. This cannot be undone.',
      inputSchema: deleteWorkflowRunShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const client = await getClient();
        const runApi = new RunApi(client);

        await runApi.deleteRun({
          owner: input.owner,
          repo: input.repo,
          runId: input.run_id,
        });

        return { content: [{ type: 'text', text: formatRunDeletedMarkdown(input.run_id) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );
}
