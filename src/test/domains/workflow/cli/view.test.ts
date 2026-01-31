/**
 * Workflow view command tests.
 *
 * Tests the `gh-vault workflow view` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowApi } from '../../../../domains/workflow/api.js';
import { createViewCommand } from '../../../../domains/workflow/cli/view.js';
import type { Workflow } from '../../../../domains/workflow/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('open', () => ({ default: vi.fn() }));
vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
}));

import open from 'open';

import { resolveRepository } from '../../../../shared/repo.js';

const mockOpen = vi.mocked(open);
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
  getWorkflowYaml: ReturnType<typeof vi.fn>;
} {
  return {
    findWorkflow: vi.fn(),
    getWorkflowYaml: vi.fn(),
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

describe('workflow view command', () => {
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
    it('views workflow by ID', async () => {
      const workflow = createMockWorkflow({ id: 123, name: 'CI' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', '123']);

      expect(mockWorkflowApi.findWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        identifier: '123',
      });
      expect(mockOutput.print).toHaveBeenCalled();
      const output = mockOutput.print.mock.calls[0]?.[0] as string;
      expect(output).toContain('CI');
    });

    it('views workflow by filename', async () => {
      const workflow = createMockWorkflow({ path: '.github/workflows/ci.yml' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockWorkflowApi.findWorkflow).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        identifier: 'ci.yml',
      });
    });

    it('opens workflow in browser with --web flag', async () => {
      const workflow = createMockWorkflow({ htmlUrl: 'https://github.com/owner/repo/actions/workflows/ci.yml' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml', '--web']);

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/owner/repo/actions/workflows/ci.yml');
    });

    it('shows YAML content with --yaml flag', async () => {
      const workflow = createMockWorkflow({ path: '.github/workflows/ci.yml' });
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);
      mockWorkflowApi.getWorkflowYaml.mockResolvedValue('name: CI\non: push');

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml', '--yaml']);

      expect(mockWorkflowApi.getWorkflowYaml).toHaveBeenCalled();
      expect(mockOutput.print).toHaveBeenCalledWith('name: CI\non: push');
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'custom-owner',
        repo: 'custom-repo',
      });
      const workflow = createMockWorkflow();
      mockWorkflowApi.findWorkflow.mockResolvedValue(workflow);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml', '--repo', 'custom-owner/custom-repo']);

      expect(mockResolveRepository).toHaveBeenCalledWith('custom-owner/custom-repo');
      expect(mockWorkflowApi.findWorkflow).toHaveBeenCalledWith({
        owner: 'custom-owner',
        repo: 'custom-repo',
        identifier: 'ci.yml',
      });
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

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
    });

    it('handles workflow not found', async () => {
      mockWorkflowApi.findWorkflow.mockResolvedValue(null);

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'nonexistent']);

      expect(mockOutput.printError).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockWorkflowApi.findWorkflow.mockRejectedValue(new Error('API rate limit'));

      const cmd = createViewCommand(
        mockOutput as unknown as Output,
        mockWorkflowApi as unknown as WorkflowApi
      );
      await cmd.parseAsync(['node', 'test', 'ci.yml']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: API rate limit');
      expect(process.exitCode).toBe(1);
    });
  });
});
