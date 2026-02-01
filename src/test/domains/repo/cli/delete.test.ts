/**
 * Repo delete command tests.
 *
 * Tests the `gh-vault repo delete` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepoApi } from '../../../../domains/repo/api.js';
import { createDeleteCommand } from '../../../../domains/repo/cli/delete.js';
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
  getRepo: ReturnType<typeof vi.fn>;
  deleteRepo: ReturnType<typeof vi.fn>;
} {
  return {
    getRepo: vi.fn(),
    deleteRepo: vi.fn(),
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('repo delete command', () => {
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
    it('deletes repository with --yes flag', async () => {
      mockRepoApi.getRepo.mockResolvedValue({});
      mockRepoApi.deleteRepo.mockResolvedValue(undefined);

      const cmd = createDeleteCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat/Hello-World', '--yes']);

      expect(mockRepoApi.getRepo).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
      });
      expect(mockRepoApi.deleteRepo).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'Hello-World',
      });
      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('Deleted');
    });

    it('uses resolved repository when provided', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      mockRepoApi.getRepo.mockResolvedValue({});
      mockRepoApi.deleteRepo.mockResolvedValue(undefined);

      const cmd = createDeleteCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'other-owner/other-repo', '--yes']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockRepoApi.deleteRepo).toHaveBeenCalledWith({
        owner: 'other-owner',
        repo: 'other-repo',
      });
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('requires repository argument for safety', async () => {
      const cmd = createDeleteCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', '--yes']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        expect.stringContaining('--yes is ignored when no repository is specified')
      );
      expect(process.exitCode).toBe(1);
      expect(mockRepoApi.deleteRepo).not.toHaveBeenCalled();
    });

    it('requires confirmation without --yes flag', async () => {
      const cmd = createDeleteCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat/Hello-World']);

      expect(mockOutput.printError).toHaveBeenCalledWith(expect.stringContaining('--yes'));
      expect(process.exitCode).toBe(1);
      expect(mockRepoApi.deleteRepo).not.toHaveBeenCalled();
    });

    it('handles repository resolution failure', async () => {
      mockResolveRepository.mockResolvedValue({
        success: false,
        error: 'Invalid repository format',
      });

      const cmd = createDeleteCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'invalid', '--yes']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Invalid repository format');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRepoApi.getRepo.mockResolvedValue({});
      mockRepoApi.deleteRepo.mockRejectedValue(new Error('Not Found'));

      const cmd = createDeleteCommand(
        mockOutput as unknown as Output,
        mockRepoApi as unknown as RepoApi
      );
      await cmd.parseAsync(['node', 'test', 'octocat/Hello-World', '--yes']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not Found');
      expect(process.exitCode).toBe(1);
    });
  });
});
