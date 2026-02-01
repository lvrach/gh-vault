/**
 * Search text formatters snapshot tests.
 *
 * Uses vi.useFakeTimers() for deterministic date output.
 * Tests with color=false for readable snapshots.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatCodeText,
  formatCommitsText,
  formatIssuesText,
  formatPrsText,
  formatReposText,
} from '../../../../domains/search/formatters/text.js';
import type {
  SearchCodeResult,
  SearchCommit,
  SearchIssue,
  SearchPullRequest,
  SearchRepository,
} from '../../../../domains/search/types.js';

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

function createSearchRepo(overrides: Partial<SearchRepository> = {}): SearchRepository {
  return {
    id: 1,
    name: 'Hello-World',
    fullName: 'octocat/Hello-World',
    description: 'My first repository on GitHub',
    owner: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    htmlUrl: 'https://github.com/octocat/Hello-World',
    language: 'TypeScript',
    stargazersCount: 1234,
    forksCount: 567,
    openIssuesCount: 42,
    watchersCount: 1234,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2024-01-18T10:00:00Z',
    pushedAt: '2024-01-18T09:00:00Z',
    license: { name: 'MIT License', spdxId: 'MIT' },
    topics: ['typescript', 'testing'],
    visibility: 'public',
    defaultBranch: 'main',
    ...overrides,
  };
}

function createSearchIssue(overrides: Partial<SearchIssue> = {}): SearchIssue {
  return {
    id: 1,
    number: 42,
    title: 'Bug in authentication',
    body: 'When I try to login...',
    state: 'open',
    user: { login: 'reporter', htmlUrl: 'https://github.com/reporter' },
    assignees: [],
    labels: [{ name: 'bug' }],
    commentsCount: 5,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-18T14:00:00Z',
    closedAt: null,
    htmlUrl: 'https://github.com/octocat/Hello-World/issues/42',
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    isPullRequest: false,
    isLocked: false,
    ...overrides,
  };
}

function createSearchPr(overrides: Partial<SearchPullRequest> = {}): SearchPullRequest {
  return {
    ...createSearchIssue({ isPullRequest: true }),
    isDraft: false,
    ...overrides,
  };
}

function createSearchCommit(overrides: Partial<SearchCommit> = {}): SearchCommit {
  return {
    sha: 'abc123def456789',
    htmlUrl: 'https://github.com/octocat/Hello-World/commit/abc123def456789',
    message: 'Fix authentication bug\n\nThis resolves issue #42',
    author: { name: 'The Octocat', email: 'octocat@github.com', date: '2024-01-18T10:00:00Z' },
    committer: { name: 'The Octocat', email: 'octocat@github.com', date: '2024-01-18T10:00:00Z' },
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    parents: [{ sha: 'parent123' }],
    ...overrides,
  };
}

function createSearchCode(overrides: Partial<SearchCodeResult> = {}): SearchCodeResult {
  return {
    name: 'auth.ts',
    path: 'src/auth.ts',
    sha: 'file123',
    htmlUrl: 'https://github.com/octocat/Hello-World/blob/main/src/auth.ts',
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    textMatches: [
      {
        fragment: 'function authenticate(user: User) { ... }',
        matches: [{ text: 'authenticate', indices: [9, 21] }],
      },
    ],
    ...overrides,
  };
}

// ============================================================================
// formatReposText Tests
// ============================================================================

describe('formatReposText', () => {
  it('formats empty list', () => {
    expect(formatReposText([], false)).toMatchSnapshot();
  });

  it('formats single repository', () => {
    const repos = [createSearchRepo()];
    expect(formatReposText(repos, false)).toMatchSnapshot();
  });

  it('formats multiple repositories', () => {
    const repos = [
      createSearchRepo({ fullName: 'owner/repo1', stargazersCount: 5000 }),
      createSearchRepo({ id: 2, fullName: 'owner/repo2', stargazersCount: 100 }),
    ];
    expect(formatReposText(repos, false)).toMatchSnapshot();
  });

  it('formats repository with large numbers', () => {
    const repos = [createSearchRepo({ stargazersCount: 1_500_000, forksCount: 75_000 })];
    expect(formatReposText(repos, false)).toMatchSnapshot();
  });

  it('formats archived repository', () => {
    const repos = [createSearchRepo({ isArchived: true })];
    expect(formatReposText(repos, false)).toMatchSnapshot();
  });

  it('formats private repository', () => {
    const repos = [createSearchRepo({ isPrivate: true })];
    expect(formatReposText(repos, false)).toMatchSnapshot();
  });

  it('formats repository without description', () => {
    const repos = [createSearchRepo({ description: null })];
    expect(formatReposText(repos, false)).toMatchSnapshot();
  });

  it('formats repository without language', () => {
    const repos = [createSearchRepo({ language: null })];
    expect(formatReposText(repos, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatIssuesText Tests
// ============================================================================

describe('formatIssuesText', () => {
  it('formats empty list', () => {
    expect(formatIssuesText([], false)).toMatchSnapshot();
  });

  it('formats single open issue', () => {
    const issues = [createSearchIssue()];
    expect(formatIssuesText(issues, false)).toMatchSnapshot();
  });

  it('formats closed issue', () => {
    const issues = [createSearchIssue({ state: 'closed' })];
    expect(formatIssuesText(issues, false)).toMatchSnapshot();
  });

  it('formats issues with multiple labels', () => {
    const issues = [
      createSearchIssue({
        labels: [{ name: 'bug' }, { name: 'priority-high' }, { name: 'needs-triage' }],
      }),
    ];
    expect(formatIssuesText(issues, false)).toMatchSnapshot();
  });

  it('formats issue with null user', () => {
    const issues = [createSearchIssue({ user: null })];
    expect(formatIssuesText(issues, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatPrsText Tests
// ============================================================================

describe('formatPrsText', () => {
  it('formats empty list', () => {
    expect(formatPrsText([], false)).toMatchSnapshot();
  });

  it('formats open PR', () => {
    const prs = [createSearchPr()];
    expect(formatPrsText(prs, false)).toMatchSnapshot();
  });

  it('formats draft PR', () => {
    const prs = [createSearchPr({ isDraft: true })];
    expect(formatPrsText(prs, false)).toMatchSnapshot();
  });

  it('formats closed PR', () => {
    const prs = [createSearchPr({ state: 'closed' })];
    expect(formatPrsText(prs, false)).toMatchSnapshot();
  });

  it('formats PRs with labels', () => {
    const prs = [
      createSearchPr({
        labels: [{ name: 'enhancement' }, { name: 'documentation' }],
      }),
    ];
    expect(formatPrsText(prs, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatCommitsText Tests
// ============================================================================

describe('formatCommitsText', () => {
  it('formats empty list', () => {
    expect(formatCommitsText([], false)).toMatchSnapshot();
  });

  it('formats single commit', () => {
    const commits = [createSearchCommit()];
    expect(formatCommitsText(commits, false)).toMatchSnapshot();
  });

  it('formats commit with long message (truncates)', () => {
    const commits = [
      createSearchCommit({
        message:
          'This is a very long commit message that should be truncated because it exceeds the maximum length allowed for display in the text formatter output',
      }),
    ];
    expect(formatCommitsText(commits, false)).toMatchSnapshot();
  });

  it('formats multiple commits', () => {
    const commits = [
      createSearchCommit({ sha: 'abc123' }),
      createSearchCommit({ sha: 'def456', message: 'Another commit' }),
    ];
    expect(formatCommitsText(commits, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatCodeText Tests
// ============================================================================

describe('formatCodeText', () => {
  it('formats empty list', () => {
    expect(formatCodeText([], false)).toMatchSnapshot();
  });

  it('formats single code result', () => {
    const results = [createSearchCode()];
    expect(formatCodeText(results, false)).toMatchSnapshot();
  });

  it('formats code result without text matches', () => {
    const results = [createSearchCode({ textMatches: undefined })];
    expect(formatCodeText(results, false)).toMatchSnapshot();
  });

  it('formats code result with multiple text matches', () => {
    const results = [
      createSearchCode({
        textMatches: [
          { fragment: 'first match fragment...', matches: [] },
          { fragment: 'second match fragment...', matches: [] },
          { fragment: 'third match (should be hidden)...', matches: [] },
        ],
      }),
    ];
    expect(formatCodeText(results, false)).toMatchSnapshot();
  });

  it('formats multiple code results', () => {
    const results = [
      createSearchCode({ path: 'src/auth.ts' }),
      createSearchCode({ path: 'src/login.ts', name: 'login.ts' }),
    ];
    expect(formatCodeText(results, false)).toMatchSnapshot();
  });
});
