/**
 * Search command index tests.
 *
 * Tests the `gh-vault search` command registration and subcommand setup.
 */

import { describe, expect, it, vi } from 'vitest';

import type { SearchApi } from '../../../../domains/search/api.js';
import { createSearchCommand } from '../../../../domains/search/cli/index.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

function createMockOutput(): {
  print: ReturnType<typeof vi.fn>;
  printError: ReturnType<typeof vi.fn>;
} {
  return {
    print: vi.fn(),
    printError: vi.fn(),
  };
}

function createMockSearchApi(): Record<string, ReturnType<typeof vi.fn>> {
  return {
    searchRepos: vi.fn(),
    searchIssues: vi.fn(),
    searchPrs: vi.fn(),
    searchCommits: vi.fn(),
    searchCode: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('search command index', () => {
  it('creates command with correct name', () => {
    const mockOutput = createMockOutput();
    const mockSearchApi = createMockSearchApi();

    const cmd = createSearchCommand(
      mockOutput as unknown as Output,
      mockSearchApi as unknown as SearchApi
    );

    expect(cmd.name()).toBe('search');
  });

  it('creates command with correct description', () => {
    const mockOutput = createMockOutput();
    const mockSearchApi = createMockSearchApi();

    const cmd = createSearchCommand(
      mockOutput as unknown as Output,
      mockSearchApi as unknown as SearchApi
    );

    expect(cmd.description()).toBe(
      'Search for repositories, issues, PRs, commits, and code on GitHub'
    );
  });

  it('registers all subcommands', () => {
    const mockOutput = createMockOutput();
    const mockSearchApi = createMockSearchApi();

    const cmd = createSearchCommand(
      mockOutput as unknown as Output,
      mockSearchApi as unknown as SearchApi
    );
    const subcommandNames = cmd.commands.map((c) => c.name());

    expect(subcommandNames).toContain('code');
    expect(subcommandNames).toContain('commits');
    expect(subcommandNames).toContain('issues');
    expect(subcommandNames).toContain('prs');
    expect(subcommandNames).toContain('repos');
  });

  it('has exactly 5 subcommands', () => {
    const mockOutput = createMockOutput();
    const mockSearchApi = createMockSearchApi();

    const cmd = createSearchCommand(
      mockOutput as unknown as Output,
      mockSearchApi as unknown as SearchApi
    );

    expect(cmd.commands).toHaveLength(5);
  });
});
