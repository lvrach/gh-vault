/**
 * Run domain types - structured data for GitHub Actions workflow runs.
 * These types represent the domain model, independent of presentation format.
 */

// ============================================================================
// Status Types
// ============================================================================

export type RunStatus =
  | 'queued'
  | 'completed'
  | 'in_progress'
  | 'requested'
  | 'waiting'
  | 'pending'
  | 'action_required';

export type RunConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'neutral'
  | 'skipped'
  | 'stale'
  | 'startup_failure'
  | 'timed_out'
  | null;

// ============================================================================
// Core Types
// ============================================================================

export interface RunActor {
  login: string;
  htmlUrl: string;
}

export interface RunStep {
  name: string;
  status: RunStatus;
  conclusion: RunConclusion;
  number: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface RunJob {
  id: number;
  runId: number;
  name: string;
  status: RunStatus;
  conclusion: RunConclusion;
  startedAt: string | null;
  completedAt: string | null;
  htmlUrl: string;
  steps: RunStep[];
}

export interface RunListItem {
  id: number;
  name: string;
  displayTitle: string;
  headBranch: string;
  headSha: string;
  event: string;
  status: RunStatus;
  conclusion: RunConclusion;
  workflowId: number;
  workflowName: string | null;
  runNumber: number;
  runAttempt: number;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  actor: RunActor | null;
}

export interface RunDetail extends RunListItem {
  jobs: RunJob[];
}

// ============================================================================
// Input Types
// ============================================================================

export interface ListRunsInput {
  owner: string;
  repo: string;
  branch?: string | undefined;
  status?: RunStatus | undefined;
  event?: string | undefined;
  actor?: string | undefined;
  workflowId?: number | string | undefined;
  headSha?: string | undefined;
  created?: string | undefined;
  excludePullRequests?: boolean | undefined;
  checkSuiteId?: number | undefined;
  perPage?: number | undefined;
}

export interface GetRunInput {
  owner: string;
  repo: string;
  runId: number;
  attempt?: number | undefined;
}

export interface GetRunJobsInput {
  owner: string;
  repo: string;
  runId: number;
  filter?: 'latest' | 'all' | undefined;
  perPage?: number | undefined;
}

export interface GetJobLogsInput {
  owner: string;
  repo: string;
  jobId: number;
}

export interface CancelRunInput {
  owner: string;
  repo: string;
  runId: number;
}

export interface RerunInput {
  owner: string;
  repo: string;
  runId: number;
  enableDebugLogging?: boolean | undefined;
}

export interface RerunFailedJobsInput {
  owner: string;
  repo: string;
  runId: number;
  enableDebugLogging?: boolean | undefined;
}

export interface RerunJobInput {
  owner: string;
  repo: string;
  jobId: number;
  enableDebugLogging?: boolean | undefined;
}

export interface DeleteRunInput {
  owner: string;
  repo: string;
  runId: number;
}
