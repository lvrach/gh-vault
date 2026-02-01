/**
 * Run domain JSON formatters unit tests.
 *
 * Tests pure functions that transform workflow run types to JSON output.
 */

import { describe, expect, it } from 'vitest';

import {
  formatJobViewJson,
  formatRunListJson,
  formatRunViewJson,
  jobToJson,
  runDetailToJson,
  runListItemToJson,
} from '../../../../domains/run/formatters/json.js';
import type { RunDetail, RunJob, RunListItem, RunStep } from '../../../../domains/run/types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestRunStep(overrides: Partial<RunStep> = {}): RunStep {
  return {
    name: 'Build',
    status: 'completed',
    conclusion: 'success',
    number: 1,
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:01:00Z',
    ...overrides,
  };
}

function createTestRunJob(overrides: Partial<RunJob> = {}): RunJob {
  return {
    id: 1000,
    runId: 1,
    name: 'build',
    status: 'completed',
    conclusion: 'success',
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:05:00Z',
    htmlUrl: 'https://github.com/octocat/Hello-World/actions/runs/1/jobs/1000',
    steps: [
      createTestRunStep({ number: 1, name: 'Set up job' }),
      createTestRunStep({ number: 2, name: 'Build' }),
    ],
    ...overrides,
  };
}

function createTestRunListItem(overrides: Partial<RunListItem> = {}): RunListItem {
  return {
    id: 1,
    name: 'CI',
    displayTitle: 'CI Pipeline',
    headBranch: 'main',
    headSha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
    workflowId: 100,
    workflowName: 'CI',
    runNumber: 42,
    runAttempt: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:05:00Z',
    htmlUrl: 'https://github.com/octocat/Hello-World/actions/runs/1',
    actor: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    ...overrides,
  };
}

function createTestRunDetail(overrides: Partial<RunDetail> = {}): RunDetail {
  return {
    ...createTestRunListItem(),
    jobs: [createTestRunJob()],
    ...overrides,
  };
}

// ============================================================================
// jobToJson Tests
// ============================================================================

describe('jobToJson', () => {
  it('converts job to JSON format with all fields', () => {
    const job = createTestRunJob();
    const result = jobToJson(job);

    expect(result).toEqual({
      databaseId: 1000,
      name: 'build',
      status: 'completed',
      conclusion: 'success',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:05:00Z',
      url: 'https://github.com/octocat/Hello-World/actions/runs/1/jobs/1000',
      steps: [
        {
          name: 'Set up job',
          number: 1,
          status: 'completed',
          conclusion: 'success',
          startedAt: '2024-01-15T10:00:00Z',
          completedAt: '2024-01-15T10:01:00Z',
        },
        {
          name: 'Build',
          number: 2,
          status: 'completed',
          conclusion: 'success',
          startedAt: '2024-01-15T10:00:00Z',
          completedAt: '2024-01-15T10:01:00Z',
        },
      ],
    });
  });

  it('handles in_progress job', () => {
    const job = createTestRunJob({
      status: 'in_progress',
      conclusion: null,
      completedAt: null,
    });
    const result = jobToJson(job);

    expect(result['status']).toBe('in_progress');
    expect(result['conclusion']).toBeNull();
    expect(result['completedAt']).toBeNull();
  });

  it('handles failed job', () => {
    const job = createTestRunJob({ conclusion: 'failure' });
    const result = jobToJson(job);

    expect(result['conclusion']).toBe('failure');
  });

  it('handles job with no steps', () => {
    const job = createTestRunJob({ steps: [] });
    const result = jobToJson(job);

    expect(result['steps']).toEqual([]);
  });

  it.each([
    ['success', 'success'],
    ['failure', 'failure'],
    ['cancelled', 'cancelled'],
    ['skipped', 'skipped'],
    [null, null],
  ] as const)('handles conclusion: %s', (_label, conclusion) => {
    const job = createTestRunJob({ conclusion });
    const result = jobToJson(job);

    expect(result['conclusion']).toBe(conclusion);
  });
});

// ============================================================================
// runListItemToJson Tests
// ============================================================================

describe('runListItemToJson', () => {
  it('converts run list item to JSON format', () => {
    const run = createTestRunListItem();
    const result = runListItemToJson(run);

    expect(result).toEqual({
      attempt: 1,
      conclusion: 'success',
      createdAt: '2024-01-15T10:00:00Z',
      databaseId: 1,
      displayTitle: 'CI Pipeline',
      event: 'push',
      headBranch: 'main',
      headSha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      name: 'CI',
      number: 42,
      startedAt: '2024-01-15T10:00:00Z',
      status: 'completed',
      updatedAt: '2024-01-15T10:05:00Z',
      url: 'https://github.com/octocat/Hello-World/actions/runs/1',
      workflowDatabaseId: 100,
      workflowName: 'CI',
    });
  });

  it('handles null actor', () => {
    const run = createTestRunListItem({ actor: null });
    const result = runListItemToJson(run);

    // actor is not included in JSON output by design
    expect(result).not.toHaveProperty('actor');
  });

  it('handles null workflow name', () => {
    const run = createTestRunListItem({ workflowName: null });
    const result = runListItemToJson(run);

    expect(result['workflowName']).toBeNull();
  });

  it.each([
    ['push', 'push'],
    ['pull_request', 'pull_request'],
    ['schedule', 'schedule'],
    ['workflow_dispatch', 'workflow_dispatch'],
  ])('handles event type: %s', (event) => {
    const run = createTestRunListItem({ event });
    const result = runListItemToJson(run);

    expect(result['event']).toBe(event);
  });
});

