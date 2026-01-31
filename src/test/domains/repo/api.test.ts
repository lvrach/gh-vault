/**
 * Integration tests for Repo domain API.
 * Tests use MSW mocks - no real GitHub API calls.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { RepoApi } from '../../../domains/repo/api.js';
import { createGitHubClient } from '../../../shared/github.js';

// MSW server is started in src/test/setup.ts (shared across all tests)

describe('RepoApi', () => {
  let repoApi: RepoApi;

  beforeAll(async () => {
    const client = await createGitHubClient();
    repoApi = new RepoApi(client);
  });

  describe('getRepo', () => {
    it('returns repository details', async () => {
      const repo = await repoApi.getRepo({
        owner: 'octocat',
        repo: 'Hello-World',
      });

      expect(repo.name).toBe('Hello-World');
      expect(repo.fullName).toBe('octocat/Hello-World');
      expect(repo.owner.login).toBe('octocat');
      expect(repo.defaultBranch).toBe('main');
    });

    it('throws error for non-existent repo (magic number 404)', async () => {
      await expect(
        repoApi.getRepo({
          owner: 'octocat',
          repo: '404',
        })
      ).rejects.toThrow();
    });
  });

  describe('listRepos', () => {
    it('returns repositories for authenticated user', async () => {
      const repos = await repoApi.listRepos({});

      expect(repos.length).toBeGreaterThan(0);
      expect(repos[0]?.fullName).toBeDefined();
    });

    it('returns repositories for specified owner', async () => {
      const repos = await repoApi.listRepos({
        owner: 'octocat',
      });

      expect(repos.length).toBeGreaterThan(0);
    });

    it('respects perPage parameter', async () => {
      const repos = await repoApi.listRepos({
        perPage: 1,
      });

      expect(repos).toHaveLength(1);
    });
  });

  describe('createRepo', () => {
    it('creates a new repository', async () => {
      const repo = await repoApi.createRepo({
        name: 'new-repo',
        description: 'A new repository',
        private: false,
      });

      expect(repo.name).toBe('new-repo');
      expect(repo.description).toBe('A new repository');
      expect(repo.private).toBe(false);
    });

    it('creates a private repository', async () => {
      const repo = await repoApi.createRepo({
        name: 'private-repo',
        private: true,
      });

      expect(repo.private).toBe(true);
    });

    it('creates repository in an organization', async () => {
      const repo = await repoApi.createRepo({
        name: 'org-repo',
        org: 'my-org',
      });

      expect(repo.name).toBe('org-repo');
    });
  });

  describe('forkRepo', () => {
    it('forks a repository', async () => {
      const repo = await repoApi.forkRepo({
        owner: 'octocat',
        repo: 'Hello-World',
      });

      expect(repo.fork).toBe(true);
      expect(repo.parent?.fullName).toBe('octocat/Hello-World');
    });

    it('forks with custom name', async () => {
      const repo = await repoApi.forkRepo({
        owner: 'octocat',
        repo: 'Hello-World',
        name: 'my-fork',
      });

      expect(repo.name).toBe('my-fork');
      expect(repo.fork).toBe(true);
    });

    it('forks to an organization', async () => {
      const repo = await repoApi.forkRepo({
        owner: 'octocat',
        repo: 'Hello-World',
        organization: 'my-org',
      });

      expect(repo.fork).toBe(true);
    });
  });

  describe('editRepo', () => {
    it('updates repository description', async () => {
      const repo = await repoApi.editRepo({
        owner: 'octocat',
        repo: 'Hello-World',
        description: 'Updated description',
      });

      expect(repo.description).toBe('Updated description');
    });

    it('updates repository visibility', async () => {
      const repo = await repoApi.editRepo({
        owner: 'octocat',
        repo: 'Hello-World',
        visibility: 'private',
      });

      expect(repo.private).toBe(true);
    });

    it('updates default branch', async () => {
      const repo = await repoApi.editRepo({
        owner: 'octocat',
        repo: 'Hello-World',
        defaultBranch: 'develop',
      });

      expect(repo.defaultBranch).toBe('develop');
    });
  });

  describe('deleteRepo', () => {
    it('deletes a repository without error', async () => {
      await expect(
        repoApi.deleteRepo({
          owner: 'octocat',
          repo: 'Hello-World',
        })
      ).resolves.toBeUndefined();
    });

    it('throws error for non-existent repo (magic number 404)', async () => {
      await expect(
        repoApi.deleteRepo({
          owner: 'octocat',
          repo: '404',
        })
      ).rejects.toThrow();
    });
  });

  describe('setArchived', () => {
    it('archives a repository', async () => {
      const repo = await repoApi.setArchived({
        owner: 'octocat',
        repo: 'Hello-World',
        archived: true,
      });

      expect(repo.archived).toBe(true);
    });

    it('unarchives a repository', async () => {
      const repo = await repoApi.setArchived({
        owner: 'octocat',
        repo: 'Hello-World',
        archived: false,
      });

      expect(repo.archived).toBe(false);
    });
  });

  describe('getReadme', () => {
    it('returns README content', async () => {
      const readme = await repoApi.getReadme({
        owner: 'octocat',
        repo: 'Hello-World',
      });

      expect(typeof readme).toBe('string');
      // Mock README contains "# Hello-World" as the repo name
      expect(readme).toContain('Hello-World');
    });

    // Note: All repos in mock return a README, so we can't test no-readme case
    // without adding a magic repo name to the handler
  });

  describe('getCurrentUser', () => {
    it('returns authenticated user login', async () => {
      const login = await repoApi.getCurrentUser();

      expect(typeof login).toBe('string');
      expect(login.length).toBeGreaterThan(0);
    });
  });
});
