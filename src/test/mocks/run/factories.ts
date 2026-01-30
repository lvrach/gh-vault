/**
 * Run domain mock data factories.
 * These functions create realistic GitHub Actions API responses for testing.
 */

import { mockUser } from '../shared/data.js';

/**
 * Create a mock workflow step.
 * Steps show individual stages within a job.
 */
export function createMockStep(stepNumber: number, status = 'completed', conclusion = 'success') {
  return {
    name: stepNumber === 1 ? 'Set up job' : `Step ${String(stepNumber)}`,
    status,
    conclusion,
    number: stepNumber,
    started_at: '2024-01-15T10:00:00Z',
    completed_at: status === 'completed' ? '2024-01-15T10:01:00Z' : null,
  };
}

/**
 * Create a mock workflow job.
 * Jobs contain steps and run within a workflow.
 *
 * Job ID pattern: runId * 1000 + index (deterministic for data consistency)
 */
export function createMockJob(
  runId: number,
  jobIndex = 0,
  status = 'completed',
  conclusion = 'success'
) {
  const jobId = runId * 1000 + jobIndex;
  return {
    id: jobId,
    run_id: runId,
    run_url: `https://api.github.com/repos/octocat/Hello-World/actions/runs/${String(runId)}`,
    node_id: 'MDg6Q2hlY2tSdW4xNQ==',
    head_sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    url: `https://api.github.com/repos/octocat/Hello-World/actions/jobs/${String(jobId)}`,
    html_url: `https://github.com/octocat/Hello-World/actions/runs/${String(runId)}/jobs/${String(jobId)}`,
    status,
    conclusion,
    started_at: '2024-01-15T10:00:00Z',
    completed_at: status === 'completed' ? '2024-01-15T10:05:00Z' : null,
    name: jobIndex === 0 ? 'build' : `job-${String(jobIndex)}`,
    steps: [
      createMockStep(1, status, conclusion),
      createMockStep(2, status, conclusion),
      createMockStep(3, status, conclusion),
    ],
    check_run_url: `https://api.github.com/repos/octocat/Hello-World/check-runs/${String(jobId)}`,
    labels: ['ubuntu-latest'],
    runner_id: 1,
    runner_name: 'GitHub Actions',
    runner_group_id: 1,
    runner_group_name: 'Default',
    workflow_name: 'CI',
  };
}

/**
 * Create a mock workflow run.
 * Runs represent a complete workflow execution.
 */
export function createMockWorkflowRun(
  runId: number,
  status = 'completed',
  conclusion: string | null = 'success'
) {
  return {
    id: runId,
    name: 'CI',
    node_id: 'MDEwOldvcmtmbG93UnVuMQ==',
    head_branch: 'main',
    head_sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    path: '.github/workflows/ci.yml',
    display_title: 'CI Pipeline',
    run_number: runId,
    event: 'push',
    status,
    conclusion,
    workflow_id: 1,
    check_suite_id: 1,
    check_suite_node_id: 'MDEwOkNoZWNrU3VpdGUx',
    url: `https://api.github.com/repos/octocat/Hello-World/actions/runs/${String(runId)}`,
    html_url: `https://github.com/octocat/Hello-World/actions/runs/${String(runId)}`,
    pull_requests: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:05:00Z',
    actor: mockUser,
    run_attempt: 1,
    referenced_workflows: [],
    run_started_at: '2024-01-15T10:00:00Z',
    triggering_actor: mockUser,
    jobs_url: `https://api.github.com/repos/octocat/Hello-World/actions/runs/${String(runId)}/jobs`,
    logs_url: `https://api.github.com/repos/octocat/Hello-World/actions/runs/${String(runId)}/logs`,
    check_suite_url: 'https://api.github.com/repos/octocat/Hello-World/check-suites/1',
    artifacts_url: `https://api.github.com/repos/octocat/Hello-World/actions/runs/${String(runId)}/artifacts`,
    cancel_url: `https://api.github.com/repos/octocat/Hello-World/actions/runs/${String(runId)}/cancel`,
    rerun_url: `https://api.github.com/repos/octocat/Hello-World/actions/runs/${String(runId)}/rerun`,
    previous_attempt_url: null,
    workflow_url: 'https://api.github.com/repos/octocat/Hello-World/actions/workflows/1',
    repository: {
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
    },
    head_repository: {
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
    },
    head_commit: {
      id: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      tree_id: '9c48853fa3dc5c1c3d6f1f1cd1f2743e72652840',
      message: 'Add new feature',
      timestamp: '2024-01-15T09:58:00Z',
      author: {
        name: 'The Octocat',
        email: 'octocat@github.com',
      },
      committer: {
        name: 'The Octocat',
        email: 'octocat@github.com',
      },
    },
  };
}

/**
 * Create a mock workflow (for workflow listing).
 */
export function createMockWorkflow(workflowId: number, name = 'CI') {
  return {
    id: workflowId,
    node_id: 'MDg6V29ya2Zsb3cx',
    name,
    path: `.github/workflows/${name.toLowerCase()}.yml`,
    state: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    url: `https://api.github.com/repos/octocat/Hello-World/actions/workflows/${String(workflowId)}`,
    html_url: `https://github.com/octocat/Hello-World/actions/workflows/${name.toLowerCase()}.yml`,
    badge_url: `https://github.com/octocat/Hello-World/workflows/${name}/badge.svg`,
  };
}

/**
 * Sample job log content (plain text).
 * GitHub Actions logs use ANSI groups and checkmarks.
 */
export const mockJobLogs = `2024-01-15T10:00:00.0000000Z ##[group]Set up job
2024-01-15T10:00:01.0000000Z Current runner version: '2.300.0'
2024-01-15T10:00:02.0000000Z ##[endgroup]
2024-01-15T10:00:03.0000000Z ##[group]Run actions/checkout@v4
2024-01-15T10:00:04.0000000Z Syncing repository: octocat/Hello-World
2024-01-15T10:00:05.0000000Z ##[endgroup]
2024-01-15T10:00:06.0000000Z ##[group]Run npm install
2024-01-15T10:00:07.0000000Z added 500 packages in 30s
2024-01-15T10:00:08.0000000Z ##[endgroup]
2024-01-15T10:00:09.0000000Z ##[group]Run npm test
2024-01-15T10:00:10.0000000Z All tests passed!
2024-01-15T10:00:11.0000000Z ##[endgroup]
`;
