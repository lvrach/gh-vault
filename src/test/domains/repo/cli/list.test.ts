/**
 * Repo list command tests.
 *
 * Tests the `gh-vault repo list` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepoApi } from '../../../../domains/repo/api.js';
import { createListCommand } from '../../../../domains/repo/cli/list.js';
import type { RepositoryListItem } from '../../../../domains/repo/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

interface MockOutput {
  print: ReturnType<typeof vi.fn>;
  printError: ReturnType<typeof vi.fn>;
}

function createMockOutput(): MockOutput {
  return {
    print: vi.fn(),
    printError: vi.fn(),
  };
}

function createMockRepoApi(): {
  listRepos: ReturnType<typeof vi.fn>;
} {
  return {
    listRepos: vi.fn(),
  };
}

function createMockRepoListItem(overrides: Partial<RepositoryListItem> = {}): RepositoryListItem {
  return {
    id: 1,
    name: 'Hello-World',
    fullName: 'octocat/Hello-World',
    private: false,
    owner: { login: 'octocat', type: 'User', htmlUrl: 'https://github.com/octocat' },
    htmlUrl: 'https://github.com/octocat/Hello-World',
    description: 'A test repository',
    fork: false,
    visibility: 'public',
    language: 'TypeScript',
    stargazersCount: 100,
    forksCount: 10,
    updatedAt: '2024-01-15T10:00:00Z',
    pushedAt: '2024-01-15T10:00:00Z',
    archived: false,
    isTemplate: false,
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('repo list command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockRepoApi: ReturnType<typeof createMockRepoApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockRepoApi = createMockRepoApi();
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('lists repos for authenticated user by default', async () => {
      const repos = [
        createMockRepoListItem({ name: 'repo1' }),
        createMockRepoListItem({ name: 'repo2' }),
      ];
      mockRepoApi.listRepos.mockResolvedValue(repos);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockRepoApi.listRepos).toHaveBeenCalledWith(
        expect.objectContaining({
          perPage: 30,
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('lists repos for specified owner', async () => {
      mockRepoApi.listRepos.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat']);

      expect(mockRepoApi.listRepos).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'octocat',
        })
      );
    });

    it('applies --limit flag', async () => {
      mockRepoApi.listRepos.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--limit', '50']);

      expect(mockRepoApi.listRepos).toHaveBeenCalledWith(
        expect.objectContaining({
          perPage: 50,
        })
      );
    });

    it('applies visibility filter', async () => {
      mockRepoApi.listRepos.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--visibility', 'private']);

      expect(mockRepoApi.listRepos).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'private',
        })
      );
    });

    // Language filter is client-side, not passed to API
    it('filters by language client-side', async () => {
      const repos = [
        createMockRepoListItem({ name: 'ts-repo', fullName: 'octocat/ts-repo', language: 'TypeScript' }),
        createMockRepoListItem({ name: 'js-repo', fullName: 'octocat/js-repo', language: 'JavaScript' }),
      ];
      mockRepoApi.listRepos.mockResolvedValue(repos);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--language', 'TypeScript']);

      // API called, then client-side filtered
      expect(mockRepoApi.listRepos).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('ts-repo');
      expect(output).not.toContain('js-repo');
    });

    // Archived filter is client-side
    it('filters archived repos client-side with --archived flag', async () => {
      const repos = [
        createMockRepoListItem({ name: 'active-repo', fullName: 'octocat/active-repo', archived: false }),
        createMockRepoListItem({ name: 'old-repo', fullName: 'octocat/old-repo', archived: true }),
      ];
      mockRepoApi.listRepos.mockResolvedValue(repos);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--archived']);

      expect(mockRepoApi.listRepos).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('old-repo');
      expect(output).not.toContain('active-repo');
    });

    // Source filter is client-side
    it('filters by source (non-fork) repos client-side', async () => {
      const repos = [
        createMockRepoListItem({ name: 'original-repo', fullName: 'octocat/original-repo', fork: false }),
        createMockRepoListItem({ name: 'forked-repo', fullName: 'octocat/forked-repo', fork: true }),
      ];
      mockRepoApi.listRepos.mockResolvedValue(repos);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--source']);

      expect(mockRepoApi.listRepos).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('original-repo');
      expect(output).not.toContain('forked-repo');
    });

    // Fork filter is client-side
    it('filters by fork repos client-side', async () => {
      const repos = [
        createMockRepoListItem({ name: 'original-repo', fullName: 'octocat/original-repo', fork: false }),
        createMockRepoListItem({ name: 'forked-repo', fullName: 'octocat/forked-repo', fork: true }),
      ];
      mockRepoApi.listRepos.mockResolvedValue(repos);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--fork']);

      expect(mockRepoApi.listRepos).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('forked-repo');
      expect(output).not.toContain('original-repo');
    });

    it('outputs JSON when --json flag is provided', async () => {
      const repos = [createMockRepoListItem()];
      mockRepoApi.listRepos.mockResolvedValue(repos);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--json']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const repos = [createMockRepoListItem({ name: 'test-repo' })];
      mockRepoApi.listRepos.mockResolvedValue(repos);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--json', 'name,visibility']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({ name: 'test-repo', visibility: 'public' });
    });

    it('handles empty repo list', async () => {
      mockRepoApi.listRepos.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.print).toHaveBeenCalledWith('No repositories found');
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles API error', async () => {
      mockRepoApi.listRepos.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--jq', '.[0]']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: --jq requires --json to be specified');
      expect(process.exitCode).toBe(1);
    });
  });
});
