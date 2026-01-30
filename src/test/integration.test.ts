import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrApi } from '../domains/pr/api.js';
import {
  formatCreatedCommentMarkdown,
  formatCreatedReviewMarkdown,
  formatPrCommentsMarkdown,
  formatPrFilesMarkdown,
  formatPrListMarkdown,
  formatPrReviewCommentsMarkdown,
  formatPrReviewsMarkdown,
  formatPrViewMarkdown,
} from '../domains/pr/formatters/markdown.js';
import { createGitHubClient } from '../shared/github.js';

// MSW server is started in src/test/setup.ts (shared across all tests)

// Test the MCP server protocol (tool listing, connection)
describe('gh-vault MCP Protocol Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeEach(async () => {
    // Filter out undefined values from process.env for type safety
    const filteredEnv = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined
      )
    );

    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/cli/index.js', 'mcp'],
      env: {
        ...filteredEnv,
        NODE_ENV: 'test',
      },
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0',
    });

    await client.connect(transport);
  });

  afterEach(async () => {
    await client.close();
  });

  describe('Tool Discovery', () => {
    it('should list all registered tools', async () => {
      const tools = await client.listTools();

      const expectedTools = [
        // PR tools (16)
        'get_pull_request',
        'list_pull_requests',
        'list_pr_comments',
        'list_pr_review_comments',
        'list_pr_reviews',
        'create_pr_comment',
        'create_pr_review',
        'list_pr_files',
        'get_current_repo',
        'edit_pull_request',
        'merge_pull_request',
        'close_pull_request',
        'reopen_pull_request',
        'mark_pr_ready',
        'list_pr_checks',
        'get_pr_status',
        // Run tools (6)
        'list_workflow_runs',
        'get_workflow_run',
        'get_workflow_run_logs',
        'cancel_workflow_run',
        'rerun_workflow_run',
        'delete_workflow_run',
      ];

      // 16 PR + 6 Run + 5 Search = 27 tools
      expect(tools.tools).toHaveLength(27);

      for (const toolName of expectedTools) {
        const tool = tools.tools.find((t) => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool?.description).toBeTruthy();
      }
    });

    it('should have proper input schemas for get_pull_request', async () => {
      const tools = await client.listTools();
      const tool = tools.tools.find((t) => t.name === 'get_pull_request');

      expect(tool).toBeDefined();
      expect(tool?.inputSchema).toBeDefined();
      // Verify it has the required properties
      const schema = tool?.inputSchema as Record<string, unknown>;
      const properties = schema['properties'] as Record<string, unknown>;
      expect(properties['owner']).toBeDefined();
      expect(properties['repo']).toBeDefined();
      expect(properties['pull_number']).toBeDefined();
    });

    it('should have proper input schemas for create_pr_review', async () => {
      const tools = await client.listTools();
      const tool = tools.tools.find((t) => t.name === 'create_pr_review');

      expect(tool).toBeDefined();
      expect(tool?.inputSchema).toBeDefined();
      const schema = tool?.inputSchema as Record<string, unknown>;
      const properties = schema['properties'] as Record<string, unknown>;
      expect(properties['owner']).toBeDefined();
      expect(properties['repo']).toBeDefined();
      expect(properties['pull_number']).toBeDefined();
      expect(properties['body']).toBeDefined();
      expect(properties['event']).toBeDefined();
    });
  });
});

