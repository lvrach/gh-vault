/**
 * Repo domain API class - fetch data from GitHub and return structured types.
 * These methods are presentation-agnostic and can be used by both CLI and MCP.
 */

import type { Octokit } from '../../shared/github.js';
import type {
  RepoArchiveInput,
  RepoCreateInput,
  RepoDeleteInput,
  RepoEditInput,
  RepoForkInput,
  RepoGetInput,
  RepoLicense,
  RepoListInput,
  RepoOwner,
  Repository,
  RepositoryListItem,
  RepoVisibility,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

/** Default number of items per page for paginated API calls */
const DEFAULT_PAGE_SIZE = 30;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Validate repository visibility from GitHub API.
 */
function toVisibility(visibility: string | undefined): RepoVisibility {
  if (visibility === 'public' || visibility === 'private' || visibility === 'internal') {
    return visibility;
  }
  return 'public';
}

// ============================================================================
// Helper Functions
// ============================================================================

function toOwner(owner: { login: string; type: string; html_url?: string }): RepoOwner {
  return {
    login: owner.login,
    type: owner.type === 'Organization' ? 'Organization' : 'User',
    htmlUrl: owner.html_url ?? `https://github.com/${owner.login}`,
  };
}

function toLicense(
  license: { key: string; name: string; spdx_id: string } | null | undefined
): RepoLicense | null {
  if (!license) return null;
  return {
    key: license.key,
    name: license.name,
    spdxId: license.spdx_id,
  };
}

interface GitHubRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: { login: string; type: string; html_url?: string };
  private: boolean;
  description: string | null;
  fork: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  visibility?: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  archived: boolean;
  disabled: boolean;
  topics?: string[];
  license: { key: string; name: string; spdx_id: string } | null;
  parent?: GitHubRepo;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_discussions?: boolean;
  allow_forking?: boolean;
  is_template?: boolean;
}

function mapRepository(repo: GitHubRepo): Repository {
  return {
    id: repo.id,
    nodeId: repo.node_id,
    name: repo.name,
    fullName: repo.full_name,
    owner: toOwner(repo.owner),
    private: repo.private,
    description: repo.description,
    fork: repo.fork,
    htmlUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    sshUrl: repo.ssh_url,
    defaultBranch: repo.default_branch,
    visibility: toVisibility(repo.visibility ?? (repo.private ? 'private' : 'public')),
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    watchersCount: repo.watchers_count,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    archived: repo.archived,
    disabled: repo.disabled,
    topics: repo.topics ?? [],
    license: toLicense(repo.license),
    parent: repo.parent ? mapRepository(repo.parent) : undefined,
    hasIssues: repo.has_issues,
    hasProjects: repo.has_projects,
    hasWiki: repo.has_wiki,
    hasDiscussions: repo.has_discussions ?? false,
    allowForking: repo.allow_forking ?? false,
    isTemplate: repo.is_template ?? false,
  };
}

function mapRepositoryListItem(repo: GitHubRepo): RepositoryListItem {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: toOwner(repo.owner),
    private: repo.private,
    description: repo.description,
    fork: repo.fork,
    htmlUrl: repo.html_url,
    visibility: toVisibility(repo.visibility ?? (repo.private ? 'private' : 'public')),
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    archived: repo.archived,
    isTemplate: repo.is_template ?? false,
  };
}

// ============================================================================
// RepoApi Class
// ============================================================================

/**
 * Repo domain API with constructor-injected Octokit client.
 * All methods use the injected client for GitHub API calls.
 */
export class RepoApi {
  constructor(private readonly client: Octokit) {}

  /**
   * Get a specific repository.
   */
  async getRepo(input: RepoGetInput): Promise<Repository> {
    const { data } = await this.client.rest.repos.get({
      owner: input.owner,
      repo: input.repo,
    });

    return mapRepository(data as GitHubRepo);
  }

