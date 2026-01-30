/**
 * Search domain API class - fetch data from GitHub Search API.
 * These methods are presentation-agnostic and can be used by both CLI and MCP.
 */

import type { Octokit } from '../../shared/github.js';
import type {
  SearchCodeInput,
  SearchCodeResult,
  SearchCommit,
  SearchCommitsInput,
  SearchIssue,
  SearchIssuesInput,
  SearchPrsInput,
  SearchPullRequest,
  SearchReposInput,
  SearchRepository,
  SearchResult,
  SearchUser,
} from './types.js';

// Helper to transform user data
function toSearchUser(user: { login: string; html_url?: string } | null): SearchUser | null {
  if (!user) return null;
  return { login: user.login, htmlUrl: user.html_url ?? '' };
}

// Helper to add qualifier to query if value is present
function addQualifier(parts: string[], qualifier: string, value: string | undefined): void {
  if (value !== undefined && value !== '') {
    parts.push(`${qualifier}:${value}`);
  }
}

// Helper to add array qualifiers
function addArrayQualifier(parts: string[], qualifier: string, values: string[] | undefined): void {
  if (values && values.length > 0) {
    for (const value of values) {
      parts.push(`${qualifier}:${value}`);
    }
  }
}

// Helper to add boolean qualifier
function addBooleanQualifier(parts: string[], qualifier: string, value: boolean | undefined): void {
  if (value !== undefined) {
    parts.push(`${qualifier}:${String(value)}`);
  }
}

/**
 * Build search query string for repositories
 */
function buildRepoQuery(input: SearchReposInput): string {
  const parts: string[] = [];

  // Add raw query first
  if (input.query) {
    parts.push(input.query);
  }

  // Add qualifiers
  addBooleanQualifier(parts, 'archived', input.archived);
  addQualifier(parts, 'created', input.created);
  addQualifier(parts, 'followers', input.followers);
  addQualifier(parts, 'forks', input.forks);
  addQualifier(parts, 'good-first-issues', input.goodFirstIssues);
  addQualifier(parts, 'help-wanted-issues', input.helpWantedIssues);
  addQualifier(parts, 'language', input.language);
  addArrayQualifier(parts, 'license', input.license);
  addQualifier(parts, 'topics', input.numberTopics);
  addArrayQualifier(parts, 'user', input.owner);
  addQualifier(parts, 'size', input.size);
  addQualifier(parts, 'stars', input.stars);
  addArrayQualifier(parts, 'topic', input.topic);
  addQualifier(parts, 'pushed', input.updated);

  // Handle include-forks
  if (input.includeForks === 'true') {
    parts.push('fork:true');
  } else if (input.includeForks === 'only') {
    parts.push('fork:only');
  }

  // Handle match restriction
  if (input.match && input.match.length > 0) {
    parts.push(`in:${input.match.join(',')}`);
  }

  // Handle visibility
  if (input.visibility && input.visibility.length > 0) {
    for (const vis of input.visibility) {
      parts.push(`is:${vis}`);
    }
  }

  return parts.join(' ');
}

/**
 * Build search query string for issues
 */
function buildIssueQuery(input: SearchIssuesInput): string {
  const parts: string[] = [];

  // Add raw query first
  if (input.query) {
    parts.push(input.query);
  }

  // Add type:issue unless including PRs
  if (!input.includePrs) {
    parts.push('type:issue');
  }

  // Add qualifiers
  addQualifier(parts, 'app', input.app);
  addBooleanQualifier(parts, 'archived', input.archived);
  addQualifier(parts, 'assignee', input.assignee);
  addQualifier(parts, 'author', input.author);
  addQualifier(parts, 'closed', input.closed);
  addQualifier(parts, 'commenter', input.commenter);
  addQualifier(parts, 'comments', input.comments);
  addQualifier(parts, 'created', input.created);
  addQualifier(parts, 'interactions', input.interactions);
  addQualifier(parts, 'involves', input.involves);
  addArrayQualifier(parts, 'label', input.label);
  addQualifier(parts, 'language', input.language);
  // Handle locked separately - if true, add is:locked
  if (input.locked) {
    parts.push('is:locked');
  }
  addQualifier(parts, 'mentions', input.mentions);
  addQualifier(parts, 'milestone', input.milestone);
  addArrayQualifier(parts, 'user', input.owner);
  addQualifier(parts, 'project', input.project);
  addQualifier(parts, 'reactions', input.reactions);
  addArrayQualifier(parts, 'repo', input.repo);
  addQualifier(parts, 'state', input.state);
  addQualifier(parts, 'team', input.teamMentions);
  addQualifier(parts, 'updated', input.updated);

  // Handle no-* flags
  if (input.noAssignee) parts.push('no:assignee');
  if (input.noLabel) parts.push('no:label');
  if (input.noMilestone) parts.push('no:milestone');
  if (input.noProject) parts.push('no:project');

  // Handle match restriction
  if (input.match && input.match.length > 0) {
    parts.push(`in:${input.match.join(',')}`);
  }

  // Handle visibility
  if (input.visibility && input.visibility.length > 0) {
    for (const vis of input.visibility) {
      parts.push(`is:${vis}`);
    }
  }

  return parts.join(' ');
}

