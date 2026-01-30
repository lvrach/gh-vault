/**
 * PR close command tests.
 *
 * Tests the `gh-vault pr close` CLI command with mocked dependencies.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createCloseCommand } from '../../../../domains/pr/cli/close.js';
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
  getPr: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
  deleteBranch: ReturnType<typeof vi.fn>;
} {
  return {
    updatePrState: vi.fn(),
    createPrComment: vi.fn(),
    getPr: vi.fn(),
    listPrs: vi.fn(),
    deleteBranch: vi.fn(),
  };
}

function createMockPullRequest(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 42,
    title: 'Test PR',
    body: 'PR description',
    state: 'closed',
    draft: false,
    merged: false,
    mergeable: null,
    mergeableState: 'unknown',
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    head: { ref: 'feature-branch', sha: 'abc123' },
    base: { ref: 'main', sha: 'def456' },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    closedAt: '2024-01-17T10:00:00Z',
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

describe('pr close command', () => {
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

    mockPrApi.getPr.mockResolvedValue(createMockPullRequest({ state: 'open' }));
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('closes PR', async () => {
      const closedPr = createMockPullRequest({ state: 'closed' });
      mockPrApi.updatePrState.mockResolvedValue(closedPr);

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockPrApi.updatePrState).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        state: 'closed',
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('adds comment when closing with --comment', async () => {
      const closedPr = createMockPullRequest({ state: 'closed' });
      mockPrApi.updatePrState.mockResolvedValue(closedPr);
      mockPrApi.createPrComment.mockResolvedValue({
        id: 1,
        body: 'Closing this PR',
        user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
        createdAt: '2024-01-17T10:00:00Z',
        htmlUrl: 'https://github.com/owner/repo/pull/42#issuecomment-1',
      });

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--comment', 'Closing this PR']);

      expect(mockPrApi.createPrComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issueNumber: 42,
        body: 'Closing this PR',
      });
      expect(mockPrApi.updatePrState).toHaveBeenCalled();
    });

    it('deletes branch when closing with --delete-branch', async () => {
      const closedPr = createMockPullRequest({ state: 'closed' });
      mockPrApi.updatePrState.mockResolvedValue(closedPr);
      mockPrApi.deleteBranch.mockResolvedValue(undefined);

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--delete-branch']);

      expect(mockPrApi.updatePrState).toHaveBeenCalled();
      expect(mockPrApi.deleteBranch).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        branch: 'feature-branch',
      });
    });

    it('handles branch deletion failure gracefully', async () => {
      const closedPr = createMockPullRequest({ state: 'closed' });
      mockPrApi.updatePrState.mockResolvedValue(closedPr);
      mockPrApi.deleteBranch.mockRejectedValue(new Error('Branch protected'));

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--delete-branch']);

      expect(mockPrApi.updatePrState).toHaveBeenCalled();
      expect(mockPrApi.deleteBranch).toHaveBeenCalled();
      // Should not fail the overall operation
      expect(process.exitCode).toBeUndefined();
    });

    it('closes with comment and deletes branch', async () => {
      const closedPr = createMockPullRequest({ state: 'closed' });
      mockPrApi.updatePrState.mockResolvedValue(closedPr);
      mockPrApi.createPrComment.mockResolvedValue({
        id: 1,
        body: 'Done',
        user: null,
        createdAt: '2024-01-17T10:00:00Z',
        htmlUrl: 'https://github.com/owner/repo/pull/42#issuecomment-1',
      });
      mockPrApi.deleteBranch.mockResolvedValue(undefined);

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--comment', 'Done', '--delete-branch']);

      expect(mockPrApi.createPrComment).toHaveBeenCalled();
      expect(mockPrApi.updatePrState).toHaveBeenCalled();
      expect(mockPrApi.deleteBranch).toHaveBeenCalled();
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const closedPr = createMockPullRequest({ state: 'closed' });
      mockPrApi.updatePrState.mockResolvedValue(closedPr);

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.updatePrState).toHaveBeenCalledWith(
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

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.updatePrState).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: No open PR found for current branch');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when closing', async () => {
      mockPrApi.updatePrState.mockRejectedValue(new Error('PR already closed'));

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: PR already closed');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when adding comment', async () => {
      mockPrApi.createPrComment.mockRejectedValue(new Error('Cannot add comment'));

      const cmd = createCloseCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--comment', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Cannot add comment');
      expect(process.exitCode).toBe(1);
    });
  });
});
