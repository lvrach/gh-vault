/**
 * Integration tests for Workflow domain API.
 * Tests use MSW mocks - no real GitHub API calls.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { WorkflowApi } from '../../../domains/workflow/api.js';
import { createGitHubClient } from '../../../shared/github.js';

// MSW server is started in src/test/setup.ts (shared across all tests)

describe('WorkflowApi', () => {
  let workflowApi: WorkflowApi;

  beforeAll(async () => {
    const client = await createGitHubClient();
    workflowApi = new WorkflowApi(client);
  });

  describe('listWorkflows', () => {
    it('returns workflows for a repository', async () => {
      const workflows = await workflowApi.listWorkflows({
        owner: 'octocat',
        repo: 'Hello-World',
      });

      expect(workflows).toHaveLength(3);
      expect(workflows[0]).toMatchObject({
        id: 1,
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
      });
      expect(workflows[1]?.name).toBe('Release');
      // Third workflow is CodeQL which is disabled_manually
      expect(workflows[2]?.name).toBe('CodeQL');
      expect(workflows[2]?.state).toBe('disabled_manually');
    });
  });

  describe('getWorkflow', () => {
    it('returns a specific workflow by ID', async () => {
      const workflow = await workflowApi.getWorkflow({
        owner: 'octocat',
        repo: 'Hello-World',
        workflowId: 123,
      });

      expect(workflow.id).toBe(123);
      expect(workflow.name).toBe('CI');
      expect(workflow.state).toBe('active');
    });

    it('returns a workflow by filename', async () => {
      const workflow = await workflowApi.getWorkflow({
        owner: 'octocat',
        repo: 'Hello-World',
        workflowId: 'ci.yml',
      });

      expect(workflow.id).toBe(1);
      expect(workflow.path).toBe('.github/workflows/ci.yml');
    });

    it('throws error for non-existent workflow (magic number 404)', async () => {
      await expect(
        workflowApi.getWorkflow({
          owner: 'octocat',
          repo: 'Hello-World',
          workflowId: 404,
        })
      ).rejects.toThrow();
    });
  });

  describe('runWorkflow', () => {
    it('triggers a workflow dispatch', async () => {
      await expect(
        workflowApi.runWorkflow({
          owner: 'octocat',
          repo: 'Hello-World',
          workflowId: 123,
          ref: 'main',
        })
      ).resolves.toBeUndefined();
    });

    it('triggers workflow with inputs', async () => {
      await expect(
        workflowApi.runWorkflow({
          owner: 'octocat',
          repo: 'Hello-World',
          workflowId: 'ci.yml',
          ref: 'main',
          inputs: { environment: 'production' },
        })
      ).resolves.toBeUndefined();
    });

    it('throws error for non-existent workflow (magic number 404)', async () => {
      await expect(
        workflowApi.runWorkflow({
          owner: 'octocat',
          repo: 'Hello-World',
          workflowId: 404,
          ref: 'main',
        })
      ).rejects.toThrow();
    });
  });

  describe('enableWorkflow', () => {
    it('enables a workflow without error', async () => {
      await expect(
        workflowApi.enableWorkflow({
          owner: 'octocat',
          repo: 'Hello-World',
          workflowId: 123,
        })
      ).resolves.toBeUndefined();
    });

    it('throws error for non-existent workflow (magic number 404)', async () => {
      await expect(
        workflowApi.enableWorkflow({
          owner: 'octocat',
          repo: 'Hello-World',
          workflowId: 404,
        })
      ).rejects.toThrow();
    });
  });

  describe('disableWorkflow', () => {
    it('disables a workflow without error', async () => {
      await expect(
        workflowApi.disableWorkflow({
          owner: 'octocat',
          repo: 'Hello-World',
          workflowId: 123,
        })
      ).resolves.toBeUndefined();
    });

    it('throws error for non-existent workflow (magic number 404)', async () => {
      await expect(
        workflowApi.disableWorkflow({
          owner: 'octocat',
          repo: 'Hello-World',
          workflowId: 404,
        })
      ).rejects.toThrow();
    });
  });

  describe('getWorkflowYaml', () => {
    it('returns workflow YAML content', async () => {
      const yaml = await workflowApi.getWorkflowYaml({
        owner: 'octocat',
        repo: 'Hello-World',
        workflowId: 1,
      });

      expect(typeof yaml).toBe('string');
      expect(yaml).toContain('name: CI');
      expect(yaml).toContain('runs-on: ubuntu-latest');
    });
  });

  describe('findWorkflow', () => {
    it('finds workflow by numeric ID', async () => {
      const workflow = await workflowApi.findWorkflow({
        owner: 'octocat',
        repo: 'Hello-World',
        identifier: '123',
      });

      expect(workflow?.id).toBe(123);
    });

    it('finds workflow by filename', async () => {
      const workflow = await workflowApi.findWorkflow({
        owner: 'octocat',
        repo: 'Hello-World',
        identifier: 'ci.yml',
      });

      expect(workflow?.path).toBe('.github/workflows/ci.yml');
    });

    it('finds workflow by name match', async () => {
      const workflow = await workflowApi.findWorkflow({
        owner: 'octocat',
        repo: 'Hello-World',
        identifier: 'CI',
      });

      expect(workflow?.name).toBe('CI');
    });

    // Note: Case-insensitive name matching is tested via CLI unit tests
    // because the MSW mock returns a default workflow for any identifier
    // and the name search fallback is only triggered on 404 errors
  });
});
