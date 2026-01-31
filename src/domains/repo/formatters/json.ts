/**
 * JSON formatters for --json flag output.
 * Supports field selection similar to `gh` CLI.
 */

import type { Repository, RepositoryListItem } from '../types.js';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function pick(obj: Record<string, JsonValue>, fields: string[]): Record<string, JsonValue> {
  const objMap = new Map(Object.entries(obj));
  const result = new Map<string, JsonValue>();

  for (const field of fields) {
    if (objMap.has(field)) {
      const value = objMap.get(field);
      if (value !== undefined) {
        result.set(field, value);
      }
    }
  }

  return Object.fromEntries(result);
}

/**
 * Convert repository to JSON object for list output.
 */
export function repoListItemToJson(repo: RepositoryListItem): Record<string, JsonValue> {
  return {
    id: repo.id,
    name: repo.name,
    nameWithOwner: repo.fullName,
    owner: { login: repo.owner.login },
    description: repo.description,
    url: repo.htmlUrl,
    visibility: repo.visibility,
    isPrivate: repo.private,
    isFork: repo.fork,
    isArchived: repo.archived,
    isTemplate: repo.isTemplate,
    primaryLanguage: repo.language ? { name: repo.language } : null,
    stargazerCount: repo.stargazersCount,
    forkCount: repo.forksCount,
    updatedAt: repo.updatedAt,
    pushedAt: repo.pushedAt,
  };
}

/**
 * Convert full repository to JSON object.
 */
export function repoToJson(repo: Repository): Record<string, JsonValue> {
  return {
    id: repo.id,
    name: repo.name,
    nameWithOwner: repo.fullName,
    owner: { login: repo.owner.login, type: repo.owner.type },
    description: repo.description,
    url: repo.htmlUrl,
    sshUrl: repo.sshUrl,
    visibility: repo.visibility,
    isPrivate: repo.private,
    isFork: repo.fork,
    isArchived: repo.archived,
    isTemplate: repo.isTemplate,
    hasIssuesEnabled: repo.hasIssues,
    hasProjectsEnabled: repo.hasProjects,
    hasWikiEnabled: repo.hasWiki,
    hasDiscussionsEnabled: repo.hasDiscussions,
    primaryLanguage: repo.language ? { name: repo.language } : null,
    licenseInfo: repo.license ? { name: repo.license.name, key: repo.license.key } : null,
    stargazerCount: repo.stargazersCount,
    forkCount: repo.forksCount,
    watchers: { totalCount: repo.watchersCount },
    defaultBranchRef: { name: repo.defaultBranch },
    repositoryTopics: repo.topics.map((t) => ({ topic: { name: t } })),
    parent: repo.parent
      ? { nameWithOwner: repo.parent.fullName, owner: { login: repo.parent.owner.login } }
      : null,
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
    pushedAt: repo.pushedAt,
  };
}

export function formatRepoListJson(repos: RepositoryListItem[], fields?: string[]): string {
  const jsonRepos = repos.map((r) => repoListItemToJson(r));

  if (fields && fields.length > 0) {
    const filtered = jsonRepos.map((r) => pick(r, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonRepos, null, 2);
}

export function formatRepoViewJson(repo: Repository, fields?: string[]): string {
  const jsonRepo = repoToJson(repo);

  if (fields && fields.length > 0) {
    return JSON.stringify(pick(jsonRepo, fields), null, 2);
  }

  return JSON.stringify(jsonRepo, null, 2);
}
