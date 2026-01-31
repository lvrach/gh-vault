/**
 * Repo domain types - structured data returned by core functions.
 * These types represent the domain model, independent of presentation format.
 */

/**
 * Repository visibility.
 */
export type RepoVisibility = 'public' | 'private' | 'internal';

/**
 * License information.
 */
export interface RepoLicense {
  key: string;
  name: string;
  spdxId: string;
}

/**
 * Repository owner information.
 */
export interface RepoOwner {
  login: string;
  type: 'User' | 'Organization';
  htmlUrl: string;
}

/**
 * Repository as returned by GitHub API.
 */
export interface Repository {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  owner: RepoOwner;
  private: boolean;
  description: string | null;
  fork: boolean;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  visibility: RepoVisibility;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  watchersCount: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  archived: boolean;
  disabled: boolean;
  topics: string[];
  license: RepoLicense | null;
  parent?: Repository | undefined;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  hasDiscussions: boolean;
  allowForking: boolean;
  isTemplate: boolean;
}

/**
 * Simplified repository info for list output.
 */
export interface RepositoryListItem {
  id: number;
  name: string;
  fullName: string;
  owner: RepoOwner;
  private: boolean;
  description: string | null;
  fork: boolean;
  htmlUrl: string;
  visibility: RepoVisibility;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  pushedAt: string | null;
  archived: boolean;
  isTemplate: boolean;
}

/**
 * Input for getting a single repository.
 */
export interface RepoGetInput {
  owner: string;
  repo: string;
}

/**
 * Input for listing repositories.
 */
export interface RepoListInput {
  owner?: string | undefined; // If not provided, list authenticated user's repos
  perPage?: number | undefined;
  page?: number | undefined;
  visibility?: RepoVisibility | undefined;
  affiliation?: 'owner' | 'collaborator' | 'organization_member' | undefined;
  sort?: 'created' | 'updated' | 'pushed' | 'full_name' | undefined;
  direction?: 'asc' | 'desc' | undefined;
  type?: 'all' | 'owner' | 'public' | 'private' | 'member' | undefined;
}

/**
 * Input for creating a repository.
 */
export interface RepoCreateInput {
  name: string;
  description?: string | undefined;
  homepage?: string | undefined;
  private?: boolean | undefined;
  visibility?: RepoVisibility | undefined;
  hasIssues?: boolean | undefined;
  hasProjects?: boolean | undefined;
  hasWiki?: boolean | undefined;
  hasDiscussions?: boolean | undefined;
  isTemplate?: boolean | undefined;
  teamId?: number | undefined;
  autoInit?: boolean | undefined;
  gitignoreTemplate?: string | undefined;
  licenseTemplate?: string | undefined;
  allowSquashMerge?: boolean | undefined;
  allowMergeCommit?: boolean | undefined;
  allowRebaseMerge?: boolean | undefined;
  allowAutoMerge?: boolean | undefined;
  deleteBranchOnMerge?: boolean | undefined;
  // For org repos
  org?: string | undefined;
}

/**
 * Input for forking a repository.
 */
export interface RepoForkInput {
  owner: string;
  repo: string;
  organization?: string | undefined;
  name?: string | undefined;
  defaultBranchOnly?: boolean | undefined;
}

/**
 * Input for editing a repository.
 */
export interface RepoEditInput {
  owner: string;
  repo: string;
  name?: string | undefined;
  description?: string | undefined;
  homepage?: string | undefined;
  private?: boolean | undefined;
  visibility?: RepoVisibility | undefined;
  hasIssues?: boolean | undefined;
  hasProjects?: boolean | undefined;
  hasWiki?: boolean | undefined;
  hasDiscussions?: boolean | undefined;
  isTemplate?: boolean | undefined;
  defaultBranch?: string | undefined;
  allowSquashMerge?: boolean | undefined;
  allowMergeCommit?: boolean | undefined;
  allowRebaseMerge?: boolean | undefined;
  allowAutoMerge?: boolean | undefined;
  deleteBranchOnMerge?: boolean | undefined;
  allowForking?: boolean | undefined;
  archived?: boolean | undefined;
  // Topics
  addTopics?: string[] | undefined;
  removeTopics?: string[] | undefined;
}

/**
 * Input for deleting a repository.
 */
export interface RepoDeleteInput {
  owner: string;
  repo: string;
}

/**
 * Input for archiving/unarchiving a repository.
 */
export interface RepoArchiveInput {
  owner: string;
  repo: string;
  archived: boolean;
}
