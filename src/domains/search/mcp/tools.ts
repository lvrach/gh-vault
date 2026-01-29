/**
 * MCP tool registrations for the search domain.
 * All search related tools are defined here.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { searchCode, searchCommits, searchIssues, searchPrs, searchRepos } from '../api.js';
import {
  formatCodeMarkdown,
  formatCommitsMarkdown,
  formatIssuesMarkdown,
  formatPrsMarkdown,
  formatReposMarkdown,
} from '../formatters/markdown.js';

// Schema shape definitions with .describe() for parameter documentation

const searchRepositoriesShape = {
  query: z.string().describe('Search keywords or query'),
  language: z.string().optional().describe('Filter by programming language'),
  owner: z.array(z.string()).optional().describe('Filter by repository owner(s)'),
  stars: z.string().optional().describe('Filter by star count (e.g., ">100", "10..50")'),
  forks: z.string().optional().describe('Filter by fork count'),
  topic: z.array(z.string()).optional().describe('Filter by topic(s)'),
  archived: z.boolean().optional().describe('Filter by archived state'),
  visibility: z
    .array(z.enum(['public', 'private', 'internal']))
    .optional()
    .describe('Filter by visibility'),
  sort: z
    .enum(['stars', 'forks', 'updated', 'help-wanted-issues'])
    .optional()
    .describe('Sort results'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page (max 100)'),
};

const searchIssuesShape = {
  query: z.string().describe('Search keywords or query'),
  state: z.enum(['open', 'closed']).optional().describe('Filter by state'),
  author: z.string().optional().describe('Filter by author'),
  assignee: z.string().optional().describe('Filter by assignee'),
  label: z.array(z.string()).optional().describe('Filter by label(s)'),
  repo: z.array(z.string()).optional().describe('Filter by repository (owner/repo)'),
  owner: z.array(z.string()).optional().describe('Filter by repository owner'),
  language: z.string().optional().describe('Filter by repository language'),
  created: z.string().optional().describe('Filter by created date (e.g., ">2023-01-01")'),
  updated: z.string().optional().describe('Filter by updated date'),
  comments: z.string().optional().describe('Filter by comment count'),
  sort: z.enum(['comments', 'created', 'updated', 'reactions']).optional().describe('Sort results'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page (max 100)'),
};

const searchPullRequestsShape = {
  query: z.string().describe('Search keywords or query'),
  state: z.enum(['open', 'closed']).optional().describe('Filter by state'),
  author: z.string().optional().describe('Filter by author'),
  assignee: z.string().optional().describe('Filter by assignee'),
  label: z.array(z.string()).optional().describe('Filter by label(s)'),
  repo: z.array(z.string()).optional().describe('Filter by repository (owner/repo)'),
  owner: z.array(z.string()).optional().describe('Filter by repository owner'),
  draft: z.boolean().optional().describe('Filter by draft state'),
  merged: z.boolean().optional().describe('Filter by merged state'),
  review: z
    .enum(['none', 'required', 'approved', 'changes_requested'])
    .optional()
    .describe('Filter by review status'),
  review_requested: z.string().optional().describe('Filter by review requested from user'),
  base: z.string().optional().describe('Filter by base branch'),
  head: z.string().optional().describe('Filter by head branch'),
  sort: z.enum(['comments', 'created', 'updated', 'reactions']).optional().describe('Sort results'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page (max 100)'),
};

const searchCommitsShape = {
  query: z.string().describe('Search keywords or query'),
  author: z.string().optional().describe('Filter by author username'),
  author_name: z.string().optional().describe('Filter by author name'),
  author_email: z.string().optional().describe('Filter by author email'),
  committer: z.string().optional().describe('Filter by committer username'),
  repo: z.array(z.string()).optional().describe('Filter by repository (owner/repo)'),
  owner: z.array(z.string()).optional().describe('Filter by repository owner'),
  author_date: z.string().optional().describe('Filter by authored date'),
  committer_date: z.string().optional().describe('Filter by committed date'),
  merge: z.boolean().optional().describe('Filter for merge commits'),
  hash: z.string().optional().describe('Filter by commit hash'),
  sort: z.enum(['author-date', 'committer-date']).optional().describe('Sort results'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page (max 100)'),
};

const searchCodeShape = {
  query: z.string().describe('Search keywords or query (required)'),
  repo: z.array(z.string()).optional().describe('Filter by repository (owner/repo)'),
  owner: z.array(z.string()).optional().describe('Filter by repository owner'),
  language: z.string().optional().describe('Filter by programming language'),
  filename: z.string().optional().describe('Filter by filename'),
  extension: z.string().optional().describe('Filter by file extension'),
  size: z.string().optional().describe('Filter by file size in bytes'),
  per_page: z.number().min(1).max(100).default(30).describe('Results per page (max 100)'),
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
1. Verify your search query syntax
2. Check that repository names are correct
3. Ensure your token has access to private repositories if searching them`;
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
1. Check your token has the required scopes (repo for private repos)
2. Verify you have access to the repositories being searched
3. For code search, you may need additional permissions`;
    }

    if (message.includes('rate limit')) {
      return `Error: GitHub API rate limit exceeded

Action Required:
1. Search API has stricter limits (30 requests/min)
2. Wait a few minutes before retrying
3. Consider using more specific queries to reduce requests`;
    }

    if (message.includes('validation failed')) {
      return `Error: Invalid search query

Action Required:
1. Check your search syntax
2. Ensure qualifiers are properly formatted
3. Code search requires a search term`;
    }

    return `Error: ${error.message}

Action Required:
1. Check your search query syntax
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
 * Register all search tools with the MCP server.
 */
