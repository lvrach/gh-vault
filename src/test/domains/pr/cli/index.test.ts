/**
 * PR command index tests.
 *
 * Tests the `gh-vault pr` command registration and subcommand setup.
 */

import { describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createPrCommand } from '../../../../domains/pr/cli/index.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

function createMockOutput(): { print: ReturnType<typeof vi.fn>; printError: ReturnType<typeof vi.fn> } {
  return {
    print: vi.fn(),
    printError: vi.fn(),
  };
}

function createMockPrApi(): Record<string, ReturnType<typeof vi.fn>> {
  return {
    getPr: vi.fn(),
    listPrs: vi.fn(),
    createPr: vi.fn(),
    editPr: vi.fn(),
    mergePr: vi.fn(),
    updatePrState: vi.fn(),
    updatePrDraft: vi.fn(),
    getPrDiff: vi.fn(),
    listPrFiles: vi.fn(),
    listPrCommits: vi.fn(),
    listPrComments: vi.fn(),
    createPrComment: vi.fn(),
    createPrReview: vi.fn(),
    getPrChecks: vi.fn(),
    getPrStatus: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('pr command index', () => {
  it('creates command with correct name', () => {
    const mockOutput = createMockOutput();
    const mockPrApi = createMockPrApi();

    const cmd = createPrCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);

    expect(cmd.name()).toBe('pr');
  });

  it('creates command with correct description', () => {
    const mockOutput = createMockOutput();
    const mockPrApi = createMockPrApi();

    const cmd = createPrCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);

    expect(cmd.description()).toBe('Work with GitHub pull requests');
  });

  it('registers all subcommands', () => {
    const mockOutput = createMockOutput();
    const mockPrApi = createMockPrApi();

    const cmd = createPrCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);
    const subcommandNames = cmd.commands.map((c) => c.name());

    expect(subcommandNames).toContain('checkout');
    expect(subcommandNames).toContain('checks');
    expect(subcommandNames).toContain('close');
    expect(subcommandNames).toContain('comment');
    expect(subcommandNames).toContain('create');
    expect(subcommandNames).toContain('diff');
    expect(subcommandNames).toContain('edit');
    expect(subcommandNames).toContain('list');
    expect(subcommandNames).toContain('merge');
    expect(subcommandNames).toContain('ready');
    expect(subcommandNames).toContain('reopen');
    expect(subcommandNames).toContain('review');
    expect(subcommandNames).toContain('status');
    expect(subcommandNames).toContain('view');
  });

  it('has exactly 14 subcommands', () => {
    const mockOutput = createMockOutput();
    const mockPrApi = createMockPrApi();

    const cmd = createPrCommand(mockOutput as unknown as Output, mockPrApi as unknown as PrApi);

    expect(cmd.commands).toHaveLength(14);
  });
});
