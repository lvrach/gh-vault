/**
 * Run domain API functions - fetch data from GitHub Actions and return structured types.
 * These functions are presentation-agnostic and can be used by both CLI and MCP.
 */

import { createGitHubClient } from '../../shared/github.js';
import type {
  CancelRunInput,
  DeleteRunInput,
  GetJobLogsInput,
  GetRunInput,
  GetRunJobsInput,
  ListRunsInput,
  RerunFailedJobsInput,
  RerunInput,
  RerunJobInput,
  RunActor,
  RunConclusion,
  RunDetail,
  RunJob,
  RunListItem,
  RunStatus,
  RunStep,
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
 * Validate run status from GitHub API.
 */
function toRunStatus(status: string): RunStatus {
  const validStatuses: RunStatus[] = [
    'queued',
    'completed',
    'in_progress',
    'requested',
    'waiting',
    'pending',
    'action_required',
  ];
  if (validStatuses.includes(status as RunStatus)) {
    return status as RunStatus;
  }
  return 'queued';
}

/**
 * Validate run conclusion from GitHub API.
 */
function toRunConclusion(conclusion: string | null | undefined): RunConclusion {
  if (conclusion === null || conclusion === undefined) {
    return null;
  }
  const validConclusions: NonNullable<RunConclusion>[] = [
    'success',
    'failure',
    'cancelled',
    'neutral',
    'skipped',
    'stale',
    'startup_failure',
    'timed_out',
  ];
  if (validConclusions.includes(conclusion as NonNullable<RunConclusion>)) {
    return conclusion as RunConclusion;
  }
  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function toActor(actor: { login: string; html_url?: string } | null): RunActor | null {
  if (!actor) return null;
  return { login: actor.login, htmlUrl: actor.html_url ?? '' };
}

function mapStep(step: {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at?: string | null | undefined;
  completed_at?: string | null | undefined;
}): RunStep {
  return {
    name: step.name,
    status: toRunStatus(step.status),
    conclusion: toRunConclusion(step.conclusion),
    number: step.number,
    startedAt: step.started_at ?? null,
    completedAt: step.completed_at ?? null,
  };
}

function mapJob(job: {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string | null;
  steps?: {
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
    started_at?: string | null | undefined;
    completed_at?: string | null | undefined;
  }[];
}): RunJob {
  return {
    id: job.id,
    runId: job.run_id,
    name: job.name,
    status: toRunStatus(job.status),
    conclusion: toRunConclusion(job.conclusion),
    startedAt: job.started_at,
    completedAt: job.completed_at,
    htmlUrl: job.html_url ?? '',
    steps: (job.steps ?? []).map((step) => mapStep(step)),
  };
}

interface GitHubWorkflowRun {
  id: number;
  name: string | null;
  display_title: string;
  head_branch: string | null;
  head_sha: string;
  event: string;
  status: string | null;
  conclusion: string | null;
  workflow_id: number;
  run_number: number;
  run_attempt?: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  actor: { login: string; html_url?: string } | null;
}

function mapRun(run: GitHubWorkflowRun, workflowName: string | null = null): RunListItem {
  return {
    id: run.id,
    name: run.name ?? '',
    displayTitle: run.display_title,
    headBranch: run.head_branch ?? '',
    headSha: run.head_sha,
    event: run.event,
    status: toRunStatus(run.status ?? 'queued'),
    conclusion: toRunConclusion(run.conclusion),
    workflowId: run.workflow_id,
    workflowName: workflowName ?? run.name,
    runNumber: run.run_number,
    runAttempt: run.run_attempt ?? 1,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    htmlUrl: run.html_url,
    actor: toActor(run.actor),
  };
}

// ============================================================================
// API Functions
// ============================================================================

// GitHub API status type (superset of our RunStatus)
type GitHubRunStatus =
  | 'completed'
  | 'action_required'
  | 'cancelled'
  | 'failure'
  | 'neutral'
  | 'skipped'
  | 'stale'
  | 'success'
  | 'timed_out'
  | 'in_progress'
  | 'queued'
  | 'requested'
  | 'waiting'
  | 'pending';

/**
 * List workflow runs for a repository with optional filters.
 */
export async function listRuns(input: ListRunsInput): Promise<RunListItem[]> {
  const client = await createGitHubClient();

  const params: {
    owner: string;
    repo: string;
    per_page: number;
    branch?: string;
    status?: GitHubRunStatus;
    event?: string;
    actor?: string;
    head_sha?: string;
    created?: string;
    exclude_pull_requests?: boolean;
    check_suite_id?: number;
  } = {
    owner: input.owner,
    repo: input.repo,
    per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
  };

  if (input.branch) params.branch = input.branch;
  if (input.status) params.status = input.status as GitHubRunStatus;
  if (input.event) params.event = input.event;
  if (input.actor) params.actor = input.actor;
  if (input.headSha) params.head_sha = input.headSha;
  if (input.created) params.created = input.created;
  if (input.excludePullRequests) params.exclude_pull_requests = input.excludePullRequests;
  if (input.checkSuiteId) params.check_suite_id = input.checkSuiteId;

  // If filtering by workflow, use the workflow-specific endpoint
  if (input.workflowId) {
    const { data } = await client.rest.actions.listWorkflowRuns({
      ...params,
      workflow_id: input.workflowId,
    });

    return data.workflow_runs.map((run) => mapRun(run as GitHubWorkflowRun));
  }

  const { data } = await client.rest.actions.listWorkflowRunsForRepo(params);

  return data.workflow_runs.map((run) => mapRun(run as GitHubWorkflowRun));
}

/**
 * Get a specific workflow run.
 */
export async function getRun(input: GetRunInput): Promise<RunListItem> {
  const client = await createGitHubClient();

  if (input.attempt) {
    const { data } = await client.rest.actions.getWorkflowRunAttempt({
      owner: input.owner,
      repo: input.repo,
      run_id: input.runId,
      attempt_number: input.attempt,
    });

    return mapRun(data as GitHubWorkflowRun);
  }

  const { data } = await client.rest.actions.getWorkflowRun({
    owner: input.owner,
    repo: input.repo,
    run_id: input.runId,
  });

  return mapRun(data as GitHubWorkflowRun);
}

/**
 * Get a workflow run with its jobs for detailed view.
 * If an attempt is specified, fetches jobs for that specific attempt.
 */
export async function getRunWithJobs(input: GetRunInput): Promise<RunDetail> {
  const run = await getRun(input);

  // If a specific attempt is requested, use the attempt-specific jobs endpoint
  const jobs = input.attempt
    ? await getRunJobsForAttempt({
        owner: input.owner,
        repo: input.repo,
        runId: input.runId,
        attemptNumber: input.attempt,
      })
    : await getRunJobs({
        owner: input.owner,
        repo: input.repo,
        runId: input.runId,
        filter: 'latest',
      });

  return {
    ...run,
    jobs,
  };
}

/**
 * Get jobs for a workflow run.
 */
export async function getRunJobs(input: GetRunJobsInput): Promise<RunJob[]> {
  const client = await createGitHubClient();

  const { data } = await client.rest.actions.listJobsForWorkflowRun({
    owner: input.owner,
    repo: input.repo,
    run_id: input.runId,
    filter: input.filter ?? 'latest',
    per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
  });

  return data.jobs.map((job) => mapJob(job));
}

/**
 * Get jobs for a specific workflow run attempt.
 * This uses the attempt-specific endpoint to ensure jobs match the requested attempt.
 */
export async function getRunJobsForAttempt(input: {
  owner: string;
  repo: string;
  runId: number;
  attemptNumber: number;
  perPage?: number | undefined;
}): Promise<RunJob[]> {
  const client = await createGitHubClient();

  const { data } = await client.rest.actions.listJobsForWorkflowRunAttempt({
    owner: input.owner,
    repo: input.repo,
    run_id: input.runId,
    attempt_number: input.attemptNumber,
    per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
  });

  return data.jobs.map((job) => mapJob(job));
}

/**
 * Get a specific job by ID.
 */
export async function getJob(input: {
  owner: string;
  repo: string;
  jobId: number;
}): Promise<RunJob> {
  const client = await createGitHubClient();

  const { data } = await client.rest.actions.getJobForWorkflowRun({
    owner: input.owner,
    repo: input.repo,
    job_id: input.jobId,
  });

  return mapJob(data);
}

/**
 * Download logs for a specific job.
 * Returns the plain text logs.
 */
export async function getJobLogs(input: GetJobLogsInput): Promise<string> {
  const client = await createGitHubClient();

  const { data } = await client.rest.actions.downloadJobLogsForWorkflowRun({
    owner: input.owner,
    repo: input.repo,
    job_id: input.jobId,
  });

  // The API returns the log content directly as a string
  return data as string;
}

/**
 * Cancel a workflow run.
 */
export async function cancelRun(input: CancelRunInput): Promise<void> {
  const client = await createGitHubClient();

  await client.rest.actions.cancelWorkflowRun({
    owner: input.owner,
    repo: input.repo,
    run_id: input.runId,
  });
}

/**
 * Rerun an entire workflow run.
 */
export async function rerunRun(input: RerunInput): Promise<void> {
  const client = await createGitHubClient();

  await client.rest.actions.reRunWorkflow({
    owner: input.owner,
    repo: input.repo,
    run_id: input.runId,
    ...(input.enableDebugLogging !== undefined && {
      enable_debug_logging: input.enableDebugLogging,
    }),
  });
}

/**
 * Rerun only the failed jobs in a workflow run.
 */
export async function rerunFailedJobs(input: RerunFailedJobsInput): Promise<void> {
  const client = await createGitHubClient();

  await client.rest.actions.reRunWorkflowFailedJobs({
    owner: input.owner,
    repo: input.repo,
    run_id: input.runId,
    ...(input.enableDebugLogging !== undefined && {
      enable_debug_logging: input.enableDebugLogging,
    }),
  });
}

/**
 * Rerun a specific job.
 */
export async function rerunJob(input: RerunJobInput): Promise<void> {
  const client = await createGitHubClient();

  await client.rest.actions.reRunJobForWorkflowRun({
    owner: input.owner,
    repo: input.repo,
    job_id: input.jobId,
    ...(input.enableDebugLogging !== undefined && {
      enable_debug_logging: input.enableDebugLogging,
    }),
  });
}

/**
 * Delete a workflow run.
 */
export async function deleteRun(input: DeleteRunInput): Promise<void> {
  const client = await createGitHubClient();

  await client.rest.actions.deleteWorkflowRun({
    owner: input.owner,
    repo: input.repo,
    run_id: input.runId,
  });
}

/**
 * Lookup a workflow by name to get its ID.
 */
export async function getWorkflowIdByName(input: {
  owner: string;
  repo: string;
  name: string;
}): Promise<number | null> {
  const client = await createGitHubClient();

  const { data } = await client.rest.actions.listRepoWorkflows({
    owner: input.owner,
    repo: input.repo,
    per_page: 100,
  });

  const workflow = data.workflows.find(
    (w) => w.name.toLowerCase() === input.name.toLowerCase() || w.path.endsWith(`/${input.name}`)
  );

  return workflow?.id ?? null;
}
