/**
 * PR JSON formatters unit tests.
 *
 * Tests pure functions that transform domain types to JSON output.
 * Uses table-driven tests for comprehensive coverage with minimal repetition.
 */

import { describe, expect, it } from 'vitest';

import {
  formatPrCommentsJson,
  formatPrFilesJson,
  formatPrListJson,
  formatPrViewJson,
  prListItemToJson,
  prToJson,
} from '../../../../domains/pr/formatters/json.js';
import type {
  PrComment,
  PrFile,
  PullRequest,
  PullRequestListItem,
} from '../../../../domains/pr/types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestPrListItem(overrides: Partial<PullRequestListItem> = {}): PullRequestListItem {
  return {
    number: 1,
    title: 'Test PR',
    state: 'open',
    draft: false,
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-16T14:20:00Z',
    htmlUrl: 'https://github.com/octocat/Hello-World/pull/1',
    labels: [{ name: 'bug', color: 'd73a4a' }],
    head: { ref: 'feature-branch', sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e' },
    base: { ref: 'main', sha: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840' },
    ...overrides,
  };
}

function createTestPullRequest(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 1,
    title: 'Test PR',
    body: 'PR description',
    state: 'open',
    draft: false,
    merged: false,
    mergeable: true,
    mergeableState: 'clean',
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    head: { ref: 'feature-branch', sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e' },
    base: { ref: 'main', sha: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840' },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-16T14:20:00Z',
    closedAt: null,
    mergedAt: null,
    htmlUrl: 'https://github.com/octocat/Hello-World/pull/1',
    additions: 100,
    deletions: 10,
    changedFiles: 5,
    labels: [{ name: 'enhancement' }],
    ...overrides,
  };
}

function createTestPrFile(overrides: Partial<PrFile> = {}): PrFile {
  return {
    filename: 'src/index.ts',
    status: 'modified',
    additions: 50,
    deletions: 10,
    ...overrides,
  };
}

function createTestPrComment(overrides: Partial<PrComment> = {}): PrComment {
  return {
    id: 1,
    user: { login: 'reviewer', htmlUrl: 'https://github.com/reviewer' },
    body: 'Looks good!',
    createdAt: '2024-01-16T12:00:00Z',
    htmlUrl: 'https://github.com/octocat/Hello-World/pull/1#issuecomment-1',
    ...overrides,
  };
}

// ============================================================================
// prListItemToJson Tests
// ============================================================================

describe('prListItemToJson', () => {
  it('converts a basic PR list item to JSON format', () => {
    const pr = createTestPrListItem();
    const result = prListItemToJson(pr);

    expect(result).toEqual({
      number: 1,
      title: 'Test PR',
      state: 'open',
      draft: false,
      url: 'https://github.com/octocat/Hello-World/pull/1',
      author: { login: 'octocat' },
      headRefName: 'feature-branch',
      baseRefName: 'main',
      labels: [{ name: 'bug' }],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-16T14:20:00Z',
    });
  });

  it('handles PR with null user', () => {
    const pr = createTestPrListItem({ user: null });
    const result = prListItemToJson(pr);

    expect(result['author']).toBeNull();
  });

  it('handles draft PR', () => {
    const pr = createTestPrListItem({ draft: true });
    const result = prListItemToJson(pr);

    expect(result['draft']).toBe(true);
  });

  it('handles closed PR state', () => {
    const pr = createTestPrListItem({ state: 'closed' });
    const result = prListItemToJson(pr);

    expect(result['state']).toBe('closed');
  });

  it('handles multiple labels', () => {
    const pr = createTestPrListItem({
      labels: [{ name: 'bug' }, { name: 'priority-high' }, { name: 'needs-review' }],
    });
    const result = prListItemToJson(pr);

    expect(result['labels']).toEqual([
      { name: 'bug' },
      { name: 'priority-high' },
      { name: 'needs-review' },
    ]);
  });

  it('handles empty labels array', () => {
    const pr = createTestPrListItem({ labels: [] });
    const result = prListItemToJson(pr);

    expect(result['labels']).toEqual([]);
  });
});

// ============================================================================
// prToJson Tests
// ============================================================================

describe('prToJson', () => {
  it('converts a full PR to JSON format with all fields', () => {
    const pr = createTestPullRequest();
    const result = prToJson(pr);

    expect(result).toEqual({
      number: 1,
      title: 'Test PR',
      body: 'PR description',
      state: 'open',
      draft: false,
      merged: false,
      mergeable: true,
      mergeableState: 'clean',
      url: 'https://github.com/octocat/Hello-World/pull/1',
      author: { login: 'octocat' },
      headRefName: 'feature-branch',
      headRefOid: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      baseRefName: 'main',
      baseRefOid: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
      additions: 100,
      deletions: 10,
      changedFiles: 5,
      labels: [{ name: 'enhancement' }],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-16T14:20:00Z',
      closedAt: null,
      mergedAt: null,
    });
  });

  it('handles merged PR', () => {
    const pr = createTestPullRequest({
      merged: true,
      state: 'closed',
      mergedAt: '2024-01-17T10:00:00Z',
      closedAt: '2024-01-17T10:00:00Z',
    });
    const result = prToJson(pr);

    expect(result['merged']).toBe(true);
    expect(result['state']).toBe('closed');
    expect(result['mergedAt']).toBe('2024-01-17T10:00:00Z');
    expect(result['closedAt']).toBe('2024-01-17T10:00:00Z');
  });

  it('handles null mergeable (computing)', () => {
    const pr = createTestPullRequest({ mergeable: null });
    const result = prToJson(pr);

    expect(result['mergeable']).toBeNull();
  });

  it('handles PR with null body', () => {
    const pr = createTestPullRequest({ body: null });
    const result = prToJson(pr);

    expect(result['body']).toBeNull();
  });

  it('handles null user', () => {
    const pr = createTestPullRequest({ user: null });
    const result = prToJson(pr);

    expect(result['author']).toBeNull();
  });
});

// ============================================================================
// formatPrListJson Tests
// ============================================================================

describe('formatPrListJson', () => {
  it('formats multiple PRs as JSON array', () => {
    const prs = [createTestPrListItem({ number: 1 }), createTestPrListItem({ number: 2 })];
    const result = formatPrListJson(prs);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
    expect((parsed[0] as { number: number }).number).toBe(1);
    expect((parsed[1] as { number: number }).number).toBe(2);
  });

  it('formats empty array', () => {
    const result = formatPrListJson([]);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toEqual([]);
  });

  it('returns full objects when no fields specified', () => {
    const prs = [createTestPrListItem()];
    const result = formatPrListJson(prs);
    const parsed = JSON.parse(result) as unknown[];

    // Should include all fields from prListItemToJson
    const pr = parsed[0] as Record<string, unknown>;
    expect(pr).toHaveProperty('number');
    expect(pr).toHaveProperty('title');
    expect(pr).toHaveProperty('state');
    expect(pr).toHaveProperty('author');
    expect(pr).toHaveProperty('labels');
  });

  it('filters to specified fields', () => {
    const prs = [createTestPrListItem()];
    const result = formatPrListJson(prs, ['number', 'title']);
    const parsed = JSON.parse(result) as unknown[];

    const pr = parsed[0] as Record<string, unknown>;
    expect(pr).toEqual({ number: 1, title: 'Test PR' });
  });

  it('ignores non-existent fields', () => {
    const prs = [createTestPrListItem()];
    const result = formatPrListJson(prs, ['number', 'nonexistent']);
    const parsed = JSON.parse(result) as unknown[];

    const pr = parsed[0] as Record<string, unknown>;
    expect(pr).toEqual({ number: 1 });
  });

  it.each([
    [['number'], { number: 1 }],
    [['title'], { title: 'Test PR' }],
    [['state', 'draft'], { state: 'open', draft: false }],
    [['author'], { author: { login: 'octocat' } }],
    [['labels'], { labels: [{ name: 'bug' }] }],
  ])('filters with fields %j returns %j', (fields, expected) => {
    const prs = [createTestPrListItem()];
    const result = formatPrListJson(prs, fields);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed[0]).toEqual(expected);
  });
});

// ============================================================================
// formatPrViewJson Tests
// ============================================================================

describe('formatPrViewJson', () => {
  it('formats single PR as JSON object', () => {
    const pr = createTestPullRequest();
    const result = formatPrViewJson(pr);
    const parsed = JSON.parse(result) as { number: number };

    expect(parsed.number).toBe(1);
  });

  it('returns full object when no fields specified', () => {
    const pr = createTestPullRequest();
    const result = formatPrViewJson(pr);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    // Should include all fields from prToJson
    expect(parsed).toHaveProperty('number');
    expect(parsed).toHaveProperty('title');
    expect(parsed).toHaveProperty('body');
    expect(parsed).toHaveProperty('merged');
    expect(parsed).toHaveProperty('additions');
  });

  it('filters to specified fields', () => {
    const pr = createTestPullRequest();
    const result = formatPrViewJson(pr, ['number', 'title', 'merged']);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    expect(parsed).toEqual({ number: 1, title: 'Test PR', merged: false });
  });

  it.each([
    [['additions', 'deletions'], { additions: 100, deletions: 10 }],
    [['mergeable', 'mergeableState'], { mergeable: true, mergeableState: 'clean' }],
    [['headRefName', 'baseRefName'], { headRefName: 'feature-branch', baseRefName: 'main' }],
  ])('filters with fields %j returns expected subset', (fields, expected) => {
    const pr = createTestPullRequest();
    const result = formatPrViewJson(pr, fields);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    expect(parsed).toEqual(expected);
  });
});

// ============================================================================
// formatPrFilesJson Tests
// ============================================================================

describe('formatPrFilesJson', () => {
  it('formats file list as JSON array', () => {
    const files = [
      createTestPrFile({ filename: 'src/a.ts' }),
      createTestPrFile({ filename: 'src/b.ts' }),
    ];
    const result = formatPrFilesJson(files);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
  });

  it('maps file fields correctly', () => {
    const files = [createTestPrFile()];
    const result = formatPrFilesJson(files);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed[0]).toEqual({
      path: 'src/index.ts',
      status: 'modified',
      additions: 50,
      deletions: 10,
    });
  });

  it.each(['added', 'removed', 'modified', 'renamed', 'copied'] as const)(
    'handles file status: %s',
    (status) => {
      const files = [createTestPrFile({ status })];
      const result = formatPrFilesJson(files);
      const parsed = JSON.parse(result) as { status: string }[];

      expect(parsed[0]?.status).toBe(status);
    }
  );

  it('formats empty file list', () => {
    const result = formatPrFilesJson([]);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toEqual([]);
  });
});

// ============================================================================
// formatPrCommentsJson Tests
// ============================================================================

describe('formatPrCommentsJson', () => {
  it('formats comments as JSON array', () => {
    const comments = [createTestPrComment({ id: 1 }), createTestPrComment({ id: 2 })];
    const result = formatPrCommentsJson(comments);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
  });

  it('maps comment fields correctly', () => {
    const comments = [createTestPrComment()];
    const result = formatPrCommentsJson(comments);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed[0]).toEqual({
      id: 1,
      author: { login: 'reviewer' },
      body: 'Looks good!',
      createdAt: '2024-01-16T12:00:00Z',
      url: 'https://github.com/octocat/Hello-World/pull/1#issuecomment-1',
    });
  });

  it('handles null user', () => {
    const comments = [createTestPrComment({ user: null })];
    const result = formatPrCommentsJson(comments);
    const parsed = JSON.parse(result) as { author: unknown }[];

    expect(parsed[0]?.author).toBeNull();
  });

  it('formats empty comments array', () => {
    const result = formatPrCommentsJson([]);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toEqual([]);
  });
});
