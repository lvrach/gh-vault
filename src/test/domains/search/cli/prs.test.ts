/**
 * Search prs command tests.
 *
 * Tests the `gh-vault search prs` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchApi } from '../../../../domains/search/api.js';
import { createPrsCommand } from '../../../../domains/search/cli/prs.js';
import type { SearchPullRequest, SearchResult } from '../../../../domains/search/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('open', () => ({ default: vi.fn() }));

import openModule from 'open';

const mockOpen = vi.mocked(openModule);

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

function createMockSearchApi(): { searchPrs: ReturnType<typeof vi.fn> } {
  return {
    searchPrs: vi.fn(),
  };
}

function createMockSearchPr(overrides: Partial<SearchPullRequest> = {}): SearchPullRequest {
  return {
    id: 1,
    number: 42,
    title: 'Fix authentication bug',
    body: 'PR description',
    state: 'open',
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    assignees: [],
    labels: [{ name: 'bug', color: 'd73a4a' }],
    commentsCount: 5,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T14:00:00Z',
    closedAt: null,
    htmlUrl: 'https://github.com/octocat/Hello-World/pull/42',
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    isPullRequest: true,
    isLocked: false,
    isDraft: false,
    ...overrides,
  };
}

function createMockSearchResult<T>(items: T[], totalCount?: number): SearchResult<T> {
  return {
    totalCount: totalCount ?? items.length,
    incompleteResults: false,
    items,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('search prs command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockSearchApi: ReturnType<typeof createMockSearchApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockSearchApi = createMockSearchApi();
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('searches PRs with query', async () => {
      const prs = [createMockSearchPr({ id: 1 }), createMockSearchPr({ id: 2 })];
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult(prs));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix']);

      expect(mockSearchApi.searchPrs).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'fix',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('passes filter options to API', async () => {
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult([]));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        'authentication',
        '--author',
        'octocat',
        '--assignee',
        'dev',
        '--label',
        'bug',
        '--label',
        'priority',
        '--state',
        'open',
        '--repo',
        'owner/repo',
        '--base',
        'main',
        '--head',
        'feature',
        '--draft',
        '--merged',
        '--limit',
        '50',
        '--sort',
        'created',
        '--order',
        'asc',
      ]);

      expect(mockSearchApi.searchPrs).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'authentication',
          author: 'octocat',
          assignee: 'dev',
          label: ['bug', 'priority'],
          state: 'open',
          repo: ['owner/repo'],
          base: 'main',
          head: 'feature',
          draft: true,
          merged: true,
          perPage: 50,
          sort: 'created',
          order: 'asc',
        })
      );
    });

    it('outputs JSON when --json flag is provided', async () => {
      const prs = [createMockSearchPr()];
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult(prs));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const prs = [createMockSearchPr({ number: 42, title: 'Test PR', isDraft: false })];
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult(prs));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--json', 'number,title,isDraft']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({ number: 42, title: 'Test PR', isDraft: false });
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/search?q=fix&type=pullrequests');
      expect(mockSearchApi.searchPrs).not.toHaveBeenCalled();
    });

    it('handles empty search results', async () => {
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult([]));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'nonexistent-pr-12345']);

      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('handles review filter options', async () => {
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult([]));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        'fix',
        '--review',
        'approved',
        '--reviewed-by',
        'reviewer',
        '--review-requested',
        'octocat',
      ]);

      expect(mockSearchApi.searchPrs).toHaveBeenCalledWith(
        expect.objectContaining({
          review: 'approved',
          reviewedBy: 'reviewer',
          reviewRequested: 'octocat',
        })
      );
    });

    it('handles checks filter', async () => {
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult([]));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--checks', 'success']);

      expect(mockSearchApi.searchPrs).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: 'success',
        })
      );
    });

    it('handles multiple query words', async () => {
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult([]));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', 'authentication', 'bug']);

      expect(mockSearchApi.searchPrs).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'fix authentication bug',
        })
      );
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles API error', async () => {
      mockSearchApi.searchPrs.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--jq', '.[0]']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: --jq requires --json to be specified');
      expect(process.exitCode).toBe(1);
    });
  });

  // ============================================================================
  // jq Filtering
  // ============================================================================

  describe('jq filtering', () => {
    it('filters output with jq expression', async () => {
      const prs = [
        createMockSearchPr({ number: 1, title: 'First' }),
        createMockSearchPr({ number: 2, title: 'Second' }),
      ];
      mockSearchApi.searchPrs.mockResolvedValue(createMockSearchResult(prs));

      const cmd = createPrsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--json', '--jq', '.[0].number']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('1');
    });
  });
});
