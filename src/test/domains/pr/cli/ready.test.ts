/**
 * PR ready command tests.
 *
 * Tests the `gh-vault pr ready` CLI command with mocked dependencies.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createReadyCommand } from '../../../../domains/pr/cli/ready.js';
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
  updatePrDraft: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
} {
  return {
    updatePrDraft: vi.fn(),
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

describe('pr ready command', () => {
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
    it('marks PR as ready for review', async () => {
      const readyPr = createMockPullRequest({ draft: false });
      mockPrApi.updatePrDraft.mockResolvedValue(readyPr);

      const cmd = createReadyCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockPrApi.updatePrDraft).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        draft: false,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('converts PR to draft with --undo', async () => {
      const draftPr = createMockPullRequest({ draft: true });
      mockPrApi.updatePrDraft.mockResolvedValue(draftPr);

      const cmd = createReadyCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--undo']);

      expect(mockPrApi.updatePrDraft).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        draft: true,
      });
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const readyPr = createMockPullRequest({ draft: false });
      mockPrApi.updatePrDraft.mockResolvedValue(readyPr);

      const cmd = createReadyCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.updatePrDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('resolves PR from current branch when no argument given', async () => {
      const readyPr = createMockPullRequest({ draft: false });
      mockPrApi.updatePrDraft.mockResolvedValue(readyPr);

      const cmd = createReadyCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockResolvePrNumber).toHaveBeenCalledWith(
        undefined,
        'owner',
        'repo',
        expect.any(Function)
      );
      expect(mockPrApi.updatePrDraft).toHaveBeenCalled();
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

      const cmd = createReadyCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.updatePrDraft).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createReadyCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: No open PR found for current branch');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when marking ready', async () => {
      mockPrApi.updatePrDraft.mockRejectedValue(new Error('PR is already ready for review'));

      const cmd = createReadyCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: PR is already ready for review');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when converting to draft', async () => {
      mockPrApi.updatePrDraft.mockRejectedValue(new Error('Cannot convert merged PR to draft'));

      const cmd = createReadyCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--undo']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Cannot convert merged PR to draft');
      expect(process.exitCode).toBe(1);
    });
  });
});
