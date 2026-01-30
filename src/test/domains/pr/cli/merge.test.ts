/**
 * PR merge command tests.
 *
 * Tests the `gh-vault pr merge` CLI command with mocked dependencies.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createMergeCommand } from '../../../../domains/pr/cli/merge.js';
import type { MergeResult, PullRequest } from '../../../../domains/pr/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
  resolvePrNumber: vi.fn(),
}));

import { resolvePrNumber,resolveRepository } from '../../../../shared/repo.js';

const mockResolveRepository = vi.mocked(resolveRepository);
const mockResolvePrNumber = vi.mocked(resolvePrNumber);

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

function createMockPrApi(): {
  mergePr: ReturnType<typeof vi.fn>;
  getPr: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
  deleteBranch: ReturnType<typeof vi.fn>;
  enableAutoMerge: ReturnType<typeof vi.fn>;
  disableAutoMerge: ReturnType<typeof vi.fn>;
} {
  return {
    mergePr: vi.fn(),
    getPr: vi.fn(),
    listPrs: vi.fn(),
    deleteBranch: vi.fn(),
    enableAutoMerge: vi.fn(),
    disableAutoMerge: vi.fn(),
  };
}

function createMockMergeResult(overrides: Partial<MergeResult> = {}): MergeResult {
  return {
    sha: 'abc123def456',
    merged: true,
    message: 'Pull Request successfully merged',
    ...overrides,
  };
}

function createMockPullRequest(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 42,
    title: 'Test PR',
    body: 'PR description',
    state: 'open',
    draft: false,
    merged: false,
    mergeable: true,
    mergeableState: 'clean',
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    head: { ref: 'feature-branch', sha: 'abc123' },
    base: { ref: 'main', sha: 'def456' },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    closedAt: null,
    mergedAt: null,
    htmlUrl: 'https://github.com/owner/repo/pull/42',
    additions: 100,
    deletions: 10,
    changedFiles: 5,
    labels: [],
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr merge command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockPrApi: ReturnType<typeof createMockPrApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockPrApi = createMockPrApi();

    mockResolveRepository.mockResolvedValue({
      success: true,
      owner: 'owner',
      repo: 'repo',
    });

    mockResolvePrNumber.mockResolvedValue({
      success: true,
      pullNumber: 42,
    });

    mockPrApi.getPr.mockResolvedValue(createMockPullRequest());
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('merges PR with default merge method', async () => {
      const result = createMockMergeResult();
      mockPrApi.mergePr.mockResolvedValue(result);

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockPrApi.mergePr).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          pullNumber: 42,
          mergeMethod: 'merge',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('merges PR with squash method', async () => {
      const result = createMockMergeResult();
      mockPrApi.mergePr.mockResolvedValue(result);

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--squash']);

      expect(mockPrApi.mergePr).toHaveBeenCalledWith(
        expect.objectContaining({
          mergeMethod: 'squash',
        })
      );
    });

    it('merges PR with rebase method', async () => {
      const result = createMockMergeResult();
      mockPrApi.mergePr.mockResolvedValue(result);

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--rebase']);

      expect(mockPrApi.mergePr).toHaveBeenCalledWith(
        expect.objectContaining({
          mergeMethod: 'rebase',
        })
      );
    });

    it('merges with custom commit subject and body', async () => {
      const result = createMockMergeResult();
      mockPrApi.mergePr.mockResolvedValue(result);

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync([
        'node',
        'test',
        '42',
        '--subject',
        'Merge feature',
        '--body',
        'Detailed description',
      ]);

      expect(mockPrApi.mergePr).toHaveBeenCalledWith(
        expect.objectContaining({
          commitTitle: 'Merge feature',
          commitMessage: 'Detailed description',
        })
      );
    });

    it('deletes branch after merge when --delete-branch is specified', async () => {
      const result = createMockMergeResult();
      mockPrApi.mergePr.mockResolvedValue(result);
      mockPrApi.deleteBranch.mockResolvedValue(undefined);

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--delete-branch']);

      expect(mockPrApi.mergePr).toHaveBeenCalled();
      expect(mockPrApi.deleteBranch).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        branch: 'feature-branch',
      });
    });

    it('handles branch deletion failure gracefully', async () => {
      const result = createMockMergeResult();
      mockPrApi.mergePr.mockResolvedValue(result);
      mockPrApi.deleteBranch.mockRejectedValue(new Error('Branch protected'));

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--delete-branch']);

      expect(mockPrApi.mergePr).toHaveBeenCalled();
      expect(mockPrApi.deleteBranch).toHaveBeenCalled();
      // Should not fail the overall operation
      expect(process.exitCode).toBeUndefined();
    });

    it('enables auto-merge when --auto is specified', async () => {
      mockPrApi.enableAutoMerge.mockResolvedValue({ enabled: true, mergeMethod: 'merge' });

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--auto']);

      expect(mockPrApi.enableAutoMerge).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          pullNumber: 42,
          mergeMethod: 'merge',
        })
      );
      expect(mockPrApi.mergePr).not.toHaveBeenCalled();
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('enables auto-merge with squash method', async () => {
      mockPrApi.enableAutoMerge.mockResolvedValue({ enabled: true, mergeMethod: 'squash' });

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--auto', '--squash']);

      expect(mockPrApi.enableAutoMerge).toHaveBeenCalledWith(
        expect.objectContaining({
          mergeMethod: 'squash',
        })
      );
    });

    it('disables auto-merge when --disable-auto is specified', async () => {
      mockPrApi.disableAutoMerge.mockResolvedValue(undefined);

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--disable-auto']);

      expect(mockPrApi.disableAutoMerge).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
      });
      expect(mockPrApi.mergePr).not.toHaveBeenCalled();
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('passes SHA for head commit verification', async () => {
      const result = createMockMergeResult();
      mockPrApi.mergePr.mockResolvedValue(result);

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--match-head-commit', 'abc123']);

      expect(mockPrApi.mergePr).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: 'abc123',
        })
      );
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const result = createMockMergeResult();
      mockPrApi.mergePr.mockResolvedValue(result);

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.mergePr).toHaveBeenCalledWith(
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
    it('handles repository resolution failure', async () => {
      mockResolveRepository.mockResolvedValue({
        success: false,
        error: 'Not a git repository',
      });

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.mergePr).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: No open PR found for current branch');
      expect(process.exitCode).toBe(1);
    });

    it('rejects multiple merge methods', async () => {
      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--squash', '--rebase']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: Only one of --merge, --squash, or --rebase can be specified'
      );
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.mergePr).not.toHaveBeenCalled();
    });

    it('handles merge API error', async () => {
      mockPrApi.mergePr.mockRejectedValue(new Error('Pull request is not mergeable'));

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Pull request is not mergeable');
      expect(process.exitCode).toBe(1);
    });

    it('handles auto-merge enable error', async () => {
      mockPrApi.enableAutoMerge.mockRejectedValue(new Error('Auto-merge not enabled for repository'));

      const cmd = createMergeCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--auto']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Auto-merge not enabled for repository');
      expect(process.exitCode).toBe(1);
    });
  });
});
