/**
 * PR API tests.
 *
 * Tests the PrApi class methods with MSW mock handlers.
 * Covers create, edit, merge, and state management operations.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { PrApi } from '../../../domains/pr/api.js';
import { createGitHubClient } from '../../../shared/github.js';

// ============================================================================
// Test Setup
// ============================================================================

describe('PrApi', () => {
  let prApi: PrApi;

  beforeAll(async () => {
    const client = await createGitHubClient();
    prApi = new PrApi(client);
  });

  // ============================================================================
  // createPr Tests
  // ============================================================================

  describe('createPr', () => {
    it('creates a new pull request', async () => {
      const result = await prApi.createPr({
        owner: 'octocat',
        repo: 'Hello-World',
        title: 'New feature',
        body: 'This adds an amazing feature',
        head: 'feature-branch',
        base: 'main',
      });

      expect(result.number).toBe(100);
      expect(result.title).toBe('New feature');
      expect(result.htmlUrl).toContain('github.com');
    });

    it('creates a draft pull request', async () => {
      const result = await prApi.createPr({
        owner: 'octocat',
        repo: 'Hello-World',
        title: 'WIP: New feature',
        head: 'feature-branch',
        base: 'main',
        draft: true,
      });

      expect(result.number).toBeDefined();
      expect(result.draft).toBe(true);
    });
  });

  // ============================================================================
  // editPr Tests
  // ============================================================================

  describe('editPr', () => {
    it('updates PR title', async () => {
      const result = await prApi.editPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        title: 'Updated title',
      });

      expect(result.number).toBe(1);
      expect(result.updatedFields).toContain('title');
    });

    it('updates PR body', async () => {
      const result = await prApi.editPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        body: 'Updated description',
      });

      expect(result.number).toBe(1);
      expect(result.updatedFields).toContain('body');
    });

    it('adds labels to PR', async () => {
      const result = await prApi.editPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        addLabels: ['bug', 'enhancement'],
      });

      expect(result.number).toBe(1);
      expect(result.updatedFields).toContain('labels (added)');
    });

    it('removes labels from PR', async () => {
      const result = await prApi.editPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        removeLabels: ['wontfix'],
      });

      expect(result.number).toBe(1);
      expect(result.updatedFields).toContain('labels (removed)');
    });

    it('adds assignees to PR', async () => {
      const result = await prApi.editPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        addAssignees: ['octocat'],
      });

      expect(result.number).toBe(1);
      expect(result.updatedFields).toContain('assignees (added)');
    });

    it('removes assignees from PR', async () => {
      const result = await prApi.editPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        removeAssignees: ['olduser'],
      });

      expect(result.number).toBe(1);
      expect(result.updatedFields).toContain('assignees (removed)');
    });

    it('adds reviewers to PR', async () => {
      const result = await prApi.editPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        addReviewers: ['reviewer1'],
      });

      expect(result.number).toBe(1);
      expect(result.updatedFields).toContain('reviewers (added)');
    });

    it('removes reviewers from PR', async () => {
      const result = await prApi.editPr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        removeReviewers: ['oldreviewer'],
      });

      expect(result.number).toBe(1);
      expect(result.updatedFields).toContain('reviewers (removed)');
    });

    it('throws error for non-existent PR', async () => {
      await expect(
        prApi.editPr({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 404,
          title: 'Should fail',
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // mergePr Tests
  // ============================================================================

  describe('mergePr', () => {
    it('merges PR with default method', async () => {
      const result = await prApi.mergePr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        mergeMethod: 'merge',
      });

      expect(result.merged).toBe(true);
      expect(result.sha).toBeDefined();
    });

    it('merges PR with squash method', async () => {
      const result = await prApi.mergePr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        mergeMethod: 'squash',
      });

      expect(result.merged).toBe(true);
    });

    it('merges PR with rebase method', async () => {
      const result = await prApi.mergePr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        mergeMethod: 'rebase',
      });

      expect(result.merged).toBe(true);
    });

    it('merges PR with custom commit title', async () => {
      const result = await prApi.mergePr({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        mergeMethod: 'squash',
        commitTitle: 'feat: Add new feature (#1)',
      });

      expect(result.merged).toBe(true);
    });

    it('throws error for non-existent PR', async () => {
      await expect(
        prApi.mergePr({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 404,
          mergeMethod: 'merge',
        })
      ).rejects.toThrow();
    });

    it('throws error for conflict (409)', async () => {
      await expect(
        prApi.mergePr({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 409,
          mergeMethod: 'merge',
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // updatePrState Tests
  // ============================================================================

  describe('updatePrState', () => {
    it('closes a PR', async () => {
      const result = await prApi.updatePrState({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        state: 'closed',
      });

      expect(result.number).toBe(1);
    });

    it('reopens a PR', async () => {
      const result = await prApi.updatePrState({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
        state: 'open',
      });

      expect(result.number).toBe(1);
    });

    it('throws error for non-existent PR', async () => {
      await expect(
        prApi.updatePrState({
          owner: 'octocat',
          repo: 'Hello-World',
          pullNumber: 404,
          state: 'closed',
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // deleteBranch Tests
  // ============================================================================

  describe('deleteBranch', () => {
    it('deletes a branch', async () => {
      // Should not throw
      await expect(
        prApi.deleteBranch({
          owner: 'octocat',
          repo: 'Hello-World',
          branch: 'feature-branch',
        })
      ).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // listPrChecks Tests
  // ============================================================================

  describe('listPrChecks', () => {
    it('returns check runs and statuses', async () => {
      const result = await prApi.listPrChecks({
        owner: 'octocat',
        repo: 'Hello-World',
        pullNumber: 1,
      });

      expect(result.checkRuns).toBeDefined();
      expect(result.statuses).toBeDefined();
      expect(result.checkRuns.length).toBeGreaterThan(0);
    });
  });
});
