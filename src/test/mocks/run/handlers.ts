/**
 * Run domain MSW handlers.
 * These mock the GitHub Actions API endpoints for workflow run operations.
 */

import { http, HttpResponse } from 'msw';

import { handleMagicNumber, ratelimitHeaders } from '../shared/helpers.js';
import {
  createMockJob,
  createMockWorkflow,
  createMockWorkflowRun,
  mockJobLogs,
} from './factories.js';

export const runHandlers = [
  // GET /repos/:owner/:repo/actions/runs - List workflow runs
  http.get<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs',
    ({ request }) => {
      const url = new URL(request.url);
      const perPage = Number(url.searchParams.get('per_page') ?? '30');

      // Return 3 runs for testing
      const runs = [
        createMockWorkflowRun(1, 'completed', 'success'),
        createMockWorkflowRun(2, 'completed', 'failure'),
        createMockWorkflowRun(3, 'in_progress', null),
      ];

      return HttpResponse.json(
        { total_count: runs.length, workflow_runs: runs.slice(0, perPage) },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // GET /repos/:owner/:repo/actions/workflows/:workflow_id/runs - List workflow runs for specific workflow
  http.get<{ owner: string; repo: string; workflow_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/workflows/:workflow_id/runs',
    ({ request }) => {
      const url = new URL(request.url);
      const perPage = Number(url.searchParams.get('per_page') ?? '30');

      const runs = [
        createMockWorkflowRun(1, 'completed', 'success'),
        createMockWorkflowRun(2, 'completed', 'failure'),
      ];

      return HttpResponse.json(
        { total_count: runs.length, workflow_runs: runs.slice(0, perPage) },
        { headers: ratelimitHeaders() }
      );
    }
  ),

  // GET /repos/:owner/:repo/actions/runs/:run_id - Get a workflow run
  http.get<{ owner: string; repo: string; run_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs/:run_id',
    ({ params }) => {
      const runId = Number(params.run_id);

      const error = handleMagicNumber(runId);
      if (error) return error;

      return HttpResponse.json(createMockWorkflowRun(runId), {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/actions/runs/:run_id/attempts/:attempt_number - Get workflow run attempt
  http.get<{ owner: string; repo: string; run_id: string; attempt_number: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs/:run_id/attempts/:attempt_number',
    ({ params }) => {
      const runId = Number(params.run_id);
      const attempt = Number(params.attempt_number);

      const error = handleMagicNumber(runId);
      if (error) return error;

      const run = createMockWorkflowRun(runId);
      run.run_attempt = attempt;

      return HttpResponse.json(run, {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/actions/runs/:run_id/jobs - List jobs for a workflow run
  http.get<{ owner: string; repo: string; run_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs/:run_id/jobs',
    ({ params, request }) => {
      const runId = Number(params.run_id);
      const url = new URL(request.url);
      const filter = url.searchParams.get('filter') ?? 'latest';

      const error = handleMagicNumber(runId);
      if (error) return error;

      // Return 2 jobs per run
      const jobs =
        filter === 'all'
          ? [
              createMockJob(runId, 0, 'completed', 'success'),
              createMockJob(runId, 1, 'completed', 'success'),
              createMockJob(runId, 2, 'completed', 'failure'), // Previous attempt
            ]
          : [
              createMockJob(runId, 0, 'completed', 'success'),
              createMockJob(runId, 1, 'completed', 'success'),
            ];

      return HttpResponse.json({ total_count: jobs.length, jobs }, { headers: ratelimitHeaders() });
    }
  ),

  // GET /repos/:owner/:repo/actions/runs/:run_id/attempts/:attempt_number/jobs - List jobs for attempt
  http.get<{ owner: string; repo: string; run_id: string; attempt_number: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs/:run_id/attempts/:attempt_number/jobs',
    ({ params }) => {
      const runId = Number(params.run_id);

      const error = handleMagicNumber(runId);
      if (error) return error;

      const jobs = [
        createMockJob(runId, 0, 'completed', 'success'),
        createMockJob(runId, 1, 'completed', 'success'),
      ];

      return HttpResponse.json({ total_count: jobs.length, jobs }, { headers: ratelimitHeaders() });
    }
  ),

  // GET /repos/:owner/:repo/actions/jobs/:job_id - Get a specific job
  http.get<{ owner: string; repo: string; job_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/jobs/:job_id',
    ({ params }) => {
      const jobId = Number(params.job_id);

      const error = handleMagicNumber(jobId);
      if (error) return error;

      // Reverse the deterministic ID to get runId
      const runId = Math.floor(jobId / 1000);
      const jobIndex = jobId % 1000;

      return HttpResponse.json(createMockJob(runId, jobIndex), {
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/actions/jobs/:job_id/logs - Download job logs (plain text)
  http.get<{ owner: string; repo: string; job_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/jobs/:job_id/logs',
    ({ params }) => {
      const jobId = Number(params.job_id);

      const error = handleMagicNumber(jobId);
      if (error) return error;

      // Return plain text logs
      return new Response(mockJobLogs, {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          ...ratelimitHeaders(),
        },
      });
    }
  ),

  // POST /repos/:owner/:repo/actions/runs/:run_id/cancel - Cancel a workflow run
  http.post<{ owner: string; repo: string; run_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs/:run_id/cancel',
    ({ params }) => {
      const runId = Number(params.run_id);

      const error = handleMagicNumber(runId);
      if (error) return error;

      return new Response(null, {
        status: 202,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // POST /repos/:owner/:repo/actions/runs/:run_id/rerun - Rerun a workflow
  http.post<{ owner: string; repo: string; run_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs/:run_id/rerun',
    ({ params }) => {
      const runId = Number(params.run_id);

      const error = handleMagicNumber(runId);
      if (error) return error;

      return new Response(null, {
        status: 201,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // POST /repos/:owner/:repo/actions/runs/:run_id/rerun-failed-jobs - Rerun failed jobs
  http.post<{ owner: string; repo: string; run_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs/:run_id/rerun-failed-jobs',
    ({ params }) => {
      const runId = Number(params.run_id);

      const error = handleMagicNumber(runId);
      if (error) return error;

      return new Response(null, {
        status: 201,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // POST /repos/:owner/:repo/actions/jobs/:job_id/rerun - Rerun a specific job
  http.post<{ owner: string; repo: string; job_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/jobs/:job_id/rerun',
    ({ params }) => {
      const jobId = Number(params.job_id);

      const error = handleMagicNumber(jobId);
      if (error) return error;

      return new Response(null, {
        status: 201,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // DELETE /repos/:owner/:repo/actions/runs/:run_id - Delete a workflow run
  http.delete<{ owner: string; repo: string; run_id: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/runs/:run_id',
    ({ params }) => {
      const runId = Number(params.run_id);

      const error = handleMagicNumber(runId);
      if (error) return error;

      return new Response(null, {
        status: 204,
        headers: ratelimitHeaders(),
      });
    }
  ),

  // GET /repos/:owner/:repo/actions/workflows - List workflows
  http.get<{ owner: string; repo: string }>(
    'https://api.github.com/repos/:owner/:repo/actions/workflows',
    () => {
      const workflows = [
        createMockWorkflow(1, 'CI'),
        createMockWorkflow(2, 'Release'),
        createMockWorkflow(3, 'Deploy'),
      ];

      return HttpResponse.json(
        { total_count: workflows.length, workflows },
        { headers: ratelimitHeaders() }
      );
    }
  ),
];
