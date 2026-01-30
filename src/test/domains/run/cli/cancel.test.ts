/**
 * Run cancel command tests.
 *
 * Tests the `gh-vault run cancel` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunApi } from '../../../../domains/run/api.js';
import { createCancelCommand } from '../../../../domains/run/cli/cancel.js';
import type { RunListItem } from '../../../../domains/run/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('open', () => ({ default: vi.fn() }));
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

function createMockRunApi(): {
  getRun: ReturnType<typeof vi.fn>;
  cancelRun: ReturnType<typeof vi.fn>;
} {
  return {
    getRun: vi.fn(),
    cancelRun: vi.fn(),
  };
}

function createMockRunListItem(overrides: Partial<RunListItem> = {}): RunListItem {
  return {
    id: 12_345_678,
    name: 'CI',
    displayTitle: 'Update README.md',
    headBranch: 'main',
    headSha: 'abc123def456',
    event: 'push',
    status: 'in_progress',
    conclusion: null,
    workflowId: 100,
    workflowName: 'CI',
    runNumber: 42,
    runAttempt: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:05:00Z',
    htmlUrl: 'https://github.com/owner/repo/actions/runs/12345678',
    actor: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('run cancel command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockRunApi: ReturnType<typeof createMockRunApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockRunApi = createMockRunApi();

    mockResolveRepository.mockResolvedValue({
      success: true,
      owner: 'owner',
      repo: 'repo',
    });
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('cancels a running workflow', async () => {
      const run = createMockRunListItem({ status: 'in_progress' });
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.cancelRun.mockResolvedValue(undefined);

      const cmd = createCancelCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockRunApi.getRun).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        runId: 12_345_678,
      });
      expect(mockRunApi.cancelRun).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        runId: 12_345_678,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const run = createMockRunListItem({ status: 'in_progress' });
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.cancelRun.mockResolvedValue(undefined);

      const cmd = createCancelCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockRunApi.cancelRun).toHaveBeenCalledWith(
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

      const cmd = createCancelCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles invalid run ID', async () => {
      const cmd = createCancelCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', 'abc']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Invalid run ID "abc"');
      expect(process.exitCode).toBe(1);
    });

    it('handles already completed run', async () => {
      const run = createMockRunListItem({ status: 'completed', conclusion: 'success' });
      mockRunApi.getRun.mockResolvedValue(run);

      const cmd = createCancelCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Run #42 is already completed');
      expect(process.exitCode).toBe(1);
      expect(mockRunApi.cancelRun).not.toHaveBeenCalled();
    });

    it('handles API error', async () => {
      const run = createMockRunListItem({ status: 'in_progress' });
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.cancelRun.mockRejectedValue(new Error('Permission denied'));

      const cmd = createCancelCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Permission denied');
      expect(process.exitCode).toBe(1);
    });

    it('handles 409 conflict error for already completed run', async () => {
      const run = createMockRunListItem({ status: 'in_progress' });
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.cancelRun.mockRejectedValue(new Error('409 Conflict'));

      const cmd = createCancelCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Cannot cancel - run has already completed');
      expect(process.exitCode).toBe(1);
    });
  });
});
