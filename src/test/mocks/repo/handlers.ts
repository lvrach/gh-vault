/**
 * Repo domain MSW handlers.
 * These mock the GitHub API endpoints for repository operations.
 */

import { http, HttpResponse } from 'msw';

import { ratelimitHeaders } from '../shared/helpers.js';
import { createMockRepository, createMockRepositoryListItem } from './factories.js';

export const repoHandlers = [
  // GET /repos/:owner/:repo - Get a repository
  http.get<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo',
    ({ params }) => {
      // Handle magic number errors via repo name
      if (params.repo === '404') {
        return HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }
      if (params.repo === '403') {
        return HttpResponse.json(
          { message: 'Forbidden' },
          { status: 403, headers: ratelimitHeaders() }
        );
      }

      return HttpResponse.json(createMockRepository(params.repo, params.owner), {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /user/repos - List authenticated user's repositories
  http.get('https://api.github.com/user/repos', ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get('per_page') ?? '30');

    const repos = [
      createMockRepositoryListItem('repo-one', 'octocat'),
      createMockRepositoryListItem('repo-two', 'octocat'),
      createMockRepositoryListItem('private-repo', 'octocat', { private: true }),
      createMockRepositoryListItem('fork-repo', 'octocat', { fork: true }),
      createMockRepositoryListItem('archived-repo', 'octocat', { archived: true }),
    ];

    return HttpResponse.json(repos.slice(0, perPage), {
      headers: ratelimitHeaders(),
    });
  }),

  // GET /users/:username/repos - List user's repositories
  http.get<{ username: string }>(
    'https://api.github.com/users/:username/repos',
    ({ params, request }) => {
      const url = new URL(request.url);
      const perPage = Number(url.searchParams.get('per_page') ?? '30');

      const repos = [
        createMockRepositoryListItem('repo-one', params.username),
        createMockRepositoryListItem('repo-two', params.username),
      ];

      return HttpResponse.json(repos.slice(0, perPage), {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /orgs/:org/repos - List organization's repositories
  http.get<{ org: string }>('https://api.github.com/orgs/:org/repos', ({ params, request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get('per_page') ?? '30');

    const repos = [
      createMockRepositoryListItem('org-repo-one', params.org),
      createMockRepositoryListItem('org-repo-two', params.org),
    ];

    return HttpResponse.json(repos.slice(0, perPage), {
      headers: ratelimitHeaders(),
    });
  }),

  // POST /user/repos - Create a repository for authenticated user
  http.post('https://api.github.com/user/repos', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      private?: boolean;
      auto_init?: boolean;
    };

    const repo = createMockRepository(body.name, 'octocat', {
      ...(body.private !== undefined && { private: body.private }),
      ...(body.description && { description: body.description }),
    });

    return HttpResponse.json(repo, {
      status: 201,
      headers: ratelimitHeaders(),
    });
  }),

  // POST /orgs/:org/repos - Create a repository in an organization
  http.post<{ org: string }>('https://api.github.com/orgs/:org/repos', async ({ params, request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      private?: boolean;
    };

    const repo = createMockRepository(body.name, params.org, {
      ...(body.private !== undefined && { private: body.private }),
      ...(body.description && { description: body.description }),
    });

    return HttpResponse.json(repo, {
      status: 201,
      headers: ratelimitHeaders(),
    });
  }),

  // POST /repos/:owner/:repo/forks - Fork a repository
  http.post<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/forks',
    async ({ params, request }) => {
      // Handle empty or missing body gracefully
      let body: {
        organization?: string;
        name?: string;
        default_branch_only?: boolean;
      } = {};
      try {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text) as typeof body;
        }
      } catch {
        // Empty body is fine
      }

      const forkOwner = body.organization ?? 'octocat';
      const forkName = body.name ?? params.repo;

      const fork = {
        ...createMockRepository(forkName, forkOwner, { fork: true }),
        parent: createMockRepository(params.repo, params.owner),
        source: createMockRepository(params.repo, params.owner),
      };

      return HttpResponse.json(fork, {
        status: 202,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // PATCH /repos/:owner/:repo - Update a repository
  http.patch<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        name?: string;
        description?: string;
        private?: boolean;
        visibility?: string;
        archived?: boolean;
        default_branch?: string;
      };

      // Determine private flag from visibility if provided
      let isPrivate = body.private;
      if (body.visibility !== undefined) {
        isPrivate = body.visibility === 'private';
      }

      const repo = {
        ...createMockRepository(body.name ?? params.repo, params.owner),
        ...(body.description !== undefined && { description: body.description }),
        ...(isPrivate !== undefined && { private: isPrivate }),
        ...(body.archived !== undefined && { archived: body.archived }),
        ...(body.default_branch && { default_branch: body.default_branch, defaultBranch: body.default_branch }),
      };

      return HttpResponse.json(repo, {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // DELETE /repos/:owner/:repo - Delete a repository
  http.delete<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo',
    ({ params }) => {
      // Handle magic number errors via repo name
      if (params.repo === '404') {
        return HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: ratelimitHeaders() }
        );
      }
      if (params.repo === '403') {
        return HttpResponse.json(
          { message: 'Forbidden' },
          { status: 403, headers: ratelimitHeaders() }
        );
      }

      return new Response(null, {
        status: 204,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/readme - Get README
  http.get<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/readme',
    ({ params }) => {
      const readmeContent = `# ${params.repo}

Welcome to ${params.owner}/${params.repo}!

## Installation

\`\`\`bash
npm install ${params.repo}
\`\`\`

## Usage

See documentation for more details.
`;

      const base64Content = Buffer.from(readmeContent).toString('base64');

      return HttpResponse.json(
        {
          name: 'README.md',
          path: 'README.md',
          sha: 'readme123',
          size: readmeContent.length,
          url: `https://api.github.com/repos/${params.owner}/${params.repo}/contents/README.md`,
          html_url: `https://github.com/${params.owner}/${params.repo}/blob/main/README.md`,
          git_url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/blobs/readme123`,
          download_url: `https://raw.githubusercontent.com/${params.owner}/${params.repo}/main/README.md`,
          type: 'file',
          content: base64Content,
          encoding: 'base64',
        },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // GET /repos/:owner/:repo/topics - Get repository topics
  http.get<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/topics',
    () => {
      return HttpResponse.json(
        { names: ['api', 'testing', 'cli'] },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // PUT /repos/:owner/:repo/topics - Replace repository topics
  http.put<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/topics',
    async ({ request }) => {
      const body = (await request.json()) as { names: string[] };

      return HttpResponse.json(
        { names: body.names },
        { headers: ratelimitHeaders() }
      );
    }
  ),
];