/**
 * Build search query string for pull requests
 */
function buildPrQuery(input: SearchPrsInput): string {
  const parts: string[] = [];

  // Add raw query first
  if (input.query) {
    parts.push(input.query);
  }

  // Add type:pr
  parts.push('type:pr');

  // Add qualifiers
  addQualifier(parts, 'app', input.app);
  addBooleanQualifier(parts, 'archived', input.archived);
  addQualifier(parts, 'assignee', input.assignee);
  addQualifier(parts, 'author', input.author);
  addQualifier(parts, 'base', input.base);
  addQualifier(parts, 'status', input.checks);
  addQualifier(parts, 'closed', input.closed);
  addQualifier(parts, 'commenter', input.commenter);
  addQualifier(parts, 'comments', input.comments);
  addQualifier(parts, 'created', input.created);
  addBooleanQualifier(parts, 'draft', input.draft);
  addQualifier(parts, 'head', input.head);
  addQualifier(parts, 'interactions', input.interactions);
  addQualifier(parts, 'involves', input.involves);
  addArrayQualifier(parts, 'label', input.label);
  addQualifier(parts, 'language', input.language);
  // Handle locked separately - if true, add is:locked
  if (input.locked) {
    parts.push('is:locked');
  }
  addQualifier(parts, 'mentions', input.mentions);
  addQualifier(parts, 'milestone', input.milestone);
  addArrayQualifier(parts, 'user', input.owner);
  addQualifier(parts, 'project', input.project);
  addQualifier(parts, 'reactions', input.reactions);
  addArrayQualifier(parts, 'repo', input.repo);
  addQualifier(parts, 'review', input.review);
  addQualifier(parts, 'review-requested', input.reviewRequested);
  addQualifier(parts, 'reviewed-by', input.reviewedBy);
  addQualifier(parts, 'state', input.state);
  addQualifier(parts, 'team', input.teamMentions);
  addQualifier(parts, 'updated', input.updated);
  addQualifier(parts, 'merged', input.mergedAt);

  // Handle merged boolean
  if (input.merged === true) {
    parts.push('is:merged');
  } else if (input.merged === false) {
    parts.push('is:unmerged');
  }

  // Handle no-* flags
  if (input.noAssignee) parts.push('no:assignee');
  if (input.noLabel) parts.push('no:label');
  if (input.noMilestone) parts.push('no:milestone');
  if (input.noProject) parts.push('no:project');

  // Handle match restriction
  if (input.match && input.match.length > 0) {
    parts.push(`in:${input.match.join(',')}`);
  }

  // Handle visibility
  if (input.visibility && input.visibility.length > 0) {
    for (const vis of input.visibility) {
      parts.push(`is:${vis}`);
    }
  }

  return parts.join(' ');
}

/**
 * Build search query string for commits
 */
function buildCommitQuery(input: SearchCommitsInput): string {
  const parts: string[] = [];

  // Add raw query first
  if (input.query) {
    parts.push(input.query);
  }

  // Add qualifiers
  addQualifier(parts, 'author', input.author);
  addQualifier(parts, 'author-date', input.authorDate);
  addQualifier(parts, 'author-email', input.authorEmail);
  addQualifier(parts, 'author-name', input.authorName);
  addQualifier(parts, 'committer', input.committer);
  addQualifier(parts, 'committer-date', input.committerDate);
  addQualifier(parts, 'committer-email', input.committerEmail);
  addQualifier(parts, 'committer-name', input.committerName);
  addQualifier(parts, 'hash', input.hash);
  addBooleanQualifier(parts, 'merge', input.merge);
  addArrayQualifier(parts, 'user', input.owner);
  addQualifier(parts, 'parent', input.parent);
  addArrayQualifier(parts, 'repo', input.repo);
  addQualifier(parts, 'tree', input.tree);

  // Handle visibility
  if (input.visibility && input.visibility.length > 0) {
    for (const vis of input.visibility) {
      parts.push(`is:${vis}`);
    }
  }

  return parts.join(' ');
}

