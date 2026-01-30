/**
 * Search commits command tests.
 *
 * Tests the `gh-vault search commits` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchApi } from '../../../../domains/search/api.js';
import { createCommitsCommand } from '../../../../domains/search/cli/commits.js';
import type { SearchCommit, SearchResult } from '../../../../domains/search/types.js';
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

function createMockSearchApi(): { searchCommits: ReturnType<typeof vi.fn> } {
  return {
    searchCommits: vi.fn(),
  };
}

function createMockSearchCommit(overrides: Partial<SearchCommit> = {}): SearchCommit {
  return {
    sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    htmlUrl:
      'https://github.com/octocat/Hello-World/commit/6dcb09b5b57875f334f61aebed695e2e4193db5e',
    message: 'Fix authentication bug',
    author: { name: 'The Octocat', email: 'octocat@github.com', date: '2024-01-15T10:00:00Z' },
    committer: { name: 'The Octocat', email: 'octocat@github.com', date: '2024-01-15T10:00:00Z' },
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    parents: [{ sha: 'abc123' }],
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

describe('search commits command', () => {
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
    it('searches commits with query', async () => {
      const commits = [createMockSearchCommit({ sha: 'abc123' }), createMockSearchCommit({ sha: 'def456' })];
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult(commits));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix']);

      expect(mockSearchApi.searchCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'fix',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('passes filter options to API', async () => {
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        'authentication',
        '--author',
        'octocat',
        '--committer',
        'dev',
        '--repo',
        'owner/repo',
        '--owner',
        'octocat',
        '--author-date',
        '>2024-01-01',
        '--committer-date',
        '<2024-12-31',
        '--limit',
        '50',
        '--sort',
        'author-date',
        '--order',
        'asc',
      ]);

      expect(mockSearchApi.searchCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'authentication',
          author: 'octocat',
          committer: 'dev',
          repo: ['owner/repo'],
          owner: ['octocat'],
          authorDate: '>2024-01-01',
          committerDate: '<2024-12-31',
          perPage: 50,
          sort: 'author-date',
          order: 'asc',
        })
      );
    });

    it('outputs JSON when --json flag is provided', async () => {
      const commits = [createMockSearchCommit()];
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult(commits));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const commits = [createMockSearchCommit({ sha: 'abc123', message: 'Test commit' })];
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult(commits));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--json', 'sha,repository']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({
        sha: 'abc123',
        repository: 'octocat/Hello-World',
      });
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/search?q=fix&type=commits');
      expect(mockSearchApi.searchCommits).not.toHaveBeenCalled();
    });

    it('handles empty search results', async () => {
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'nonexistent-commit-12345']);

      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('handles author email and name filters', async () => {
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        'fix',
        '--author-email',
        'octocat@github.com',
        '--author-name',
        'The Octocat',
      ]);

      expect(mockSearchApi.searchCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          authorEmail: 'octocat@github.com',
          authorName: 'The Octocat',
        })
      );
    });

    it('handles hash and parent filters', async () => {
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        'fix',
        '--hash',
        'abc123',
        '--parent',
        'def456',
        '--tree',
        'ghi789',
      ]);

      expect(mockSearchApi.searchCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: 'abc123',
          parent: 'def456',
          tree: 'ghi789',
        })
      );
    });

    it('handles merge filter', async () => {
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--merge']);

      expect(mockSearchApi.searchCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          merge: true,
        })
      );
    });

    it('handles multiple query words', async () => {
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', 'authentication', 'bug']);

      expect(mockSearchApi.searchCommits).toHaveBeenCalledWith(
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
      mockSearchApi.searchCommits.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createCommitsCommand(
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
      const commits = [
        createMockSearchCommit({ sha: 'abc123', message: 'First' }),
        createMockSearchCommit({ sha: 'def456', message: 'Second' }),
      ];
      mockSearchApi.searchCommits.mockResolvedValue(createMockSearchResult(commits));

      const cmd = createCommitsCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'fix', '--json', '--jq', '.[0].sha']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('"abc123"');
    });
  });
});
