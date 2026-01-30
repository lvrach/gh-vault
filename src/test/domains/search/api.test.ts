/**
 * Integration tests for Search domain API.
 * Tests use MSW mocks - no real GitHub API calls.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { SearchApi } from '../../../domains/search/api.js';
import { createGitHubClient } from '../../../shared/github.js';

// MSW server is started in src/test/setup.ts (shared across all tests)

describe('SearchApi', () => {
  let searchApi: SearchApi;

  beforeAll(async () => {
    const client = await createGitHubClient();
    searchApi = new SearchApi(client);
  });

  describe('searchRepos', () => {
    it('returns repository search results', async () => {
      const result = await searchApi.searchRepos({
        query: 'typescript',
      });

      expect(result.totalCount).toBe(3);
      expect(result.incompleteResults).toBe(false);
      expect(result.items).toHaveLength(3);

      expect(result.items[0]).toMatchObject({
        name: 'typescript-project',
        fullName: 'octocat/typescript-project',
        language: 'TypeScript',
      });
    });

    it('respects perPage parameter', async () => {
      const result = await searchApi.searchRepos({
        query: 'typescript',
        perPage: 1,
      });

      expect(result.items).toHaveLength(1);
    });

    it('includes owner information', async () => {
      const result = await searchApi.searchRepos({
        query: 'test',
      });

      expect(result.items[0]?.owner.login).toBe('octocat');
      expect(result.items[0]?.owner.htmlUrl).toBe('https://github.com/octocat');
    });
  });

  describe('searchIssues', () => {
    it('returns issue search results', async () => {
      const result = await searchApi.searchIssues({
        query: 'bug',
      });

      expect(result.totalCount).toBe(3);
      expect(result.items).toHaveLength(3);

      // Issues don't have pull_request field (or it's undefined)
      expect(result.items[0]?.isPullRequest).toBe(false);
    });

    it('includes labels with name and color', async () => {
      const result = await searchApi.searchIssues({
        query: 'bug',
      });

      expect(result.items[0]?.labels).toHaveLength(2);
      expect(result.items[0]?.labels[0]).toMatchObject({
        name: 'bug',
        color: 'd73a4a',
      });
    });

    it('includes repository information', async () => {
      const result = await searchApi.searchIssues({
        query: 'help wanted',
      });

      expect(result.items[0]?.repository.fullName).toBe('octocat/Hello-World');
    });
  });

  describe('searchPrs', () => {
    it('returns pull request search results', async () => {
      const result = await searchApi.searchPrs({
        query: 'fix',
      });

      expect(result.totalCount).toBe(3);
      expect(result.items).toHaveLength(3);

      // All results should be PRs
      expect(result.items[0]?.isPullRequest).toBe(true);
    });

    it('includes draft status for PRs', async () => {
      const result = await searchApi.searchPrs({
        query: 'test',
      });

      expect(result.items[0]).toHaveProperty('isDraft');
    });

    it('respects state filter', async () => {
      const result = await searchApi.searchPrs({
        query: 'update',
        state: 'closed',
      });

      expect(result.items).toBeDefined();
    });
  });

  describe('searchCommits', () => {
    it('returns commit search results', async () => {
      const result = await searchApi.searchCommits({
        query: 'fix',
      });

      expect(result.totalCount).toBe(3);
      expect(result.items).toHaveLength(3);

      expect(result.items[0]).toMatchObject({
        sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      });
    });

    it('includes author and committer information', async () => {
      const result = await searchApi.searchCommits({
        query: 'authentication',
      });

      expect(result.items[0]?.author.name).toBe('The Octocat');
      expect(result.items[0]?.author.email).toBe('octocat@github.com');
      expect(result.items[0]?.committer).toBeDefined();
    });

    it('includes commit message', async () => {
      const result = await searchApi.searchCommits({
        query: 'bug',
      });

      expect(result.items[0]?.message).toContain('Fix critical bug');
    });

    it('includes parent commits', async () => {
      const result = await searchApi.searchCommits({
        query: 'test',
      });

      expect(result.items[0]?.parents).toHaveLength(1);
      expect(result.items[0]?.parents[0]?.sha).toBeDefined();
    });
  });

  describe('searchCode', () => {
    it('returns code search results', async () => {
      const result = await searchApi.searchCode({
        query: 'authenticate',
      });

      expect(result.totalCount).toBe(3);
      expect(result.items).toHaveLength(3);

      expect(result.items[0]).toMatchObject({
        name: 'auth.ts',
        path: 'src/auth.ts',
      });
    });

    it('includes repository context', async () => {
      const result = await searchApi.searchCode({
        query: 'function',
      });

      expect(result.items[0]?.repository.fullName).toBe('octocat/Hello-World');
      expect(result.items[0]?.repository.htmlUrl).toBe('https://github.com/octocat/Hello-World');
    });

    it('includes text matches when available', async () => {
      const result = await searchApi.searchCode({
        query: 'authenticate',
      });

      // Text matches are optional - mock includes them
      expect(result.items[0]?.textMatches).toBeDefined();
      expect(result.items[0]?.textMatches?.[0]?.fragment).toContain('authenticate');
    });

    it('includes file SHA', async () => {
      const result = await searchApi.searchCode({
        query: 'config',
      });

      expect(result.items[0]?.sha).toBeDefined();
    });
  });
});
