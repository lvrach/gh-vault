/**
 * PR domain mock data factories.
 * These functions create realistic GitHub API responses for testing.
 */

import { mockLabel, mockMilestone, mockRepo, mockUser } from '../shared/data.js';

/**
 * Create a detailed mock pull request (for GET /pulls/:number).
 */
export function createMockPullRequest(pullNumber: number) {
  return {
    url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}`,
    id: pullNumber,
    node_id: 'MDExOlB1bGxSZXF1ZXN0MQ==',
    html_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}`,
    diff_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}.diff`,
    patch_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}.patch`,
    issue_url: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}`,
    commits_url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/commits`,
    review_comments_url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/comments`,
    review_comment_url: 'https://api.github.com/repos/octocat/Hello-World/pulls/comments{/number}',
    comments_url: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}/comments`,
    statuses_url:
      'https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e',
    number: pullNumber,
    state: 'open',
    locked: false,
    title: 'Amazing new feature',
    user: mockUser,
    body: 'Please pull these awesome changes in!',
    labels: [mockLabel],
    milestone: mockMilestone,
    active_lock_reason: null,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-16T14:20:00Z',
    closed_at: null,
    merged_at: null,
    merge_commit_sha: null,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    requested_teams: [],
    head: {
      label: 'octocat:new-topic',
      ref: 'new-topic',
      sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      user: mockUser,
      repo: mockRepo,
    },
    base: {
      label: 'octocat:main',
      ref: 'main',
      sha: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
      user: mockUser,
      repo: mockRepo,
    },
    _links: {
      self: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}`,
      },
      html: {
        href: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}`,
      },
      issue: {
        href: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}`,
      },
      comments: {
        href: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}/comments`,
      },
      review_comments: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/comments`,
      },
      review_comment: {
        href: 'https://api.github.com/repos/octocat/Hello-World/pulls/comments{/number}',
      },
      commits: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/commits`,
      },
      statuses: {
        href: 'https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e',
      },
    },
    author_association: 'OWNER',
    auto_merge: null,
    draft: false,
    merged: false,
    mergeable: true,
    rebaseable: true,
    mergeable_state: 'clean',
    merged_by: null,
    comments: 10,
    review_comments: 5,
    maintainer_can_modify: true,
    commits: 3,
    additions: 100,
    deletions: 3,
    changed_files: 5,
  };
}

/**
 * Create a mock pull request list item (for GET /pulls).
 */
export function createMockPullRequestListItem(pullNumber: number) {
  return {
    url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}`,
    id: pullNumber,
    node_id: 'MDExOlB1bGxSZXF1ZXN0MQ==',
    html_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}`,
    diff_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}.diff`,
    patch_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}.patch`,
    issue_url: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}`,
    number: pullNumber,
    state: 'open',
    locked: false,
    title: `Pull Request #${String(pullNumber)}`,
    user: mockUser,
    body: 'PR description',
    labels: [mockLabel],
    milestone: mockMilestone,
    active_lock_reason: null,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-16T14:20:00Z',
    closed_at: null,
    merged_at: null,
    merge_commit_sha: null,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    requested_teams: [],
    head: {
      label: 'octocat:feature-branch',
      ref: 'feature-branch',
      sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      user: mockUser,
      repo: mockRepo,
    },
    base: {
      label: 'octocat:main',
      ref: 'main',
      sha: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
      user: mockUser,
      repo: mockRepo,
    },
    _links: {
      self: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}`,
      },
      html: {
        href: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}`,
      },
      issue: {
        href: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}`,
      },
      comments: {
        href: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}/comments`,
      },
      review_comments: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/comments`,
      },
      review_comment: {
        href: 'https://api.github.com/repos/octocat/Hello-World/pulls/comments{/number}',
      },
      commits: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/commits`,
      },
      statuses: {
        href: 'https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e',
      },
    },
    author_association: 'OWNER',
    auto_merge: null,
    draft: false,
  };
}

/**
 * Create a mock issue comment.
 */
