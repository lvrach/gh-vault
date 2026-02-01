/**
 * PR text formatters snapshot tests.
 *
 * Uses vi.useFakeTimers() for deterministic date output.
 * Tests with color=false for readable snapshots.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatAutoMergeText,
  formatCheckoutText,
  formatCommentCreatedText,
  formatCommentDeletedText,
  formatCommentUpdatedText,
  formatEditResultText,
  formatMergeResultText,
  formatPrChecksText,
  formatPrCommentsText,
  formatPrFilesText,
  formatPrListText,
  formatPrStateChangeText,
  formatPrStatusText,
  formatPrViewText,
  formatReviewSubmittedText,
} from '../../../../domains/pr/formatters/text.js';
import type {
  EditPrResult,
  MergeResult,
  PrChecksResult,
  PrComment,
  PrFile,
  PrReview,
  PrStatusResult,
  PullRequest,
  PullRequestListItem,
} from '../../../../domains/pr/types.js';

// ============================================================================
// Test Setup - Freeze time for deterministic relative dates
// ============================================================================

const FROZEN_DATE = new Date('2024-01-20T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================================
// Fixtures
// ============================================================================

function createPrListItem(overrides: Partial<PullRequestListItem> = {}): PullRequestListItem {
  return {
    number: 42,
    title: 'Add new feature',
    state: 'open',
    draft: false,
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-18T14:20:00Z',
    htmlUrl: 'https://github.com/owner/repo/pull/42',
    labels: [{ name: 'enhancement' }],
    head: { ref: 'feature-branch', sha: 'abc123' },
    base: { ref: 'main', sha: 'def456' },
    ...overrides,
  };
}

function createPullRequest(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 42,
    title: 'Add new feature',
    body: 'This PR adds a great new feature.\n\n- Feature 1\n- Feature 2',
    state: 'open',
    draft: false,
    merged: false,
    mergeable: true,
    mergeableState: 'clean',
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    head: { ref: 'feature-branch', sha: 'abc123def' },
    base: { ref: 'main', sha: '789xyz' },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-18T14:20:00Z',
    closedAt: null,
    mergedAt: null,
    htmlUrl: 'https://github.com/owner/repo/pull/42',
    additions: 150,
    deletions: 25,
    changedFiles: 8,
    labels: [{ name: 'enhancement' }, { name: 'documentation' }],
    ...overrides,
  };
}

function createPrFile(overrides: Partial<PrFile> = {}): PrFile {
  return {
    filename: 'src/index.ts',
    status: 'modified',
    additions: 50,
    deletions: 10,
    ...overrides,
  };
}

function createPrComment(overrides: Partial<PrComment> = {}): PrComment {
  return {
    id: 1,
    user: { login: 'reviewer', htmlUrl: 'https://github.com/reviewer' },
    body: 'Looks good to me!',
    createdAt: '2024-01-17T10:00:00Z',
    htmlUrl: 'https://github.com/owner/repo/pull/42#issuecomment-1',
    ...overrides,
  };
}

// ============================================================================
// formatPrListText Tests
// ============================================================================

describe('formatPrListText', () => {
  it('formats empty list', () => {
    expect(formatPrListText([], false)).toMatchSnapshot();
  });

  it('formats single open PR', () => {
    const prs = [createPrListItem()];
    expect(formatPrListText(prs, false)).toMatchSnapshot();
  });

  it('formats multiple PRs with various states', () => {
    const prs = [
      createPrListItem({ number: 1, title: 'Open PR', state: 'open' }),
      createPrListItem({ number: 2, title: 'Draft PR', state: 'open', draft: true }),
      createPrListItem({ number: 3, title: 'Closed PR', state: 'closed' }),
    ];
    expect(formatPrListText(prs, false)).toMatchSnapshot();
  });

  it('formats PR with multiple labels', () => {
    const prs = [
      createPrListItem({
        labels: [{ name: 'bug' }, { name: 'priority-high' }, { name: 'needs-review' }],
      }),
    ];
    expect(formatPrListText(prs, false)).toMatchSnapshot();
  });

  it('formats PR with no labels', () => {
    const prs = [createPrListItem({ labels: [] })];
    expect(formatPrListText(prs, false)).toMatchSnapshot();
  });

  it('formats PR with null user', () => {
    const prs = [createPrListItem({ user: null })];
    expect(formatPrListText(prs, false)).toMatchSnapshot();
  });

  it('formats PR with mergeable status', () => {
    const prs = [createPrListItem({ mergeable: true, mergeableState: 'clean' })];
    expect(formatPrListText(prs, false)).toMatchSnapshot();
  });

  it('formats PR with conflicts', () => {
    const prs = [createPrListItem({ mergeable: false, mergeableState: 'dirty' })];
    expect(formatPrListText(prs, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatPrViewText Tests
// ============================================================================

describe('formatPrViewText', () => {
  it('formats open PR with body', () => {
    const pr = createPullRequest();
    expect(formatPrViewText(pr, false)).toMatchSnapshot();
  });

  it('formats merged PR', () => {
    const pr = createPullRequest({
      state: 'closed',
      merged: true,
      mergedAt: '2024-01-19T16:00:00Z',
      closedAt: '2024-01-19T16:00:00Z',
    });
    expect(formatPrViewText(pr, false)).toMatchSnapshot();
  });

  it('formats draft PR', () => {
    const pr = createPullRequest({ draft: true });
    expect(formatPrViewText(pr, false)).toMatchSnapshot();
  });

  it('formats closed (not merged) PR', () => {
    const pr = createPullRequest({
      state: 'closed',
      merged: false,
      closedAt: '2024-01-19T16:00:00Z',
    });
    expect(formatPrViewText(pr, false)).toMatchSnapshot();
  });

  it('formats PR without body', () => {
    const pr = createPullRequest({ body: null });
    expect(formatPrViewText(pr, false)).toMatchSnapshot();
  });

  it('formats PR with no labels', () => {
    const pr = createPullRequest({ labels: [] });
    expect(formatPrViewText(pr, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatPrFilesText Tests
// ============================================================================

describe('formatPrFilesText', () => {
  it('formats empty file list', () => {
    expect(formatPrFilesText([], false, false)).toMatchSnapshot();
  });

  it('formats multiple files', () => {
    const files = [
      createPrFile({ filename: 'src/index.ts', status: 'modified', additions: 50, deletions: 10 }),
      createPrFile({ filename: 'src/new.ts', status: 'added', additions: 100, deletions: 0 }),
      createPrFile({ filename: 'src/old.ts', status: 'removed', additions: 0, deletions: 75 }),
    ];
    expect(formatPrFilesText(files, false, false)).toMatchSnapshot();
  });

  it('formats files name-only mode', () => {
    const files = [
      createPrFile({ filename: 'src/a.ts' }),
      createPrFile({ filename: 'src/b.ts' }),
      createPrFile({ filename: 'test/c.test.ts' }),
    ];
    expect(formatPrFilesText(files, true, false)).toMatchSnapshot();
  });

  it('formats files with various statuses', () => {
    const files = [
      createPrFile({ filename: 'modified.ts', status: 'modified' }),
      createPrFile({ filename: 'added.ts', status: 'added' }),
      createPrFile({ filename: 'removed.ts', status: 'removed' }),
      createPrFile({ filename: 'renamed.ts', status: 'renamed' }),
      createPrFile({ filename: 'copied.ts', status: 'copied' }),
    ];
    expect(formatPrFilesText(files, false, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatPrCommentsText Tests
// ============================================================================

describe('formatPrCommentsText', () => {
  it('formats empty comments', () => {
    expect(formatPrCommentsText([], false)).toMatchSnapshot();
  });

  it('formats single comment', () => {
    const comments = [createPrComment()];
    expect(formatPrCommentsText(comments, false)).toMatchSnapshot();
  });

  it('formats multiple comments', () => {
    const comments = [
      createPrComment({ id: 1, body: 'First comment' }),
      createPrComment({ id: 2, body: 'Second comment', user: { login: 'another', htmlUrl: '#' } }),
    ];
    expect(formatPrCommentsText(comments, false)).toMatchSnapshot();
  });

  it('formats comment with null user', () => {
    const comments = [createPrComment({ user: null })];
    expect(formatPrCommentsText(comments, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatPrStateChangeText Tests
// ============================================================================

describe('formatPrStateChangeText', () => {
  it('formats closed PR', () => {
    const pr = createPullRequest({ state: 'closed' });
    expect(formatPrStateChangeText(pr, 'closed', false)).toMatchSnapshot();
  });

  it('formats reopened PR', () => {
    const pr = createPullRequest();
    expect(formatPrStateChangeText(pr, 'reopened', false)).toMatchSnapshot();
  });

  it('formats ready for review', () => {
    const pr = createPullRequest({ draft: false });
    expect(formatPrStateChangeText(pr, 'ready', false)).toMatchSnapshot();
  });

  it('formats converted to draft', () => {
    const pr = createPullRequest({ draft: true });
    expect(formatPrStateChangeText(pr, 'draft', false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatEditResultText Tests
// ============================================================================

describe('formatEditResultText', () => {
  it('formats edit result with updated fields', () => {
    const result: EditPrResult = {
      number: 42,
      title: 'Updated Title',
      htmlUrl: 'https://github.com/owner/repo/pull/42',
      updatedFields: ['title', 'body', 'labels'],
    };
    expect(formatEditResultText(result, false)).toMatchSnapshot();
  });

  it('formats edit result with no updated fields', () => {
    const result: EditPrResult = {
      number: 42,
      title: 'Same Title',
      htmlUrl: 'https://github.com/owner/repo/pull/42',
      updatedFields: [],
    };
    expect(formatEditResultText(result, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatMergeResultText Tests
// ============================================================================

describe('formatMergeResultText', () => {
  it('formats merge result without branch deletion', () => {
    const result: MergeResult = {
      sha: 'abc123def456',
      merged: true,
      message: 'Pull Request successfully merged',
    };
    const pr = { number: 42, title: 'Add feature' };
    expect(formatMergeResultText(result, pr, undefined, false)).toMatchSnapshot();
  });

  it('formats merge result with branch deletion', () => {
    const result: MergeResult = {
      sha: 'abc123def456',
      merged: true,
      message: 'Pull Request successfully merged',
    };
    const pr = { number: 42, title: 'Add feature' };
    expect(formatMergeResultText(result, pr, 'feature-branch', false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatAutoMergeText Tests
// ============================================================================

describe('formatAutoMergeText', () => {
  it('formats auto-merge enabled', () => {
    expect(formatAutoMergeText(true, 42, 'squash', false)).toMatchSnapshot();
  });

  it('formats auto-merge disabled', () => {
    expect(formatAutoMergeText(false, 42, 'merge', false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatPrChecksText Tests
// ============================================================================

describe('formatPrChecksText', () => {
  it('formats all passing checks', () => {
    const checks: PrChecksResult = {
      sha: 'abc123def',
      overallState: 'success',
      checkRuns: [
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          detailsUrl: null,
          startedAt: null,
          completedAt: null,
        },
        {
          name: 'Lint',
          status: 'completed',
          conclusion: 'success',
          detailsUrl: null,
          startedAt: null,
          completedAt: null,
        },
      ],
      statuses: [],
      passing: 2,
      failing: 0,
      pending: 0,
      total: 2,
    };
    expect(formatPrChecksText(checks, false)).toMatchSnapshot();
  });

  it('formats mixed check results', () => {
    const checks: PrChecksResult = {
      sha: 'abc123def',
      overallState: 'failure',
      checkRuns: [
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          detailsUrl: null,
          startedAt: null,
          completedAt: null,
        },
        {
          name: 'Tests',
          status: 'completed',
          conclusion: 'failure',
          detailsUrl: null,
          startedAt: null,
          completedAt: null,
        },
        {
          name: 'Deploy',
          status: 'in_progress',
          conclusion: null,
          detailsUrl: null,
          startedAt: null,
          completedAt: null,
        },
      ],
      statuses: [
        { state: 'success', context: 'coverage/codecov', description: '80%', targetUrl: null },
      ],
      passing: 2,
      failing: 1,
      pending: 1,
      total: 4,
    };
    expect(formatPrChecksText(checks, false)).toMatchSnapshot();
  });

  it('formats pending checks', () => {
    const checks: PrChecksResult = {
      sha: 'abc123def',
      overallState: 'pending',
      checkRuns: [
        {
          name: 'CI',
          status: 'queued',
          conclusion: null,
          detailsUrl: null,
          startedAt: null,
          completedAt: null,
        },
      ],
      statuses: [
        {
          state: 'pending',
          context: 'deploy/preview',
          description: 'Building...',
          targetUrl: null,
        },
      ],
      passing: 0,
      failing: 0,
      pending: 2,
      total: 2,
    };
    expect(formatPrChecksText(checks, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatPrStatusText Tests
// ============================================================================

describe('formatPrStatusText', () => {
  it('formats empty status', () => {
    const status: PrStatusResult = {
      currentBranchPr: null,
      createdByYou: [],
      reviewRequested: [],
      assignedToYou: [],
    };
    expect(formatPrStatusText(status, false)).toMatchSnapshot();
  });

  it('formats status with current branch PR', () => {
    const status: PrStatusResult = {
      currentBranchPr: createPrListItem(),
      createdByYou: [],
      reviewRequested: [],
      assignedToYou: [],
    };
    expect(formatPrStatusText(status, false)).toMatchSnapshot();
  });

  it('formats full status', () => {
    const status: PrStatusResult = {
      currentBranchPr: createPrListItem({ number: 1, title: 'Current branch PR' }),
      createdByYou: [
        createPrListItem({ number: 2, title: 'My PR 1' }),
        createPrListItem({ number: 3, title: 'My PR 2', draft: true }),
      ],
      reviewRequested: [
        createPrListItem({
          number: 4,
          title: 'Review requested',
          user: { login: 'author', htmlUrl: '#' },
        }),
      ],
      assignedToYou: [
        createPrListItem({
          number: 5,
          title: 'Assigned to me',
          user: { login: 'assigner', htmlUrl: '#' },
        }),
      ],
    };
    expect(formatPrStatusText(status, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatReviewSubmittedText Tests
// ============================================================================

describe('formatReviewSubmittedText', () => {
  const review: PrReview = {
    id: 1,
    user: { login: 'reviewer', htmlUrl: '#' },
    body: 'Great work!',
    state: 'APPROVED',
    submittedAt: '2024-01-18T10:00:00Z',
    htmlUrl: '#',
  };

  it('formats approval', () => {
    expect(formatReviewSubmittedText(review, 'APPROVE', 42, false)).toMatchSnapshot();
  });

  it('formats changes requested', () => {
    expect(formatReviewSubmittedText(review, 'REQUEST_CHANGES', 42, false)).toMatchSnapshot();
  });

  it('formats comment', () => {
    expect(formatReviewSubmittedText(review, 'COMMENT', 42, false)).toMatchSnapshot();
  });
});

// ============================================================================
// Comment Action Text Tests
// ============================================================================

describe('comment action formatters', () => {
  const comment = createPrComment();

  it('formats comment created', () => {
    expect(formatCommentCreatedText(comment, 42, false)).toMatchSnapshot();
  });

  it('formats comment updated', () => {
    expect(formatCommentUpdatedText(comment, 42, false)).toMatchSnapshot();
  });

  it('formats comment deleted', () => {
    expect(formatCommentDeletedText(42, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatCheckoutText Tests
// ============================================================================

describe('formatCheckoutText', () => {
  it('formats checkout message', () => {
    expect(formatCheckoutText(42, 'feature-branch', false)).toMatchSnapshot();
  });
});
