/**
 * Search domain JSON formatters unit tests.
 *
 * Tests pure functions that transform search results to JSON output.
 */

import { describe, expect,it } from 'vitest';

import {
  codeToJson,
  commitToJson,
  formatCodeJson,
  formatCommitsJson,
  formatIssuesJson,
  formatPrsJson,
  formatReposJson,
  issueToJson,
  prToJson,
  repoToJson,
} from '../../../../domains/search/formatters/json.js';
import type {
  SearchCodeResult,
  SearchCommit,
  SearchIssue,
  SearchPullRequest,
  SearchRepository,
} from '../../../../domains/search/types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestSearchRepo(overrides: Partial<SearchRepository> = {}): SearchRepository {
  return {
    id: 1,
    name: 'Hello-World',
    fullName: 'octocat/Hello-World',
    description: 'My first repository',
    owner: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    htmlUrl: 'https://github.com/octocat/Hello-World',
    language: 'TypeScript',
    stargazersCount: 100,
    forksCount: 25,
    openIssuesCount: 5,
    watchersCount: 100,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    pushedAt: '2024-01-15T09:00:00Z',
    license: { name: 'MIT License', spdxId: 'MIT' },
    topics: ['typescript', 'testing'],
    visibility: 'public',
    defaultBranch: 'main',
    ...overrides,
  };
}

