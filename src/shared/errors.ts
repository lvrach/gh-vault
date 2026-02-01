/**
 * Error handling utilities for GitHub API responses.
 *
 * Provides user-friendly error messages with actionable guidance
 * when operations fail due to missing permissions or authentication.
 */

// ============================================================================
// Domain-Specific Error Types
// ============================================================================

/**
 * Thrown when no GitHub token is configured.
 */
export class AuthenticationError extends Error {
  constructor(message = 'GitHub token not configured.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when token format is invalid (not recognized as GitHub token).
 */
export class InvalidTokenFormatError extends Error {
  constructor(
    message = 'Invalid token format. Expected: github_pat_... (fine-grained personal access token)'
  ) {
    super(message);
    this.name = 'InvalidTokenFormatError';
  }
}

/**
 * Thrown when a classic token (ghp_*) is used instead of fine-grained.
 */
export class ClassicTokenError extends Error {
  constructor(message = 'Classic personal access tokens (ghp_*) are not supported.') {
    super(message);
    this.name = 'ClassicTokenError';
  }
}

/**
 * Thrown when user attempts to display token (security: disabled by design).
 */
export class TokenDisplayDisabledError extends Error {
  constructor(message = 'Token display is disabled for security.') {
    super(message);
    this.name = 'TokenDisplayDisabledError';
  }
}

/**
 * Permission error details for 403 responses.
 */
export interface PermissionInfo {
  /** Permission needed (e.g., 'pull_requests:write') */
  permission: string;
  /** Human-readable permission label (e.g., 'Pull requests → Read and write') */
  permissionLabel: string;
}

/**
 * Map of API operations to required permissions.
 *
 * Used to provide helpful error messages when operations fail with 403.
 */
export const PERMISSION_MAP = new Map<string, PermissionInfo>([
  // Pull request operations
  ['pr:list', { permission: 'pull_requests:read', permissionLabel: 'Pull requests → Read' }],
  ['pr:view', { permission: 'pull_requests:read', permissionLabel: 'Pull requests → Read' }],
  ['pr:diff', { permission: 'pull_requests:read', permissionLabel: 'Pull requests → Read' }],
  [
    'pr:create',
    { permission: 'pull_requests:write', permissionLabel: 'Pull requests → Read and write' },
  ],
  [
    'pr:edit',
    { permission: 'pull_requests:write', permissionLabel: 'Pull requests → Read and write' },
  ],
  [
    'pr:merge',
    { permission: 'pull_requests:write', permissionLabel: 'Pull requests → Read and write' },
  ],
  [
    'pr:close',
    { permission: 'pull_requests:write', permissionLabel: 'Pull requests → Read and write' },
  ],
  [
    'pr:reopen',
    { permission: 'pull_requests:write', permissionLabel: 'Pull requests → Read and write' },
  ],
  [
    'pr:comment',
    { permission: 'pull_requests:write', permissionLabel: 'Pull requests → Read and write' },
  ],
  [
    'pr:review',
    { permission: 'pull_requests:write', permissionLabel: 'Pull requests → Read and write' },
  ],
  ['pr:checks', { permission: 'checks:read', permissionLabel: 'Checks → Read' }],

  // Workflow run operations
  ['run:list', { permission: 'actions:read', permissionLabel: 'Actions → Read' }],
  ['run:view', { permission: 'actions:read', permissionLabel: 'Actions → Read' }],
  ['run:cancel', { permission: 'actions:write', permissionLabel: 'Actions → Read and write' }],
  ['run:rerun', { permission: 'actions:write', permissionLabel: 'Actions → Read and write' }],
  ['run:delete', { permission: 'actions:write', permissionLabel: 'Actions → Read and write' }],

  // Branch operations
  ['branch:delete', { permission: 'contents:write', permissionLabel: 'Contents → Read and write' }],
]);

/**
 * Format a 403 permission error with actionable guidance.
 *
 * @param operation - The operation that failed (e.g., 'pr:create')
 * @returns Formatted error message with instructions
 */
export function formatPermissionError(operation: string): string {
  const permissionInfo = PERMISSION_MAP.get(operation);

  if (!permissionInfo) {
    // Unknown operation - provide generic guidance
    return `Error: Permission denied.

Your token lacks the required permission for this operation.

To fix:
1. Go to: https://github.com/settings/tokens
2. Edit your fine-grained token
3. Enable the required permission
4. Save and re-authenticate: gh-vault auth login`;
  }

  return `Error: Permission denied (${permissionInfo.permission} required)

Your token lacks the required permission for this operation.

To fix:
1. Go to: https://github.com/settings/tokens
2. Edit your fine-grained token
3. Enable: ${permissionInfo.permissionLabel}
4. Save and re-authenticate: gh-vault auth login`;
}

/**
 * Check if an error is a 403 permission error.
 */
export function isPermissionError(error: unknown): boolean {
  if (error instanceof Error) {
    // Octokit throws HttpError with status property
    const httpError = error as Error & { status?: number };
    return httpError.status === 403;
  }
  return false;
}
