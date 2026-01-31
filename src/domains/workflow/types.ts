/**
 * Workflow domain types - structured data returned by core functions.
 * These types represent the domain model, independent of presentation format.
 */

/**
 * Workflow state as returned by GitHub API.
 */
export type WorkflowState =
  | 'active'
  | 'deleted'
  | 'disabled_fork'
  | 'disabled_inactivity'
  | 'disabled_manually'
  | 'unknown';

/**
 * Workflow as returned by GitHub API.
 */
export interface Workflow {
  id: number;
  nodeId: string;
  name: string;
  path: string; // e.g., ".github/workflows/ci.yml"
  state: WorkflowState;
  createdAt: string;
  updatedAt: string;
  url: string;
  htmlUrl: string;
  badgeUrl: string;
}

/**
 * Input for listing workflows.
 */
export interface WorkflowListInput {
  owner: string;
  repo: string;
  perPage?: number | undefined;
  page?: number | undefined;
}

/**
 * Input for getting a single workflow.
 */
export interface WorkflowGetInput {
  owner: string;
  repo: string;
  workflowId: number | string; // ID or filename
}

/**
 * Input for triggering a workflow dispatch.
 */
export interface WorkflowRunInput {
  owner: string;
  repo: string;
  workflowId: number | string; // ID or filename
  ref: string; // Branch or tag
  inputs?: Record<string, string> | undefined;
}

/**
 * Input for enabling/disabling a workflow.
 */
export interface WorkflowToggleInput {
  owner: string;
  repo: string;
  workflowId: number | string;
}
