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
];
