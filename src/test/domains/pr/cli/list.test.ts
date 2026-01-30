/**
 * PR list command tests.
 *
 * Tests the `gh-vault pr list` CLI command with mocked dependencies.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createListCommand } from '../../../../domains/pr/cli/list.js';
import type { PullRequestListItem } from '../../../../domains/pr/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

// Mock external dependencies
vi.mock('open', () => ({ default: vi.fn() }));
vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
}));

import openModule from 'open';

import { resolveRepository } from '../../../../shared/repo.js';

const mockOpen = vi.mocked(openModule);
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

function createMockPrApi(): { listPrs: ReturnType<typeof vi.fn> } {
  return {
    listPrs: vi.fn(),
  };
}

function createMockPrListItem(overrides: Partial<PullRequestListItem> = {}): PullRequestListItem {
  return {
    number: 1,
    title: 'Test PR',
    state: 'open',
    draft: false,
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    htmlUrl: 'https://github.com/owner/repo/pull/1',
    labels: [],
    head: { ref: 'feature', sha: 'abc123' },
    base: { ref: 'main', sha: 'def456' },
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr list command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockPrApi: ReturnType<typeof createMockPrApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockPrApi = createMockPrApi();

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
    it('lists open PRs by default', async () => {
      const prs = [createMockPrListItem({ number: 1 }), createMockPrListItem({ number: 2 })];
      mockPrApi.listPrs.mockResolvedValue(prs);

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockPrApi.listPrs).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          state: 'open',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('passes filter options to API', async () => {
      mockPrApi.listPrs.mockResolvedValue([]);

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync([
        'node', 'test',
        '--state', 'closed',
        '--author', 'octocat',
        '--assignee', 'dev',
        '--label', 'bug',
        '--label', 'urgent',
        '--base', 'main',
        '--head', 'feature',
        '--draft',
        '--limit', '50',
        '--search', 'fix auth',
      ]);

      expect(mockPrApi.listPrs).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'closed',
          author: 'octocat',
          assignee: 'dev',
          labels: ['bug', 'urgent'],
          base: 'main',
          head: 'feature',
          draft: true,
          perPage: 50,
          search: 'fix auth',
        })
      );
    });

    it('outputs JSON when --json flag is provided', async () => {
      const prs = [createMockPrListItem()];
      mockPrApi.listPrs.mockResolvedValue(prs);

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const prs = [createMockPrListItem({ number: 42, title: 'My PR' })];
      mockPrApi.listPrs.mockResolvedValue(prs);

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '--json', 'number,title']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({ number: 42, title: 'My PR' });
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'custom-owner',
        repo: 'custom-repo',
      });
      mockPrApi.listPrs.mockResolvedValue([]);

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '--repo', 'custom-owner/custom-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('custom-owner/custom-repo');
      expect(mockPrApi.listPrs).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'custom-owner',
          repo: 'custom-repo',
        })
      );
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/owner/repo/pulls');
      expect(mockPrApi.listPrs).not.toHaveBeenCalled();
    });

    it('handles empty PR list', async () => {
      mockPrApi.listPrs.mockResolvedValue([]);

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
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

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.listPrs).not.toHaveBeenCalled();
    });

    it('handles API error', async () => {
      mockPrApi.listPrs.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('requires --json when --jq is specified', async () => {
      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '--jq', '.[0]']);

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
        createMockPrListItem({ number: 1, title: 'First' }),
        createMockPrListItem({ number: 2, title: 'Second' }),
      ];
      mockPrApi.listPrs.mockResolvedValue(prs);

      const cmd = createListCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
      await cmd.parseAsync(['node', 'test', '--json', '--jq', '.[0].number']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output.trim()).toBe('1');
    });
  });
});
