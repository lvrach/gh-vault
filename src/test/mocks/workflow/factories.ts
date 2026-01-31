/**
 * Workflow domain mock data factories.
 * These functions create realistic GitHub API responses for testing.
 */

/**
 * Create a mock workflow (for GET /repos/:owner/:repo/actions/workflows/:id).
 */
export function createMockWorkflow(
  id: number,
  name = `Workflow ${String(id)}`,
  path = `.github/workflows/workflow-${String(id)}.yml`,
  state = 'active'
) {
  return {
    id,
    node_id: `MDg6V29ya2Zsb3c${String(id)}`,
    name,
    path,
    state,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    url: `https://api.github.com/repos/octocat/Hello-World/actions/workflows/${String(id)}`,
    html_url: `https://github.com/octocat/Hello-World/actions/workflows/${path.split('/').pop() ?? 'workflow.yml'}`,
    badge_url: `https://github.com/octocat/Hello-World/workflows/${encodeURIComponent(name)}/badge.svg`,
  };
}

/**
 * Create a mock workflow list response.
 */
export function createMockWorkflowListResponse(workflows: ReturnType<typeof createMockWorkflow>[]) {
  return {
    total_count: workflows.length,
    workflows,
  };
}
