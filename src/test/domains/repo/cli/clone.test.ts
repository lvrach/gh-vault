/**
 * Repo clone command tests.
 *
 * Tests the `gh-vault repo clone` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepoApi } from '../../../../domains/repo/api.js';
import { createCloneCommand } from '../../../../domains/repo/cli/clone.js';
import type { Repository } from '../../../../domains/repo/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

type ExecFileCallback = (error: Error | null, stdout: string, stderr: string) => void;

vi.mock('node:child_process', () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      _optsOrCallback?: Record<string, unknown> | ExecFileCallback,
      callback?: ExecFileCallback
    ) => {
      // Handle both 3-arg and 4-arg forms
      const cb = typeof _optsOrCallback === 'function' ? _optsOrCallback : callback;
      if (cb) cb(null, '', '');
    }
  ),
}));

import { execFile } from 'node:child_process';

const mockExecFile = vi.mocked(execFile);

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
  getCurrentUser: ReturnType<typeof vi.fn>;
} {
  return {
    getRepo: vi.fn(),
    getCurrentUser: vi.fn(),
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

describe('repo clone command', () => {
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
    it('clones repository by owner/repo format', async () => {
      const repo = createMockRepository();
      mockRepoApi.getRepo.mockResolvedValue(repo);

      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat/Hello-World']);

      expect(mockRepoApi.getRepo).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
      });
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['clone', 'https://github.com/octocat/Hello-World.git'],
        expect.any(Function)
      );
      expect(mockOutput.print).toHaveBeenCalledWith(expect.stringContaining('Cloning'));
    });

    it('clones repository to custom directory', async () => {
      const repo = createMockRepository();
      mockRepoApi.getRepo.mockResolvedValue(repo);

      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat/Hello-World', 'my-dir']);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['clone', 'https://github.com/octocat/Hello-World.git', 'my-dir'],
        expect.any(Function)
      );
      expect(mockOutput.print).toHaveBeenCalledWith("Cloning into 'my-dir'...");
    });

    it('clones repository by HTTPS URL', async () => {
      const repo = createMockRepository();
      mockRepoApi.getRepo.mockResolvedValue(repo);

      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'https://github.com/octocat/Hello-World.git']);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['clone', 'https://github.com/octocat/Hello-World.git'],
        expect.any(Function)
      );
    });

    it('clones repository by SSH URL', async () => {
      const repo = createMockRepository();
      mockRepoApi.getRepo.mockResolvedValue(repo);

      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'git@github.com:octocat/Hello-World.git']);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['clone', 'git@github.com:octocat/Hello-World.git'],
        expect.any(Function)
      );
    });

    it('clones repository by name only (assumes current user)', async () => {
      mockRepoApi.getCurrentUser.mockResolvedValue('myuser');
      const repo = createMockRepository({ fullName: 'myuser/my-repo', name: 'my-repo' });
      mockRepoApi.getRepo.mockResolvedValue(repo);

      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'my-repo']);

      expect(mockRepoApi.getCurrentUser).toHaveBeenCalled();
      expect(mockRepoApi.getRepo).toHaveBeenCalledWith({
        owner: 'myuser',
        repo: 'my-repo',
      });
    });

    it('adds upstream remote when cloning a fork', async () => {
      const parentRepo = createMockRepository({
        fullName: 'upstream/Hello-World',
        cloneUrl: 'https://github.com/upstream/Hello-World.git',
      });
      const forkRepo = createMockRepository({
        fork: true,
        parent: parentRepo,
      });
      mockRepoApi.getRepo.mockResolvedValue(forkRepo);

      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat/Hello-World']);

      // Should call git remote add upstream
      const remoteCall = mockExecFile.mock.calls.find(
        (call) => Array.isArray(call[1]) && call[1][0] === 'remote'
      );
      expect(remoteCall).toBeDefined();
      expect(remoteCall).toEqual([
        'git',
        ['remote', 'add', 'upstream', 'https://github.com/upstream/Hello-World.git'],
        { cwd: 'Hello-World' },
        expect.any(Function),
      ]);
    });

    it('uses custom upstream remote name', async () => {
      const parentRepo = createMockRepository({
        cloneUrl: 'https://github.com/upstream/Hello-World.git',
      });
      const forkRepo = createMockRepository({
        fork: true,
        parent: parentRepo,
      });
      mockRepoApi.getRepo.mockResolvedValue(forkRepo);

      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        'octocat/Hello-World',
        '--upstream-remote-name',
        'origin-upstream',
      ]);

      const remoteCall = mockExecFile.mock.calls.find(
        (call) => Array.isArray(call[1]) && call[1][0] === 'remote'
      );
      expect(remoteCall).toBeDefined();
      const args = remoteCall?.[1] as string[] | undefined;
      expect(args).toContain('origin-upstream');
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles invalid repository format', async () => {
      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'invalid/format/repo']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        expect.stringContaining('invalid repository format')
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles URL parse error', async () => {
      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'https://example.com/not-github']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        expect.stringContaining('could not parse repository URL')
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRepoApi.getRepo.mockRejectedValue(new Error('Not Found'));

      const cmd = createCloneCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat/nonexistent']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not Found');
      expect(process.exitCode).toBe(1);
    });
  });
});
