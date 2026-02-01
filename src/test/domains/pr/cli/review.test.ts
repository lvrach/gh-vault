/**
 * PR review command tests.
 *
 * Tests the `gh-vault pr review` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createReviewCommand } from '../../../../domains/pr/cli/review.js';
import type { PrReview } from '../../../../domains/pr/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
  resolvePrNumber: vi.fn(),
}));

import { resolvePrNumber, resolveRepository } from '../../../../shared/repo.js';

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
  createPrReview: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
} {
  return {
    createPrReview: vi.fn(),
    listPrs: vi.fn(),
  };
}

function createMockReview(overrides: Partial<PrReview> = {}): PrReview {
  return {
    id: 1,
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    body: 'LGTM!',
    state: 'APPROVED',
    submittedAt: '2024-01-15T10:00:00Z',
    htmlUrl: 'https://github.com/owner/repo/pull/42#pullrequestreview-1',
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr review command', () => {
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
  // Success Cases - Approving
  // ============================================================================

  describe('approving PRs', () => {
    it('approves PR with --approve', async () => {
      const review = createMockReview({ state: 'APPROVED' });
      mockPrApi.createPrReview.mockResolvedValue(review);

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--approve']);

      expect(mockPrApi.createPrReview).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        body: '',
        event: 'APPROVE',
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('approves with body message', async () => {
      const review = createMockReview({ state: 'APPROVED', body: 'Great work!' });
      mockPrApi.createPrReview.mockResolvedValue(review);

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--approve', '--body', 'Great work!']);

      expect(mockPrApi.createPrReview).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Great work!',
          event: 'APPROVE',
        })
      );
    });
  });

  // ============================================================================
  // Success Cases - Requesting Changes
  // ============================================================================

  describe('requesting changes', () => {
    it('requests changes with --request-changes and body', async () => {
      const review = createMockReview({ state: 'CHANGES_REQUESTED' });
      mockPrApi.createPrReview.mockResolvedValue(review);

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        '42',
        '--request-changes',
        '--body',
        'Please fix the tests',
      ]);

      expect(mockPrApi.createPrReview).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        body: 'Please fix the tests',
        event: 'REQUEST_CHANGES',
      });
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('requires body for --request-changes', async () => {
      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--request-changes']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: --request-changes requires a body (-b or -F)'
      );
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.createPrReview).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Success Cases - Commenting
  // ============================================================================

  describe('commenting on PRs', () => {
    it('leaves comment review with --comment', async () => {
      const review = createMockReview({ state: 'COMMENTED' });
      mockPrApi.createPrReview.mockResolvedValue(review);

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--comment']);

      expect(mockPrApi.createPrReview).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        body: '',
        event: 'COMMENT',
      });
    });

    it('leaves comment with body', async () => {
      const review = createMockReview({ state: 'COMMENTED', body: 'Looks interesting' });
      mockPrApi.createPrReview.mockResolvedValue(review);

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--comment', '--body', 'Looks interesting']);

      expect(mockPrApi.createPrReview).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Looks interesting',
          event: 'COMMENT',
        })
      );
    });
  });

  // ============================================================================
  // Success Cases - Other
  // ============================================================================

  describe('other success cases', () => {
    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const review = createMockReview();
      mockPrApi.createPrReview.mockResolvedValue(review);

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo', '--approve']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.createPrReview).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('resolves PR from current branch when no argument given', async () => {
      const review = createMockReview();
      mockPrApi.createPrReview.mockResolvedValue(review);

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--approve']);

      expect(mockResolvePrNumber).toHaveBeenCalledWith(
        undefined,
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

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--approve']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.createPrReview).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--approve']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: No open PR found for current branch'
      );
      expect(process.exitCode).toBe(1);
    });

    it('requires review type to be specified', async () => {
      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: Specify --approve, --request-changes, or --comment'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockPrApi.createPrReview.mockRejectedValue(new Error('Cannot review your own PR'));

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--approve']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Cannot review your own PR');
      expect(process.exitCode).toBe(1);
    });

    it('handles already reviewed error', async () => {
      mockPrApi.createPrReview.mockRejectedValue(new Error('PR is already merged'));

      const cmd = createReviewCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--approve']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: PR is already merged');
      expect(process.exitCode).toBe(1);
    });
  });
});
