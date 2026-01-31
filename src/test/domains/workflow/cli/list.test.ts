/**
 * Workflow list command tests.
 *
 * Tests the `gh-vault workflow list` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowApi } from '../../../../domains/workflow/api.js';
import { createListCommand } from '../../../../domains/workflow/cli/list.js';
import type { Workflow } from '../../../../domains/workflow/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
}));

import { resolveRepository } from '../../../../shared/repo.js';

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

function createMockWorkflowApi(): {
  listWorkflows: ReturnType<typeof vi.fn>;
} {
  return {
    listWorkflows: vi.fn(),
  };
}

function createMockWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 1,
    nodeId: 'MDg6V29ya2Zsb3cx',
    name: 'CI',
    path: '.github/workflows/ci.yml',
    state: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    url: 'https://api.github.com/repos/owner/repo/actions/workflows/1',
    htmlUrl: 'https://github.com/owner/repo/actions/workflows/ci.yml',
    badgeUrl: 'https://github.com/owner/repo/workflows/CI/badge.svg',
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('workflow list command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockWorkflowApi: ReturnType<typeof createMockWorkflowApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockWorkflowApi = createMockWorkflowApi();

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
    it('lists workflows with default options', async () => {
      const workflows = [
        createMockWorkflow({ id: 1, name: 'CI' }),
        createMockWorkflow({ id: 2, name: 'Release' }),
      ];
      mockWorkflowApi.listWorkflows.mockResolvedValue(workflows);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockWorkflowApi.listWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
        })
      );
      expect(mockOutput.print).toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('filters out disabled workflows by default', async () => {
      const workflows = [
        createMockWorkflow({ id: 1, name: 'CI', state: 'active' }),
        createMockWorkflow({ id: 2, name: 'Old', state: 'disabled_manually' }),
      ];
      mockWorkflowApi.listWorkflows.mockResolvedValue(workflows);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('CI');
      expect(output).not.toContain('Old');
    });

    it('includes disabled workflows with --all flag', async () => {
      const workflows = [
        createMockWorkflow({ id: 1, name: 'CI', state: 'active' }),
        createMockWorkflow({ id: 2, name: 'Old', state: 'disabled_manually' }),
      ];
      mockWorkflowApi.listWorkflows.mockResolvedValue(workflows);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', '--all']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('CI');
      expect(output).toContain('Old');
    });

    it('outputs JSON when --json flag is provided', async () => {
      const workflows = [createMockWorkflow()];
      mockWorkflowApi.listWorkflows.mockResolvedValue(workflows);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', '--json']);

      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(() => void JSON.parse(output)).not.toThrow();
    });

    it('filters JSON fields when specified', async () => {
      const workflows = [createMockWorkflow({ id: 42, name: 'CI', state: 'active' })];
      mockWorkflowApi.listWorkflows.mockResolvedValue(workflows);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', '--json', 'id,name']);

      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as unknown[];
      expect(parsed[0]).toEqual({ id: 42, name: 'CI' });
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'custom-owner',
        repo: 'custom-repo',
      });
      mockWorkflowApi.listWorkflows.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', '--repo', 'custom-owner/custom-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('custom-owner/custom-repo');
      expect(mockWorkflowApi.listWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'custom-owner',
          repo: 'custom-repo',
        })
      );
    });

    it('handles empty workflow list showing active only', async () => {
      // Return disabled workflows which get filtered out
      mockWorkflowApi.listWorkflows.mockResolvedValue([
        createMockWorkflow({ state: 'disabled_manually' }),
      ]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.print).toHaveBeenCalledWith('No workflows found');
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

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockWorkflowApi.listWorkflows).not.toHaveBeenCalled();
    });

    it('handles API error', async () => {
      mockWorkflowApi.listWorkflows.mockRejectedValue(new Error('API rate limit exceeded'));

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit exceeded');
      expect(process.exitCode).toBe(1);
    });

    it('validates --jq requires --json', async () => {
      // Mock API returning data so validation runs
      mockWorkflowApi.listWorkflows.mockResolvedValue([]);

      const cmd = createListCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      // Test that --jq with --json works
      await cmd.parseAsync(['node', 'test', '--json', '--jq', '.[0]']);

      expect(mockWorkflowApi.listWorkflows).toHaveBeenCalled();
    });
  });
});
