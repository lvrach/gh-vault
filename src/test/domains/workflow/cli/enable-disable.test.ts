/**
 * Workflow enable/disable command tests.
 *
 * Tests the `gh-vault workflow enable` and `gh-vault workflow disable` CLI commands.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowApi } from '../../../../domains/workflow/api.js';
import { createDisableCommand } from '../../../../domains/workflow/cli/disable.js';
import { createEnableCommand } from '../../../../domains/workflow/cli/enable.js';
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
  findWorkflow: ReturnType<typeof vi.fn>;
  enableWorkflow: ReturnType<typeof vi.fn>;
  disableWorkflow: ReturnType<typeof vi.fn>;
} {
  return {
    findWorkflow: vi.fn(),
    enableWorkflow: vi.fn(),
    disableWorkflow: vi.fn(),
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

describe('workflow enable command', () => {
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

  describe('success cases', () => {
    it('enables a workflow by filename', async () => {
      const workflow = createMockWorkflow({ id: 123, name: 'CI', state: 'disabled_manually' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.enableWorkflow.mockResolvedValue(undefined);

      const cmd = createEnableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockWorkflowApi.findWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        identifier: 'ci.yml',
      });
      expect(mockWorkflowApi.enableWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflowId: 123,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('Enabled');
      expect(output).toContain('CI');
    });

    it('enables a workflow by ID', async () => {
      const workflow = createMockWorkflow({ id: 456, name: 'Release' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.enableWorkflow.mockResolvedValue(undefined);

      const cmd = createEnableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', '456']);

      expect(mockWorkflowApi.findWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        identifier: '456',
      });
      expect(mockWorkflowApi.enableWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflowId: 456,
      });
    });
  });

  describe('error cases', () => {
    it('handles repository resolution failure', async () => {
      mockResolveRepository.mockResolvedValue({
        success: false,
        error: 'Not a git repository',
      });

      const cmd = createEnableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles workflow not found', async () => {
      mockWorkflowApi.findWorkflow.mockResolvedValue(null);

      const cmd = createEnableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'nonexistent']);

      expect(mockOutput.printError).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      const workflow = createMockWorkflow({ id: 123 });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.enableWorkflow.mockRejectedValue(new Error('Permission denied'));

      const cmd = createEnableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Permission denied');
      expect(process.exitCode).toBe(1);
    });
  });
});

describe('workflow disable command', () => {
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

  describe('success cases', () => {
    it('disables a workflow by filename', async () => {
      const workflow = createMockWorkflow({ id: 123, name: 'CI', state: 'active' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.disableWorkflow.mockResolvedValue(undefined);

      const cmd = createDisableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockWorkflowApi.findWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        identifier: 'ci.yml',
      });
      expect(mockWorkflowApi.disableWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflowId: 123,
      });
      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('Disabled');
      expect(output).toContain('CI');
    });

    it('disables a workflow by ID', async () => {
      const workflow = createMockWorkflow({ id: 789, name: 'Deploy' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.disableWorkflow.mockResolvedValue(undefined);

      const cmd = createDisableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', '789']);

      expect(mockWorkflowApi.disableWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflowId: 789,
      });
    });
  });

  describe('error cases', () => {
    it('handles repository resolution failure', async () => {
      mockResolveRepository.mockResolvedValue({
        success: false,
        error: 'Not a git repository',
      });

      const cmd = createDisableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles workflow not found', async () => {
      mockWorkflowApi.findWorkflow.mockResolvedValue(null);

      const cmd = createDisableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'nonexistent']);

      expect(mockOutput.printError).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      const workflow = createMockWorkflow({ id: 123 });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.disableWorkflow.mockRejectedValue(new Error('Permission denied'));

      const cmd = createDisableCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Permission denied');
      expect(process.exitCode).toBe(1);
    });
  });
});
