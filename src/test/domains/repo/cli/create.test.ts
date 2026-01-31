/**
 * Repo create command tests.
 *
 * Tests the `gh-vault repo create` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepoApi } from '../../../../domains/repo/api.js';
import { createCreateCommand } from '../../../../domains/repo/cli/create.js';
import type { Repository } from '../../../../domains/repo/types.js';
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
  createRepo: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
} {
  return {
    createRepo: vi.fn(),
    getCurrentUser: vi.fn(),
  };
}

function createMockRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    nodeId: 'MDEwOlJlcG9zaXRvcnkx',
    name: 'new-repo',
    fullName: 'octocat/new-repo',
    private: false,
    owner: { login: 'octocat', type: 'User', htmlUrl: 'https://github.com/octocat' },
    htmlUrl: 'https://github.com/octocat/new-repo',
    description: null,
    fork: false,
    cloneUrl: 'https://github.com/octocat/new-repo.git',
    sshUrl: 'git@github.com:octocat/new-repo.git',
    defaultBranch: 'main',
    visibility: 'public',
    language: null,
    stargazersCount: 0,
    forksCount: 0,
    openIssuesCount: 0,
    watchersCount: 0,
    archived: false,
    disabled: false,
    topics: [],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    pushedAt: null,
    license: null,
    hasIssues: true,
    hasProjects: true,
    hasWiki: true,
    hasDiscussions: false,
    allowForking: true,
    isTemplate: false,
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('repo create command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockRepoApi: ReturnType<typeof createMockRepoApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockRepoApi = createMockRepoApi();
    mockRepoApi.getCurrentUser.mockResolvedValue({ login: 'octocat' });
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('requires visibility flag', async () => {
      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-repo']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: visibility must be specified (--public, --private, or --internal)'
      );
      expect(process.exitCode).toBe(1);
      expect(mockRepoApi.createRepo).not.toHaveBeenCalled();
    });

    it('creates a private repository with --private flag', async () => {
      const repo = createMockRepository({ private: true });
      mockRepoApi.createRepo.mockResolvedValue(repo);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-repo', '--private']);

      expect(mockRepoApi.createRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          private: true,
        })
      );
    });

    it('creates a public repository with --public flag', async () => {
      const repo = createMockRepository({ private: false });
      mockRepoApi.createRepo.mockResolvedValue(repo);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-repo', '--public']);

      expect(mockRepoApi.createRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'public',
        })
      );
    });

    it('creates repository with description', async () => {
      const repo = createMockRepository({ description: 'My awesome repo' });
      mockRepoApi.createRepo.mockResolvedValue(repo);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-repo', '--public', '--description', 'My awesome repo']);

      expect(mockRepoApi.createRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'My awesome repo',
        })
      );
    });

    it('creates repository in organization', async () => {
      const repo = createMockRepository({ fullName: 'my-org/my-repo' });
      mockRepoApi.createRepo.mockResolvedValue(repo);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-org/my-repo', '--public']);

      expect(mockRepoApi.createRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-repo',
          org: 'my-org',
        })
      );
    });

    it('creates repository with gitignore template', async () => {
      const repo = createMockRepository();
      mockRepoApi.createRepo.mockResolvedValue(repo);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-repo', '--public', '--gitignore', 'Node']);

      expect(mockRepoApi.createRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          gitignoreTemplate: 'Node',
        })
      );
    });

    it('creates repository with license', async () => {
      const repo = createMockRepository();
      mockRepoApi.createRepo.mockResolvedValue(repo);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-repo', '--public', '--license', 'MIT']);

      expect(mockRepoApi.createRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          licenseTemplate: 'MIT',
        })
      );
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('requires repository name', async () => {
      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--public']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: repository name is required'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRepoApi.createRepo.mockRejectedValue(new Error('Repository name already exists'));

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-repo', '--public']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Repository name already exists');
      expect(process.exitCode).toBe(1);
    });
  });
});
