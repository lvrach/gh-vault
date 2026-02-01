/**
 * Repo fork command tests.
 *
 * Tests the `gh-vault repo fork` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepoApi } from '../../../../domains/repo/api.js';
import { createForkCommand } from '../../../../domains/repo/cli/fork.js';
import type { Repository } from '../../../../domains/repo/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
}));

import { resolveRepository } from '../../../../shared/repo.js';

const mockResolveRepository = vi.mocked(resolveRepository);

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
  forkRepo: ReturnType<typeof vi.fn>;
} {
  return {
    forkRepo: vi.fn(),
  };
}

function createMockRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 2,
    nodeId: 'MDEwOlJlcG9zaXRvcnky',
    name: 'Hello-World',
    fullName: 'myuser/Hello-World',
    private: false,
    owner: { login: 'myuser', type: 'User', htmlUrl: 'https://github.com/myuser' },
    htmlUrl: 'https://github.com/myuser/Hello-World',
    description: 'A test repository',
    fork: true,
    cloneUrl: 'https://github.com/myuser/Hello-World.git',
    sshUrl: 'git@github.com:myuser/Hello-World.git',
    defaultBranch: 'main',
    visibility: 'public',
    language: 'TypeScript',
    stargazersCount: 0,
    forksCount: 0,
    openIssuesCount: 0,
    watchersCount: 0,
    archived: false,
    disabled: false,
    topics: [],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    pushedAt: '2024-01-15T10:00:00Z',
    license: null,
    hasIssues: true,
    hasProjects: true,
    hasWiki: true,
    hasDiscussions: false,
    allowForking: true,
    isTemplate: false,
    parent: {
      id: 1,
      nodeId: 'MDEwOlJlcG9zaXRvcnkx',
      name: 'Hello-World',
      fullName: 'octocat/Hello-World',
      private: false,
      owner: { login: 'octocat', type: 'User', htmlUrl: 'https://github.com/octocat' },
      htmlUrl: 'https://github.com/octocat/Hello-World',
      description: 'A test repository',
      fork: false,
      cloneUrl: 'https://github.com/octocat/Hello-World.git',
      sshUrl: 'git@github.com:octocat/Hello-World.git',
      defaultBranch: 'main',
      visibility: 'public',
      language: 'TypeScript',
      stargazersCount: 100,
      forksCount: 10,
      openIssuesCount: 5,
      watchersCount: 50,
      archived: false,
      disabled: false,
      topics: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      pushedAt: '2024-01-15T10:00:00Z',
      license: null,
      hasIssues: true,
      hasProjects: true,
      hasWiki: true,
      hasDiscussions: false,
      allowForking: true,
      isTemplate: false,
    },
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('repo fork command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockRepoApi: ReturnType<typeof createMockRepoApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockRepoApi = createMockRepoApi();

    mockResolveRepository.mockResolvedValue({
      success: true,
      owner: 'octocat',
      repo: 'Hello-World',
    });
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('forks current repository by default', async () => {
      const repo = createMockRepository();
      mockRepoApi.forkRepo.mockResolvedValue(repo);

      const cmd = createForkCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockResolveRepository).toHaveBeenCalledWith(undefined);
      expect(mockRepoApi.forkRepo).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
      });
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('forks specified repository', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-user',
        repo: 'other-repo',
      });
      const repo = createMockRepository();
      mockRepoApi.forkRepo.mockResolvedValue(repo);

      const cmd = createForkCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'other-user/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-user/other-repo');
      expect(mockRepoApi.forkRepo).toHaveBeenCalledWith({
        owner: 'other-user',
        repo: 'other-repo',
      });
    });

    it('forks with custom name using --fork-name', async () => {
      const repo = createMockRepository({ name: 'my-custom-fork' });
      mockRepoApi.forkRepo.mockResolvedValue(repo);

      const cmd = createForkCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--fork-name', 'my-custom-fork']);

      expect(mockRepoApi.forkRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-custom-fork',
        })
      );
    });

    it('forks to organization with --org flag', async () => {
      const repo = createMockRepository({ fullName: 'my-org/Hello-World' });
      mockRepoApi.forkRepo.mockResolvedValue(repo);

      const cmd = createForkCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--org', 'my-org']);

      expect(mockRepoApi.forkRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: 'my-org',
        })
      );
    });

    it('forks with default branch only using --default-branch-only', async () => {
      const repo = createMockRepository();
      mockRepoApi.forkRepo.mockResolvedValue(repo);

      const cmd = createForkCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--default-branch-only']);

      expect(mockRepoApi.forkRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultBranchOnly: true,
        })
      );
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles repository resolution failure', async () => {
      mockResolveRepository.mockResolvedValue({
        success: false,
        error: 'Not a git repository',
      });

      const cmd = createForkCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRepoApi.forkRepo.mockRejectedValue(new Error('You have already forked this repository'));

      const cmd = createForkCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: You have already forked this repository'
      );
      expect(process.exitCode).toBe(1);
    });
  });
});
