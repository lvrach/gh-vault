/**
 * Search issues command tests.
 *
 * Tests the `gh-vault search issues` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchApi } from '../../../../domains/search/api.js';
import { createIssuesCommand } from '../../../../domains/search/cli/issues.js';
import type { SearchIssue, SearchResult } from '../../../../domains/search/types.js';
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

function createMockSearchApi(): { searchIssues: ReturnType<typeof vi.fn> } {
  return {
    searchIssues: vi.fn(),
  };
}

function createMockSearchIssue(overrides: Partial<SearchIssue> = {}): SearchIssue {
  return {
    id: 1,
    number: 42,
    title: 'Bug in authentication',
    body: 'Issue description',
    state: 'open',
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    assignees: [],
    labels: [{ name: 'bug', color: 'd73a4a' }],
    commentsCount: 5,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T14:00:00Z',
    closedAt: null,
    htmlUrl: 'https://github.com/octocat/Hello-World/issues/42',
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    isPullRequest: false,
    isLocked: false,
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

describe('search issues command', () => {
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
    it('searches issues with query', async () => {
      const issues = [createMockSearchIssue({ id: 1 }), createMockSearchIssue({ id: 2 })];
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult(issues));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug']);

      expect(mockSearchApi.searchIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'bug',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('passes filter options to API', async () => {
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult([]));

      const cmd = createIssuesCommand(
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
        '--language',
        'TypeScript',
        '--limit',
        '50',
        '--sort',
        'created',
        '--order',
        'asc',
      ]);

      expect(mockSearchApi.searchIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'authentication',
          author: 'octocat',
          assignee: 'dev',
          label: ['bug', 'priority'],
          state: 'open',
          repo: ['owner/repo'],
          language: 'TypeScript',
          perPage: 50,
          sort: 'created',
          order: 'asc',
        })
      );
    });

    it('outputs JSON when --json flag is provided', async () => {
      const issues = [createMockSearchIssue()];
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult(issues));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const issues = [createMockSearchIssue({ number: 42, title: 'Test Issue' })];
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult(issues));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug', '--json', 'number,title']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({ number: 42, title: 'Test Issue' });
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/search?q=bug&type=issues');
      expect(mockSearchApi.searchIssues).not.toHaveBeenCalled();
    });

    it('handles empty search results', async () => {
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult([]));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'nonexistent-issue-12345']);

      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('handles search with include-prs flag', async () => {
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult([]));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug', '--include-prs']);

      expect(mockSearchApi.searchIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'bug',
          includePrs: true,
        })
      );
    });

    it('handles locked filter', async () => {
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult([]));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug', '--locked']);

      expect(mockSearchApi.searchIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          locked: true,
        })
      );
    });

    it('handles multiple query words', async () => {
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult([]));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authentication', 'bug', 'fix']);

      expect(mockSearchApi.searchIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'authentication bug fix',
        })
      );
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles API error', async () => {
      mockSearchApi.searchIssues.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug', '--jq', '.[0]']);

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
      const issues = [
        createMockSearchIssue({ number: 1, title: 'First' }),
        createMockSearchIssue({ number: 2, title: 'Second' }),
      ];
      mockSearchApi.searchIssues.mockResolvedValue(createMockSearchResult(issues));

      const cmd = createIssuesCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'bug', '--json', '--jq', '.[0].number']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('1');
    });
  });
});
