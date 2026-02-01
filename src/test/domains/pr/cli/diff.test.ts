/**
 * PR diff command tests.
 *
 * Tests the `gh-vault pr diff` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createDiffCommand } from '../../../../domains/pr/cli/diff.js';
import type { PrFile } from '../../../../domains/pr/types.js';
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
  listPrFiles: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
} {
  return {
    listPrFiles: vi.fn(),
    listPrs: vi.fn(),
  };
}

function createMockPrFile(overrides: Partial<PrFile> = {}): PrFile {
  return {
    filename: 'src/index.ts',
    status: 'modified',
    additions: 10,
    deletions: 5,
    patch: '@@ -1,5 +1,10 @@\n+added line\n-removed line',
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr diff command', () => {
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
    it('displays file changes summary', async () => {
      const files = [
        createMockPrFile({ filename: 'src/index.ts', additions: 10, deletions: 5 }),
        createMockPrFile({ filename: 'src/utils.ts', additions: 20, deletions: 0 }),
      ];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockPrApi.listPrFiles).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('shows only file names when --name-only is specified', async () => {
      const files = [
        createMockPrFile({ filename: 'src/index.ts' }),
        createMockPrFile({ filename: 'src/utils.ts' }),
      ];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--name-only']);

      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('shows full patch output when --patch is specified', async () => {
      const files = [
        createMockPrFile({
          filename: 'src/index.ts',
          patch: '@@ -1,5 +1,10 @@\n+added line',
        }),
      ];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--patch']);

      // Should print diff header and patch content
      expect(mockOutput.print).toHaveBeenCalledWith('diff --git a/src/index.ts b/src/index.ts');
      expect(mockOutput.print).toHaveBeenCalledWith('@@ -1,5 +1,10 @@\n+added line');
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/owner/repo/pull/42/files');
      expect(mockPrApi.listPrFiles).not.toHaveBeenCalled();
    });

    it('forces color with --color always', async () => {
      const files = [createMockPrFile()];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--color', 'always']);

      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('disables color with --color never', async () => {
      const files = [createMockPrFile()];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--color', 'never']);

      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const files = [createMockPrFile()];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--repo', 'other-owner/other-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.listPrFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('resolves PR from current branch when no argument given', async () => {
      const files = [createMockPrFile()];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockResolvePrNumber).toHaveBeenCalledWith(
        undefined,
        'owner',
        'repo',
        expect.any(Function)
      );
    });

    it('handles empty diff (no changed files)', async () => {
      mockPrApi.listPrFiles.mockResolvedValue([]);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('handles files without patches', async () => {
      const files = [createMockPrFile({ filename: 'binary.png', patch: undefined })];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--patch']);

      // Should not crash when patch is undefined
      expect(process.exitCode).toBeUndefined();
    });
  });

  // ============================================================================
  // File Status Types
  // ============================================================================

  describe('file status types', () => {
    it('shows added files', async () => {
      const files = [createMockPrFile({ filename: 'new-file.ts', status: 'added' })];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('shows removed files', async () => {
      const files = [createMockPrFile({ filename: 'deleted.ts', status: 'removed' })];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('shows renamed files', async () => {
      const files = [createMockPrFile({ filename: 'renamed.ts', status: 'renamed' })];
      mockPrApi.listPrFiles.mockResolvedValue(files);

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.print).toHaveBeenCalled();
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

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.listPrFiles).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: No open PR found for current branch'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockPrApi.listPrFiles.mockRejectedValue(new Error('PR not found'));

      const cmd = createDiffCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: PR not found');
      expect(process.exitCode).toBe(1);
    });
  });
});
