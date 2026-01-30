/**
 * Run delete command tests.
 *
 * Tests the `gh-vault run delete` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunApi } from '../../../../domains/run/api.js';
import { createDeleteCommand } from '../../../../domains/run/cli/delete.js';
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
  deleteRun: ReturnType<typeof vi.fn>;
} {
  return {
    deleteRun: vi.fn(),
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('run delete command', () => {
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
    it('deletes a workflow run', async () => {
      mockRunApi.deleteRun.mockResolvedValue(undefined);

      const cmd = createDeleteCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockRunApi.deleteRun).toHaveBeenCalledWith({
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
      mockRunApi.deleteRun.mockResolvedValue(undefined);

      const cmd = createDeleteCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockRunApi.deleteRun).toHaveBeenCalledWith(
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

      const cmd = createDeleteCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles invalid run ID', async () => {
      const cmd = createDeleteCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', 'abc']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Invalid run ID "abc"');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockRunApi.deleteRun.mockRejectedValue(new Error('Run not found'));

      const cmd = createDeleteCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Run not found');
      expect(process.exitCode).toBe(1);
    });

    it('handles permission denied error', async () => {
      mockRunApi.deleteRun.mockRejectedValue(new Error('Must have admin rights to Repository'));

      const cmd = createDeleteCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
      await cmd.parseAsync(['node', 'test', '12345678']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Must have admin rights to Repository');
      expect(process.exitCode).toBe(1);
    });
  });
});
