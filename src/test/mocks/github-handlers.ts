import { http, HttpResponse } from 'msw';

// Realistic mock data based on GitHub API documentation
// https://docs.github.com/en/rest/pulls/pulls

const mockUser = {
  login: 'octocat',
  id: 1,
  node_id: 'MDQ6VXNlcjE=',
  avatar_url: 'https://github.com/images/error/octocat_happy.gif',
  gravatar_id: '',
  url: 'https://api.github.com/users/octocat',
  html_url: 'https://github.com/octocat',
  followers_url: 'https://api.github.com/users/octocat/followers',
  following_url: 'https://api.github.com/users/octocat/following{/other_user}',
  gists_url: 'https://api.github.com/users/octocat/gists{/gist_id}',
  starred_url: 'https://api.github.com/users/octocat/starred{/owner}{/repo}',
  subscriptions_url: 'https://api.github.com/users/octocat/subscriptions',
  organizations_url: 'https://api.github.com/users/octocat/orgs',
  repos_url: 'https://api.github.com/users/octocat/repos',
  events_url: 'https://api.github.com/users/octocat/events{/privacy}',
  received_events_url: 'https://api.github.com/users/octocat/received_events',
  type: 'User',
  site_admin: false,
};

const mockRepo = {
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
  archive_url: 'https://api.github.com/repos/octocat/Hello-World/{archive_format}{/ref}',
  assignees_url: 'https://api.github.com/repos/octocat/Hello-World/assignees{/user}',
  blobs_url: 'https://api.github.com/repos/octocat/Hello-World/git/blobs{/sha}',
  branches_url: 'https://api.github.com/repos/octocat/Hello-World/branches{/branch}',
  collaborators_url:
    'https://api.github.com/repos/octocat/Hello-World/collaborators{/collaborator}',
  comments_url: 'https://api.github.com/repos/octocat/Hello-World/comments{/number}',
  commits_url: 'https://api.github.com/repos/octocat/Hello-World/commits{/sha}',
  compare_url: 'https://api.github.com/repos/octocat/Hello-World/compare/{base}...{head}',
  contents_url: 'https://api.github.com/repos/octocat/Hello-World/contents/{+path}',
  contributors_url: 'https://api.github.com/repos/octocat/Hello-World/contributors',
  deployments_url: 'https://api.github.com/repos/octocat/Hello-World/deployments',
  downloads_url: 'https://api.github.com/repos/octocat/Hello-World/downloads',
  events_url: 'https://api.github.com/repos/octocat/Hello-World/events',
  forks_url: 'https://api.github.com/repos/octocat/Hello-World/forks',
  git_commits_url: 'https://api.github.com/repos/octocat/Hello-World/git/commits{/sha}',
  git_refs_url: 'https://api.github.com/repos/octocat/Hello-World/git/refs{/sha}',
  git_tags_url: 'https://api.github.com/repos/octocat/Hello-World/git/tags{/sha}',
  git_url: 'git:github.com/octocat/Hello-World.git',
  issue_comment_url: 'https://api.github.com/repos/octocat/Hello-World/issues/comments{/number}',
  issue_events_url: 'https://api.github.com/repos/octocat/Hello-World/issues/events{/number}',
  issues_url: 'https://api.github.com/repos/octocat/Hello-World/issues{/number}',
  keys_url: 'https://api.github.com/repos/octocat/Hello-World/keys{/key_id}',
  labels_url: 'https://api.github.com/repos/octocat/Hello-World/labels{/name}',
  languages_url: 'https://api.github.com/repos/octocat/Hello-World/languages',
  merges_url: 'https://api.github.com/repos/octocat/Hello-World/merges',
  milestones_url: 'https://api.github.com/repos/octocat/Hello-World/milestones{/number}',
  notifications_url:
    'https://api.github.com/repos/octocat/Hello-World/notifications{?since,all,participating}',
  pulls_url: 'https://api.github.com/repos/octocat/Hello-World/pulls{/number}',
  releases_url: 'https://api.github.com/repos/octocat/Hello-World/releases{/id}',
  ssh_url: 'git@github.com:octocat/Hello-World.git',
  stargazers_url: 'https://api.github.com/repos/octocat/Hello-World/stargazers',
  statuses_url: 'https://api.github.com/repos/octocat/Hello-World/statuses/{sha}',
  subscribers_url: 'https://api.github.com/repos/octocat/Hello-World/subscribers',
  subscription_url: 'https://api.github.com/repos/octocat/Hello-World/subscription',
  tags_url: 'https://api.github.com/repos/octocat/Hello-World/tags',
  teams_url: 'https://api.github.com/repos/octocat/Hello-World/teams',
  trees_url: 'https://api.github.com/repos/octocat/Hello-World/git/trees{/sha}',
  clone_url: 'https://github.com/octocat/Hello-World.git',
  mirror_url: 'git:git.example.com/octocat/Hello-World',
  hooks_url: 'https://api.github.com/repos/octocat/Hello-World/hooks',
  svn_url: 'https://svn.github.com/octocat/Hello-World',
  homepage: 'https://github.com',
  language: null,
  forks_count: 9,
  stargazers_count: 80,
  watchers_count: 80,
  size: 108,
  default_branch: 'main',
  open_issues_count: 0,
  is_template: false,
  topics: ['octocat', 'api', 'testing'],
  has_issues: true,
  has_projects: true,
  has_wiki: true,
  has_pages: false,
  has_downloads: true,
  has_discussions: false,
  archived: false,
  disabled: false,
  visibility: 'public',
  pushed_at: '2024-01-15T09:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  permissions: {
    admin: false,
    maintain: false,
    push: false,
    triage: false,
    pull: true,
  },
  allow_rebase_merge: true,
  template_repository: null,
  temp_clone_token: '',
  allow_squash_merge: true,
  allow_auto_merge: false,
  delete_branch_on_merge: false,
  allow_merge_commit: true,
  allow_update_branch: false,
  use_squash_pr_title_as_default: false,
  squash_merge_commit_title: 'COMMIT_OR_PR_TITLE',
  squash_merge_commit_message: 'COMMIT_MESSAGES',
  merge_commit_title: 'MERGE_MESSAGE',
  merge_commit_message: 'PR_TITLE',
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
  open_issues: 0,
  watchers: 80,
};

