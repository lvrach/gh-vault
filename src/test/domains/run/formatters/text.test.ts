/**
 * Run text formatters snapshot tests.
 *
 * Uses vi.useFakeTimers() for deterministic date output.
 * Tests with color=false for readable snapshots.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatJobViewText,
  formatRunCancelledText,
  formatRunDeletedText,
  formatRunListText,
  formatRunRerunText,
  formatRunViewText,
} from '../../../../domains/run/formatters/text.js';
import type { RunDetail, RunJob, RunListItem, RunStep } from '../../../../domains/run/types.js';

// ============================================================================
// Test Setup - Freeze time for deterministic relative dates
// ============================================================================

const FROZEN_DATE = new Date('2024-01-20T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================================
// Fixtures
// ============================================================================

function createRunStep(overrides: Partial<RunStep> = {}): RunStep {
  return {
    name: 'Build',
    status: 'completed',
    conclusion: 'success',
    number: 1,
    startedAt: '2024-01-19T10:00:00Z',
    completedAt: '2024-01-19T10:01:30Z',
    ...overrides,
  };
}

function createRunJob(overrides: Partial<RunJob> = {}): RunJob {
  return {
    id: 1001,
    runId: 1,
    name: 'build',
    status: 'completed',
    conclusion: 'success',
    startedAt: '2024-01-19T10:00:00Z',
    completedAt: '2024-01-19T10:05:00Z',
    htmlUrl: 'https://github.com/owner/repo/actions/runs/1/jobs/1001',
    steps: [
      createRunStep({ number: 1, name: 'Set up job' }),
      createRunStep({ number: 2, name: 'Checkout' }),
      createRunStep({ number: 3, name: 'Build' }),
    ],
    ...overrides,
  };
}

function createRunListItem(overrides: Partial<RunListItem> = {}): RunListItem {
  return {
    id: 1,
    name: 'CI',
    displayTitle: 'CI Pipeline - Add new feature',
    headBranch: 'main',
    headSha: 'abc123def456789',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
    workflowId: 100,
    workflowName: 'CI',
    runNumber: 42,
    runAttempt: 1,
    createdAt: '2024-01-19T10:00:00Z',
    updatedAt: '2024-01-19T10:05:00Z',
    htmlUrl: 'https://github.com/owner/repo/actions/runs/1',
    actor: { login: 'octocat', htmlUrl: 'https://github.com/octocat' },
    ...overrides,
  };
}

function createRunDetail(overrides: Partial<RunDetail> = {}): RunDetail {
  return {
    ...createRunListItem(),
    jobs: [createRunJob()],
    ...overrides,
  };
}

// ============================================================================
// formatRunListText Tests
// ============================================================================

describe('formatRunListText', () => {
  it('formats empty list', () => {
    expect(formatRunListText([], false)).toMatchSnapshot();
  });

  it('formats single completed run', () => {
    const runs = [createRunListItem()];
    expect(formatRunListText(runs, false)).toMatchSnapshot();
  });

  it('formats multiple runs with various statuses', () => {
    const runs = [
      createRunListItem({ id: 1, displayTitle: 'Successful run', conclusion: 'success' }),
      createRunListItem({ id: 2, displayTitle: 'Failed run', conclusion: 'failure' }),
      createRunListItem({ id: 3, displayTitle: 'In progress', status: 'in_progress', conclusion: null }),
      createRunListItem({ id: 4, displayTitle: 'Cancelled', conclusion: 'cancelled' }),
    ];
    expect(formatRunListText(runs, false)).toMatchSnapshot();
  });

  it('formats run with null actor', () => {
    const runs = [createRunListItem({ actor: null })];
    expect(formatRunListText(runs, false)).toMatchSnapshot();
  });

  it('formats run with null workflow name', () => {
    const runs = [createRunListItem({ workflowName: null })];
    expect(formatRunListText(runs, false)).toMatchSnapshot();
  });

  it('formats queued run', () => {
    const runs = [createRunListItem({ status: 'queued', conclusion: null })];
    expect(formatRunListText(runs, false)).toMatchSnapshot();
  });

  it('formats waiting run', () => {
    const runs = [createRunListItem({ status: 'waiting', conclusion: null })];
    expect(formatRunListText(runs, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatRunViewText Tests
// ============================================================================

describe('formatRunViewText', () => {
  it('formats completed run (non-verbose)', () => {
    const run = createRunDetail();
    expect(formatRunViewText(run, false, false)).toMatchSnapshot();
  });

  it('formats completed run (verbose with steps)', () => {
    const run = createRunDetail();
    expect(formatRunViewText(run, true, false)).toMatchSnapshot();
  });

  it('formats failed run', () => {
    const run = createRunDetail({
      status: 'completed',
      conclusion: 'failure',
      jobs: [
        createRunJob({
          conclusion: 'failure',
          steps: [
            createRunStep({ number: 1, name: 'Set up job', conclusion: 'success' }),
            createRunStep({ number: 2, name: 'Build', conclusion: 'failure' }),
          ],
        }),
      ],
    });
    expect(formatRunViewText(run, true, false)).toMatchSnapshot();
  });

  it('formats in-progress run', () => {
    const run = createRunDetail({
      status: 'in_progress',
      conclusion: null,
      jobs: [
        createRunJob({
          status: 'in_progress',
          conclusion: null,
          completedAt: null,
        }),
      ],
    });
    expect(formatRunViewText(run, false, false)).toMatchSnapshot();
  });

  it('formats run with no jobs', () => {
    const run = createRunDetail({ jobs: [] });
    expect(formatRunViewText(run, false, false)).toMatchSnapshot();
  });

  it('formats run with multiple jobs', () => {
    const run = createRunDetail({
      jobs: [
        createRunJob({ name: 'build', conclusion: 'success' }),
        createRunJob({ id: 1002, name: 'test', conclusion: 'success' }),
        createRunJob({ id: 1003, name: 'deploy', conclusion: 'skipped' }),
      ],
    });
    expect(formatRunViewText(run, false, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatJobViewText Tests
// ============================================================================

describe('formatJobViewText', () => {
  it('formats completed job (non-verbose)', () => {
    const job = createRunJob();
    expect(formatJobViewText(job, false, false)).toMatchSnapshot();
  });

  it('formats completed job (verbose with steps)', () => {
    const job = createRunJob();
    expect(formatJobViewText(job, true, false)).toMatchSnapshot();
  });

  it('formats failed job', () => {
    const job = createRunJob({
      conclusion: 'failure',
      steps: [
        createRunStep({ name: 'Build', conclusion: 'failure' }),
      ],
    });
    expect(formatJobViewText(job, true, false)).toMatchSnapshot();
  });

  it('formats in-progress job', () => {
    const job = createRunJob({
      status: 'in_progress',
      conclusion: null,
      completedAt: null,
    });
    expect(formatJobViewText(job, false, false)).toMatchSnapshot();
  });

  it('formats job with no started time', () => {
    const job = createRunJob({ startedAt: null, completedAt: null });
    expect(formatJobViewText(job, false, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatRunCancelledText Tests
// ============================================================================

describe('formatRunCancelledText', () => {
  it('formats cancelled run', () => {
    const run = createRunListItem();
    expect(formatRunCancelledText(run, false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatRunRerunText Tests
// ============================================================================

describe('formatRunRerunText', () => {
  it('formats full rerun', () => {
    const run = createRunListItem();
    expect(formatRunRerunText(run, 'full', undefined, false)).toMatchSnapshot();
  });

  it('formats failed jobs rerun', () => {
    const run = createRunListItem();
    expect(formatRunRerunText(run, 'failed', undefined, false)).toMatchSnapshot();
  });

  it('formats single job rerun', () => {
    const run = createRunListItem();
    expect(formatRunRerunText(run, 'job', 'build', false)).toMatchSnapshot();
  });
});

// ============================================================================
// formatRunDeletedText Tests
// ============================================================================

describe('formatRunDeletedText', () => {
  it('formats deleted run', () => {
    expect(formatRunDeletedText(12_345, false)).toMatchSnapshot();
  });
});
