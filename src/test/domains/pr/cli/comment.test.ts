/**
 * PR comment command tests.
 *
 * Tests the `gh-vault pr comment` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createCommentCommand } from '../../../../domains/pr/cli/comment.js';
import type { PrComment } from '../../../../domains/pr/types.js';
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
  createPrComment: ReturnType<typeof vi.fn>;
  updatePrComment: ReturnType<typeof vi.fn>;
  deletePrComment: ReturnType<typeof vi.fn>;
  listPrComments: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
  listPrs: ReturnType<typeof vi.fn>;
} {
  return {
    createPrComment: vi.fn(),
    updatePrComment: vi.fn(),
    deletePrComment: vi.fn(),
    listPrComments: vi.fn(),
    getCurrentUser: vi.fn(),
    listPrs: vi.fn(),
  };
}

function createMockComment(overrides: Partial<PrComment> = {}): PrComment {
  return {
    id: 1,
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    body: 'Test comment',
    createdAt: '2024-01-15T10:00:00Z',
    htmlUrl: 'https://github.com/owner/repo/pull/42#issuecomment-1',
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr comment command', () => {
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
  // Success Cases - Creating Comments
  // ============================================================================

  describe('creating comments', () => {
    it('creates a comment with --body', async () => {
      const comment = createMockComment({ body: 'My comment' });
      mockPrApi.createPrComment.mockResolvedValue(comment);

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--body', 'My comment']);

      expect(mockPrApi.createPrComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issueNumber: 42,
        body: 'My comment',
      });
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--web']);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://github.com/owner/repo/pull/42#issuecomment-new'
      );
      expect(mockPrApi.createPrComment).not.toHaveBeenCalled();
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const comment = createMockComment();
      mockPrApi.createPrComment.mockResolvedValue(comment);

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        '42',
        '--repo',
        'other-owner/other-repo',
        '--body',
        'comment',
      ]);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.createPrComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });
  });

  // ============================================================================
  // Success Cases - Editing Comments
  // ============================================================================

  describe('editing comments', () => {
    it('edits last comment with --edit-last and --body', async () => {
      const existingComment = createMockComment({ id: 123, body: 'Old comment' });
      const updatedComment = createMockComment({ id: 123, body: 'New comment' });
      mockPrApi.listPrComments.mockResolvedValue([existingComment]);
      mockPrApi.updatePrComment.mockResolvedValue(updatedComment);

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--edit-last', '--body', 'New comment']);

      expect(mockPrApi.getCurrentUser).toHaveBeenCalled();
      expect(mockPrApi.listPrComments).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issueNumber: 42,
        perPage: 100,
      });
      expect(mockPrApi.updatePrComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        commentId: 123,
        body: 'New comment',
      });
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('errors when --edit-last without body', async () => {
      const existingComment = createMockComment({ id: 123 });
      mockPrApi.listPrComments.mockResolvedValue([existingComment]);

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--edit-last']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: New comment body is required (-b or -F) when using --edit-last'
      );
      expect(process.exitCode).toBe(1);
    });

    it('errors when no comments by user for --edit-last', async () => {
      const otherUserComment = createMockComment({
        user: { login: 'other-user', htmlUrl: 'https://github.com/other-user' },
      });
      mockPrApi.listPrComments.mockResolvedValue([otherUserComment]);

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--edit-last', '--body', 'New']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: No comments found by @octocat on this pull request'
      );
      expect(process.exitCode).toBe(1);
    });
  });

  // ============================================================================
  // Success Cases - Deleting Comments
  // ============================================================================

  describe('deleting comments', () => {
    it('deletes last comment with --delete-last and --yes', async () => {
      const existingComment = createMockComment({ id: 456 });
      mockPrApi.listPrComments.mockResolvedValue([existingComment]);
      mockPrApi.deletePrComment.mockResolvedValue(undefined);

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--delete-last', '--yes']);

      expect(mockPrApi.getCurrentUser).toHaveBeenCalled();
      expect(mockPrApi.deletePrComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        commentId: 456,
      });
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('errors when no comments by user for --delete-last', async () => {
      mockPrApi.listPrComments.mockResolvedValue([]);

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--delete-last', '--yes']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: No comments found by @octocat on this pull request'
      );
      expect(process.exitCode).toBe(1);
    });

    it('finds user comments among multiple comments', async () => {
      const otherComment = createMockComment({
        id: 1,
        user: { login: 'other', htmlUrl: '' },
      });
      const userComment = createMockComment({ id: 2 }); // login: 'octocat'
      mockPrApi.listPrComments.mockResolvedValue([otherComment, userComment]);
      mockPrApi.deletePrComment.mockResolvedValue(undefined);

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--delete-last', '--yes']);

      expect(mockPrApi.deletePrComment).toHaveBeenCalledWith(
        expect.objectContaining({
          commentId: 2,
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

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--body', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.createPrComment).not.toHaveBeenCalled();
    });

    it('handles PR number resolution failure', async () => {
      mockResolvePrNumber.mockResolvedValue({
        success: false,
        error: 'No open PR found for current branch',
      });

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--body', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: No open PR found for current branch'
      );
      expect(process.exitCode).toBe(1);
    });

    it('requires body when creating comment', async () => {
      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: Comment body is required (-b or -F)'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when creating comment', async () => {
      mockPrApi.createPrComment.mockRejectedValue(new Error('Permission denied'));

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--body', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Permission denied');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when updating comment', async () => {
      const existingComment = createMockComment({ id: 123 });
      mockPrApi.listPrComments.mockResolvedValue([existingComment]);
      mockPrApi.updatePrComment.mockRejectedValue(new Error('Comment not found'));

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--edit-last', '--body', 'New']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Comment not found');
      expect(process.exitCode).toBe(1);
    });

    it('handles API error when deleting comment', async () => {
      const existingComment = createMockComment({ id: 123 });
      mockPrApi.listPrComments.mockResolvedValue([existingComment]);
      mockPrApi.deletePrComment.mockRejectedValue(new Error('Cannot delete'));

      const cmd = createCommentCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '42', '--delete-last', '--yes']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Cannot delete');
      expect(process.exitCode).toBe(1);
    });
  });
});
