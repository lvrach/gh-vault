/**
 * Search domain mock data factories.
 * These functions create realistic GitHub Search API responses for testing.
 */

import { mockUser } from '../shared/data.js';

/**
 * Create a mock search repository result.
 */
export function createMockSearchRepo(repoId: number, name = `repo-${String(repoId)}`) {
  return {
    id: repoId,
    node_id: 'MDEwOlJlcG9zaXRvcnkx',
    name,
    full_name: `octocat/${name}`,
    private: false,
    owner: mockUser,
    html_url: `https://github.com/octocat/${name}`,
    description: `Description for ${name}`,
    fork: false,
    url: `https://api.github.com/repos/octocat/${name}`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    pushed_at: '2024-01-15T09:00:00Z',
    homepage: 'https://github.com',
    size: 108,
    stargazers_count: 80 + repoId,
    watchers_count: 80 + repoId,
    language: 'TypeScript',
    forks_count: 9 + repoId,
    open_issues_count: repoId,
    master_branch: 'main',
    default_branch: 'main',
    score: 1,
    forks: 9 + repoId,
    open_issues: repoId,
    watchers: 80 + repoId,
    archived: false,
    disabled: false,
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
      node_id: 'MDc6TGljZW5zZW1pdA==',
    },
    topics: ['typescript', 'testing'],
    visibility: 'public',
  };
}

/**
 * Create a mock search issue result.
 * Note: Issues and PRs share the same search endpoint.
 */
export function createMockSearchIssue(issueId: number, isPullRequest = false) {
  const number = issueId;
  return {
    id: issueId,
    node_id: 'MDU6SXNzdWUx',
    number,
    title: `Issue #${String(number)}: ${isPullRequest ? 'PR' : 'Bug'} title`,
    user: mockUser,
    labels: [
      { name: 'bug', color: 'd73a4a' },
      { name: 'help wanted', color: '008672' },
    ],
    state: 'open',
    locked: false,
    assignee: null,
    assignees: [],
    milestone: null,
    comments: 5,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-16T14:00:00Z',
    closed_at: null,
    body: 'Issue body content goes here.',
    html_url: `https://github.com/octocat/Hello-World/issues/${String(number)}`,
    repository_url: 'https://api.github.com/repos/octocat/Hello-World',
    labels_url: 'https://api.github.com/repos/octocat/Hello-World/issues/1/labels{/name}',
    comments_url: 'https://api.github.com/repos/octocat/Hello-World/issues/1/comments',
    events_url: 'https://api.github.com/repos/octocat/Hello-World/issues/1/events',
    url: `https://api.github.com/repos/octocat/Hello-World/issues/${String(number)}`,
    author_association: 'OWNER',
    active_lock_reason: null,
    draft: isPullRequest ? false : undefined,
    pull_request: isPullRequest
      ? {
          url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(number)}`,
          html_url: `https://github.com/octocat/Hello-World/pull/${String(number)}`,
          diff_url: `https://github.com/octocat/Hello-World/pull/${String(number)}.diff`,
          patch_url: `https://github.com/octocat/Hello-World/pull/${String(number)}.patch`,
        }
      : undefined,
    score: 1,
    reactions: {
      url: 'https://api.github.com/repos/octocat/Hello-World/issues/1/reactions',
      total_count: 3,
      '+1': 2,
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
 * Create a mock search commit result.
 */
export function createMockSearchCommit(sha: string) {
  return {
    sha,
    node_id: 'MDY6Q29tbWl0MQ==',
    url: `https://api.github.com/repos/octocat/Hello-World/git/commits/${sha}`,
    html_url: `https://github.com/octocat/Hello-World/commit/${sha}`,
    comments_url: `https://api.github.com/repos/octocat/Hello-World/commits/${sha}/comments`,
    commit: {
      url: `https://api.github.com/repos/octocat/Hello-World/git/commits/${sha}`,
      message: 'Fix critical bug in authentication\n\nThis fixes issue #123.',
      comment_count: 0,
      author: {
        name: 'The Octocat',
        email: 'octocat@github.com',
        date: '2024-01-15T10:00:00Z',
      },
      committer: {
        name: 'The Octocat',
        email: 'octocat@github.com',
        date: '2024-01-15T10:00:00Z',
      },
      tree: {
        sha: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
        url: 'https://api.github.com/repos/octocat/Hello-World/git/trees/9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
      },
    },
    author: mockUser,
    committer: mockUser,
    parents: [
      {
        sha: 'e3443e7bd4e00c2aab3a9f3e4c3e6d0e5e6f7g8h',
        url: 'https://api.github.com/repos/octocat/Hello-World/git/commits/e3443e7bd4e00c2aab3a9f3e4c3e6d0e5e6f7g8h',
        html_url:
          'https://github.com/octocat/Hello-World/commit/e3443e7bd4e00c2aab3a9f3e4c3e6d0e5e6f7g8h',
      },
    ],
    repository: {
      id: 1_296_269,
      node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
      name: 'Hello-World',
      full_name: 'octocat/Hello-World',
      private: false,
      owner: mockUser,
      html_url: 'https://github.com/octocat/Hello-World',
      description: 'This your first repo!',
      fork: false,
      url: 'https://api.github.com/repos/octocat/Hello-World',
    },
    score: 1,
  };
}

/**
 * Create a mock search code result.
 */
export function createMockSearchCode(filename: string, path = `src/${filename}`) {
  return {
    name: filename,
    path,
    sha: 'bbcd538c8e72b8c175046e27cc8f907076331401',
    url: `https://api.github.com/repos/octocat/Hello-World/contents/${path}?ref=main`,
    git_url:
      'https://api.github.com/repos/octocat/Hello-World/git/blobs/bbcd538c8e72b8c175046e27cc8f907076331401',
    html_url: `https://github.com/octocat/Hello-World/blob/main/${path}`,
    repository: {
      id: 1_296_269,
      node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
      name: 'Hello-World',
      full_name: 'octocat/Hello-World',
      private: false,
      owner: mockUser,
      html_url: 'https://github.com/octocat/Hello-World',
      description: 'This your first repo!',
      fork: false,
      url: 'https://api.github.com/repos/octocat/Hello-World',
    },
    score: 1,
    // Text matches are optional and only returned with text-match media type
    text_matches: [
      {
        object_url: `https://api.github.com/repos/octocat/Hello-World/contents/${path}`,
        object_type: 'FileContent',
        property: 'content',
        fragment: '...function authenticate(user) {\n  return token;...',
        matches: [
          {
            text: 'authenticate',
            indices: [12, 24],
          },
        ],
      },
    ],
  };
}
