/**
 * MCP tool registrations for the PR domain.
 * All pull request related tools are defined here.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { detectRepo, getCurrentBranch } from '../../../shared/repo.js';

/** Return type for MCP tool handler callbacks */
interface ToolResult {
  [x: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}
import {
  createPrComment,
  createPrReview,
  deleteBranch,
  editPr,
  getCurrentUser,
  getPr,
  getPrStatus,
  listPrChecks,
  listPrComments,
  listPrFiles,
  listPrReviewComments,
  listPrReviews,
  listPrs,
  mergePr,
  updatePrDraft,
  updatePrState,
} from '../api.js';
import {
  formatCreatedCommentMarkdown,
  formatCreatedReviewMarkdown,
  formatEditResultMarkdown,
  formatMergeResultMarkdown,
  formatPrChecksMarkdown,
  formatPrCommentsMarkdown,
  formatPrFilesMarkdown,
  formatPrListMarkdown,
  formatPrReviewCommentsMarkdown,
  formatPrReviewsMarkdown,
  formatPrStateChangeMarkdown,
  formatPrStatusMarkdown,
  formatPrViewMarkdown,
} from '../formatters/markdown.js';
import type { MergeMethod, ReviewEvent } from '../types.js';

// Schema shape definitions with .describe() for parameter documentation

const getPullRequestShape = {
  owner: z.string().describe('Repository owner (user or org)'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
};

const listPullRequestsShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).default('open').describe('Filter by PR state'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page (max 100)'),
};

const listPrCommentsShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issue_number: z.number().describe('PR number (PRs are issues)'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
};

const listPrReviewCommentsShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
};

const listPrReviewsShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
};

const createPrCommentShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issue_number: z.number().describe('PR number'),
  body: z.string().describe('Comment body (Markdown supported)'),
};

const createPrReviewShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  body: z.string().describe('Review body'),
  event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).describe('Review action'),
};

const listPrFilesShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
};

const getCurrentRepoShape = {
  directory: z
    .string()
    .optional()
    .describe('Directory to check (defaults to current working directory)'),
};

const editPullRequestShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  title: z.string().optional().describe('New title'),
  body: z.string().optional().describe('New body'),
  base: z.string().optional().describe('New base branch'),
  add_labels: z.array(z.string()).optional().describe('Labels to add'),
  remove_labels: z.array(z.string()).optional().describe('Labels to remove'),
  add_assignees: z.array(z.string()).optional().describe('Assignees to add'),
  remove_assignees: z.array(z.string()).optional().describe('Assignees to remove'),
  add_reviewers: z.array(z.string()).optional().describe('Reviewers to request'),
  remove_reviewers: z.array(z.string()).optional().describe('Reviewers to remove'),
  milestone: z.string().optional().describe('Milestone name'),
  remove_milestone: z.boolean().optional().describe('Remove milestone'),
};

const mergePullRequestShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  merge_method: z.enum(['merge', 'squash', 'rebase']).default('merge').describe('Merge method'),
  commit_title: z.string().optional().describe('Custom commit title'),
  commit_message: z.string().optional().describe('Custom commit message'),
  sha: z.string().optional().describe('HEAD SHA must match'),
  delete_branch: z.boolean().optional().describe('Delete branch after merge'),
};

const closePullRequestShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  comment: z.string().optional().describe('Closing comment'),
  delete_branch: z.boolean().optional().describe('Delete branch after closing'),
};

const reopenPullRequestShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  comment: z.string().optional().describe('Comment when reopening'),
};

const markPrReadyShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  draft: z.boolean().default(false).describe('Convert to draft (true) or mark ready (false)'),
};

const listPrChecksShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pull_number: z.number().describe('Pull request number'),
  required: z.boolean().optional().describe('Only show required checks'),
};

