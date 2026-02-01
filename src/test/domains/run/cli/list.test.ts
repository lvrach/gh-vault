/**
 * Run list command tests.
 *
 * Tests the `gh-vault run list` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunApi } from '../../../../domains/run/api.js';
import { createListCommand } from '../../../../domains/run/cli/list.js';
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
  listRuns: ReturnType<typeof vi.fn>;
  getWorkflowIdByName: ReturnType<typeof vi.fn>;
} {
  return {
    listRuns: vi.fn(),
    getWorkflowIdByName: vi.fn(),
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
    conclusion: 'success',
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

describe('run list command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockRunApi: ReturnType<typeof createMockRunApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockRunApi = createMockRunApi();

    // Default mock setup: repository resolves successfully
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
    it('lists runs with default options', async () => {
      const runs = [createMockRunListItem({ id: 1 }), createMockRunListItem({ id: 2 })];
      mockRunApi.listRuns.mockResolvedValue(runs);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockRunApi.listRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          perPage: 20,
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('passes filter options to API', async () => {
      mockRunApi.listRuns.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        '--branch',
        'feature',
        '--status',
        'completed',
        '--event',
        'push',
        '--user',
        'octocat',
        '--commit',
        'abc123',
        '--created',
        '>2024-01-01',
        '--limit',
        '50',
      ]);

      expect(mockRunApi.listRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          branch: 'feature',
          status: 'completed',
          event: 'push',
          actor: 'octocat',
          headSha: 'abc123',
          created: '>2024-01-01',
          perPage: 50,
        })
      );
    });

    it('resolves workflow name to ID when --workflow is specified', async () => {
      mockRunApi.getWorkflowIdByName.mockResolvedValue(123);
      mockRunApi.listRuns.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--workflow', 'CI']);

      expect(mockRunApi.getWorkflowIdByName).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        name: 'CI',
      });
      expect(mockRunApi.listRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 123,
        })
      );
    });

    it('uses numeric workflow ID directly when provided', async () => {
      mockRunApi.listRuns.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--workflow', '456']);

      expect(mockRunApi.getWorkflowIdByName).not.toHaveBeenCalled();
      expect(mockRunApi.listRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 456,
        })
      );
    });

    it('outputs JSON when --json flag is provided', async () => {
      const runs = [createMockRunListItem()];
      mockRunApi.listRuns.mockResolvedValue(runs);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const runs = [createMockRunListItem({ id: 42, status: 'completed' })];
      mockRunApi.listRuns.mockResolvedValue(runs);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--json', 'databaseId,status']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({ databaseId: 42, status: 'completed' });
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'custom-owner',
        repo: 'custom-repo',
      });
      mockRunApi.listRuns.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--repo', 'custom-owner/custom-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('custom-owner/custom-repo');
      expect(mockRunApi.listRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'custom-owner',
          repo: 'custom-repo',
        })
      );
    });

    it('handles empty run list', async () => {
      mockRunApi.listRuns.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.print).toHaveBeenCalled();
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

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockRunApi.listRuns).not.toHaveBeenCalled();
    });

    it('handles API error', async () => {
      mockRunApi.listRuns.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('handles invalid status value', async () => {
      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--status', 'invalid']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid status "invalid"')
      );
      expect(process.exitCode).toBe(1);
      expect(mockRunApi.listRuns).not.toHaveBeenCalled();
    });

    it('handles workflow not found', async () => {
      mockRunApi.getWorkflowIdByName.mockResolvedValue(null);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--workflow', 'NonExistent']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Workflow "NonExistent" not found');
      expect(process.exitCode).toBe(1);
      expect(mockRunApi.listRuns).not.toHaveBeenCalled();
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--jq', '.[0]']);

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
      const runs = [
        createMockRunListItem({ id: 1, status: 'completed' }),
        createMockRunListItem({ id: 2, status: 'in_progress' }),
      ];
      mockRunApi.listRuns.mockResolvedValue(runs);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockRunApi as unknown as RunApi
      );
      await cmd.parseAsync(['node', 'test', '--json', '--jq', '.[0].databaseId']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('1');
    });
  });
});
