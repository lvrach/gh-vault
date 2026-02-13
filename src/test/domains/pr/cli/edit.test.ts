/**
 * PR edit command tests.
 *
 * Tests the `gh-vault pr edit` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createEditCommand } from '../../../../domains/pr/cli/edit.js';
import type { EditPrResult } from '../../../../domains/pr/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
  resolvePrNumber: vi.fn(),
}));

import { resolvePrNumber, resolveRepository } from '../../../../shared/repo.js';

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
  editPr: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
} {
  return {
    editPr: vi.fn(),
    listPrs: vi.fn(),
    getCurrentUser: vi.fn(),
  };
}

function createMockEditResult(overrides: Partial<EditPrResult> = {}): EditPrResult {
  return {
    number: 42,
    title: 'Updated PR',
    htmlUrl: 'https://github.com/owner/repo/pull/42',
    updatedFields: ['title'],
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr edit command', () => {
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

    mockPrApi.getCurrentUser.mockResolvedValue('octocat');
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('edits PR title', async () => {
      const result = createMockEditResult({ updatedFields: ['title'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--title', 'New Title']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          pullNumber: 42,
          title: 'New Title',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('edits PR body', async () => {
      const result = createMockEditResult({ updatedFields: ['body'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--body', 'New description']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'New description',
        })
      );
    });

    it('changes base branch', async () => {
      const result = createMockEditResult({ updatedFields: ['base'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--base', 'develop']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          base: 'develop',
        })
      );
    });

    it('adds labels', async () => {
      const result = createMockEditResult({ updatedFields: ['labels (added)'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--add-label', 'bug', '--add-label', 'urgent']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          addLabels: ['bug', 'urgent'],
        })
      );
    });

    it('removes labels', async () => {
      const result = createMockEditResult({ updatedFields: ['labels (removed)'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--remove-label', 'wontfix']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          removeLabels: ['wontfix'],
        })
      );
    });

    it('adds assignees with @me resolution', async () => {
      const result = createMockEditResult({ updatedFields: ['assignees (added)'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync([
        'node',
        'test',
        '42',
        '--add-assignee',
        '@me',
        '--add-assignee',
        'user2',
      ]);

      expect(mockPrApi.getCurrentUser).toHaveBeenCalled();
      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          addAssignees: ['octocat', 'user2'],
        })
      );
    });

    it('removes assignees', async () => {
      const result = createMockEditResult({ updatedFields: ['assignees (removed)'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--remove-assignee', 'user1']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          removeAssignees: ['user1'],
        })
      );
    });

    it('adds reviewers', async () => {
      const result = createMockEditResult({ updatedFields: ['reviewers (added)'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--add-reviewer', 'reviewer1']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          addReviewers: ['reviewer1'],
        })
      );
    });

    it('adds comma-separated reviewers', async () => {
      const result = createMockEditResult({ updatedFields: ['reviewers (added)'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--add-reviewer', 'reviewer1,reviewer2']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          addReviewers: ['reviewer1', 'reviewer2'],
        })
      );
    });

    it('removes reviewers', async () => {
      const result = createMockEditResult({ updatedFields: ['reviewers (removed)'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--remove-reviewer', 'reviewer1']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          removeReviewers: ['reviewer1'],
        })
      );
    });

    it('sets milestone', async () => {
      const result = createMockEditResult({ updatedFields: ['milestone'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--milestone', 'v1.0']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          milestone: 'v1.0',
        })
      );
    });

    it('removes milestone', async () => {
      const result = createMockEditResult({ updatedFields: ['milestone (removed)'] });
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--remove-milestone']);

      expect(mockPrApi.editPr).toHaveBeenCalledWith(
        expect.objectContaining({
          removeMilestone: true,
        })
      );
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const result = createMockEditResult();
      mockPrApi.editPr.mockResolvedValue(result);

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync([
        'node',
        'test',
        '42',
        '--repo',
        'other-owner/other-repo',
        '--title',
        'New title',
      ]);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.editPr).toHaveBeenCalledWith(
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

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--title', 'Test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.editPr).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '--title', 'Test']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: No open PR found for current branch'
      );
      expect(process.exitCode).toBe(1);
    });

    it('requires at least one edit option', async () => {
      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: No changes specified. Use --help to see available options.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockPrApi.editPr.mockRejectedValue(new Error('Permission denied'));

      const cmd = createEditCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '42', '--title', 'Test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Permission denied');
      expect(process.exitCode).toBe(1);
    });
  });
});
