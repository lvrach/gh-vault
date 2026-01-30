/**
 * Search code command tests.
 *
 * Tests the `gh-vault search code` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchApi } from '../../../../domains/search/api.js';
import { createCodeCommand } from '../../../../domains/search/cli/code.js';
import type { SearchCodeResult, SearchResult } from '../../../../domains/search/types.js';
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

function createMockSearchApi(): { searchCode: ReturnType<typeof vi.fn> } {
  return {
    searchCode: vi.fn(),
  };
}

function createMockSearchCode(overrides: Partial<SearchCodeResult> = {}): SearchCodeResult {
  return {
    name: 'index.ts',
    path: 'src/index.ts',
    sha: 'bbcd538c8e72b8c175046e27cc8f907076331401',
    htmlUrl: 'https://github.com/octocat/Hello-World/blob/main/src/index.ts',
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    textMatches: [
      {
        fragment: 'function authenticate() { ... }',
        matches: [{ text: 'authenticate', indices: [9, 21] }],
      },
    ],
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

describe('search code command', () => {
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
    it('searches code with query', async () => {
      const code = [createMockSearchCode({ path: 'src/a.ts' }), createMockSearchCode({ path: 'src/b.ts' })];
      mockSearchApi.searchCode.mockResolvedValue(createMockSearchResult(code));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authenticate']);

      expect(mockSearchApi.searchCode).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'authenticate',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('passes filter options to API', async () => {
      mockSearchApi.searchCode.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        'authenticate',
        '--language',
        'TypeScript',
        '--extension',
        'ts',
        '--filename',
        'index',
        '--repo',
        'owner/repo',
        '--owner',
        'octocat',
        '--size',
        '<10000',
        '--limit',
        '50',
      ]);

      expect(mockSearchApi.searchCode).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'authenticate',
          language: 'TypeScript',
          extension: 'ts',
          filename: 'index',
          repo: ['owner/repo'],
          owner: ['octocat'],
          size: '<10000',
          perPage: 50,
        })
      );
    });

    it('outputs JSON when --json flag is provided', async () => {
      const code = [createMockSearchCode()];
      mockSearchApi.searchCode.mockResolvedValue(createMockSearchResult(code));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authenticate', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const code = [createMockSearchCode({ path: 'src/index.ts' })];
      mockSearchApi.searchCode.mockResolvedValue(createMockSearchResult(code));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authenticate', '--json', 'path,repository']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({
        path: 'src/index.ts',
        repository: 'octocat/Hello-World',
      });
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authenticate', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/search?q=authenticate&type=code');
      expect(mockSearchApi.searchCode).not.toHaveBeenCalled();
    });

    it('handles empty search results', async () => {
      mockSearchApi.searchCode.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'nonexistent-code-12345']);

      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('handles match filter for file and path', async () => {
      mockSearchApi.searchCode.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authenticate', '--match', 'file', '--match', 'path']);

      expect(mockSearchApi.searchCode).toHaveBeenCalledWith(
        expect.objectContaining({
          match: ['file', 'path'],
        })
      );
    });

    it('handles multiple query words', async () => {
      mockSearchApi.searchCode.mockResolvedValue(createMockSearchResult([]));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'function', 'authenticate', 'user']);

      expect(mockSearchApi.searchCode).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'function authenticate user',
        })
      );
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles API error', async () => {
      mockSearchApi.searchCode.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authenticate']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authenticate', '--jq', '.[0]']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: --jq requires --json to be specified');
      expect(process.exitCode).toBe(1);
    });

    it('requires query for code search', async () => {
      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );

      // Code search requires a query argument, so Commander will throw
      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow();
    });
  });

  // ============================================================================
  // jq Filtering
  // ============================================================================

  describe('jq filtering', () => {
    it('filters output with jq expression', async () => {
      const code = [
        createMockSearchCode({ path: 'src/first.ts' }),
        createMockSearchCode({ path: 'src/second.ts' }),
      ];
      mockSearchApi.searchCode.mockResolvedValue(createMockSearchResult(code));

      const cmd = createCodeCommand(
        mockOutput as unknown as Output,
        mockSearchApi as unknown as SearchApi
      );
      await cmd.parseAsync(['node', 'test', 'authenticate', '--json', '--jq', '.[0].path']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('"src/first.ts"');
    });
  });
});
