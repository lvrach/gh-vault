/**
 * Workflow domain MSW handlers.
 * These mock the GitHub API endpoints for workflow operations.
 */

import { http, HttpResponse } from 'msw';

import { handleMagicNumber, ratelimitHeaders } from '../shared/helpers.js';
import { createMockWorkflow, createMockWorkflowListResponse } from './factories.js';

export const workflowHandlers = [
  // GET /repos/:owner/:repo/actions/workflows - List workflows
  http.get<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/workflows',
    () => {
      const workflows = [
        createMockWorkflow(1, 'CI', '.github/workflows/ci.yml', 'active'),
        createMockWorkflow(2, 'Release', '.github/workflows/release.yml', 'active'),
        createMockWorkflow(3, 'CodeQL', '.github/workflows/codeql.yml', 'disabled_manually'),
      ];

      return HttpResponse.json(createMockWorkflowListResponse(workflows), {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/actions/workflows/:workflow_id - Get a workflow
  http.get<{ owner: string; repo: string; workflow_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/workflows/:workflow_id',
    ({ params }) => {
      const workflowId = params.workflow_id;

      // Handle numeric IDs with magic number convention
      const numericId = Number(workflowId);
      if (!Number.isNaN(numericId)) {
        const error = handleMagicNumber(numericId);
        if (error) return error;
      }

      // Handle filename lookups
      if (workflowId.endsWith('.yml') || workflowId.endsWith('.yaml')) {
        return HttpResponse.json(
          createMockWorkflow(1, 'CI', `.github/workflows/${workflowId}`, 'active'),
          { headers: ratelimitHeaders() }
        );
      }

      return HttpResponse.json(
        createMockWorkflow(
          Number.isNaN(numericId) || numericId === 0 ? 1 : numericId,
          'CI',
          '.github/workflows/ci.yml',
          'active'
        ),
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // POST /repos/:owner/:repo/actions/workflows/:workflow_id/dispatches - Trigger workflow
  http.post<{ owner: string; repo: string; workflow_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/workflows/:workflow_id/dispatches',
    ({ params }) => {
      const workflowId = params.workflow_id;

      // Handle numeric IDs with magic number convention
      const numericId = Number(workflowId);
      if (!Number.isNaN(numericId)) {
        const error = handleMagicNumber(numericId);
        if (error) return error;
      }

      // Successful dispatch returns 204 No Content
      return new Response(null, {
        status: 204,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // PUT /repos/:owner/:repo/actions/workflows/:workflow_id/enable - Enable workflow
  http.put<{ owner: string; repo: string; workflow_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/workflows/:workflow_id/enable',
    ({ params }) => {
      const workflowId = params.workflow_id;

      // Handle numeric IDs with magic number convention
      const numericId = Number(workflowId);
      if (!Number.isNaN(numericId)) {
        const error = handleMagicNumber(numericId);
        if (error) return error;
      }

      // Successful enable returns 204 No Content
      return new Response(null, {
        status: 204,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // PUT /repos/:owner/:repo/actions/workflows/:workflow_id/disable - Disable workflow
  http.put<{ owner: string; repo: string; workflow_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/workflows/:workflow_id/disable',
    ({ params }) => {
      const workflowId = params.workflow_id;

      // Handle numeric IDs with magic number convention
      const numericId = Number(workflowId);
      if (!Number.isNaN(numericId)) {
        const error = handleMagicNumber(numericId);
        if (error) return error;
      }

      // Successful disable returns 204 No Content
      return new Response(null, {
        status: 204,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/contents/:path - Get workflow file content (for --yaml)
  // Note: Octokit URL-encodes the path, so we match with a wildcard
  http.get<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/contents/*',
    ({ request, params }) => {
      const url = new URL(request.url);
      // Extract the path after /contents/
      const fullPath = decodeURIComponent(url.pathname.split('/contents/')[1] ?? '');

      // Only handle workflow file requests
      if (!fullPath.startsWith('.github/workflows/')) {
        return new Response(null, { status: 404 });
      }

      const filename = fullPath.split('/').pop() ?? 'ci.yml';

      // Mock YAML content
      const yamlContent = `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm run build
`;

      // GitHub returns base64-encoded content
      const base64Content = Buffer.from(yamlContent).toString('base64');

      return HttpResponse.json(
        {
          name: filename,
          path: fullPath,
          sha: 'abc123',
          size: yamlContent.length,
          url: `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${fullPath}`,
          html_url: `https://github.com/${params.owner}/${params.repo}/blob/main/${fullPath}`,
          git_url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/blobs/abc123`,
          download_url: `https://raw.githubusercontent.com/${params.owner}/${params.repo}/main/${fullPath}`,
          type: 'file',
          content: base64Content,
          encoding: 'base64',
        },
        { headers: ratelimitHeaders() }
      );
    }
  ),
];
