/**
 * Search domain MSW handlers.
 * These mock the GitHub Search API endpoints.
 *
 * Note: Search API has stricter rate limits (30 requests/minute).
 * All search endpoints return { total_count, incomplete_results, items }.
 */

import { http, HttpResponse } from 'msw';

import { searchRatelimitHeaders } from '../shared/helpers.js';
import {
  createMockSearchCode,
  createMockSearchCommit,
  createMockSearchIssue,
  createMockSearchRepo,
} from './factories.js';

export const searchHandlers = [
  // GET /search/repositories - Search repositories
  http.get('https://api.github.com/search/repositories', ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get('per_page') ?? '30');

    // Return 3 repos for testing
    const repos = [
      createMockSearchRepo(1, 'typescript-project'),
      createMockSearchRepo(2, 'react-components'),
      createMockSearchRepo(3, 'node-api'),
    ];

    return HttpResponse.json(
      {
        total_count: repos.length,
        incomplete_results: false,
        items: repos.slice(0, perPage),
      },
      { headers: searchRatelimitHeaders() }
    );
  }),

  // GET /search/issues - Search issues and pull requests
  // Both issues and PRs use this endpoint. type:pr or type:issue qualifiers filter results.
  http.get('https://api.github.com/search/issues', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') ?? '';
    const perPage = Number(url.searchParams.get('per_page') ?? '30');

    // Determine if searching for PRs based on query
    const isPrSearch = query.includes('type:pr');
    const isIssueSearch = query.includes('type:issue') || !query.includes('type:');

    let items: ReturnType<typeof createMockSearchIssue>[] = [];

    if (isPrSearch) {
      // Return PRs
      items = [
        createMockSearchIssue(1, true),
        createMockSearchIssue(2, true),
        createMockSearchIssue(3, true),
      ];
    } else if (isIssueSearch) {
      // Return issues
      items = [
        createMockSearchIssue(10, false),
        createMockSearchIssue(11, false),
        createMockSearchIssue(12, false),
      ];
    }

    return HttpResponse.json(
      {
        total_count: items.length,
        incomplete_results: false,
        items: items.slice(0, perPage),
      },
      { headers: searchRatelimitHeaders() }
    );
  }),

  // GET /search/commits - Search commits
  http.get('https://api.github.com/search/commits', ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get('per_page') ?? '30');

    const commits = [
      createMockSearchCommit('6dcb09b5b57875f334f61aebed695e2e4193db5e'),
      createMockSearchCommit('9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840'),
      createMockSearchCommit('e3443e7bd4e00c2aab3a9f3e4c3e6d0e5e6f7g8h'),
    ];

    return HttpResponse.json(
      {
        total_count: commits.length,
        incomplete_results: false,
        items: commits.slice(0, perPage),
      },
      { headers: searchRatelimitHeaders() }
    );
  }),

  // GET /search/code - Search code
  http.get('https://api.github.com/search/code', ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get('per_page') ?? '30');

    const codeResults = [
      createMockSearchCode('auth.ts', 'src/auth.ts'),
      createMockSearchCode('user.ts', 'src/models/user.ts'),
      createMockSearchCode('config.ts', 'src/config.ts'),
    ];

    return HttpResponse.json(
      {
        total_count: codeResults.length,
        incomplete_results: false,
        items: codeResults.slice(0, perPage),
      },
      { headers: searchRatelimitHeaders() }
    );
  }),
];
