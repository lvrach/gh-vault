/**
 * Integration tests for Run domain API.
 * Tests use MSW mocks - no real GitHub API calls.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { RunApi } from '../../../domains/run/api.js';
import { createGitHubClient } from '../../../shared/github.js';

// MSW server is started in src/test/setup.ts (shared across all tests)

describe('RunApi', () => {
  let runApi: RunApi;

  beforeAll(async () => {
    const client = await createGitHubClient();
    runApi = new RunApi(client);
  });

  describe('listRuns', () => {
    it('returns workflow runs for a repository', async () => {
      const runs = await runApi.listRuns({
        owner: 'octocat',
        repo: 'Hello-World',
      });

      expect(runs).toHaveLength(3);
      expect(runs[0]).toMatchObject({
        id: 1,
        status: 'completed',
        conclusion: 'success',
        event: 'push',
      });
      expect(runs[1]?.conclusion).toBe('failure');
      expect(runs[2]?.status).toBe('in_progress');
    });

    it('respects perPage parameter', async () => {
      const runs = await runApi.listRuns({
        owner: 'octocat',
        repo: 'Hello-World',
        perPage: 1,
      });

      expect(runs).toHaveLength(1);
    });
  });

  describe('getRun', () => {
    it('returns a specific workflow run', async () => {
      const run = await runApi.getRun({
        owner: 'octocat',
        repo: 'Hello-World',
        runId: 123,
      });

      expect(run.id).toBe(123);
      expect(run.status).toBe('completed');
      expect(run.conclusion).toBe('success');
      expect(run.actor?.login).toBe('octocat');
    });

    it('throws error for non-existent run (magic number 404)', async () => {
      await expect(
        runApi.getRun({
          owner: 'octocat',
          repo: 'Hello-World',
          runId: 404,
        })
      ).rejects.toThrow();
    });
  });

  describe('getRunWithJobs', () => {
    it('returns run with associated jobs', async () => {
      const runDetail = await runApi.getRunWithJobs({
        owner: 'octocat',
        repo: 'Hello-World',
        runId: 100,
      });

      expect(runDetail.id).toBe(100);
      expect(runDetail.jobs).toHaveLength(2);
      expect(runDetail.jobs[0]?.name).toBe('build');
      expect(runDetail.jobs[0]?.steps).toHaveLength(3);
    });

    it('returns attempt-specific jobs when attempt is specified', async () => {
      const runDetail = await runApi.getRunWithJobs({
        owner: 'octocat',
        repo: 'Hello-World',
        runId: 100,
        attempt: 2,
      });

      expect(runDetail.runAttempt).toBe(2);
      expect(runDetail.jobs).toHaveLength(2);
    });
  });

  describe('getJobLogs', () => {
    it('returns plain text job logs', async () => {
      const logs = await runApi.getJobLogs({
        owner: 'octocat',
        repo: 'Hello-World',
        jobId: 1000, // runId=1, jobIndex=0
      });

      expect(typeof logs).toBe('string');
      expect(logs).toContain('##[group]');
      expect(logs).toContain('Set up job');
    });
  });

  describe('cancelRun', () => {
    it('cancels a workflow run without error', async () => {
      await expect(
        runApi.cancelRun({
          owner: 'octocat',
          repo: 'Hello-World',
          runId: 123,
        })
      ).resolves.toBeUndefined();
    });

    it('throws error for non-existent run (magic number 404)', async () => {
      await expect(
        runApi.cancelRun({
          owner: 'octocat',
          repo: 'Hello-World',
          runId: 404,
        })
      ).rejects.toThrow();
    });
  });

  describe('rerunRun', () => {
    it('reruns a workflow without error', async () => {
      await expect(
        runApi.rerunRun({
          owner: 'octocat',
          repo: 'Hello-World',
          runId: 123,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('rerunFailedJobs', () => {
    it('reruns failed jobs without error', async () => {
      await expect(
        runApi.rerunFailedJobs({
          owner: 'octocat',
          repo: 'Hello-World',
          runId: 123,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteRun', () => {
    it('deletes a workflow run without error', async () => {
      await expect(
        runApi.deleteRun({
          owner: 'octocat',
          repo: 'Hello-World',
          runId: 123,
        })
      ).resolves.toBeUndefined();
    });

    it('throws error for non-existent run (magic number 404)', async () => {
      await expect(
        runApi.deleteRun({
          owner: 'octocat',
          repo: 'Hello-World',
          runId: 404,
        })
      ).rejects.toThrow();
    });
  });

  describe('getWorkflowIdByName', () => {
    it('finds workflow ID by exact name match', async () => {
      const workflowId = await runApi.getWorkflowIdByName({
        owner: 'octocat',
        repo: 'Hello-World',
        name: 'CI',
      });

      expect(workflowId).toBe(1);
    });

    it('finds workflow ID by case-insensitive match', async () => {
      const workflowId = await runApi.getWorkflowIdByName({
        owner: 'octocat',
        repo: 'Hello-World',
        name: 'ci',
      });

      expect(workflowId).toBe(1);
    });

    it('returns null for non-existent workflow', async () => {
      const workflowId = await runApi.getWorkflowIdByName({
        owner: 'octocat',
        repo: 'Hello-World',
        name: 'nonexistent',
      });

      expect(workflowId).toBeNull();
    });
  });
});
