/**
 * Workflow domain API class - fetch data from GitHub Actions and return structured types.
 * These methods are presentation-agnostic and can be used by both CLI and MCP.
 */

import type { Octokit } from '../../shared/github.js';
import type {
  Workflow,
  WorkflowGetInput,
  WorkflowListInput,
  WorkflowRunInput,
  WorkflowState,
  WorkflowToggleInput,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

/** Default number of items per page for paginated API calls */
const DEFAULT_PAGE_SIZE = 50;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Validate workflow state from GitHub API.
 */
function toWorkflowState(state: string): WorkflowState {
  const validStates: WorkflowState[] = [
    'active',
    'deleted',
    'disabled_fork',
    'disabled_inactivity',
    'disabled_manually',
  ];
  if (validStates.includes(state as WorkflowState)) {
    return state as WorkflowState;
  }
  return 'unknown';
}

// ============================================================================
// Helper Functions
// ============================================================================

interface GitHubWorkflow {
  id: number;
  node_id: string;
  name: string;
  path: string;
  state: string;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  badge_url: string;
}

function mapWorkflow(workflow: GitHubWorkflow): Workflow {
  return {
    id: workflow.id,
    nodeId: workflow.node_id,
    name: workflow.name,
    path: workflow.path,
    state: toWorkflowState(workflow.state),
    createdAt: workflow.created_at,
    updatedAt: workflow.updated_at,
    url: workflow.url,
    htmlUrl: workflow.html_url,
    badgeUrl: workflow.badge_url,
  };
}

// ============================================================================
// WorkflowApi Class
// ============================================================================

/**
 * Workflow domain API with constructor-injected Octokit client.
 * All methods use the injected client for GitHub API calls.
 */
export class WorkflowApi {
  constructor(private readonly client: Octokit) {}

  /**
   * List workflows for a repository.
   */
  async listWorkflows(input: WorkflowListInput): Promise<Workflow[]> {
    const { data } = await this.client.rest.actions.listRepoWorkflows({
      owner: input.owner,
      repo: input.repo,
      per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
      page: input.page ?? 1,
    });

    return data.workflows.map((w) => mapWorkflow(w as GitHubWorkflow));
  }

  /**
   * Get a specific workflow by ID or filename.
   */
  async getWorkflow(input: WorkflowGetInput): Promise<Workflow> {
    const { data } = await this.client.rest.actions.getWorkflow({
      owner: input.owner,
      repo: input.repo,
      workflow_id: input.workflowId,
    });

    return mapWorkflow(data as GitHubWorkflow);
  }

  /**
   * Trigger a workflow dispatch event.
   */
  async runWorkflow(input: WorkflowRunInput): Promise<void> {
    await this.client.rest.actions.createWorkflowDispatch({
      owner: input.owner,
      repo: input.repo,
      workflow_id: input.workflowId,
      ref: input.ref,
      ...(input.inputs && { inputs: input.inputs }),
    });
  }

  /**
   * Enable a workflow.
   */
  async enableWorkflow(input: WorkflowToggleInput): Promise<void> {
    await this.client.rest.actions.enableWorkflow({
      owner: input.owner,
      repo: input.repo,
      workflow_id: input.workflowId,
    });
  }

  /**
   * Disable a workflow.
   */
  async disableWorkflow(input: WorkflowToggleInput): Promise<void> {
    await this.client.rest.actions.disableWorkflow({
      owner: input.owner,
      repo: input.repo,
      workflow_id: input.workflowId,
    });
  }

  /**
   * Get workflow YAML content by fetching the file from the repository.
   */
  async getWorkflowYaml(input: WorkflowGetInput & { ref?: string }): Promise<string> {
    const workflow = await this.getWorkflow(input);

    const { data } = await this.client.rest.repos.getContent({
      owner: input.owner,
      repo: input.repo,
      path: workflow.path,
      ...(input.ref && { ref: input.ref }),
    });

    // The content is base64 encoded when fetching a file
    if ('content' in data && typeof data.content === 'string') {
      return Buffer.from(data.content, 'base64').toString('utf8');
    }

    throw new Error('Could not retrieve workflow file content');
  }

  /**
   * Find a workflow by name or filename.
   * Returns null if not found.
   */
  async findWorkflow(input: {
    owner: string;
    repo: string;
    identifier: string;
  }): Promise<Workflow | null> {
    // First, try to get by ID or filename directly
    try {
      return await this.getWorkflow({
        owner: input.owner,
        repo: input.repo,
        workflowId: input.identifier,
      });
    } catch {
      // If not found, search by name
    }

    // Search by name in the list
    const workflows = await this.listWorkflows({
      owner: input.owner,
      repo: input.repo,
      perPage: 100,
    });

    const workflow = workflows.find(
      (w) =>
        w.name.toLowerCase() === input.identifier.toLowerCase() ||
        w.path.endsWith(`/${input.identifier}`) ||
        w.path === input.identifier
    );

    return workflow ?? null;
  }
}