const mockLabel = {
  id: 208_045_946,
  node_id: 'MDU6TGFiZWwyMDgwNDU5NDY=',
  url: 'https://api.github.com/repos/octocat/Hello-World/labels/bug',
  name: 'bug',
  description: 'Something is broken',
  color: 'd73a4a',
  default: true,
};

const mockMilestone = {
  url: 'https://api.github.com/repos/octocat/Hello-World/milestones/1',
  html_url: 'https://github.com/octocat/Hello-World/milestones/v1.0',
  labels_url: 'https://api.github.com/repos/octocat/Hello-World/milestones/1/labels',
  id: 1_002_604,
  node_id: 'MDk6TWlsZXN0b25lMTAwMjYwNA==',
  number: 1,
  state: 'open',
  title: 'v1.0',
  description: 'Initial release milestone',
  creator: mockUser,
  open_issues: 4,
  closed_issues: 8,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  closed_at: null,
  due_on: '2024-03-01T00:00:00Z',
};

function createMockPullRequest(pullNumber: number) {
  return {
    url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}`,
    id: pullNumber,
    node_id: 'MDExOlB1bGxSZXF1ZXN0MQ==',
    html_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}`,
    diff_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}.diff`,
    patch_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}.patch`,
    issue_url: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}`,
    commits_url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/commits`,
    review_comments_url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/comments`,
    review_comment_url: 'https://api.github.com/repos/octocat/Hello-World/pulls/comments{/number}',
    comments_url: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}/comments`,
    statuses_url:
      'https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e',
    number: pullNumber,
    state: 'open',
    locked: false,
    title: 'Amazing new feature',
    user: mockUser,
    body: 'Please pull these awesome changes in!',
    labels: [mockLabel],
    milestone: mockMilestone,
    active_lock_reason: null,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-16T14:20:00Z',
    closed_at: null,
    merged_at: null,
    merge_commit_sha: null,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    requested_teams: [],
    head: {
      label: 'octocat:new-topic',
      ref: 'new-topic',
      sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      user: mockUser,
      repo: mockRepo,
    },
    base: {
      label: 'octocat:main',
      ref: 'main',
      sha: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
      user: mockUser,
      repo: mockRepo,
    },
    _links: {
      self: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}`,
      },
      html: {
        href: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}`,
      },
      issue: {
        href: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}`,
      },
      comments: {
        href: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}/comments`,
      },
      review_comments: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/comments`,
      },
      review_comment: {
        href: 'https://api.github.com/repos/octocat/Hello-World/pulls/comments{/number}',
      },
      commits: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/commits`,
      },
      statuses: {
        href: 'https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e',
      },
    },
    author_association: 'OWNER',
    auto_merge: null,
    draft: false,
    merged: false,
    mergeable: true,
    rebaseable: true,
    mergeable_state: 'clean',
    merged_by: null,
    comments: 10,
    review_comments: 5,
    maintainer_can_modify: true,
    commits: 3,
    additions: 100,
    deletions: 3,
    changed_files: 5,
  };
}

