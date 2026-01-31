/**
 * Repo view command tests.
 *
 * Tests the `gh-vault repo view` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepoApi } from '../../../../domains/repo/api.js';
import { createViewCommand } from '../../../../domains/repo/cli/view.js';
import type { Repository } from '../../../../domains/repo/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('open', () => ({ default: vi.fn() }));
vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
}));

import open from 'open';

import { resolveRepository } from '../../../../shared/repo.js';

const mockOpen = vi.mocked(open);
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
  getRepo: ReturnType<typeof vi.fn>;
  getReadme: ReturnType<typeof vi.fn>;
} {
  return {
    getRepo: vi.fn(),
    getReadme: vi.fn(),
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
    topics: ['api', 'testing'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    pushedAt: '2024-01-15T10:00:00Z',
    license: { key: 'mit', name: 'MIT License', spdxId: 'MIT' },
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

describe('repo view command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockRepoApi: ReturnType<typeof createMockRepoApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockRepoApi = createMockRepoApi();

    mockResolveRepository.mockResolvedValue({
      success: true,
      owner: 'owner',
      repo: 'repo',
    });
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('views current repository by default', async () => {
      const repo = createMockRepository();
      mockRepoApi.getRepo.mockResolvedValue(repo);
      mockRepoApi.getReadme.mockResolvedValue(null);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockResolveRepository).toHaveBeenCalledWith(undefined);
      expect(mockRepoApi.getRepo).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
      });
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('views specified repository', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'octocat',
        repo: 'Hello-World',
      });
      const repo = createMockRepository();
      mockRepoApi.getRepo.mockResolvedValue(repo);
      mockRepoApi.getReadme.mockResolvedValue(null);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat/Hello-World']);

      expect(mockResolveRepository).toHaveBeenCalledWith('octocat/Hello-World');
      expect(mockRepoApi.getRepo).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
      });
    });

    it('opens repository in browser with --web flag', async () => {
      // Note: --web builds URL from resolved owner/repo, doesn't call getRepo
      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/owner/repo');
      expect(mockRepoApi.getRepo).not.toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is provided', async () => {
      const repo = createMockRepository();
      mockRepoApi.getRepo.mockResolvedValue(repo);
      mockRepoApi.getReadme.mockResolvedValue(null);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--json']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const repo = createMockRepository({ name: 'test-repo', visibility: 'public' });
      mockRepoApi.getRepo.mockResolvedValue(repo);
      mockRepoApi.getReadme.mockResolvedValue(null);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--json', 'name,visibility']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as Record<string, unknown>;
      expect(parsed).toEqual({ name: 'test-repo', visibility: 'public' });
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

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRepoApi.getRepo.mockRejectedValue(new Error('Not Found'));

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not Found');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--jq', '.name']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: --jq requires --json to be specified');
      expect(process.exitCode).toBe(1);
    });
  });
});
