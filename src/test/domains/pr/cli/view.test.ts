/**
 * PR view command tests.
 *
 * Tests the `gh-vault pr view` CLI command with mocked dependencies.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createViewCommand } from '../../../../domains/pr/cli/view.js';
import type { PrComment,PullRequest } from '../../../../domains/pr/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('open', () => ({ default: vi.fn() }));
vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
  resolvePrNumber: vi.fn(),
}));

import openModule from 'open';

import { resolvePrNumber,resolveRepository } from '../../../../shared/repo.js';

const mockOpen = vi.mocked(openModule);
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
  getPr: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
  listPrComments: ReturnType<typeof vi.fn>;
} {
  return {
    getPr: vi.fn(),
    listPrs: vi.fn(),
    listPrComments: vi.fn(),
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
    head: { ref: 'feature', sha: 'abc123' },
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

function createMockComment(overrides: Partial<PrComment> = {}): PrComment {
  return {
    id: 1,
    user: { login: 'reviewer', htmlUrl: 'https://github.com/reviewer' },
    body: 'Looks good!',
    createdAt: '2024-01-16T12:00:00Z',
    htmlUrl: 'https://github.com/owner/repo/pull/42#issuecomment-1',
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr view command', () => {
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
    it('displays PR details', async () => {
      const pr = createMockPullRequest();
      mockPrApi.getPr.mockResolvedValue(pr);

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockPrApi.getPr).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('displays PR with comments when --comments is specified', async () => {
      const pr = createMockPullRequest();
      const comments = [createMockComment({ id: 1 }), createMockComment({ id: 2 })];
      mockPrApi.getPr.mockResolvedValue(pr);
      mockPrApi.listPrComments.mockResolvedValue(comments);

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--comments']);

      expect(mockPrApi.getPr).toHaveBeenCalled();
      expect(mockPrApi.listPrComments).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issueNumber: 42,
      });
      // PR output + empty line + comments output
      expect(mockOutput.print).toHaveBeenCalledTimes(3);
    });

    it('outputs JSON when --json flag is provided', async () => {
      const pr = createMockPullRequest();
      mockPrApi.getPr.mockResolvedValue(pr);

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--json']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const pr = createMockPullRequest({ number: 42, title: 'My PR' });
      mockPrApi.getPr.mockResolvedValue(pr);

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--json', 'number,title']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as Record<string, unknown>;
      expect(parsed).toEqual({ number: 42, title: 'My PR' });
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/owner/repo/pull/42');
      expect(mockPrApi.getPr).not.toHaveBeenCalled();
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const pr = createMockPullRequest();
      mockPrApi.getPr.mockResolvedValue(pr);

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.getPr).toHaveBeenCalledWith(
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

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: No open PR found for current branch');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockPrApi.getPr.mockRejectedValue(new Error('PR not found'));

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: PR not found');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--jq', '.title']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: --jq requires --json to be specified');
      expect(process.exitCode).toBe(1);
    });
  });

  // ============================================================================
  // jq Filtering
  // ============================================================================

  describe('jq filtering', () => {
    it('filters output with jq expression', async () => {
      const pr = createMockPullRequest({ number: 42, title: 'My PR' });
      mockPrApi.getPr.mockResolvedValue(pr);

      const cmd = createViewCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--json', '--jq', '.number']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('42');
    });
  });
});
