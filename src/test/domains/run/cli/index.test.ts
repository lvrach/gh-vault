/**
 * Run command index tests.
 *
 * Tests the `gh-vault run` command registration and subcommand setup.
 */

import { describe, expect, it, vi } from 'vitest';

import type { RunApi } from '../../../../domains/run/api.js';
import { createRunCommand } from '../../../../domains/run/cli/index.js';
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

function createMockRunApi(): Record<string, ReturnType<typeof vi.fn>> {
  return {
    listRuns: vi.fn(),
    getRunWithJobs: vi.fn(),
    getJob: vi.fn(),
    getJobLogs: vi.fn(),
    cancelRun: vi.fn(),
    rerunRun: vi.fn(),
    rerunFailedJobs: vi.fn(),
    rerunJob: vi.fn(),
    deleteRun: vi.fn(),
    getWorkflowIdByName: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('run command index', () => {
  it('creates command with correct name', () => {
    const mockOutput = createMockOutput();
    const mockRunApi = createMockRunApi();

    const cmd = createRunCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);

    expect(cmd.name()).toBe('run');
  });

  it('creates command with correct description', () => {
    const mockOutput = createMockOutput();
    const mockRunApi = createMockRunApi();

    const cmd = createRunCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);

    expect(cmd.description()).toBe('View and manage GitHub Actions workflow runs');
  });

  it('registers all subcommands', () => {
    const mockOutput = createMockOutput();
    const mockRunApi = createMockRunApi();

    const cmd = createRunCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);
    const subcommandNames = cmd.commands.map((c) => c.name());

    expect(subcommandNames).toContain('cancel');
    expect(subcommandNames).toContain('delete');
    expect(subcommandNames).toContain('list');
    expect(subcommandNames).toContain('rerun');
    expect(subcommandNames).toContain('view');
  });

  it('has exactly 5 subcommands', () => {
    const mockOutput = createMockOutput();
    const mockRunApi = createMockRunApi();

    const cmd = createRunCommand(mockOutput as unknown as Output, mockRunApi as unknown as RunApi);

    expect(cmd.commands).toHaveLength(5);
  });
});
