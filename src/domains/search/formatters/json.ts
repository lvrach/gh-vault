/**
 * JSON formatters for --json flag output.
 * Supports field selection similar to `gh` CLI.
 */

import type {
  SearchCodeResult,
  SearchCommit,
  SearchIssue,
  SearchPullRequest,
  SearchRepository,
} from '../types.js';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function pick(obj: Record<string, unknown>, fields: string[]): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const field of fields) {
    if (Object.hasOwn(obj, field)) {
      // eslint-disable-next-line security/detect-object-injection -- Safe: accessing known object with validated field name
      result[field] = obj[field] as JsonValue;
    }
  }
  return result;
}

// Repository JSON conversion
export function repoToJson(repo: SearchRepository): Record<string, JsonValue> {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.fullName,
    description: repo.description,
    owner: { login: repo.owner.login },
    url: repo.htmlUrl,
    language: repo.language,
    stargazersCount: repo.stargazersCount,
    forksCount: repo.forksCount,
    openIssuesCount: repo.openIssuesCount,
    watchersCount: repo.watchersCount,
    isPrivate: repo.isPrivate,
    isFork: repo.isFork,
    isArchived: repo.isArchived,
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
    pushedAt: repo.pushedAt,
    license: repo.license ? { name: repo.license.name, spdxId: repo.license.spdxId } : null,
    visibility: repo.visibility,
    defaultBranch: repo.defaultBranch,
    hasDownloads: true,
    hasIssues: true,
    hasPages: false,
    hasProjects: true,
    hasWiki: true,
    homepage: null,
    isDisabled: false,
    size: 0,
  };
}

// Issue JSON conversion
export function issueToJson(issue: SearchIssue): Record<string, JsonValue> {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    author: issue.user ? { login: issue.user.login } : null,
    assignees: issue.assignees.map((a) => ({ login: a.login })),
    labels: issue.labels.map((l) => ({ name: l.name })),
    commentsCount: issue.commentsCount,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    closedAt: issue.closedAt,
    url: issue.htmlUrl,
    repository: issue.repository.fullName,
    isPullRequest: issue.isPullRequest,
    isLocked: issue.isLocked,
    authorAssociation: 'NONE',
  };
}

// Pull request JSON conversion
export function prToJson(pr: SearchPullRequest): Record<string, JsonValue> {
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    author: pr.user ? { login: pr.user.login } : null,
    assignees: pr.assignees.map((a) => ({ login: a.login })),
    labels: pr.labels.map((l) => ({ name: l.name })),
    commentsCount: pr.commentsCount,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    closedAt: pr.closedAt,
    url: pr.htmlUrl,
    repository: pr.repository.fullName,
    isPullRequest: true,
    isLocked: pr.isLocked,
    isDraft: pr.isDraft,
    authorAssociation: 'NONE',
  };
}

// Commit JSON conversion
export function commitToJson(commit: SearchCommit): Record<string, JsonValue> {
  return {
    sha: commit.sha,
    url: commit.htmlUrl,
    author: { name: commit.author.name, email: commit.author.email, date: commit.author.date },
    committer: commit.committer
      ? {
          name: commit.committer.name,
          email: commit.committer.email,
          date: commit.committer.date,
        }
      : null,
    commit: {
      message: commit.message,
    },
    repository: commit.repository.fullName,
    id: commit.sha,
    parents: commit.parents.map((p) => ({ sha: p.sha })),
  };
}

// Code result JSON conversion
export function codeToJson(result: SearchCodeResult): Record<string, JsonValue> {
  return {
    path: result.path,
    sha: result.sha,
    url: result.htmlUrl,
    repository: result.repository.fullName,
    textMatches: result.textMatches
      ? result.textMatches.map((tm) => ({
          fragment: tm.fragment,
          matches: tm.matches.map((m) => ({ text: m.text, indices: m.indices })),
        }))
      : [],
  };
}

// Format functions
export function formatReposJson(repos: SearchRepository[], fields?: string[]): string {
  const jsonRepos = repos.map((repo) => repoToJson(repo));

  if (fields && fields.length > 0) {
    const filtered = jsonRepos.map((repo) => pick(repo, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonRepos, null, 2);
}

export function formatIssuesJson(issues: SearchIssue[], fields?: string[]): string {
  const jsonIssues = issues.map((issue) => issueToJson(issue));

  if (fields && fields.length > 0) {
    const filtered = jsonIssues.map((issue) => pick(issue, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonIssues, null, 2);
}

export function formatPrsJson(prs: SearchPullRequest[], fields?: string[]): string {
  const jsonPrs = prs.map((pr) => prToJson(pr));

  if (fields && fields.length > 0) {
    const filtered = jsonPrs.map((pr) => pick(pr, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonPrs, null, 2);
}

export function formatCommitsJson(commits: SearchCommit[], fields?: string[]): string {
  const jsonCommits = commits.map((commit) => commitToJson(commit));

  if (fields && fields.length > 0) {
    const filtered = jsonCommits.map((commit) => pick(commit, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonCommits, null, 2);
}

export function formatCodeJson(results: SearchCodeResult[], fields?: string[]): string {
  const jsonResults = results.map((result) => codeToJson(result));

  if (fields && fields.length > 0) {
    const filtered = jsonResults.map((result) => pick(result, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonResults, null, 2);
}