// Test the core API functions with MSW mocks
// MSW server is started in src/test/setup.ts (shared across all tests)
describe('gh-vault GitHub API Integration Tests', () => {
  let prApi: PrApi;

  beforeAll(async () => {
    // Create GitHub client and API instance for tests
    const client = await createGitHubClient();
    prApi = new PrApi(client);
  });

  describe('getPr', () => {
    it('should return PR details in markdown format', async () => {
      const pr = await prApi.getPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
      });
      const result = formatPrViewMarkdown(pr);

      expect(result).toContain('PR #1347');
      expect(result).toContain('Amazing new feature');
      expect(result).toContain('@octocat');
      expect(result).toContain('new-topic');
      expect(result).toContain('main');
      expect(result).toContain('+100');
      expect(result).toContain('-3');
      expect(result).toContain('5 files');
      expect(result).toContain('View on GitHub');
    });

    it('should throw error for non-existent PR', async () => {
      await expect(
        prApi.getPr({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 404,
        })
      ).rejects.toThrow();
    });

    it('should show merge status correctly', async () => {
      const pr = await prApi.getPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 123,
      });
      const result = formatPrViewMarkdown(pr);

      expect(result).toContain('Mergeable');
      expect(result).toContain('clean');
    });

    it('should show labels when present', async () => {
      const pr = await prApi.getPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
      });
      const result = formatPrViewMarkdown(pr);

      expect(result).toContain('Labels');
      expect(result).toContain('bug');
    });
  });

  describe('listPrs', () => {
    it('should return list of open PRs by default', async () => {
      const prs = await prApi.listPrs({
        owner: 'octocat',
        repo: 'Hello-World',
        state: 'open',
        perPage: 30,
      });
      const result = formatPrListMarkdown(prs);

      expect(result).toContain('Pull Requests');
      expect(result).toContain('#1');
      expect(result).toContain('#2');
      expect(result).toContain('#3');
      expect(result).toContain('@octocat');
    });

    it('should filter by state when specified', async () => {
      const prs = await prApi.listPrs({
        owner: 'octocat',
        repo: 'Hello-World',
        state: 'all',
        perPage: 30,
      });
      const result = formatPrListMarkdown(prs);

      expect(result).toContain('Pull Requests');
    });

    it('should respect perPage parameter', async () => {
      const prs = await prApi.listPrs({
        owner: 'octocat',
        repo: 'Hello-World',
        state: 'open',
        perPage: 1,
      });
      const result = formatPrListMarkdown(prs);

      expect(result).toContain('Pull Requests');
    });

    it('should include view links for each PR', async () => {
      const prs = await prApi.listPrs({
        owner: 'octocat',
        repo: 'Hello-World',
        state: 'open',
        perPage: 30,
      });
      const result = formatPrListMarkdown(prs);

      expect(result).toContain('[View]');
    });
  });

  describe('listPrFiles', () => {
    it('should return files changed with status', async () => {
      const files = await prApi.listPrFiles({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        perPage: 30,
      });
      const result = formatPrFilesMarkdown(files);

      expect(result).toContain('Files Changed');
      expect(result).toContain('src/main.ts');
      expect(result).toContain('src/utils.ts');
      expect(result).toContain('README.md');
      expect(result).toContain('modified');
      expect(result).toContain('added');
    });

    it('should show additions and deletions', async () => {
      const files = await prApi.listPrFiles({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        perPage: 30,
      });
      const result = formatPrFilesMarkdown(files);

      expect(result).toContain('+50');
      expect(result).toContain('-10');
    });

    it('should throw error for non-existent PR', async () => {
      await expect(
        prApi.listPrFiles({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 404,
          perPage: 30,
        })
      ).rejects.toThrow();
    });
  });

  describe('listPrComments', () => {
    it('should return issue comments on PR', async () => {
      const comments = await prApi.listPrComments({
        owner: 'octocat',
        repo: 'Hello-World',
        issueNumber: 1347,
        perPage: 30,
      });
      const result = formatPrCommentsMarkdown(comments);

      expect(result).toContain('Comments');
      expect(result).toContain('@octocat');
      expect(result).toContain('This is a great PR');
    });

    it('should throw error for non-existent PR', async () => {
      await expect(
        prApi.listPrComments({
          owner: 'octocat',
          repo: 'Hello-World',
          issueNumber: 404,
          perPage: 30,
        })
      ).rejects.toThrow();
    });
  });

  describe('listPrReviewComments', () => {
    it('should return inline review comments', async () => {
      const comments = await prApi.listPrReviewComments({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        perPage: 30,
      });
      const result = formatPrReviewCommentsMarkdown(comments);

      expect(result).toContain('Review Comments');
      expect(result).toContain('@octocat');
      expect(result).toContain('src/main.ts');
      expect(result).toContain('Great work');
    });

    it('should show diff hunks', async () => {
      const comments = await prApi.listPrReviewComments({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        perPage: 30,
      });
      const result = formatPrReviewCommentsMarkdown(comments);

      expect(result).toContain('```diff');
    });

    it('should throw error for non-existent PR', async () => {
      await expect(
        prApi.listPrReviewComments({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 404,
          perPage: 30,
        })
      ).rejects.toThrow();
    });
  });

  describe('listPrReviews', () => {
    it('should return reviews with different states', async () => {
      const reviews = await prApi.listPrReviews({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        perPage: 30,
      });
      const result = formatPrReviewsMarkdown(reviews);

      expect(result).toContain('Reviews');
      expect(result).toContain('@octocat');
      expect(result).toContain('Approved');
      expect(result).toContain('Changes Requested');
      expect(result).toContain('Commented');
    });

    it('should show review bodies', async () => {
      const reviews = await prApi.listPrReviews({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        perPage: 30,
      });
      const result = formatPrReviewsMarkdown(reviews);

      expect(result).toContain('Looks good to me');
    });

    it('should throw error for non-existent PR', async () => {
      await expect(
        prApi.listPrReviews({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 404,
          perPage: 30,
        })
      ).rejects.toThrow();
    });
  });

  describe('createPrComment', () => {
    it('should create a comment and return confirmation', async () => {
      const comment = await prApi.createPrComment({
        owner: 'octocat',
        repo: 'Hello-World',
        issueNumber: 1347,
        body: 'This is a test comment from the integration test!',
      });
      const result = formatCreatedCommentMarkdown(comment);

      expect(result).toContain('Comment Created');
      expect(result).toContain('This is a test comment from the integration test!');
      expect(result).toContain('@octocat');
      expect(result).toContain('View on GitHub');
    });

    it('should throw error for non-existent PR', async () => {
      await expect(
        prApi.createPrComment({
          owner: 'octocat',
          repo: 'Hello-World',
          issueNumber: 404,
          body: 'This should fail',
        })
      ).rejects.toThrow();
    });
  });

  describe('createPrReview', () => {
    it('should create an APPROVE review', async () => {
      const review = await prApi.createPrReview({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        body: 'LGTM! Great work on this PR.',
        event: 'APPROVE',
      });
      const result = formatCreatedReviewMarkdown(review, 'APPROVE');

      expect(result).toContain('Review Submitted');
      expect(result).toContain('APPROVE');
      expect(result).toContain('LGTM! Great work on this PR.');
      expect(result).toContain('@octocat');
    });

    it('should create a REQUEST_CHANGES review', async () => {
      const review = await prApi.createPrReview({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        body: 'Please fix the issues mentioned in the comments.',
        event: 'REQUEST_CHANGES',
      });
      const result = formatCreatedReviewMarkdown(review, 'REQUEST_CHANGES');

      expect(result).toContain('Review Submitted');
      expect(result).toContain('REQUEST_CHANGES');
      expect(result).toContain('Please fix the issues mentioned');
    });

    it('should create a COMMENT review', async () => {
      const review = await prApi.createPrReview({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1347,
        body: 'Just some thoughts on the implementation.',
        event: 'COMMENT',
      });
      const result = formatCreatedReviewMarkdown(review, 'COMMENT');

      expect(result).toContain('Review Submitted');
      expect(result).toContain('COMMENT');
    });

    it('should throw error for non-existent PR', async () => {
      await expect(
        prApi.createPrReview({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 404,
          body: 'This should fail',
          event: 'APPROVE',
        })
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle PRs with labels', async () => {
      const pr = await prApi.getPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
      });
      const result = formatPrViewMarkdown(pr);

      expect(result).toContain('Labels');
    });

    it('should handle various PR numbers', async () => {
      for (const prNumber of [1, 2, 3]) {
        const pr = await prApi.getPr({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: prNumber,
        });
        const result = formatPrViewMarkdown(pr);

        expect(result).toContain(`PR #${String(prNumber)}`);
      }
    });
  });
});