/**
 * Build search query string for code
 */
function buildCodeQuery(input: SearchCodeInput): string {
  const parts: string[] = [];

  // Add raw query first (required for code search)
  if (input.query) {
    parts.push(input.query);
  }

  // Add qualifiers
  addQualifier(parts, 'extension', input.extension);
  addQualifier(parts, 'filename', input.filename);
  addQualifier(parts, 'language', input.language);
  addArrayQualifier(parts, 'user', input.owner);
  addArrayQualifier(parts, 'repo', input.repo);
  addQualifier(parts, 'size', input.size);

  // Handle match restriction
  if (input.match && input.match.length > 0) {
    parts.push(`in:${input.match.join(',')}`);
  }

  return parts.join(' ');
}

// Helper to transform label from API response
function transformLabel(l: string | { name?: string; color?: string | null }): {
  name: string;
  color?: string | undefined;
} {
  if (typeof l === 'string') {
    return { name: l };
  }
  return {
    name: l.name ?? '',
    color: l.color ?? undefined,
  };
}

/**
 * Search domain API with constructor-injected Octokit client.
 * All methods use the injected client for GitHub API calls.
 */
export class SearchApi {
  constructor(private readonly client: Octokit) {}

  /**
   * Search for repositories on GitHub
   */
  async searchRepos(input: SearchReposInput): Promise<SearchResult<SearchRepository>> {
    const query = buildRepoQuery(input);

    // Build params without undefined values to satisfy exactOptionalPropertyTypes
    const params: {
      q: string;
      sort?: 'forks' | 'help-wanted-issues' | 'stars' | 'updated';
      order?: 'asc' | 'desc';
      per_page: number;
    } = {
      q: query,
      per_page: input.perPage ?? 30,
    };
    if (input.sort) params.sort = input.sort;
    if (input.order) params.order = input.order;

    const { data } = await this.client.rest.search.repos(params);

    return {
      totalCount: data.total_count,
      incompleteResults: data.incomplete_results,
      items: data.items.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        owner: toSearchUser(repo.owner) ?? { login: '', htmlUrl: '' },
        htmlUrl: repo.html_url,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        watchersCount: repo.watchers_count,
        isPrivate: repo.private,
        isFork: repo.fork,
        isArchived: repo.archived,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        license: repo.license ? { name: repo.license.name, spdxId: repo.license.spdx_id } : null,
        topics: repo.topics ?? [],
        visibility: repo.visibility ?? (repo.private ? 'private' : 'public'),
        defaultBranch: repo.default_branch,
      })),
    };
  }

  /**
   * Search for issues on GitHub
   */
  async searchIssues(input: SearchIssuesInput): Promise<SearchResult<SearchIssue>> {
    const query = buildIssueQuery(input);

    // Build params without undefined values to satisfy exactOptionalPropertyTypes
    const params: {
      q: string;
      sort?: 'comments' | 'created' | 'updated' | 'reactions';
      order?: 'asc' | 'desc';
      per_page: number;
    } = {
      q: query,
      per_page: input.perPage ?? 30,
    };
    // Only set sort if it's a valid value for this API
    const validSorts = ['comments', 'created', 'updated', 'reactions'] as const;
    if (input.sort && validSorts.includes(input.sort as (typeof validSorts)[number])) {
      params.sort = input.sort as (typeof validSorts)[number];
    }
    if (input.order) params.order = input.order;

    const { data } = await this.client.rest.search.issuesAndPullRequests(params);

    return {
      totalCount: data.total_count,
      incompleteResults: data.incomplete_results,
      items: data.items
        .filter((item) => !item.pull_request || input.includePrs)
        .map((item) => ({
          id: item.id,
          number: item.number,
          title: item.title,
          body: item.body ?? null,
          state: item.state as 'open' | 'closed',
          user: toSearchUser(item.user),
          assignees: (item.assignees ?? [])
            .map((a) => toSearchUser(a))
            .filter((a): a is SearchUser => a !== null),
          labels: item.labels.map((l) => transformLabel(l)),
          commentsCount: item.comments,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          closedAt: item.closed_at,
          htmlUrl: item.html_url,
          repository: {
            fullName: item.repository_url.replace('https://api.github.com/repos/', ''),
            htmlUrl: item.repository_url.replace('api.github.com/repos', 'github.com'),
          },
          isPullRequest: !!item.pull_request,
          isLocked: item.locked,
        })),
    };
  }

  /**
   * Search for pull requests on GitHub
   */
  async searchPrs(input: SearchPrsInput): Promise<SearchResult<SearchPullRequest>> {
    const query = buildPrQuery(input);

    // Build params without undefined values to satisfy exactOptionalPropertyTypes
    const params: {
      q: string;
      sort?: 'comments' | 'created' | 'updated' | 'reactions';
      order?: 'asc' | 'desc';
      per_page: number;
    } = {
      q: query,
      per_page: input.perPage ?? 30,
    };
    // Only set sort if it's a valid value for this API
    const validSorts = ['comments', 'created', 'updated', 'reactions'] as const;
    if (input.sort && validSorts.includes(input.sort as (typeof validSorts)[number])) {
      params.sort = input.sort as (typeof validSorts)[number];
    }
    if (input.order) params.order = input.order;

    const { data } = await this.client.rest.search.issuesAndPullRequests(params);

    return {
      totalCount: data.total_count,
      incompleteResults: data.incomplete_results,
      items: data.items.map((item) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        body: item.body ?? null,
        state: item.state as 'open' | 'closed',
        user: toSearchUser(item.user),
        assignees: (item.assignees ?? [])
          .map((a) => toSearchUser(a))
          .filter((a): a is SearchUser => a !== null),
        labels: item.labels.map((l) => transformLabel(l)),
        commentsCount: item.comments,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        closedAt: item.closed_at,
        htmlUrl: item.html_url,
        repository: {
          fullName: item.repository_url.replace('https://api.github.com/repos/', ''),
          htmlUrl: item.repository_url.replace('api.github.com/repos', 'github.com'),
        },
        isPullRequest: true,
        isLocked: item.locked,
        isDraft: item.draft ?? false,
      })),
    };
  }

  /**
   * Search for commits on GitHub
   */
  async searchCommits(input: SearchCommitsInput): Promise<SearchResult<SearchCommit>> {
    const query = buildCommitQuery(input);

    // Build params without undefined values to satisfy exactOptionalPropertyTypes
    const params: {
      q: string;
      sort?: 'author-date' | 'committer-date';
      order?: 'asc' | 'desc';
      per_page: number;
    } = {
      q: query,
      per_page: input.perPage ?? 30,
    };
    if (input.sort) params.sort = input.sort;
    if (input.order) params.order = input.order;

    const { data } = await this.client.rest.search.commits(params);

    return {
      totalCount: data.total_count,
      incompleteResults: data.incomplete_results,
      items: data.items.map((item) => ({
        sha: item.sha,
        htmlUrl: item.html_url,
        message: item.commit.message,
        author: {
          name: item.commit.author.name,
          email: item.commit.author.email,
          date: item.commit.author.date,
        },
        committer: item.commit.committer
          ? {
              name: item.commit.committer.name ?? '',
              email: item.commit.committer.email ?? '',
              date: item.commit.committer.date ?? '',
            }
          : null,
        repository: {
          fullName: item.repository.full_name,
          htmlUrl: item.repository.html_url,
        },
        parents: item.parents.map((p) => ({ sha: p.sha ?? '' })),
      })),
    };
  }

  /**
   * Search for code on GitHub
   */
  async searchCode(input: SearchCodeInput): Promise<SearchResult<SearchCodeResult>> {
    const query = buildCodeQuery(input);

    const { data } = await this.client.rest.search.code({
      q: query,
      per_page: input.perPage ?? 30,
    });

    return {
      totalCount: data.total_count,
      incompleteResults: data.incomplete_results,
      items: data.items.map((item) => {
        // text_matches is optional in the API response
        const textMatches = item.text_matches
          ? item.text_matches.map((tm) => ({
              fragment: tm.fragment ?? '',
              matches: (tm.matches ?? []).map((m) => ({
                text: m.text ?? '',
                indices: m.indices ?? [],
              })),
            }))
          : undefined;

        return {
          name: item.name,
          path: item.path,
          sha: item.sha,
          htmlUrl: item.html_url,
          repository: {
            fullName: item.repository.full_name,
            htmlUrl: item.repository.html_url,
          },
          textMatches,
        };
      }),
    };
  }
}