// ============================================================================
// runDetailToJson Tests
// ============================================================================

describe('runDetailToJson', () => {
  it('includes all run fields plus jobs', () => {
    const run = createTestRunDetail();
    const result = runDetailToJson(run);

    expect(result['databaseId']).toBe(1);
    expect(result['name']).toBe('CI');
    expect(result['jobs']).toHaveLength(1);
  });

  it('converts embedded jobs correctly', () => {
    const run = createTestRunDetail({
      jobs: [createTestRunJob({ name: 'build' }), createTestRunJob({ name: 'test', id: 1001 })],
    });
    const result = runDetailToJson(run);

    expect(result['jobs']).toHaveLength(2);
    expect((result['jobs'] as { name: string }[])[0]?.name).toBe('build');
    expect((result['jobs'] as { name: string }[])[1]?.name).toBe('test');
  });

  it('handles empty jobs array', () => {
    const run = createTestRunDetail({ jobs: [] });
    const result = runDetailToJson(run);

    expect(result['jobs']).toEqual([]);
  });
});

// ============================================================================
// formatRunListJson Tests
// ============================================================================

describe('formatRunListJson', () => {
  it('formats multiple runs as JSON array', () => {
    const runs = [createTestRunListItem({ id: 1 }), createTestRunListItem({ id: 2 })];
    const result = formatRunListJson(runs);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toHaveLength(2);
  });

  it('formats empty array', () => {
    const result = formatRunListJson([]);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed).toEqual([]);
  });

  it('returns full objects when no fields specified', () => {
    const runs = [createTestRunListItem()];
    const result = formatRunListJson(runs);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toHaveProperty('databaseId');
    expect(parsed[0]).toHaveProperty('name');
    expect(parsed[0]).toHaveProperty('status');
    expect(parsed[0]).toHaveProperty('conclusion');
  });

  it('filters to specified fields', () => {
    const runs = [createTestRunListItem()];
    const result = formatRunListJson(runs, ['databaseId', 'status']);
    const parsed = JSON.parse(result) as Record<string, unknown>[];

    expect(parsed[0]).toEqual({ databaseId: 1, status: 'completed' });
  });

  it.each([
    [['name'], { name: 'CI' }],
    [['event', 'headBranch'], { event: 'push', headBranch: 'main' }],
    [['conclusion', 'status'], { conclusion: 'success', status: 'completed' }],
  ])('filters with fields %j', (fields, expected) => {
    const runs = [createTestRunListItem()];
    const result = formatRunListJson(runs, fields);
    const parsed = JSON.parse(result) as unknown[];

    expect(parsed[0]).toEqual(expected);
  });
});

// ============================================================================
// formatRunViewJson Tests
// ============================================================================

describe('formatRunViewJson', () => {
  it('formats run detail as JSON object', () => {
    const run = createTestRunDetail();
    const result = formatRunViewJson(run);
    const parsed = JSON.parse(result) as { databaseId: number; jobs: unknown[] };

    expect(parsed.databaseId).toBe(1);
    expect(parsed.jobs).toHaveLength(1);
  });

  it('returns full object when no fields specified', () => {
    const run = createTestRunDetail();
    const result = formatRunViewJson(run);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    expect(parsed).toHaveProperty('jobs');
    expect(parsed).toHaveProperty('name');
    expect(parsed).toHaveProperty('status');
  });

  it('filters to specified fields', () => {
    const run = createTestRunDetail();
    const result = formatRunViewJson(run, ['databaseId', 'name']);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    expect(parsed).toEqual({ databaseId: 1, name: 'CI' });
  });

  it('can filter to include only jobs', () => {
    const run = createTestRunDetail();
    const result = formatRunViewJson(run, ['jobs']);
    const parsed = JSON.parse(result) as { jobs: unknown[] };

    expect(parsed).toHaveProperty('jobs');
    expect(Object.keys(parsed)).toHaveLength(1);
  });
});

// ============================================================================
// formatJobViewJson Tests
// ============================================================================

describe('formatJobViewJson', () => {
  it('formats job as JSON object', () => {
    const job = createTestRunJob();
    const result = formatJobViewJson(job);
    const parsed = JSON.parse(result) as { databaseId: number };

    expect(parsed.databaseId).toBe(1000);
  });

  it('returns full object when no fields specified', () => {
    const job = createTestRunJob();
    const result = formatJobViewJson(job);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    expect(parsed).toHaveProperty('databaseId');
    expect(parsed).toHaveProperty('name');
    expect(parsed).toHaveProperty('steps');
  });

  it('filters to specified fields', () => {
    const job = createTestRunJob();
    const result = formatJobViewJson(job, ['name', 'status']);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    expect(parsed).toEqual({ name: 'build', status: 'completed' });
  });

  it('excludes steps when filtering', () => {
    const job = createTestRunJob();
    const result = formatJobViewJson(job, ['name']);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    expect(parsed).toEqual({ name: 'build' });
    expect(parsed).not.toHaveProperty('steps');
  });
});