  /**
   * List repositories for the authenticated user or a specified owner.
   */
  async listRepos(input: RepoListInput): Promise<RepositoryListItem[]> {
    const perPage = input.perPage ?? DEFAULT_PAGE_SIZE;
    const page = input.page ?? 1;

    // If owner is specified, check if it's an org or user
    if (input.owner) {
      try {
        // Try to list as org first
        const { data } = await this.client.rest.repos.listForOrg({
          org: input.owner,
          per_page: perPage,
          page,
          sort: input.sort ?? 'updated',
          direction: input.direction ?? 'desc',
          type: input.type as 'all' | 'public' | 'private' | 'forks' | 'sources' | 'member',
        });
        return data.map((r) => mapRepositoryListItem(r as GitHubRepo));
      } catch {
        // If org list fails, try as user
        const { data } = await this.client.rest.repos.listForUser({
          username: input.owner,
          per_page: perPage,
          page,
          sort: input.sort ?? 'updated',
          direction: input.direction ?? 'desc',
          type: input.type as 'all' | 'owner' | 'member',
        });
        return data.map((r) => mapRepositoryListItem(r as GitHubRepo));
      }
    }

    // List authenticated user's repos
    // Note: REST API visibility only accepts 'all' | 'public' | 'private'
    const visibilityParam =
      input.visibility === 'internal'
        ? undefined
        : (input.visibility as 'all' | 'public' | 'private');
    const { data } = await this.client.rest.repos.listForAuthenticatedUser({
      per_page: perPage,
      page,
      ...(visibilityParam && { visibility: visibilityParam }),
      ...(input.affiliation && { affiliation: input.affiliation }),
      sort: input.sort ?? 'updated',
      direction: input.direction ?? 'desc',
      ...(input.type && { type: input.type }),
    });

    return data.map((r) => mapRepositoryListItem(r as GitHubRepo));
  }

  /**
   * Create a new repository.
   */
  async createRepo(input: RepoCreateInput): Promise<Repository> {
    // Note: REST API visibility only accepts 'public' | 'private' (internal is org-specific)
    const visibilityParam =
      input.visibility === 'internal' || input.visibility === undefined
        ? undefined
        : input.visibility;

    const params = {
      name: input.name,
      ...(input.description && { description: input.description }),
      ...(input.homepage && { homepage: input.homepage }),
      ...(input.private !== undefined && { private: input.private }),
      ...(visibilityParam && { visibility: visibilityParam }),
      ...(input.hasIssues !== undefined && { has_issues: input.hasIssues }),
      ...(input.hasProjects !== undefined && { has_projects: input.hasProjects }),
      ...(input.hasWiki !== undefined && { has_wiki: input.hasWiki }),
      ...(input.hasDiscussions !== undefined && { has_discussions: input.hasDiscussions }),
      ...(input.isTemplate !== undefined && { is_template: input.isTemplate }),
      ...(input.teamId !== undefined && input.teamId !== 0 && { team_id: input.teamId }),
      ...(input.autoInit !== undefined && { auto_init: input.autoInit }),
      ...(input.gitignoreTemplate && { gitignore_template: input.gitignoreTemplate }),
      ...(input.licenseTemplate && { license_template: input.licenseTemplate }),
      ...(input.allowSquashMerge !== undefined && { allow_squash_merge: input.allowSquashMerge }),
      ...(input.allowMergeCommit !== undefined && { allow_merge_commit: input.allowMergeCommit }),
      ...(input.allowRebaseMerge !== undefined && { allow_rebase_merge: input.allowRebaseMerge }),
      ...(input.allowAutoMerge !== undefined && { allow_auto_merge: input.allowAutoMerge }),
      ...(input.deleteBranchOnMerge !== undefined && {
        delete_branch_on_merge: input.deleteBranchOnMerge,
      }),
    };

    if (input.org) {
      const { data } = await this.client.rest.repos.createInOrg({
        org: input.org,
        ...params,
      });
      return mapRepository(data as GitHubRepo);
    }

    const { data } = await this.client.rest.repos.createForAuthenticatedUser(params);
    return mapRepository(data as GitHubRepo);
  }

