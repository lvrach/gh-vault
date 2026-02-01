/**
 * PR status command tests.
 *
 * Tests the `gh-vault pr status` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createStatusCommand } from '../../../../domains/pr/cli/status.js';
import type { PrStatusResult, PullRequestListItem } from '../../../../domains/pr/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
  getCurrentBranch: vi.fn(),
}));

import { getCurrentBranch, resolveRepository } from '../../../../shared/repo.js';

const mockResolveRepository = vi.mocked(resolveRepository);
const mockGetCurrentBranch = vi.mocked(getCurrentBranch);

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
  getPrStatus: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
} {
  return {
    getPrStatus: vi.fn(),
    getCurrentUser: vi.fn(),
  };
}

function createMockPrListItem(overrides: Partial<PullRequestListItem> = {}): PullRequestListItem {
  return {
    number: 1,
    title: 'Test PR',
    state: 'open',
    draft: false,
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    htmlUrl: 'https://github.com/owner/repo/pull/1',
    labels: [],
    head: { ref: 'feature', sha: 'abc123' },
    base: { ref: 'main', sha: 'def456' },
    ...overrides,
  };
}

function createMockStatusResult(overrides: Partial<PrStatusResult> = {}): PrStatusResult {
  return {
    currentBranchPr: null,
    createdByYou: [],
    reviewRequested: [],
    assignedToYou: [],
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr status command', () => {
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

    mockGetCurrentBranch.mockResolvedValue('feature-branch');
    mockPrApi.getCurrentUser.mockResolvedValue('octocat');
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('displays PR status summary', async () => {
      const status = createMockStatusResult({
        currentBranchPr: createMockPrListItem({ number: 42, title: 'Current branch PR' }),
        createdByYou: [createMockPrListItem({ number: 1, title: 'My PR' })],
        reviewRequested: [createMockPrListItem({ number: 2, title: 'Review needed' })],
        assignedToYou: [createMockPrListItem({ number: 3, title: 'Assigned PR' })],
      });
      mockPrApi.getPrStatus.mockResolvedValue(status);

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockPrApi.getPrStatus).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        username: 'octocat',
        currentBranch: 'feature-branch',
        includeConflictStatus: undefined,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('includes conflict status when --conflict-status is specified', async () => {
      const status = createMockStatusResult({
        createdByYou: [
          createMockPrListItem({
            number: 1,
            mergeable: false,
            mergeableState: 'dirty',
          }),
        ],
      });
      mockPrApi.getPrStatus.mockResolvedValue(status);

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--conflict-status']);

      expect(mockPrApi.getPrStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          includeConflictStatus: true,
        })
      );
    });

    it('outputs JSON when --json is specified', async () => {
      const status = createMockStatusResult({
        createdByYou: [createMockPrListItem()],
      });
      mockPrApi.getPrStatus.mockResolvedValue(status);

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const status = createMockStatusResult({
        createdByYou: [createMockPrListItem()],
      });
      mockPrApi.getPrStatus.mockResolvedValue(status);

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--json', 'createdByYou']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as Record<string, unknown>;
      expect(Object.keys(parsed)).toEqual(['createdByYou']);
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const status = createMockStatusResult();
      mockPrApi.getPrStatus.mockResolvedValue(status);

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.getPrStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('handles empty status (no PRs)', async () => {
      const status = createMockStatusResult();
      mockPrApi.getPrStatus.mockResolvedValue(status);

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('handles missing current branch gracefully', async () => {
      mockGetCurrentBranch.mockResolvedValue(null);
      const status = createMockStatusResult();
      mockPrApi.getPrStatus.mockResolvedValue(status);

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockPrApi.getPrStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          currentBranch: undefined,
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

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.getPrStatus).not.toHaveBeenCalled();
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--jq', '.createdByYou']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: --jq requires --json to be specified'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockPrApi.getPrStatus.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('handles getCurrentUser error', async () => {
      mockPrApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not authenticated');
      expect(process.exitCode).toBe(1);
    });
  });

  // ============================================================================
  // jq Filtering
  // ============================================================================

  describe('jq filtering', () => {
    it('filters output with jq expression', async () => {
      const status = createMockStatusResult({
        createdByYou: [
          createMockPrListItem({ number: 1, title: 'First' }),
          createMockPrListItem({ number: 2, title: 'Second' }),
        ],
      });
      mockPrApi.getPrStatus.mockResolvedValue(status);

      const cmd = createStatusCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--json', '--jq', '.createdByYou[0].number']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('1');
    });
  });
});
