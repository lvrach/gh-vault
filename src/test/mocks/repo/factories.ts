/**
 * Repo domain mock data factories.
 * These functions create realistic GitHub API responses for testing.
 */

/**
 * Create a mock repository (for GET /repos/:owner/:repo).
 */
export function createMockRepository(
  name = 'Hello-World',
  owner = 'octocat',
  options: {
    private?: boolean;
    fork?: boolean;
    archived?: boolean;
    description?: string;
    language?: string;
  } = {}
) {
  const fullName = `${owner}/${name}`;
  const isPrivate = options.private ?? false;

  return {
    id: 1_296_269,
    node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
    name,
    full_name: fullName,
    private: isPrivate,
    owner: {
      login: owner,
      id: 1,
      node_id: 'MDQ6VXNlcjE=',
      avatar_url: `https://github.com/images/error/${owner}_happy.gif`,
      html_url: `https://github.com/${owner}`,
      type: 'User',
    },
    html_url: `https://github.com/${fullName}`,
    description: options.description ?? 'This your first repo!',
    fork: options.fork ?? false,
    url: `https://api.github.com/repos/${fullName}`,
    archive_url: `https://api.github.com/repos/${fullName}/{archive_format}{/ref}`,
    assignees_url: `https://api.github.com/repos/${fullName}/assignees{/user}`,
    blobs_url: `https://api.github.com/repos/${fullName}/git/blobs{/sha}`,
    branches_url: `https://api.github.com/repos/${fullName}/branches{/branch}`,
    clone_url: `https://github.com/${fullName}.git`,
    collaborators_url: `https://api.github.com/repos/${fullName}/collaborators{/collaborator}`,
    comments_url: `https://api.github.com/repos/${fullName}/comments{/number}`,
    commits_url: `https://api.github.com/repos/${fullName}/commits{/sha}`,
    compare_url: `https://api.github.com/repos/${fullName}/compare/{base}...{head}`,
    contents_url: `https://api.github.com/repos/${fullName}/contents/{+path}`,
    contributors_url: `https://api.github.com/repos/${fullName}/contributors`,
    deployments_url: `https://api.github.com/repos/${fullName}/deployments`,
    downloads_url: `https://api.github.com/repos/${fullName}/downloads`,
    events_url: `https://api.github.com/repos/${fullName}/events`,
    forks_url: `https://api.github.com/repos/${fullName}/forks`,
    git_commits_url: `https://api.github.com/repos/${fullName}/git/commits{/sha}`,
    git_refs_url: `https://api.github.com/repos/${fullName}/git/refs{/sha}`,
    git_tags_url: `https://api.github.com/repos/${fullName}/git/tags{/sha}`,
    git_url: `git:github.com/${fullName}.git`,
    issue_comment_url: `https://api.github.com/repos/${fullName}/issues/comments{/number}`,
    issue_events_url: `https://api.github.com/repos/${fullName}/issues/events{/number}`,
    issues_url: `https://api.github.com/repos/${fullName}/issues{/number}`,
    keys_url: `https://api.github.com/repos/${fullName}/keys{/key_id}`,
    labels_url: `https://api.github.com/repos/${fullName}/labels{/name}`,
    languages_url: `https://api.github.com/repos/${fullName}/languages`,
    merges_url: `https://api.github.com/repos/${fullName}/merges`,
    milestones_url: `https://api.github.com/repos/${fullName}/milestones{/number}`,
    notifications_url: `https://api.github.com/repos/${fullName}/notifications{?since,all,participating}`,
    pulls_url: `https://api.github.com/repos/${fullName}/pulls{/number}`,
    releases_url: `https://api.github.com/repos/${fullName}/releases{/id}`,
    ssh_url: `git@github.com:${fullName}.git`,
    stargazers_url: `https://api.github.com/repos/${fullName}/stargazers`,
    statuses_url: `https://api.github.com/repos/${fullName}/statuses/{sha}`,
    subscribers_url: `https://api.github.com/repos/${fullName}/subscribers`,
    subscription_url: `https://api.github.com/repos/${fullName}/subscription`,
    tags_url: `https://api.github.com/repos/${fullName}/tags`,
    teams_url: `https://api.github.com/repos/${fullName}/teams`,
    trees_url: `https://api.github.com/repos/${fullName}/git/trees{/sha}`,
    hooks_url: `https://api.github.com/repos/${fullName}/hooks`,
    svn_url: `https://svn.github.com/${fullName}`,
    homepage: 'https://github.com',
    language: options.language ?? 'TypeScript',
    forks_count: 9,
    stargazers_count: 80,
    watchers_count: 80,
    size: 108,
    default_branch: 'main',
    open_issues_count: 5,
    is_template: false,
    topics: ['api', 'testing'],
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    has_pages: false,
    has_downloads: true,
    has_discussions: false,
    archived: options.archived ?? false,
    disabled: false,
    visibility: isPrivate ? 'private' : 'public',
    pushed_at: '2024-01-15T09:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    permissions: {
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true,
    },
    allow_rebase_merge: true,
    template_repository: null,
    allow_squash_merge: true,
    allow_auto_merge: false,
    delete_branch_on_merge: false,
    allow_merge_commit: true,
    allow_update_branch: false,
    allow_forking: true,
    subscribers_count: 42,
    network_count: 0,
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
      node_id: 'MDc6TGljZW5zZW1pdA==',
    },
    forks: 9,
    open_issues: 5,
    watchers: 80,
  };
}

/**
 * Create a mock repository list item (for GET /user/repos).
 */
export function createMockRepositoryListItem(
  name: string,
  owner = 'octocat',
  options: {
    private?: boolean;
    fork?: boolean;
    archived?: boolean;
    language?: string;
  } = {}
) {
  const fullName = `${owner}/${name}`;
  const isPrivate = options.private ?? false;

  return {
    id: Date.now() + Math.floor(name.length * 1000),
    node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
    name,
    full_name: fullName,
    private: isPrivate,
    owner: {
      login: owner,
      id: 1,
      node_id: 'MDQ6VXNlcjE=',
      avatar_url: `https://github.com/images/error/${owner}_happy.gif`,
      html_url: `https://github.com/${owner}`,
      type: 'User',
    },
    html_url: `https://github.com/${fullName}`,
    description: 'Repository description',
    fork: options.fork ?? false,
    url: `https://api.github.com/repos/${fullName}`,
    clone_url: `https://github.com/${fullName}.git`,
    ssh_url: `git@github.com:${fullName}.git`,
    homepage: null,
    language: options.language ?? 'TypeScript',
    forks_count: 2,
    stargazers_count: 10,
    watchers_count: 10,
    size: 50,
    default_branch: 'main',
    open_issues_count: 1,
    is_template: false,
    topics: [],
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    has_pages: false,
    has_downloads: true,
    has_discussions: false,
    archived: options.archived ?? false,
    disabled: false,
    visibility: isPrivate ? 'private' : 'public',
    pushed_at: '2024-01-15T09:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    permissions: {
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true,
    },
    license: null,
  };
}
