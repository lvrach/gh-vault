/**
 * Run rerun command tests.
 *
 * Tests the `gh-vault run rerun` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunApi } from '../../../../domains/run/api.js';
import { createRerunCommand } from '../../../../domains/run/cli/rerun.js';
import type { RunJob, RunListItem } from '../../../../domains/run/types.js';
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
  getJob: ReturnType<typeof vi.fn>;
  rerunRun: ReturnType<typeof vi.fn>;
  rerunFailedJobs: ReturnType<typeof vi.fn>;
  rerunJob: ReturnType<typeof vi.fn>;
} {
  return {
    getRun: vi.fn(),
    getJob: vi.fn(),
    rerunRun: vi.fn(),
    rerunFailedJobs: vi.fn(),
    rerunJob: vi.fn(),
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
    status: 'completed',
    conclusion: 'failure',
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

function createMockRunJob(overrides: Partial<RunJob> = {}): RunJob {
  return {
    id: 999,
    runId: 12_345_678,
    name: 'build',
    status: 'completed',
    conclusion: 'failure',
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:05:00Z',
    htmlUrl: 'https://github.com/owner/repo/actions/runs/12345678/job/999',
    steps: [],
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('run rerun command', () => {
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
    it('reruns entire workflow', async () => {
      const run = createMockRunListItem();
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.rerunRun.mockResolvedValue(undefined);

      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockRunApi.getRun).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        runId: 12_345_678,
      });
      expect(mockRunApi.rerunRun).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        runId: 12_345_678,
        enableDebugLogging: undefined,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('reruns with debug logging enabled', async () => {
      const run = createMockRunListItem();
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.rerunRun.mockResolvedValue(undefined);

      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--debug']);

      expect(mockRunApi.rerunRun).toHaveBeenCalledWith(
        expect.objectContaining({
          enableDebugLogging: true,
        })
      );
    });

    it('reruns only failed jobs when --failed is specified', async () => {
      const run = createMockRunListItem();
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.rerunFailedJobs.mockResolvedValue(undefined);

      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--failed']);

      expect(mockRunApi.rerunFailedJobs).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        runId: 12_345_678,
        enableDebugLogging: undefined,
      });
      expect(mockRunApi.rerunRun).not.toHaveBeenCalled();
    });

    it('reruns specific job when --job is specified', async () => {
      const run = createMockRunListItem();
      const job = createMockRunJob({ id: 999, name: 'test' });
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.getJob.mockResolvedValue(job);
      mockRunApi.rerunJob.mockResolvedValue(undefined);

      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--job', '999']);

      expect(mockRunApi.getJob).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        jobId: 999,
      });
      expect(mockRunApi.rerunJob).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        jobId: 999,
        enableDebugLogging: undefined,
      });
      expect(mockRunApi.rerunRun).not.toHaveBeenCalled();
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const run = createMockRunListItem();
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.rerunRun.mockResolvedValue(undefined);

      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockRunApi.rerunRun).toHaveBeenCalledWith(
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

      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles invalid run ID', async () => {
      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', 'abc']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Invalid run ID "abc"');
      expect(process.exitCode).toBe(1);
    });

    it('handles invalid job ID', async () => {
      const run = createMockRunListItem();
      mockRunApi.getRun.mockResolvedValue(run);

      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--job', 'abc']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Invalid job ID "abc"');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      const run = createMockRunListItem();
      mockRunApi.getRun.mockResolvedValue(run);
      mockRunApi.rerunRun.mockRejectedValue(new Error('Cannot rerun - workflow is disabled'));

      const cmd = createRerunCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: Cannot rerun - workflow is disabled'
      );
      expect(process.exitCode).toBe(1);
    });
  });
});
