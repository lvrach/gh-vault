/**
 * Run view command tests.
 *
 * Tests the `gh-vault run view` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunApi } from '../../../../domains/run/api.js';
import { createViewCommand } from '../../../../domains/run/cli/view.js';
import type { RunDetail, RunJob } from '../../../../domains/run/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('open', () => ({ default: vi.fn() }));
vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
}));

import openModule from 'open';

import { resolveRepository } from '../../../../shared/repo.js';

const mockOpen = vi.mocked(openModule);
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
  getRunWithJobs: ReturnType<typeof vi.fn>;
  getJob: ReturnType<typeof vi.fn>;
  getJobLogs: ReturnType<typeof vi.fn>;
} {
  return {
    getRunWithJobs: vi.fn(),
    getJob: vi.fn(),
    getJobLogs: vi.fn(),
  };
}

function createMockRunJob(overrides: Partial<RunJob> = {}): RunJob {
  return {
    id: 999,
    runId: 12_345_678,
    name: 'build',
    status: 'completed',
    conclusion: 'success',
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:05:00Z',
    htmlUrl: 'https://github.com/owner/repo/actions/runs/12345678/job/999',
    steps: [
      {
        name: 'Checkout',
        status: 'completed',
        conclusion: 'success',
        number: 1,
        startedAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:01:00Z',
      },
    ],
    ...overrides,
  };
}

function createMockRunDetail(overrides: Partial<RunDetail> = {}): RunDetail {
  return {
    id: 12_345_678,
    name: 'CI',
    displayTitle: 'Update README.md',
    headBranch: 'main',
    headSha: 'abc123def456',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
    workflowId: 100,
    workflowName: 'CI',
    runNumber: 42,
    runAttempt: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:05:00Z',
    htmlUrl: 'https://github.com/owner/repo/actions/runs/12345678',
    actor: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    jobs: [createMockRunJob()],
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('run view command', () => {
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
    it('displays run details', async () => {
      const run = createMockRunDetail();
      mockRunApi.getRunWithJobs.mockResolvedValue(run);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockRunApi.getRunWithJobs).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        runId: 12_345_678,
        attempt: undefined,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('displays run for specific attempt', async () => {
      const run = createMockRunDetail({ runAttempt: 2 });
      mockRunApi.getRunWithJobs.mockResolvedValue(run);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--attempt', '2']);

      expect(mockRunApi.getRunWithJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 12_345_678,
          attempt: 2,
        })
      );
    });

    it('displays job details when --job is specified', async () => {
      const job = createMockRunJob({ id: 999, name: 'test' });
      mockRunApi.getJob.mockResolvedValue(job);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--job', '999']);

      expect(mockRunApi.getJob).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        jobId: 999,
      });
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is provided', async () => {
      const run = createMockRunDetail();
      mockRunApi.getRunWithJobs.mockResolvedValue(run);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--json']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const run = createMockRunDetail({ id: 42, status: 'completed' });
      mockRunApi.getRunWithJobs.mockResolvedValue(run);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--json', 'databaseId,status']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as Record<string, unknown>;
      expect(parsed).toEqual({ databaseId: 42, status: 'completed' });
    });

    it('opens browser when --web is specified', async () => {
      const run = createMockRunDetail();
      mockRunApi.getRunWithJobs.mockResolvedValue(run);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/owner/repo/actions/runs/12345678');
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const run = createMockRunDetail();
      mockRunApi.getRunWithJobs.mockResolvedValue(run);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockRunApi.getRunWithJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('sets exit code when --exit-status and run failed', async () => {
      const run = createMockRunDetail({ conclusion: 'failure' });
      mockRunApi.getRunWithJobs.mockResolvedValue(run);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--exit-status']);

      expect(process.exitCode).toBe(1);
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

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('requires run-id argument', async () => {
      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: run-id is required');
      expect(process.exitCode).toBe(1);
    });

    it('handles invalid run ID', async () => {
      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', 'abc']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Invalid run ID "abc"');
      expect(process.exitCode).toBe(1);
    });

    it('handles invalid job ID', async () => {
      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--job', 'abc']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Invalid job ID "abc"');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRunApi.getRunWithJobs.mockRejectedValue(new Error('Run not found'));

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Run not found');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '12345678', '--jq', '.status']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: --jq requires --json to be specified'
      );
      expect(process.exitCode).toBe(1);
    });
  });

  // ============================================================================
  // jq Filtering
  // ============================================================================

  describe('jq filtering', () => {
    it('filters output with jq expression', async () => {
      const run = createMockRunDetail({ id: 42, status: 'completed' });
      mockRunApi.getRunWithJobs.mockResolvedValue(run);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--json', '--jq', '.databaseId']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('42');
    });
  });
});
