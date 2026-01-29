/**
 * Search domain types - structured data returned by search functions.
 * These types represent the domain model, independent of presentation format.
 *
 * Note: Optional properties use `| undefined` syntax due to exactOptionalPropertyTypes
 * in tsconfig. This allows callers to pass `undefined` explicitly.
 */

// Common user type for search results
export interface SearchUser {
  login: string;
  htmlUrl: string;
}

// Repository search result
export interface SearchRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  owner: SearchUser;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  watchersCount: number;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  license: { name: string; spdxId: string | null } | null;
  topics: string[];
  visibility: string;
  defaultBranch: string;
}

// Issue search result
export interface SearchIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: SearchUser | null;
  assignees: SearchUser[];
  labels: { name: string; color?: string | undefined }[];
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  htmlUrl: string;
  repository: {
    fullName: string;
    htmlUrl: string;
  };
  isPullRequest: boolean;
  isLocked: boolean;
}

// Pull request search result (extends issue with PR-specific fields)
export interface SearchPullRequest extends SearchIssue {
  isDraft: boolean;
}

// Commit search result
export interface SearchCommit {
  sha: string;
  htmlUrl: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  } | null;
  repository: {
    fullName: string;
    htmlUrl: string;
  };
  parents: { sha: string }[];
}

// Code search result
export interface SearchCodeResult {
  name: string;
  path: string;
  sha: string;
  htmlUrl: string;
  repository: {
    fullName: string;
    htmlUrl: string;
  };
  textMatches?:
    | {
        fragment: string;
        matches: { text: string; indices: number[] }[];
      }[]
    | undefined;
}

// Generic search response wrapper
export interface SearchResult<T> {
  totalCount: number;
  incompleteResults: boolean;
  items: T[];
}

// Input types for search functions

export interface SearchReposInput {
  query: string;
  // Filter flags
  archived?: boolean | undefined;
  created?: string | undefined;
  followers?: string | undefined;
  forks?: string | undefined;
  goodFirstIssues?: string | undefined;
  helpWantedIssues?: string | undefined;
  includeForks?: 'false' | 'true' | 'only' | undefined;
  language?: string | undefined;
  license?: string[] | undefined;
  match?: ('name' | 'description' | 'readme')[] | undefined;
  numberTopics?: string | undefined;
  owner?: string[] | undefined;
  size?: string | undefined;
  stars?: string | undefined;
  topic?: string[] | undefined;
  updated?: string | undefined;
  visibility?: ('public' | 'private' | 'internal')[] | undefined;
  // Pagination and sorting
  sort?: 'forks' | 'help-wanted-issues' | 'stars' | 'updated' | undefined;
  order?: 'asc' | 'desc' | undefined;
  perPage?: number | undefined;
}

export interface SearchIssuesInput {
  query: string;
  // Filter flags
  app?: string | undefined;
  archived?: boolean | undefined;
  assignee?: string | undefined;
  author?: string | undefined;
  closed?: string | undefined;
  commenter?: string | undefined;
  comments?: string | undefined;
  created?: string | undefined;
  includePrs?: boolean | undefined;
  interactions?: string | undefined;
  involves?: string | undefined;
  label?: string[] | undefined;
  language?: string | undefined;
  locked?: boolean | undefined;
  match?: ('title' | 'body' | 'comments')[] | undefined;
  mentions?: string | undefined;
  milestone?: string | undefined;
  noAssignee?: boolean | undefined;
  noLabel?: boolean | undefined;
  noMilestone?: boolean | undefined;
  noProject?: boolean | undefined;
  owner?: string[] | undefined;
  project?: string | undefined;
  reactions?: string | undefined;
  repo?: string[] | undefined;
  state?: 'open' | 'closed' | undefined;
  teamMentions?: string | undefined;
  updated?: string | undefined;
  visibility?: ('public' | 'private' | 'internal')[] | undefined;
  // Pagination and sorting
  sort?:
    | 'comments'
    | 'created'
    | 'interactions'
    | 'reactions'
    | 'reactions-+1'
    | 'reactions--1'
    | 'reactions-heart'
    | 'reactions-smile'
    | 'reactions-tada'
    | 'reactions-thinking_face'
    | 'updated'
    | undefined;
  order?: 'asc' | 'desc' | undefined;
  perPage?: number | undefined;
}

export interface SearchPrsInput {
  query: string;
  // Filter flags (includes all issue flags plus PR-specific)
  app?: string | undefined;
  archived?: boolean | undefined;
  assignee?: string | undefined;
  author?: string | undefined;
  base?: string | undefined;
  checks?: 'pending' | 'success' | 'failure' | undefined;
  closed?: string | undefined;
  commenter?: string | undefined;
  comments?: string | undefined;
  created?: string | undefined;
  draft?: boolean | undefined;
  head?: string | undefined;
  interactions?: string | undefined;
  involves?: string | undefined;
  label?: string[] | undefined;
  language?: string | undefined;
  locked?: boolean | undefined;
  match?: ('title' | 'body' | 'comments')[] | undefined;
  mentions?: string | undefined;
  merged?: boolean | undefined;
  mergedAt?: string | undefined;
  milestone?: string | undefined;
  noAssignee?: boolean | undefined;
  noLabel?: boolean | undefined;
  noMilestone?: boolean | undefined;
  noProject?: boolean | undefined;
  owner?: string[] | undefined;
  project?: string | undefined;
  reactions?: string | undefined;
  repo?: string[] | undefined;
  review?: 'none' | 'required' | 'approved' | 'changes_requested' | undefined;
  reviewRequested?: string | undefined;
  reviewedBy?: string | undefined;
  state?: 'open' | 'closed' | undefined;
  teamMentions?: string | undefined;
  updated?: string | undefined;
  visibility?: ('public' | 'private' | 'internal')[] | undefined;
  // Pagination and sorting
  sort?:
    | 'comments'
    | 'reactions'
    | 'reactions-+1'
    | 'reactions--1'
    | 'reactions-smile'
    | 'reactions-thinking_face'
    | 'reactions-heart'
    | 'reactions-tada'
    | 'interactions'
    | 'created'
    | 'updated'
    | undefined;
  order?: 'asc' | 'desc' | undefined;
  perPage?: number | undefined;
}

export interface SearchCommitsInput {
  query: string;
  // Filter flags
  author?: string | undefined;
  authorDate?: string | undefined;
  authorEmail?: string | undefined;
  authorName?: string | undefined;
  committer?: string | undefined;
  committerDate?: string | undefined;
  committerEmail?: string | undefined;
  committerName?: string | undefined;
  hash?: string | undefined;
  merge?: boolean | undefined;
  owner?: string[] | undefined;
  parent?: string | undefined;
  repo?: string[] | undefined;
  tree?: string | undefined;
  visibility?: ('public' | 'private' | 'internal')[] | undefined;
  // Pagination and sorting
  sort?: 'author-date' | 'committer-date' | undefined;
  order?: 'asc' | 'desc' | undefined;
  perPage?: number | undefined;
}

export interface SearchCodeInput {
  query: string;
  // Filter flags
  extension?: string | undefined;
  filename?: string | undefined;
  language?: string | undefined;
  match?: ('file' | 'path')[] | undefined;
  owner?: string[] | undefined;
  repo?: string[] | undefined;
  size?: string | undefined;
  // Pagination
  perPage?: number | undefined;
}
