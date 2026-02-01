/**
 * Workflow run command tests.
 *
 * Tests the `gh-vault workflow run` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowApi } from '../../../../domains/workflow/api.js';
import { createRunCommand } from '../../../../domains/workflow/cli/run.js';
import type { Workflow } from '../../../../domains/workflow/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
  getCurrentBranch: vi.fn(),
}));

import { getCurrentBranch, resolveRepository } from '../../../../shared/repo.js';

const mockResolveRepository = vi.mocked(resolveRepository);
const mockGetCurrentBranch = vi.mocked(getCurrentBranch);

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
  runWorkflow: ReturnType<typeof vi.fn>;
} {
  return {
    findWorkflow: vi.fn(),
    runWorkflow: vi.fn(),
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

describe('workflow run command', () => {
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
    mockGetCurrentBranch.mockResolvedValue('main');
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('triggers workflow with current branch as default ref', async () => {
      const workflow = createMockWorkflow({ id: 123, name: 'CI' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.runWorkflow.mockResolvedValue(undefined);

      const cmd = createRunCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockWorkflowApi.findWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        identifier: 'ci.yml',
      });
      expect(mockWorkflowApi.runWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflowId: 123,
        ref: 'main',
      });
      expect(mockOutput.print).toHaveBeenCalled();
    });

    it('triggers workflow with specified ref', async () => {
      const workflow = createMockWorkflow({ id: 123 });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.runWorkflow.mockResolvedValue(undefined);

      const cmd = createRunCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml', '--ref', 'feature-branch']);

      expect(mockWorkflowApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: 'feature-branch',
        })
      );
    });

    it('passes workflow inputs with -f flag (raw-field)', async () => {
      const workflow = createMockWorkflow({ id: 123 });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.runWorkflow.mockResolvedValue(undefined);

      const cmd = createRunCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml', '-f', 'env=production', '-f', 'deploy=true']);

      expect(mockWorkflowApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: { env: 'production', deploy: 'true' },
        })
      );
    });

    it('passes workflow inputs with -F flag (field)', async () => {
      const workflow = createMockWorkflow({ id: 123 });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.runWorkflow.mockResolvedValue(undefined);

      const cmd = createRunCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml', '-F', 'version=1.0.0']);

      expect(mockWorkflowApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: { version: '1.0.0' },
        })
      );
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'custom-owner',
        repo: 'custom-repo',
      });
      const workflow = createMockWorkflow({ id: 123 });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.runWorkflow.mockResolvedValue(undefined);

      const cmd = createRunCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml', '--repo', 'custom-owner/custom-repo']);

      expect(mockWorkflowApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'custom-owner',
          repo: 'custom-repo',
        })
      );
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

      const cmd = createRunCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles workflow not found', async () => {
      mockWorkflowApi.findWorkflow.mockResolvedValue(null);

      const cmd = createRunCommand(
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
      mockWorkflowApi.runWorkflow.mockRejectedValue(new Error('Workflow is disabled'));

      const cmd = createRunCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Workflow is disabled');
      expect(process.exitCode).toBe(1);
    });

    it('handles missing current branch', async () => {
      mockGetCurrentBranch.mockResolvedValue(null);
      const workflow = createMockWorkflow({ id: 123 });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);

      const cmd = createRunCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        expect.stringContaining('could not determine current branch')
      );
      expect(process.exitCode).toBe(1);
    });
  });
});