export function createMockIssueComment(commentId: number) {
  return {
    id: commentId,
    node_id: 'MDEyOklzc3VlQ29tbWVudDE=',
    url: 'https://api.github.com/repos/octocat/Hello-World/issues/comments/1',
    html_url: 'https://github.com/octocat/Hello-World/issues/1347#issuecomment-1',
    body: 'This is a great PR! Nice work.',
    user: mockUser,
    created_at: '2024-01-15T12:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
    issue_url: 'https://api.github.com/repos/octocat/Hello-World/issues/1347',
    author_association: 'COLLABORATOR',
    performed_via_github_app: null,
    reactions: {
      url: 'https://api.github.com/repos/octocat/Hello-World/issues/comments/1/reactions',
      total_count: 2,
      '+1': 1,
      '-1': 0,
      laugh: 0,
      hooray: 1,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
  };
}

/**
 * Create a mock review comment (inline comment on code).
 */
export function createMockReviewComment(commentId: number) {
  return {
    url: `https://api.github.com/repos/octocat/Hello-World/pulls/comments/${String(commentId)}`,
    pull_request_review_id: 80,
    id: commentId,
    node_id: 'MDI0OlB1bGxSZXF1ZXN0UmV2aWV3Q29tbWVudDEw',
    diff_hunk: '@@ -16,33 +16,40 @@ public class Connection implements Runnable {',
    path: 'src/main.ts',
    position: null,
    original_position: 4,
    commit_id: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    original_commit_id: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
    in_reply_to_id: commentId > 1 ? commentId - 1 : undefined,
    user: mockUser,
    body: 'Great work on this change!',
    created_at: '2024-01-16T09:00:00Z',
    updated_at: '2024-01-16T09:00:00Z',
    html_url: 'https://github.com/octocat/Hello-World/pull/1347#discussion_r1',
    pull_request_url: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
    author_association: 'COLLABORATOR',
    _links: {
      self: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/comments/${String(commentId)}`,
      },
      html: {
        href: 'https://github.com/octocat/Hello-World/pull/1347#discussion_r1',
      },
      pull_request: {
        href: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
      },
    },
    start_line: null,
    original_start_line: null,
    start_side: null,
    line: 28,
    original_line: 26,
    side: 'RIGHT',
    reactions: {
      url: `https://api.github.com/repos/octocat/Hello-World/pulls/comments/${String(commentId)}/reactions`,
      total_count: 0,
      '+1': 0,
      '-1': 0,
      laugh: 0,
      hooray: 0,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
    subject_type: 'line',
  };
}

/**
 * Create a mock PR review.
 */
export function createMockReview(reviewId: number, state: string) {
  return {
    id: reviewId,
    node_id: 'MDE3OlB1bGxSZXF1ZXN0UmV2aWV3ODA=',
    user: mockUser,
    body: state === 'APPROVED' ? 'Looks good to me!' : 'Please address comments',
    state,
    html_url: `https://github.com/octocat/Hello-World/pull/1347#pullrequestreview-${String(reviewId)}`,
    pull_request_url: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
    _links: {
      html: {
        href: `https://github.com/octocat/Hello-World/pull/1347#pullrequestreview-${String(reviewId)}`,
      },
      pull_request: {
        href: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
      },
    },
    submitted_at: '2024-01-16T15:00:00Z',
    commit_id: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    author_association: 'COLLABORATOR',
  };
}

/**
 * Create a mock PR file.
 */
export function createMockPrFile(filename: string, status: string) {
  return {
    sha: 'bbcd538c8e72b8c175046e27cc8f907076331401',
    filename,
    status,
    additions: 50,
    deletions: 10,
    changes: 60,
    blob_url: `https://github.com/octocat/Hello-World/blob/6dcb09b5b57875f334f61aebed695e2e4193db5e/${filename}`,
    raw_url: `https://github.com/octocat/Hello-World/raw/6dcb09b5b57875f334f61aebed695e2e4193db5e/${filename}`,
    contents_url: `https://api.github.com/repos/octocat/Hello-World/contents/${filename}?ref=6dcb09b5b57875f334f61aebed695e2e4193db5e`,
    patch: '@@ -1,5 +1,10 @@\n-old line\n+new line\n context line\n context line\n+added line',
  };
}