function createMockPullRequestListItem(pullNumber: number) {
  return {
    url: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}`,
    id: pullNumber,
    node_id: 'MDExOlB1bGxSZXF1ZXN0MQ==',
    html_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}`,
    diff_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}.diff`,
    patch_url: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}.patch`,
    issue_url: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}`,
    number: pullNumber,
    state: 'open',
    locked: false,
    title: `Pull Request #${String(pullNumber)}`,
    user: mockUser,
    body: 'PR description',
    labels: [mockLabel],
    milestone: mockMilestone,
    active_lock_reason: null,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-16T14:20:00Z',
    closed_at: null,
    merged_at: null,
    merge_commit_sha: null,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    requested_teams: [],
    head: {
      label: 'octocat:feature-branch',
      ref: 'feature-branch',
      sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      user: mockUser,
      repo: mockRepo,
    },
    base: {
      label: 'octocat:main',
      ref: 'main',
      sha: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
      user: mockUser,
      repo: mockRepo,
    },
    _links: {
      self: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}`,
      },
      html: {
        href: `https://github.com/octocat/Hello-World/pull/${String(pullNumber)}`,
      },
      issue: {
        href: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}`,
      },
      comments: {
        href: `https://api.github.com/repos/octocat/Hello-World/issues/${String(pullNumber)}/comments`,
      },
      review_comments: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/comments`,
      },
      review_comment: {
        href: 'https://api.github.com/repos/octocat/Hello-World/pulls/comments{/number}',
      },
      commits: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/${String(pullNumber)}/commits`,
      },
      statuses: {
        href: 'https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e',
      },
    },
    author_association: 'OWNER',
    auto_merge: null,
    draft: false,
  };
}

