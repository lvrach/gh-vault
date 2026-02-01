/**
 * Search repos command tests.
 *
 * Tests the `gh-vault search repos` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchApi } from '../../../../domains/search/api.js';
import { createReposCommand } from '../../../../domains/search/cli/repos.js';
import type { SearchRepository, SearchResult } from '../../../../domains/search/types.js';
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

function createMockSearchApi(): { searchRepos: ReturnType<typeof vi.fn> } {
  return {
    searchRepos: vi.fn(),
  };
}

function createMockSearchRepo(overrides: Partial<SearchRepository> = {}): SearchRepository {
  return {
    id: 1,
    name: 'Hello-World',
    fullName: 'octocat/Hello-World',
    description: 'My first repository',
    owner: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    htmlUrl: 'https://github.com/octocat/Hello-World',
    language: 'TypeScript',
    stargazersCount: 100,
    forksCount: 25,
    openIssuesCount: 5,
    watchersCount: 100,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    pushedAt: '2024-01-15T09:00:00Z',
    license: { name: 'MIT License', spdxId: 'MIT' },
    topics: ['typescript', 'testing'],
    visibility: 'public',
    defaultBranch: 'main',
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

describe('search repos command', () => {
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
    it('searches repos with query', async () => {
      const repos = [createMockSearchRepo({ id: 1 }), createMockSearchRepo({ id: 2 })];
      mockSearchApi.searchRepos.mockResolvedValue(createMockSearchResult(repos));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'typescript']);

      expect(mockSearchApi.searchRepos).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'typescript',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('passes filter options to API', async () => {
      mockSearchApi.searchRepos.mockResolvedValue(createMockSearchResult([]));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        'typescript',
        '--language',
        'TypeScript',
        '--stars',
        '>100',
        '--forks',
        '>10',
        '--owner',
        'octocat',
        '--topic',
        'cli',
        '--archived',
        '--limit',
        '50',
        '--sort',
        'stars',
        '--order',
        'asc',
      ]);

      expect(mockSearchApi.searchRepos).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'typescript',
          language: 'TypeScript',
          stars: '>100',
          forks: '>10',
          owner: ['octocat'],
          topic: ['cli'],
          archived: true,
          perPage: 50,
          sort: 'stars',
          order: 'asc',
        })
      );
    });

    it('outputs JSON when --json flag is provided', async () => {
      const repos = [createMockSearchRepo()];
      mockSearchApi.searchRepos.mockResolvedValue(createMockSearchResult(repos));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'typescript', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const repos = [createMockSearchRepo({ name: 'Hello-World', stargazersCount: 100 })];
      mockSearchApi.searchRepos.mockResolvedValue(createMockSearchResult(repos));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'typescript', '--json', 'name,stargazersCount']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({ name: 'Hello-World', stargazersCount: 100 });
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'typescript', '--web']);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://github.com/search?q=typescript&type=repositories'
      );
      expect(mockSearchApi.searchRepos).not.toHaveBeenCalled();
    });

    it('handles empty search results', async () => {
      mockSearchApi.searchRepos.mockResolvedValue(createMockSearchResult([]));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'nonexistent-query-12345']);

      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('handles search with no query', async () => {
      mockSearchApi.searchRepos.mockResolvedValue(createMockSearchResult([]));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', '--language', 'TypeScript']);

      expect(mockSearchApi.searchRepos).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '',
          language: 'TypeScript',
        })
      );
    });

    it('handles multiple query words', async () => {
      mockSearchApi.searchRepos.mockResolvedValue(createMockSearchResult([]));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'typescript', 'cli', 'tool']);

      expect(mockSearchApi.searchRepos).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'typescript cli tool',
        })
      );
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles API error', async () => {
      mockSearchApi.searchRepos.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'typescript']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'typescript', '--jq', '.[0]']);

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
      const repos = [
        createMockSearchRepo({ name: 'First', stargazersCount: 100 }),
        createMockSearchRepo({ name: 'Second', stargazersCount: 200 }),
      ];
      mockSearchApi.searchRepos.mockResolvedValue(createMockSearchResult(repos));

      const cmd = createReposCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'typescript', '--json', '--jq', '.[0].name']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('"First"');
    });
  });
});