function createTestSearchIssue(overrides: Partial<SearchIssue> = {}): SearchIssue {
  return {
    id: 1,
    number: 42,
    title: 'Bug in authentication',
    body: 'Issue description',
    state: 'open',
    user: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    assignees: [],
    labels: [{ name: 'bug', color: 'd73a4a' }],
    commentsCount: 5,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T14:00:00Z',
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

function createTestSearchPr(overrides: Partial<SearchPullRequest> = {}): SearchPullRequest {
  return {
    ...createTestSearchIssue({ isPullRequest: true }),
    isDraft: false,
    ...overrides,
  };
}

function createTestSearchCommit(overrides: Partial<SearchCommit> = {}): SearchCommit {
  return {
    sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    htmlUrl: 'https://github.com/octocat/Hello-World/commit/6dcb09b5b57875f334f61aebed695e2e4193db5e',
    message: 'Fix authentication bug',
    author: { name: 'The Octocat', email: 'octocat@github.com', date: '2024-01-15T10:00:00Z' },
    committer: { name: 'The Octocat', email: 'octocat@github.com', date: '2024-01-15T10:00:00Z' },
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    parents: [{ sha: 'abc123' }],
    ...overrides,
  };
}

function createTestSearchCode(overrides: Partial<SearchCodeResult> = {}): SearchCodeResult {
  return {
    name: 'index.ts',
    path: 'src/index.ts',
    sha: 'bbcd538c8e72b8c175046e27cc8f907076331401',
    htmlUrl: 'https://github.com/octocat/Hello-World/blob/main/src/index.ts',
    repository: {
      fullName: 'octocat/Hello-World',
      htmlUrl: 'https://github.com/octocat/Hello-World',
    },
    textMatches: [
      {
        fragment: 'function authenticate() { ... }',
        matches: [{ text: 'authenticate', indices: [9, 21] }],
      },
    ],
    ...overrides,
  };
}

// ============================================================================
// repoToJson Tests
// ============================================================================

describe('repoToJson', () => {
  it('converts repository to JSON format', () => {
    const repo = createTestSearchRepo();
    const result = repoToJson(repo);

    expect(result['id']).toBe(1);
    expect(result['name']).toBe('Hello-World');
    expect(result['fullName']).toBe('octocat/Hello-World');
    expect(result['owner']).toEqual({ login: 'octocat' });
    expect(result['stargazersCount']).toBe(100);
    expect(result['language']).toBe('TypeScript');
  });

  it('handles null description', () => {
    const repo = createTestSearchRepo({ description: null });
    const result = repoToJson(repo);

    expect(result['description']).toBeNull();
  });

  it('handles null license', () => {
    const repo = createTestSearchRepo({ license: null });
    const result = repoToJson(repo);

    expect(result['license']).toBeNull();
  });

  it('handles null language', () => {
    const repo = createTestSearchRepo({ language: null });
    const result = repoToJson(repo);

    expect(result['language']).toBeNull();
  });

  it('handles archived repository', () => {
    const repo = createTestSearchRepo({ isArchived: true });
    const result = repoToJson(repo);

    expect(result['isArchived']).toBe(true);
  });

  it('handles private repository', () => {
    const repo = createTestSearchRepo({ isPrivate: true });
    const result = repoToJson(repo);

    expect(result['isPrivate']).toBe(true);
  });

  it('includes hardcoded fields', () => {
    const repo = createTestSearchRepo();
    const result = repoToJson(repo);

    // These are hardcoded in the formatter
    expect(result['hasDownloads']).toBe(true);
    expect(result['hasIssues']).toBe(true);
    expect(result['hasProjects']).toBe(true);
    expect(result['hasWiki']).toBe(true);
    expect(result['hasPages']).toBe(false);
    expect(result['homepage']).toBeNull();
    expect(result['isDisabled']).toBe(false);
    expect(result['size']).toBe(0);
  });
});

// ============================================================================
// issueToJson Tests
// ============================================================================

describe('issueToJson', () => {
  it('converts issue to JSON format', () => {
    const issue = createTestSearchIssue();
    const result = issueToJson(issue);

    expect(result['id']).toBe(1);
    expect(result['number']).toBe(42);
    expect(result['title']).toBe('Bug in authentication');
    expect(result['state']).toBe('open');
    expect(result['author']).toEqual({ login: 'octocat' });
  });

  it('handles null user', () => {
    const issue = createTestSearchIssue({ user: null });
    const result = issueToJson(issue);

    expect(result['author']).toBeNull();
  });

  it('handles null body', () => {
    const issue = createTestSearchIssue({ body: null });
    const result = issueToJson(issue);

    expect(result['body']).toBeNull();
  });

  it('handles assignees', () => {
    const issue = createTestSearchIssue({
      assignees: [
        { login: 'user1', htmlUrl: 'https://github.com/user1' },
        { login: 'user2', htmlUrl: 'https://github.com/user2' },
      ],
    });
    const result = issueToJson(issue);

    expect(result['assignees']).toEqual([{ login: 'user1' }, { login: 'user2' }]);
  });

  it('handles labels', () => {
    const issue = createTestSearchIssue({
      labels: [{ name: 'bug' }, { name: 'priority-high' }],
    });
    const result = issueToJson(issue);

    expect(result['labels']).toEqual([{ name: 'bug' }, { name: 'priority-high' }]);
  });

  it('handles closed issue', () => {
    const issue = createTestSearchIssue({
      state: 'closed',
      closedAt: '2024-01-17T10:00:00Z',
    });
    const result = issueToJson(issue);

    expect(result['state']).toBe('closed');
    expect(result['closedAt']).toBe('2024-01-17T10:00:00Z');
  });

  it('indicates non-PR issues correctly', () => {
    const issue = createTestSearchIssue({ isPullRequest: false });
    const result = issueToJson(issue);

    expect(result['isPullRequest']).toBe(false);
  });
});

// ============================================================================
// prToJson Tests
// ============================================================================

describe('prToJson', () => {
  it('converts PR to JSON format', () => {
    const pr = createTestSearchPr();
    const result = prToJson(pr);

    expect(result['isPullRequest']).toBe(true);
    expect(result['isDraft']).toBe(false);
  });

  it('handles draft PR', () => {
    const pr = createTestSearchPr({ isDraft: true });
    const result = prToJson(pr);

    expect(result['isDraft']).toBe(true);
  });

  it('includes all issue fields plus isDraft', () => {
    const pr = createTestSearchPr();
    const result = prToJson(pr);

    // Check issue fields are present
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('number');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('author');
    // Plus PR-specific field
    expect(result).toHaveProperty('isDraft');
  });
});

// ============================================================================
// commitToJson Tests
// ============================================================================

describe('commitToJson', () => {
  it('converts commit to JSON format', () => {
    const commit = createTestSearchCommit();
    const result = commitToJson(commit);

    expect(result['sha']).toBe('6dcb09b5b57875f334f61aebed695e2e4193db5e');
    expect(result['url']).toBe(
      'https://github.com/octocat/Hello-World/commit/6dcb09b5b57875f334f61aebed695e2e4193db5e'
    );
    expect(result['author']).toEqual({
      name: 'The Octocat',
      email: 'octocat@github.com',
      date: '2024-01-15T10:00:00Z',
    });
  });

  it('handles null committer', () => {
    const commit = createTestSearchCommit({ committer: null });
    const result = commitToJson(commit);

    expect(result['committer']).toBeNull();
  });

  it('includes commit message nested', () => {
    const commit = createTestSearchCommit({ message: 'Fix critical bug' });
    const result = commitToJson(commit);

    expect(result['commit']).toEqual({ message: 'Fix critical bug' });
  });

  it('includes parent commits', () => {
    const commit = createTestSearchCommit({ parents: [{ sha: 'abc' }, { sha: 'def' }] });
    const result = commitToJson(commit);

    expect(result['parents']).toEqual([{ sha: 'abc' }, { sha: 'def' }]);
  });

  it('includes repository info', () => {
    const commit = createTestSearchCommit();
    const result = commitToJson(commit);

    expect(result['repository']).toBe('octocat/Hello-World');
  });

  it('uses sha as id', () => {
    const commit = createTestSearchCommit();
    const result = commitToJson(commit);

    expect(result['id']).toBe('6dcb09b5b57875f334f61aebed695e2e4193db5e');
  });
});

// ============================================================================
// codeToJson Tests
// ============================================================================

describe('codeToJson', () => {
  it('converts code result to JSON format', () => {
    const code = createTestSearchCode();
    const result = codeToJson(code);

    expect(result['path']).toBe('src/index.ts');
    expect(result['sha']).toBe('bbcd538c8e72b8c175046e27cc8f907076331401');
    expect(result['url']).toBe('https://github.com/octocat/Hello-World/blob/main/src/index.ts');
    expect(result['repository']).toBe('octocat/Hello-World');
  });

  it('includes text matches', () => {
    const code = createTestSearchCode();
    const result = codeToJson(code);

    expect(result['textMatches']).toEqual([
      {
        fragment: 'function authenticate() { ... }',
        matches: [{ text: 'authenticate', indices: [9, 21] }],
      },
    ]);
  });

  it('handles undefined text matches', () => {
    const code = createTestSearchCode({ textMatches: undefined });
    const result = codeToJson(code);

    expect(result['textMatches']).toEqual([]);
  });

  it('handles empty text matches', () => {
    const code = createTestSearchCode({ textMatches: [] });
    const result = codeToJson(code);

    expect(result['textMatches']).toEqual([]);
  });
});

// ============================================================================
// formatReposJson Tests
// ============================================================================

describe('formatReposJson', () => {
  it('formats multiple repos as JSON array', () => {
    const repos = [createTestSearchRepo({ id: 1 }), createTestSearchRepo({ id: 2 })];
    const result = formatReposJson(repos);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
  });

  it('formats empty array', () => {
    const result = formatReposJson([]);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toEqual([]);
  });

  it('returns full objects when no fields specified', () => {
    const repos = [createTestSearchRepo()];
    const result = formatReposJson(repos);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toHaveProperty('id');
    expect(parsed[0]).toHaveProperty('name');
    expect(parsed[0]).toHaveProperty('stargazersCount');
  });

  it('filters to specified fields', () => {
    const repos = [createTestSearchRepo()];
    const result = formatReposJson(repos, ['name', 'stargazersCount']);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toEqual({ name: 'Hello-World', stargazersCount: 100 });
  });

  it('handles empty fields array (returns full)', () => {
    const repos = [createTestSearchRepo()];
    const result = formatReposJson(repos, []);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    // Empty array means no filtering
    expect(parsed[0]).toHaveProperty('id');
  });
});

// ============================================================================
// formatIssuesJson Tests
// ============================================================================

describe('formatIssuesJson', () => {
  it('formats multiple issues as JSON array', () => {
    const issues = [createTestSearchIssue({ id: 1 }), createTestSearchIssue({ id: 2 })];
    const result = formatIssuesJson(issues);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
  });

  it('filters to specified fields', () => {
    const issues = [createTestSearchIssue()];
    const result = formatIssuesJson(issues, ['number', 'title']);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toEqual({ number: 42, title: 'Bug in authentication' });
  });
});

// ============================================================================
// formatPrsJson Tests
// ============================================================================

describe('formatPrsJson', () => {
  it('formats multiple PRs as JSON array', () => {
    const prs = [createTestSearchPr({ id: 1 }), createTestSearchPr({ id: 2 })];
    const result = formatPrsJson(prs);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
  });

  it('filters to specified fields including isDraft', () => {
    const prs = [createTestSearchPr({ isDraft: true })];
    const result = formatPrsJson(prs, ['number', 'isDraft']);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toEqual({ number: 42, isDraft: true });
  });
});

// ============================================================================
// formatCommitsJson Tests
// ============================================================================

describe('formatCommitsJson', () => {
  it('formats multiple commits as JSON array', () => {
    const commits = [
      createTestSearchCommit({ sha: 'abc123' }),
      createTestSearchCommit({ sha: 'def456' }),
    ];
    const result = formatCommitsJson(commits);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
  });

  it('filters to specified fields', () => {
    const commits = [createTestSearchCommit()];
    const result = formatCommitsJson(commits, ['sha', 'repository']);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toEqual({
      sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      repository: 'octocat/Hello-World',
    });
  });
});

// ============================================================================
// formatCodeJson Tests
// ============================================================================

describe('formatCodeJson', () => {
  it('formats multiple code results as JSON array', () => {
    const results = [
      createTestSearchCode({ path: 'src/a.ts' }),
      createTestSearchCode({ path: 'src/b.ts' }),
    ];
    const result = formatCodeJson(results);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
  });

  it('filters to specified fields', () => {
    const results = [createTestSearchCode()];
    const result = formatCodeJson(results, ['path', 'repository']);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toEqual({
      path: 'src/index.ts',
      repository: 'octocat/Hello-World',
    });
  });

  it('handles text matches in filtering', () => {
    const results = [createTestSearchCode()];
    const result = formatCodeJson(results, ['path', 'textMatches']);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toHaveProperty('textMatches');
  });
});