export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    'search_repositories',
    {
      description:
        'Search for repositories on GitHub by keywords, language, owner, stars, topics, and more',
      inputSchema: searchRepositoriesShape,
    },
    async (input) => {
      try {
        const result = await searchRepos({
          query: input.query,
          language: input.language,
          owner: input.owner,
          stars: input.stars,
          forks: input.forks,
          topic: input.topic,
          archived: input.archived,
          visibility: input.visibility,
          sort: input.sort,
          order: input.order,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatReposMarkdown(result) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'search_issues',
    {
      description:
        'Search for issues on GitHub by keywords, state, author, labels, repository, and more',
      inputSchema: searchIssuesShape,
    },
    async (input) => {
      try {
        const result = await searchIssues({
          query: input.query,
          state: input.state,
          author: input.author,
          assignee: input.assignee,
          label: input.label,
          repo: input.repo,
          owner: input.owner,
          language: input.language,
          created: input.created,
          updated: input.updated,
          comments: input.comments,
          sort: input.sort,
          order: input.order,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatIssuesMarkdown(result) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'search_pull_requests',
    {
      description:
        'Search for pull requests on GitHub by keywords, state, author, labels, draft/merged status, and more',
      inputSchema: searchPullRequestsShape,
    },
    async (input) => {
      try {
        const result = await searchPrs({
          query: input.query,
          state: input.state,
          author: input.author,
          assignee: input.assignee,
          label: input.label,
          repo: input.repo,
          owner: input.owner,
          draft: input.draft,
          merged: input.merged,
          review: input.review,
          reviewRequested: input.review_requested,
          base: input.base,
          head: input.head,
          sort: input.sort,
          order: input.order,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatPrsMarkdown(result) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'search_commits',
    {
      description:
        'Search for commits on GitHub by keywords, author, committer, repository, and date',
      inputSchema: searchCommitsShape,
    },
    async (input) => {
      try {
        const result = await searchCommits({
          query: input.query,
          author: input.author,
          authorName: input.author_name,
          authorEmail: input.author_email,
          committer: input.committer,
          repo: input.repo,
          owner: input.owner,
          authorDate: input.author_date,
          committerDate: input.committer_date,
          merge: input.merge,
          hash: input.hash,
          sort: input.sort,
          order: input.order,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatCommitsMarkdown(result) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'search_code',
    {
      description:
        'Search for code in GitHub repositories by keywords, language, filename, extension, and repository',
      inputSchema: searchCodeShape,
    },
    async (input) => {
      try {
        const result = await searchCode({
          query: input.query,
          repo: input.repo,
          owner: input.owner,
          language: input.language,
          filename: input.filename,
          extension: input.extension,
          size: input.size,
          perPage: input.per_page,
        });
        return { content: [{ type: 'text', text: formatCodeMarkdown(result) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatError(error) }],
          isError: true,
        };
      }
    }
  );
}
