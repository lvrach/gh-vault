/**
 * Repo archive/unarchive command tests.
 *
 * Tests the `gh-vault repo archive` and `gh-vault repo unarchive` CLI commands.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepoApi } from '../../../../domains/repo/api.js';
import {
  createArchiveCommand,
  createUnarchiveCommand,
} from '../../../../domains/repo/cli/archive.js';
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
  setArchived: ReturnType<typeof vi.fn>;
} {
  return {
    setArchived: vi.fn(),
  };
}

function createMockRepository(overrides: Partial<Repository> = {}): Repository {
  return {
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
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('repo archive command', () => {
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

  describe('success cases', () => {
    it('archives current repository with --yes flag', async () => {
      const repo = createMockRepository({ archived: true });
      mockRepoApi.setArchived.mockResolvedValue(repo);

      const cmd = createArchiveCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--yes']);

      expect(mockRepoApi.setArchived).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
        archived: true,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('Archived');
    });

    it('archives specified repository', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const repo = createMockRepository({ archived: true });
      mockRepoApi.setArchived.mockResolvedValue(repo);

      const cmd = createArchiveCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'other-owner/other-repo', '--yes']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockRepoApi.setArchived).toHaveBeenCalledWith({
        owner: 'other-owner',
        repo: 'other-repo',
        archived: true,
      });
    });
  });

  describe('error cases', () => {
    it('requires confirmation without --yes flag', async () => {
      const cmd = createArchiveCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith(expect.stringContaining('--yes'));
      expect(process.exitCode).toBe(1);
      expect(mockRepoApi.setArchived).not.toHaveBeenCalled();
    });

    it('handles repository resolution failure', async () => {
      mockResolveRepository.mockResolvedValue({
        success: false,
        error: 'Not a git repository',
      });

      const cmd = createArchiveCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--yes']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRepoApi.setArchived.mockRejectedValue(new Error('Permission denied'));

      const cmd = createArchiveCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--yes']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Permission denied');
      expect(process.exitCode).toBe(1);
    });
  });
});

describe('repo unarchive command', () => {
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

  describe('success cases', () => {
    it('unarchives repository with --yes flag', async () => {
      const repo = createMockRepository({ archived: false });
      mockRepoApi.setArchived.mockResolvedValue(repo);

      const cmd = createUnarchiveCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--yes']);

      expect(mockRepoApi.setArchived).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
        archived: false,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('Unarchived');
    });
  });

  describe('error cases', () => {
    it('requires confirmation without --yes flag', async () => {
      const cmd = createUnarchiveCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith(expect.stringContaining('--yes'));
      expect(process.exitCode).toBe(1);
    });
  });
});
