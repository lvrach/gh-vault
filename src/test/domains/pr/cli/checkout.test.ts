/**
 * PR checkout command tests.
 *
 * Tests the `gh-vault pr checkout` CLI command with mocked dependencies.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createCheckoutCommand } from '../../../../domains/pr/cli/checkout.js';
import type { PullRequest } from '../../../../domains/pr/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
  resolvePrNumber: vi.fn(),
  detectRepo: vi.fn(),
  gitFetch: vi.fn(),
  gitCheckout: vi.fn(),
  gitReset: vi.fn(),
  localBranchExists: vi.fn(),
  updateSubmodules: vi.fn(),
}));

import {
  detectRepo,
  gitCheckout,
  gitFetch,
  gitReset,
  localBranchExists,
  resolvePrNumber,
  resolveRepository,
  updateSubmodules,
} from '../../../../shared/repo.js';

const mockResolveRepository = vi.mocked(resolveRepository);
const mockResolvePrNumber = vi.mocked(resolvePrNumber);
const mockDetectRepo = vi.mocked(detectRepo);
const mockGitFetch = vi.mocked(gitFetch);
const mockGitCheckout = vi.mocked(gitCheckout);
const mockGitReset = vi.mocked(gitReset);
const mockLocalBranchExists = vi.mocked(localBranchExists);
const mockUpdateSubmodules = vi.mocked(updateSubmodules);

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
} {
  return {
    getPr: vi.fn(),
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

describe('pr checkout command', () => {
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

    mockDetectRepo.mockResolvedValue({
      success: true,
      info: {
        owner: 'owner',
        repo: 'repo',
        fullName: 'owner/repo',
        remoteUrl: 'https://github.com/owner/repo',
      },
      remoteName: 'origin',
      directory: '/test',
    });

    mockPrApi.getPr.mockResolvedValue(createMockPullRequest());
    mockGitFetch.mockResolvedValue(undefined);
    mockGitCheckout.mockResolvedValue(undefined);
    mockGitReset.mockResolvedValue(undefined);
    mockLocalBranchExists.mockResolvedValue(false);
    mockUpdateSubmodules.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('checks out PR to new branch', async () => {
      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockGitFetch).toHaveBeenCalledWith('origin', 'pull/42/head');
      expect(mockGitCheckout).toHaveBeenCalledWith('feature-branch', { create: true });
      expect(mockGitReset).toHaveBeenCalledWith('FETCH_HEAD', true);
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('updates existing branch when it exists', async () => {
      mockLocalBranchExists.mockResolvedValue(true);

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockGitCheckout).toHaveBeenCalledWith('feature-branch');
      expect(mockGitReset).toHaveBeenCalledWith('FETCH_HEAD', true);
    });

    it('uses custom branch name with --branch', async () => {
      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--branch', 'my-local-branch']);

      expect(mockGitCheckout).toHaveBeenCalledWith('my-local-branch', { create: true });
    });

    it('checks out in detached mode with --detach', async () => {
      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--detach']);

      expect(mockGitCheckout).toHaveBeenCalledWith('FETCH_HEAD', { detach: true });
      expect(mockGitReset).not.toHaveBeenCalled();
    });

    it('forces checkout with --force', async () => {
      mockLocalBranchExists.mockResolvedValue(true);

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--force']);

      expect(mockGitCheckout).toHaveBeenCalledWith('feature-branch', { force: true });
      expect(mockGitReset).toHaveBeenCalledWith('FETCH_HEAD', true);
    });

    it('updates submodules with --recurse-submodules', async () => {
      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--recurse-submodules']);

      expect(mockUpdateSubmodules).toHaveBeenCalled();
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.getPr).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('resolves PR from current branch when no argument given', async () => {
      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockResolvePrNumber).toHaveBeenCalledWith(
        undefined,
        'owner',
        'repo',
        expect.any(Function)
      );
    });

    it('uses detected remote name', async () => {
      mockDetectRepo.mockResolvedValue({
        success: true,
        info: {
          owner: 'owner',
          repo: 'repo',
          fullName: 'owner/repo',
          remoteUrl: 'https://github.com/owner/repo',
        },
        remoteName: 'upstream',
        directory: '/test',
      });

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockGitFetch).toHaveBeenCalledWith('upstream', 'pull/42/head');
    });

    it('handles reset failure gracefully on existing branch', async () => {
      mockLocalBranchExists.mockResolvedValue(true);
      mockGitReset.mockRejectedValueOnce(new Error('Reset failed'));

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not update branch')
      );
      // Should not set exit code for warning
      expect(process.exitCode).toBeUndefined();
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

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockGitFetch).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: No open PR found for current branch');
      expect(process.exitCode).toBe(1);
    });

    it('handles fetch error', async () => {
      mockGitFetch.mockRejectedValue(new Error('Failed to fetch'));

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Failed to fetch');
      expect(process.exitCode).toBe(1);
    });

    it('handles checkout error', async () => {
      mockGitCheckout.mockRejectedValue(new Error('Local changes would be overwritten'));

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Local changes would be overwritten');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when getting PR', async () => {
      mockPrApi.getPr.mockRejectedValue(new Error('PR not found'));

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: PR not found');
      expect(process.exitCode).toBe(1);
    });

    it('handles detectRepo failure gracefully', async () => {
      mockDetectRepo.mockResolvedValue({
        success: false,
        error: 'no-github-remote',
        directory: '/test',
      });

      const cmd = createCheckoutCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      // Should fall back to 'origin'
      expect(mockGitFetch).toHaveBeenCalledWith('origin', 'pull/42/head');
    });
  });
});
