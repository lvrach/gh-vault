/**
 * Repo edit command tests.
 *
 * Tests the `gh-vault repo edit` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepoApi } from '../../../../domains/repo/api.js';
import { createEditCommand } from '../../../../domains/repo/cli/edit.js';
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
  editRepo: ReturnType<typeof vi.fn>;
} {
  return {
    editRepo: vi.fn(),
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

describe('repo edit command', () => {
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
    it('edits repository description', async () => {
      const repo = createMockRepository({ description: 'New description' });
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--description', 'New description']);

      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'octocat',
          repo: 'Hello-World',
          description: 'New description',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('edits repository homepage', async () => {
      const repo = createMockRepository();
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--homepage', 'https://example.com']);

      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          homepage: 'https://example.com',
        })
      );
    });

    it('edits repository visibility with confirmation', async () => {
      const repo = createMockRepository({ visibility: 'private' });
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        '--visibility',
        'private',
        '--accept-visibility-change-consequences',
      ]);

      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'private',
        })
      );
    });

    it('enables issues', async () => {
      const repo = createMockRepository({ hasIssues: true });
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--enable-issues']);

      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          hasIssues: true,
        })
      );
    });

    it('enables wiki', async () => {
      const repo = createMockRepository({ hasWiki: true });
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--enable-wiki']);

      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          hasWiki: true,
        })
      );
    });

    it('adds topics', async () => {
      const repo = createMockRepository({ topics: ['api', 'testing'] });
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--add-topic', 'api', 'testing']);

      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          addTopics: ['api', 'testing'],
        })
      );
    });

    it('removes topics', async () => {
      const repo = createMockRepository({ topics: [] });
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--remove-topic', 'old-topic']);

      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          removeTopics: ['old-topic'],
        })
      );
    });

    it('sets default branch', async () => {
      const repo = createMockRepository({ defaultBranch: 'develop' });
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--default-branch', 'develop']);

      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultBranch: 'develop',
        })
      );
    });

    it('edits specified repository', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const repo = createMockRepository();
      mockRepoApi.editRepo.mockResolvedValue(repo);

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'other-owner/other-repo', '--description', 'test']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockRepoApi.editRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('requires confirmation for visibility change', async () => {
      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--visibility', 'private']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        expect.stringContaining('--accept-visibility-change-consequences')
      );
      expect(process.exitCode).toBe(1);
      expect(mockRepoApi.editRepo).not.toHaveBeenCalled();
    });

    it('handles repository resolution failure', async () => {
      mockResolveRepository.mockResolvedValue({
        success: false,
        error: 'Not a git repository',
      });

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--description', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRepoApi.editRepo.mockRejectedValue(new Error('Permission denied'));

      const cmd = createEditCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--description', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Permission denied');
      expect(process.exitCode).toBe(1);
    });
  });
});
