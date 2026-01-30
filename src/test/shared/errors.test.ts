/**
 * Error handling utility tests.
 */

import { describe, expect, it } from 'vitest';

import {
  formatPermissionError,
  isPermissionError,
  PERMISSION_MAP,
} from '../../shared/errors.js';

// ============================================================================
// PERMISSION_MAP Tests
// ============================================================================

describe('PERMISSION_MAP', () => {
  const expectedMappings = [
    // PR read operations
    { key: 'pr:list', permission: 'pull_requests:read' },
    { key: 'pr:view', permission: 'pull_requests:read' },
    { key: 'pr:diff', permission: 'pull_requests:read' },
    // PR write operations
    { key: 'pr:create', permission: 'pull_requests:write' },
    { key: 'pr:edit', permission: 'pull_requests:write' },
    { key: 'pr:merge', permission: 'pull_requests:write' },
    { key: 'pr:close', permission: 'pull_requests:write' },
    { key: 'pr:reopen', permission: 'pull_requests:write' },
    { key: 'pr:comment', permission: 'pull_requests:write' },
    { key: 'pr:review', permission: 'pull_requests:write' },
    { key: 'pr:checks', permission: 'checks:read' },
    // Workflow run operations
    { key: 'run:list', permission: 'actions:read' },
    { key: 'run:view', permission: 'actions:read' },
    { key: 'run:cancel', permission: 'actions:write' },
    { key: 'run:rerun', permission: 'actions:write' },
    { key: 'run:delete', permission: 'actions:write' },
    // Branch operations
    { key: 'branch:delete', permission: 'contents:write' },
  ];

  it.each(expectedMappings)('maps $key to $permission', ({ key, permission }) => {
    expect(PERMISSION_MAP.get(key)?.permission).toBe(permission);
  });
});

// ============================================================================
// formatPermissionError Tests
// ============================================================================

describe('formatPermissionError', () => {
  it('includes permission details for known operations', () => {
    const result = formatPermissionError('pr:create');

    expect(result).toContain('Permission denied');
    expect(result).toContain('pull_requests:write');
    expect(result).toContain('github.com/settings/tokens');
  });

  it('provides generic guidance for unknown operations', () => {
    const result = formatPermissionError('unknown:operation');

    expect(result).toContain('Permission denied');
    expect(result).not.toContain('required)');
  });
});

// ============================================================================
// isPermissionError Tests
// ============================================================================

describe('isPermissionError', () => {
  const testCases = [
    { input: Object.assign(new Error('Forbidden'), { status: 403 }), expected: true, desc: '403 error' },
    { input: Object.assign(new Error('Unauthorized'), { status: 401 }), expected: false, desc: '401 error' },
    { input: new Error('Generic'), expected: false, desc: 'error without status' },
    { input: 'string', expected: false, desc: 'string' },
    { input: null, expected: false, desc: 'null' },
  ];

  it.each(testCases)('returns $expected for $desc', ({ input, expected }) => {
    expect(isPermissionError(input)).toBe(expected);
  });
});
