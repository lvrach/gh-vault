/**
 * PR domain MSW handlers.
 * These mock the GitHub API endpoints for pull request operations.
 */

import { http, HttpResponse } from 'msw';

import { mockUser } from '../shared/data.js';
import { handleMagicNumber, ratelimitHeaders } from '../shared/helpers.js';
import {
  createMockIssueComment,
  createMockPrFile,
  createMockPullRequest,
  createMockPullRequestListItem,
  createMockReview,
  createMockReviewComment,
} from './factories.js';

export const prHandlers = [
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

      // Handle magic number errors
      const error = handleMagicNumber(pullNumber);
      if (error) return error;

      // Handle diff format request
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

      const error = handleMagicNumber(pullNumber);
      if (error) return error;

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

      const error = handleMagicNumber(issueNumber);
      if (error) return error;

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

      const error = handleMagicNumber(pullNumber);
      if (error) return error;

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

      const error = handleMagicNumber(pullNumber);
      if (error) return error;

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

      const error = handleMagicNumber(issueNumber);
      if (error) return error;

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

      const error = handleMagicNumber(pullNumber);
      if (error) return error;

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

  // POST /repos/:owner/:repo/pulls - Create a pull request
  http.post<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        title: string;
        body?: string;
        head: string;
        base: string;
        draft?: boolean;
      };

      const newPr = {
        ...createMockPullRequest(100),
        title: body.title,
        body: body.body ?? null,
        head: {
          ref: body.head,
          sha: 'abc123new',
          label: `${params.owner}:${body.head}`,
          user: mockUser,
          repo: null,
        },
        base: {
          ref: body.base,
          sha: 'def456base',
          label: `${params.owner}:${body.base}`,
          user: mockUser,
          repo: null,
        },
        draft: body.draft ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return HttpResponse.json(newPr, {
        status: 201,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // PATCH /repos/:owner/:repo/pulls/:pull_number - Update a pull request
  http.patch<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number',
    async ({ params, request }) => {
      const pullNumber = Number(params.pull_number);

      const error = handleMagicNumber(pullNumber);
      if (error) return error;

      const body = (await request.json()) as {
        title?: string;
        body?: string;
        state?: 'open' | 'closed';
        base?: string;
      };

      const updatedPr = {
        ...createMockPullRequest(pullNumber),
        ...(body.title && { title: body.title }),
        ...(body.body && { body: body.body }),
        ...(body.state && { state: body.state }),
        updated_at: new Date().toISOString(),
      };

      return HttpResponse.json(updatedPr, {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // PUT /repos/:owner/:repo/pulls/:pull_number/merge - Merge a pull request
  http.put<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number/merge',
    async ({ params, request }) => {
      const pullNumber = Number(params.pull_number);

      // handleMagicNumber handles all error codes including 409 Conflict
      const error = handleMagicNumber(pullNumber);
      if (error) return error;

      // Parse request body (used to determine merge method, etc.)
      await request.json();

      return HttpResponse.json(
        {
          sha: 'mergedsha123456',
          merged: true,
          message: 'Pull Request successfully merged',
        },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // DELETE /repos/:owner/:repo/git/refs/:ref - Delete a branch
  http.delete<{ owner: string; repo: string; ref: string }>(
    'https://api.github.com/repos/:owner/:repo/git/refs/:ref*',
    ({ params }) => {
      // Magic number 404 for not found in ref
      if (params.ref.includes('404')) {
        return HttpResponse.json(
          { message: 'Reference not found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }

      return new Response(null, {
        status: 204,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // POST /repos/:owner/:repo/pulls/:pull_number/requested_reviewers - Request reviewers
  http.post<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number/requested_reviewers',
    async ({ params, request }) => {
      const pullNumber = Number(params.pull_number);

      const error = handleMagicNumber(pullNumber);
      if (error) return error;

      // Parse the request body to get the reviewers being added
      const body = (await request.json()) as { reviewers?: string[] };
      const requestedReviewers = (body.reviewers ?? []).map((login, index) => ({
        login,
        id: 10_000 + index, // Deterministic ID for tests
        type: 'User',
        avatar_url: `https://avatars.githubusercontent.com/u/${String(10_000 + index)}?v=4`,
        html_url: `https://github.com/${login}`,
      }));

      // Return PR with requested_reviewers populated
      return HttpResponse.json(
        {
          ...createMockPullRequest(pullNumber),
          requested_reviewers: requestedReviewers,
        },
        {
          headers: ratelimitHeaders(),
        }
      );
    }
  ),

  // DELETE /repos/:owner/:repo/pulls/:pull_number/requested_reviewers - Remove requested reviewers
  http.delete<{ owner: string; repo: string; pull_number: string }>(
    'https://api.github.com/repos/:owner/:repo/pulls/:pull_number/requested_reviewers',
    ({ params }) => {
      const pullNumber = Number(params.pull_number);

      const error = handleMagicNumber(pullNumber);
      if (error) return error;

      return HttpResponse.json(createMockPullRequest(pullNumber), {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // POST /repos/:owner/:repo/issues/:issue_number/assignees - Add assignees
  http.post<{ owner: string; repo: string; issue_number: string }>(
    'https://api.github.com/repos/:owner/:repo/issues/:issue_number/assignees',
    ({ params }) => {
      const issueNumber = Number(params.issue_number);

      const error = handleMagicNumber(issueNumber);
      if (error) return error;

      return HttpResponse.json(
        { ...createMockPullRequest(issueNumber), assignees: [mockUser] },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // DELETE /repos/:owner/:repo/issues/:issue_number/assignees - Remove assignees
  http.delete<{ owner: string; repo: string; issue_number: string }>(
    'https://api.github.com/repos/:owner/:repo/issues/:issue_number/assignees',
    ({ params }) => {
      const issueNumber = Number(params.issue_number);

      const error = handleMagicNumber(issueNumber);
      if (error) return error;

      return HttpResponse.json(
        { ...createMockPullRequest(issueNumber), assignees: [] },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // POST /repos/:owner/:repo/issues/:issue_number/labels - Add labels
  http.post<{ owner: string; repo: string; issue_number: string }>(
    'https://api.github.com/repos/:owner/:repo/issues/:issue_number/labels',
    async ({ params, request }) => {
      const issueNumber = Number(params.issue_number);

      const error = handleMagicNumber(issueNumber);
      if (error) return error;

      const body = (await request.json()) as { labels: string[] };

      return HttpResponse.json(
        body.labels.map((name) => ({
          id: Date.now(),
          name,
          color: 'ededed',
          description: null,
        })),
        { status: 200, headers: ratelimitHeaders() }
      );
    }
  ),

  // DELETE /repos/:owner/:repo/issues/:issue_number/labels/:label - Remove label
  http.delete<{ owner: string; repo: string; issue_number: string; label: string }>(
    'https://api.github.com/repos/:owner/:repo/issues/:issue_number/labels/:label',
    ({ params }) => {
      const issueNumber = Number(params.issue_number);

      const error = handleMagicNumber(issueNumber);
      if (error) return error;

      return HttpResponse.json([], { status: 200, headers: ratelimitHeaders() });
    }
  ),

  // GET /repos/:owner/:repo/commits/:ref/check-runs - Get check runs for a commit
  http.get<{ owner: string; repo: string; ref: string }>(
    'https://api.github.com/repos/:owner/:repo/commits/:ref/check-runs',
    () => {
      return HttpResponse.json(
        {
          total_count: 2,
          check_runs: [
            {
              id: 1,
              name: 'build',
              status: 'completed',
              conclusion: 'success',
              started_at: '2024-01-15T10:00:00Z',
              completed_at: '2024-01-15T10:05:00Z',
              html_url: 'https://github.com/octocat/Hello-World/runs/1',
              output: {
                title: 'Build successful',
                summary: 'All tests passed',
              },
              app: {
                name: 'GitHub Actions',
                slug: 'github-actions',
              },
            },
            {
              id: 2,
              name: 'test',
              status: 'completed',
              conclusion: 'success',
              started_at: '2024-01-15T10:00:00Z',
              completed_at: '2024-01-15T10:03:00Z',
              html_url: 'https://github.com/octocat/Hello-World/runs/2',
              output: {
                title: 'Tests passed',
                summary: '100 tests passed',
              },
              app: {
                name: 'GitHub Actions',
                slug: 'github-actions',
              },
            },
          ],
        },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // GET /repos/:owner/:repo/commits/:ref/status - Get combined status for a commit
  http.get<{ owner: string; repo: string; ref: string }>(
    'https://api.github.com/repos/:owner/:repo/commits/:ref/status',
    () => {
      return HttpResponse.json(
        {
          state: 'success',
          statuses: [
            {
              context: 'ci/lint',
              state: 'success',
              description: 'Linting passed',
              target_url: 'https://example.com/lint',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z',
            },
          ],
          sha: 'abc123',
          total_count: 1,
        },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // GET /repos/:owner/:repo/branches/:branch/protection - Get branch protection
  http.get<{ owner: string; repo: string; branch: string }>(
    'https://api.github.com/repos/:owner/:repo/branches/:branch/protection',
    () => {
      return HttpResponse.json(
        {
          url: 'https://api.github.com/repos/octocat/Hello-World/branches/main/protection',
          required_status_checks: {
            url: 'https://api.github.com/repos/octocat/Hello-World/branches/main/protection/required_status_checks',
            strict: true,
            contexts: ['ci/build', 'ci/test'],
          },
          enforce_admins: {
            url: 'https://api.github.com/repos/octocat/Hello-World/branches/main/protection/enforce_admins',
            enabled: true,
          },
          required_pull_request_reviews: {
            url: 'https://api.github.com/repos/octocat/Hello-World/branches/main/protection/required_pull_request_reviews',
            dismiss_stale_reviews: true,
            require_code_owner_reviews: true,
            required_approving_review_count: 1,
          },
        },
        { headers: ratelimitHeaders() }
      );
    }
  ),
];