const getPrStatusShape = {
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
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
2. Check that the pull request number exists
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
1. Check your token has the required scopes (repo, read:org)
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
 * Register all pull request tools with the MCP server.
 */
export function registerPrTools(server: McpServer): void {
  server.registerTool(
    'get_pull_request',
    {
      description:
        'Get detailed information about a specific pull request including status, author, changes, and description',
      inputSchema: getPullRequestShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const pr = await getPr({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
        });
        return { content: [{ type: 'text', text: formatPrViewMarkdown(pr) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'list_pull_requests',
    {
      description:
        'List pull requests in a repository with optional state filtering (open, closed, all)',
      inputSchema: listPullRequestsShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const prs = await listPrs({
          owner: input.owner,
          repo: input.repo,
          state: input.state,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatPrListMarkdown(prs) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'list_pr_comments',
    {
      description:
        'List general comments on a pull request conversation thread (not inline code comments)',
      inputSchema: listPrCommentsShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const comments = await listPrComments({
          owner: input.owner,
          repo: input.repo,
          issueNumber: input.issue_number,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatPrCommentsMarkdown(comments) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'list_pr_review_comments',
    {
      description: 'List inline code review comments on specific lines in the pull request diff',
      inputSchema: listPrReviewCommentsShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const comments = await listPrReviewComments({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatPrReviewCommentsMarkdown(comments) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'list_pr_reviews',
    {
      description:
        'List all reviews on a pull request including approvals, change requests, and comments',
      inputSchema: listPrReviewsShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const reviews = await listPrReviews({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatPrReviewsMarkdown(reviews) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'create_pr_comment',
    {
      description: 'Add a new comment to a pull request conversation thread (supports Markdown)',
      inputSchema: createPrCommentShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const comment = await createPrComment({
          owner: input.owner,
          repo: input.repo,
          issueNumber: input.issue_number,
          body: input.body,
        });
        return { content: [{ type: 'text', text: formatCreatedCommentMarkdown(comment) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'create_pr_review',
    {
      description: 'Submit a review on a pull request (APPROVE, REQUEST_CHANGES, or COMMENT)',
      inputSchema: createPrReviewShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const review = await createPrReview({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          body: input.body,
          event: input.event as ReviewEvent,
        });
        return {
          content: [{ type: 'text', text: formatCreatedReviewMarkdown(review, input.event) }],
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
    'list_pr_files',
    {
      description: 'List files changed in a pull request with their status and change statistics',
      inputSchema: listPrFilesShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const files = await listPrFiles({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatPrFilesMarkdown(files) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_current_repo',
    {
      description:
        'Detect the GitHub repository from git remote in the current directory. Returns owner and repo name for use with other PR tools.',
      inputSchema: getCurrentRepoShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const result = await detectRepo(input.directory);

        if (!result.success) {
          const errorMessages: Record<string, string> = {
            'not-git-repo': `# Not a Git Repository

The directory is not a git repository.

**Directory:** \`${result.directory}\`

**Action Required:**
1. Navigate to a git repository
2. Or initialize a new one with \`git init\``,
            'no-remotes': `# No Git Remotes

No remotes configured in this repository.

**Directory:** \`${result.directory}\`

**Action Required:**
1. Add a GitHub remote: \`git remote add origin https://github.com/owner/repo.git\``,
            'no-github-remote': `# No GitHub Remote Found

The repository has remotes but none point to GitHub.

**Directory:** \`${result.directory}\`
**Remotes found:** ${result.remoteNames?.join(', ') ?? 'none'}

**Action Required:**
1. Add a GitHub remote: \`git remote add origin https://github.com/owner/repo.git\`
2. Or use an existing remote that points to GitHub`,
          };

          return {
            content: [{ type: 'text', text: errorMessages[result.error] ?? 'Unknown error' }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `# Current Repository

**Owner:** \`${result.info.owner}\`
**Repo:** \`${result.info.repo}\`
**Full Name:** \`${result.info.fullName}\`

**Remote:** ${result.remoteName}
**URL:** \`${result.info.remoteUrl}\`
**Directory:** \`${result.directory}\`

---

You can now use these values with other PR tools:
- \`owner\`: "${result.info.owner}"
- \`repo\`: "${result.info.repo}"`,
            },
          ],
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
    'edit_pull_request',
    {
      description:
        'Edit a pull request: change title, body, labels, assignees, reviewers, milestone, or base branch',
      inputSchema: editPullRequestShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const result = await editPr({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          title: input.title,
          body: input.body,
          base: input.base,
          addLabels: input.add_labels,
          removeLabels: input.remove_labels,
          addAssignees: input.add_assignees,
          removeAssignees: input.remove_assignees,
          addReviewers: input.add_reviewers,
          removeReviewers: input.remove_reviewers,
          milestone: input.milestone,
          removeMilestone: input.remove_milestone,
        });
        return { content: [{ type: 'text', text: formatEditResultMarkdown(result) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'merge_pull_request',
    {
      description:
        'Merge a pull request using merge, squash, or rebase method. Optionally delete branch after merge.',
      inputSchema: mergePullRequestShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        // Get PR info first for the response
        const pr = await getPr({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
        });

        const result = await mergePr({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          mergeMethod: input.merge_method as MergeMethod,
          commitTitle: input.commit_title,
          commitMessage: input.commit_message,
          sha: input.sha,
        });

        // Delete branch if requested
        let deletedBranch: string | undefined;
        if (input.delete_branch) {
          try {
            await deleteBranch({ owner: input.owner, repo: input.repo, branch: pr.head.ref });
            deletedBranch = pr.head.ref;
          } catch {
            // Expected: branch may already be deleted, be protected, or user lacks permission
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: formatMergeResultMarkdown(
                result,
                { number: pr.number, title: pr.title, htmlUrl: pr.htmlUrl },
                deletedBranch
              ),
            },
          ],
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
    'close_pull_request',
    {
      description:
        'Close a pull request without merging. Optionally add a comment and delete the branch.',
      inputSchema: closePullRequestShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        // Add comment if provided
        if (input.comment) {
          await createPrComment({
            owner: input.owner,
            repo: input.repo,
            issueNumber: input.pull_number,
            body: input.comment,
          });
        }

        const pr = await updatePrState({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          state: 'closed',
        });

        // Delete branch if requested
        if (input.delete_branch) {
          try {
            await deleteBranch({ owner: input.owner, repo: input.repo, branch: pr.head.ref });
          } catch {
            // Expected: branch may already be deleted, be protected, or user lacks permission
          }
        }

        return { content: [{ type: 'text', text: formatPrStateChangeMarkdown(pr, 'closed') }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'reopen_pull_request',
    {
      description: 'Reopen a closed pull request. Optionally add a comment.',
      inputSchema: reopenPullRequestShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        // Add comment if provided
        if (input.comment) {
          await createPrComment({
            owner: input.owner,
            repo: input.repo,
            issueNumber: input.pull_number,
            body: input.comment,
          });
        }

        const pr = await updatePrState({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          state: 'open',
        });

        return { content: [{ type: 'text', text: formatPrStateChangeMarkdown(pr, 'reopened') }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'mark_pr_ready',
    {
      description: 'Mark a draft PR as ready for review, or convert a ready PR to draft.',
      inputSchema: markPrReadyShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const pr = await updatePrDraft({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          draft: input.draft,
        });

        const action = input.draft ? 'draft' : 'ready';
        return { content: [{ type: 'text', text: formatPrStateChangeMarkdown(pr, action) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'list_pr_checks',
    {
      description:
        'List CI check runs and commit statuses for a pull request. Shows pass/fail status for each check.',
      inputSchema: listPrChecksShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const checks = await listPrChecks({
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pull_number,
          required: input.required,
        });
        return { content: [{ type: 'text', text: formatPrChecksMarkdown(checks) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_pr_status',
    {
      description:
        'Get PR status summary: PRs you created, PRs requesting your review, and PRs assigned to you.',
      inputSchema: getPrStatusShape,
    },
    async (input): Promise<ToolResult> => {
      try {
        const username = await getCurrentUser();
        const currentBranch = (await getCurrentBranch()) ?? undefined;

        const status = await getPrStatus({
          owner: input.owner,
          repo: input.repo,
          username,
          currentBranch,
        });

        return { content: [{ type: 'text', text: formatPrStatusMarkdown(status) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );
}
