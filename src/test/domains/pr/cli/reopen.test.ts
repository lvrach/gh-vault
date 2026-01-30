/**
 * PR reopen command tests.
 *
 * Tests the `gh-vault pr reopen` CLI command with mocked dependencies.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createReopenCommand } from '../../../../domains/pr/cli/reopen.js';
import type { PullRequest } from '../../../../domains/pr/types.js';
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
  updatePrState: ReturnType<typeof vi.fn>;
  createPrComment: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
} {
  return {
    updatePrState: vi.fn(),
    createPrComment: vi.fn(),
    listPrs: vi.fn(),
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

describe('pr reopen command', () => {
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
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('reopens a closed PR', async () => {
      const reopenedPr = createMockPullRequest({ state: 'open' });
      mockPrApi.updatePrState.mockResolvedValue(reopenedPr);

      const cmd = createReopenCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockPrApi.updatePrState).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        state: 'open',
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('adds comment when reopening with --comment', async () => {
      const reopenedPr = createMockPullRequest({ state: 'open' });
      mockPrApi.updatePrState.mockResolvedValue(reopenedPr);
      mockPrApi.createPrComment.mockResolvedValue({
        id: 1,
        body: 'Reopening this PR',
        user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
        createdAt: '2024-01-17T10:00:00Z',
        htmlUrl: 'https://github.com/owner/repo/pull/42#issuecomment-1',
      });

      const cmd = createReopenCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--comment', 'Reopening this PR']);

      expect(mockPrApi.createPrComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issueNumber: 42,
        body: 'Reopening this PR',
      });
      expect(mockPrApi.updatePrState).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        state: 'open',
      });
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const reopenedPr = createMockPullRequest({ state: 'open' });
      mockPrApi.updatePrState.mockResolvedValue(reopenedPr);

      const cmd = createReopenCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.updatePrState).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('resolves PR number from argument', async () => {
      const reopenedPr = createMockPullRequest({ state: 'open' });
      mockPrApi.updatePrState.mockResolvedValue(reopenedPr);

      const cmd = createReopenCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '123']);

      expect(mockResolvePrNumber).toHaveBeenCalledWith(
        '123',
        'owner',
        'repo',
        expect.any(Function)
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

      const cmd = createReopenCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.updatePrState).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'PR not found',
      });

      const cmd = createReopenCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '999']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: PR not found');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when reopening', async () => {
      mockPrApi.updatePrState.mockRejectedValue(new Error('Cannot reopen merged PR'));

      const cmd = createReopenCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Cannot reopen merged PR');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when adding comment', async () => {
      mockPrApi.createPrComment.mockRejectedValue(new Error('Cannot add comment'));

      const cmd = createReopenCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--comment', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Cannot add comment');
      expect(process.exitCode).toBe(1);
    });
  });
});