  /**
   * Fork a repository.
   */
  async forkRepo(input: RepoForkInput): Promise<Repository> {
    const { data } = await this.client.rest.repos.createFork({
      owner: input.owner,
      repo: input.repo,
      ...(input.organization && { organization: input.organization }),
      ...(input.name && { name: input.name }),
      ...(input.defaultBranchOnly !== undefined && {
        default_branch_only: input.defaultBranchOnly,
      }),
    });

    return mapRepository(data as GitHubRepo);
  }

  /**
   * Edit repository settings.
   */
  async editRepo(input: RepoEditInput): Promise<Repository> {
    // Note: REST API visibility only accepts 'public' | 'private' (internal is org-specific)
    const visibilityParam =
      input.visibility === 'internal' || input.visibility === undefined
        ? undefined
        : input.visibility;

    const { data } = await this.client.rest.repos.update({
      owner: input.owner,
      repo: input.repo,
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.homepage !== undefined && { homepage: input.homepage }),
      ...(input.private !== undefined && { private: input.private }),
      ...(visibilityParam && { visibility: visibilityParam }),
      ...(input.hasIssues !== undefined && { has_issues: input.hasIssues }),
      ...(input.hasProjects !== undefined && { has_projects: input.hasProjects }),
      ...(input.hasWiki !== undefined && { has_wiki: input.hasWiki }),
      ...(input.hasDiscussions !== undefined && { has_discussions: input.hasDiscussions }),
      ...(input.isTemplate !== undefined && { is_template: input.isTemplate }),
      ...(input.defaultBranch && { default_branch: input.defaultBranch }),
      ...(input.allowSquashMerge !== undefined && { allow_squash_merge: input.allowSquashMerge }),
      ...(input.allowMergeCommit !== undefined && { allow_merge_commit: input.allowMergeCommit }),
      ...(input.allowRebaseMerge !== undefined && { allow_rebase_merge: input.allowRebaseMerge }),
      ...(input.allowAutoMerge !== undefined && { allow_auto_merge: input.allowAutoMerge }),
      ...(input.deleteBranchOnMerge !== undefined && {
        delete_branch_on_merge: input.deleteBranchOnMerge,
      }),
      ...(input.allowForking !== undefined && { allow_forking: input.allowForking }),
      ...(input.archived !== undefined && { archived: input.archived }),
    });

    // Handle topics separately
    if (input.addTopics || input.removeTopics) {
      // Get current topics
      const { data: topicsData } = await this.client.rest.repos.getAllTopics({
        owner: input.owner,
        repo: input.name ?? input.repo, // Use new name if renamed
      });

      let newTopics = topicsData.names;

      if (input.addTopics) {
        newTopics = [...new Set([...newTopics, ...input.addTopics])];
      }

      if (input.removeTopics) {
        const removeSet = new Set(input.removeTopics);
        newTopics = newTopics.filter((t) => !removeSet.has(t));
      }

      await this.client.rest.repos.replaceAllTopics({
        owner: input.owner,
        repo: input.name ?? input.repo,
        names: newTopics,
      });
    }

    return mapRepository(data as GitHubRepo);
  }

  /**
   * Delete a repository.
   */
  async deleteRepo(input: RepoDeleteInput): Promise<void> {
    await this.client.rest.repos.delete({
      owner: input.owner,
      repo: input.repo,
    });
  }

  /**
   * Archive or unarchive a repository.
   */
  async setArchived(input: RepoArchiveInput): Promise<Repository> {
    const { data } = await this.client.rest.repos.update({
      owner: input.owner,
      repo: input.repo,
      archived: input.archived,
    });

    return mapRepository(data as GitHubRepo);
  }

  /**
   * Get README content for a repository.
   */
  async getReadme(input: RepoGetInput & { ref?: string }): Promise<string | null> {
    try {
      const { data } = await this.client.rest.repos.getReadme({
        owner: input.owner,
        repo: input.repo,
        ...(input.ref && { ref: input.ref }),
      });

      if ('content' in data && typeof data.content === 'string') {
        return Buffer.from(data.content, 'base64').toString('utf8');
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get the authenticated user's login.
   */
  async getCurrentUser(): Promise<string> {
    const { data } = await this.client.rest.users.getAuthenticated();
    return data.login;
  }
}
