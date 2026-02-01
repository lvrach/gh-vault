/**
 * PR checks command tests.
 *
 * Tests the `gh-vault pr checks` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createChecksCommand } from '../../../../domains/pr/cli/checks.js';
import type { PrChecksResult } from '../../../../domains/pr/types.js';
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

import { resolvePrNumber, resolveRepository } from '../../../../shared/repo.js';

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
  listPrChecks: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
} {
  return {
    listPrChecks: vi.fn(),
    listPrs: vi.fn(),
  };
}

function createMockChecksResult(overrides: Partial<PrChecksResult> = {}): PrChecksResult {
  return {
    sha: 'abc123def456',
    overallState: 'success',
    checkRuns: [
      {
        name: 'CI',
        status: 'completed',
        conclusion: 'success',
        detailsUrl: 'https://github.com/owner/repo/actions/runs/1',
        startedAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:05:00Z',
      },
    ],
    statuses: [
      {
        context: 'coverage',
        state: 'success',
        description: 'Coverage is 85%',
        targetUrl: 'https://codecov.io/gh/owner/repo',
      },
    ],
    passing: 2,
    failing: 0,
    pending: 0,
    total: 2,
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr checks command', () => {
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
    it('displays check status for PR', async () => {
      const checks = createMockChecksResult();
      mockPrApi.listPrChecks.mockResolvedValue(checks);

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockPrApi.listPrChecks).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        required: undefined,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('shows only required checks when --required is specified', async () => {
      const checks = createMockChecksResult();
      mockPrApi.listPrChecks.mockResolvedValue(checks);

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--required']);

      expect(mockPrApi.listPrChecks).toHaveBeenCalledWith(
        expect.objectContaining({
          required: true,
        })
      );
    });

    it('outputs JSON when --json is specified', async () => {
      const checks = createMockChecksResult();
      mockPrApi.listPrChecks.mockResolvedValue(checks);

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const checks = createMockChecksResult();
      mockPrApi.listPrChecks.mockResolvedValue(checks);

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--json', 'sha,overallState']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as Record<string, unknown>;
      expect(Object.keys(parsed)).toEqual(['sha', 'overallState']);
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/owner/repo/pull/42/checks');
      expect(mockPrApi.listPrChecks).not.toHaveBeenCalled();
    });

    it('sets exit code 1 when checks are failing', async () => {
      const checks = createMockChecksResult({
        overallState: 'failure',
        failing: 1,
        passing: 1,
        checkRuns: [
          {
            name: 'CI',
            status: 'completed',
            conclusion: 'failure',
            detailsUrl: null,
            startedAt: null,
            completedAt: null,
          },
        ],
      });
      mockPrApi.listPrChecks.mockResolvedValue(checks);

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42']);

      expect(process.exitCode).toBe(1);
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const checks = createMockChecksResult();
      mockPrApi.listPrChecks.mockResolvedValue(checks);

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.listPrChecks).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('resolves PR from current branch when no argument given', async () => {
      const checks = createMockChecksResult();
      mockPrApi.listPrChecks.mockResolvedValue(checks);

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test']);

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

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.listPrChecks).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: No open PR found for current branch'
      );
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--jq', '.sha']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: --jq requires --json to be specified'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockPrApi.listPrChecks.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });
  });

  // ============================================================================
  // Pending Checks
  // ============================================================================

  describe('pending checks', () => {
    it('shows pending state', async () => {
      const checks = createMockChecksResult({
        overallState: 'pending',
        pending: 1,
        passing: 1,
        checkRuns: [
          {
            name: 'CI',
            status: 'in_progress',
            conclusion: null,
            detailsUrl: null,
            startedAt: '2024-01-15T10:00:00Z',
            completedAt: null,
          },
        ],
      });
      mockPrApi.listPrChecks.mockResolvedValue(checks);

      const cmd = createChecksCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.print).toHaveBeenCalled();
      // Pending checks don't set exit code
      expect(process.exitCode).toBeUndefined();
    });
  });
});