function createMockIssueComment(commentId: number) {
  return {
    id: commentId,
    node_id: 'MDEyOklzc3VlQ29tbWVudDE=',
    url: 'https://api.github.com/repos/octocat/Hello-World/issues/comments/1',
    html_url: 'https://github.com/octocat/Hello-World/issues/1347#issuecomment-1',
    body: 'This is a great PR! Nice work.',
    user: mockUser,
    created_at: '2024-01-15T12:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
    issue_url: 'https://api.github.com/repos/octocat/Hello-World/issues/1347',
    author_association: 'COLLABORATOR',
    performed_via_github_app: null,
    reactions: {
      url: 'https://api.github.com/repos/octocat/Hello-World/issues/comments/1/reactions',
      total_count: 2,
      '+1': 1,
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

function createMockReviewComment(commentId: number) {
  return {
    url: `https://api.github.com/repos/octocat/Hello-World/pulls/comments/${String(commentId)}`,
    pull_request_review_id: 80,
    id: commentId,
    node_id: 'MDI0OlB1bGxSZXF1ZXN0UmV2aWV3Q29tbWVudDEw',
    diff_hunk: '@@ -16,33 +16,40 @@ public class Connection implements Runnable {',
    path: 'src/main.ts',
    position: null,
    original_position: 4,
    commit_id: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    original_commit_id: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
    in_reply_to_id: commentId > 1 ? commentId - 1 : undefined,
    user: mockUser,
    body: 'Great work on this change!',
    created_at: '2024-01-16T09:00:00Z',
    updated_at: '2024-01-16T09:00:00Z',
    html_url: 'https://github.com/octocat/Hello-World/pull/1347#discussion_r1',
    pull_request_url: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
    author_association: 'COLLABORATOR',
    _links: {
      self: {
        href: `https://api.github.com/repos/octocat/Hello-World/pulls/comments/${String(commentId)}`,
      },
      html: {
        href: 'https://github.com/octocat/Hello-World/pull/1347#discussion_r1',
      },
      pull_request: {
        href: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
      },
    },
    start_line: null,
    original_start_line: null,
    start_side: null,
    line: 28,
    original_line: 26,
    side: 'RIGHT',
    reactions: {
      url: `https://api.github.com/repos/octocat/Hello-World/pulls/comments/${String(commentId)}/reactions`,
      total_count: 0,
      '+1': 0,
      '-1': 0,
      laugh: 0,
      hooray: 0,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
    subject_type: 'line',
  };
}

function createMockReview(reviewId: number, state: string) {
  return {
    id: reviewId,
    node_id: 'MDE3OlB1bGxSZXF1ZXN0UmV2aWV3ODA=',
    user: mockUser,
    body: state === 'APPROVED' ? 'Looks good to me!' : 'Please address comments',
    state,
    html_url: `https://github.com/octocat/Hello-World/pull/1347#pullrequestreview-${String(reviewId)}`,
    pull_request_url: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
    _links: {
      html: {
        href: `https://github.com/octocat/Hello-World/pull/1347#pullrequestreview-${String(reviewId)}`,
      },
      pull_request: {
        href: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
      },
    },
    submitted_at: '2024-01-16T15:00:00Z',
    commit_id: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    author_association: 'COLLABORATOR',
  };
}

function createMockPrFile(filename: string, status: string) {
  return {
    sha: 'bbcd538c8e72b8c175046e27cc8f907076331401',
    filename,
    status,
    additions: 50,
    deletions: 10,
    changes: 60,
    blob_url: `https://github.com/octocat/Hello-World/blob/6dcb09b5b57875f334f61aebed695e2e4193db5e/${filename}`,
    raw_url: `https://github.com/octocat/Hello-World/raw/6dcb09b5b57875f334f61aebed695e2e4193db5e/${filename}`,
    contents_url: `https://api.github.com/repos/octocat/Hello-World/contents/${filename}?ref=6dcb09b5b57875f334f61aebed695e2e4193db5e`,
    patch: '@@ -1,5 +1,10 @@\n-old line\n+new line\n context line\n context line\n+added line',
  };
}

function ratelimitHeaders() {
  return {
    'x-ratelimit-limit': '5000',
    'x-ratelimit-remaining': '4998',
    'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    'x-ratelimit-used': '2',
    'x-ratelimit-resource': 'core',
  };
}

export const handlers = [
  // GET /user - for token verification
  http.get('https://api.github.com/user', () => {
    return HttpResponse.json(mockUser, {
      headers: {
        'x-oauth-scopes': 'repo, read:user',
        ...ratelimitHeaders(),
      },
    });
  }),

  // GET /repos/:owner/:repo/pulls/:pull_number - Get a single PR
  http.get<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number',
    ({ params, request }) => {
      const pullNumber = Number(params.pull_number);
      const acceptHeader = request.headers.get('accept');

      // Handle 404 case
      if (pullNumber === 404) {
        return HttpResponse.json(
          {
            message: 'Not Found',
            documentation_url: 'https://docs.github.com/rest/pulls/pulls#get-a-pull-request',
          },
          {
            status: 404,
            headers: ratelimitHeaders(),
          }
        );
      }

      // Handle diff format request
      // Octokit sends 'application/vnd.github.v3.diff' for mediaType: { format: 'diff' }
      if (
        acceptHeader?.includes('application/vnd.github.diff') ||
        acceptHeader?.includes('application/vnd.github.v3.diff')
      ) {
        const diff = `diff --git a/src/main.ts b/src/main.ts
index 1234567..abcdefg 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,5 +1,10 @@
-console.log('old');
+console.log('new');

+function newFeature() {
+  return 'amazing';
+}
+
 export default function main() {
   return 'hello world';
 }`;
        // Use plain Response for text/diff content to avoid ArrayBuffer issues
        return new Response(diff, {
          status: 200,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            ...ratelimitHeaders(),
          },
        });
      }

      return HttpResponse.json(createMockPullRequest(pullNumber), {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/pulls - List PRs
  http.get<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls',
    ({ request }) => {
      const url = new URL(request.url);
      const state = url.searchParams.get('state') ?? 'open';
      const perPage = Number(url.searchParams.get('per_page') ?? '30');

      // Return 3 PRs for testing
      const prs = [
        createMockPullRequestListItem(1),
        createMockPullRequestListItem(2),
        createMockPullRequestListItem(3),
      ];

      // Filter by state if needed
      const filteredPrs = state === 'all' ? prs : prs.filter((pr) => pr.state === state);

      return HttpResponse.json(filteredPrs.slice(0, perPage), {
        headers: {
          link: '<https://api.github.com/repos/octocat/Hello-World/pulls?page=2>; rel="next"',
          ...ratelimitHeaders(),
        },
      });
    }
  ),

  // GET /repos/:owner/:repo/pulls/:pull_number/files - List PR files
  http.get<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number/files',
    ({ params }) => {
      const pullNumber = Number(params.pull_number);

      if (pullNumber === 404) {
        return HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }

      const files = [
        createMockPrFile('src/main.ts', 'modified'),
        createMockPrFile('src/utils.ts', 'added'),
        createMockPrFile('README.md', 'modified'),
      ];

      return HttpResponse.json(files, {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/issues/:issue_number/comments - List issue comments (PR comments)
  http.get<{ owner: string; repo: string; issue_number: string }>(
    'https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments',
    ({ params }) => {
      const issueNumber = Number(params.issue_number);

      if (issueNumber === 404) {
        return HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }

      const comments = [
        createMockIssueComment(1),
        createMockIssueComment(2),
        createMockIssueComment(3),
      ];

      return HttpResponse.json(comments, {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/pulls/:pull_number/comments - List review comments
  http.get<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number/comments',
    ({ params }) => {
      const pullNumber = Number(params.pull_number);

      if (pullNumber === 404) {
        return HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }

      const comments = [createMockReviewComment(1), createMockReviewComment(2)];

      return HttpResponse.json(comments, {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/pulls/:pull_number/reviews - List reviews
  http.get<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews',
    ({ params }) => {
      const pullNumber = Number(params.pull_number);

      if (pullNumber === 404) {
        return HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }

      const reviews = [
        createMockReview(1, 'APPROVED'),
        createMockReview(2, 'CHANGES_REQUESTED'),
        createMockReview(3, 'COMMENTED'),
      ];

      return HttpResponse.json(reviews, {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // POST /repos/:owner/:repo/issues/:issue_number/comments - Create issue comment
  http.post<{ owner: string; repo: string; issue_number: string }>(
    'https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments',
    async ({ params, request }) => {
      const issueNumber = Number(params.issue_number);

      if (issueNumber === 404) {
        return HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }

      const body = (await request.json()) as { body: string };
      const comment = {
        ...createMockIssueComment(Date.now()),
        body: body.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return HttpResponse.json(comment, {
        status: 201,
        headers: {
          location: comment.url,
          ...ratelimitHeaders(),
        },
      });
    }
  ),

  // POST /repos/:owner/:repo/pulls/:pull_number/reviews - Create review
  http.post<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews',
    async ({ params, request }) => {
      const pullNumber = Number(params.pull_number);

      if (pullNumber === 404) {
        return HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }

      const body = (await request.json()) as { body: string; event: string };
      const review = {
        ...createMockReview(Date.now(), body.event),
        body: body.body,
        submitted_at: new Date().toISOString(),
      };

      return HttpResponse.json(review, {
        status: 200,
        headers: ratelimitHeaders(),
      });
    }
  ),
];
