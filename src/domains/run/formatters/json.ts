/**
 * JSON formatters for --json flag output.
 * Supports field selection similar to `gh` CLI.
 */

import type { RunDetail, RunJob, RunListItem, RunStep } from '../types.js';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function pick(obj: Record<string, JsonValue>, fields: string[]): Record<string, JsonValue> {
  const objMap = new Map(Object.entries(obj));
  const result = new Map<string, JsonValue>();

  for (const field of fields) {
    if (objMap.has(field)) {
      const value = objMap.get(field);
      if (value !== undefined) {
        result.set(field, value);
      }
    }
  }

  return Object.fromEntries(result);
}

/**
 * Convert a step to JSON format.
 */
function stepToJson(step: RunStep): Record<string, JsonValue> {
  return {
    name: step.name,
    number: step.number,
    status: step.status,
    conclusion: step.conclusion,
    startedAt: step.startedAt,
    completedAt: step.completedAt,
  };
}

/**
 * Convert a job to JSON format.
 */
export function jobToJson(job: RunJob): Record<string, JsonValue> {
  return {
    databaseId: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    url: job.htmlUrl,
    steps: job.steps.map((step) => stepToJson(step)),
  };
}

/**
 * Convert a run list item to JSON format.
 */
export function runListItemToJson(run: RunListItem): Record<string, JsonValue> {
  return {
    attempt: run.runAttempt,
    conclusion: run.conclusion,
    createdAt: run.createdAt,
    databaseId: run.id,
    displayTitle: run.displayTitle,
    event: run.event,
    headBranch: run.headBranch,
    headSha: run.headSha,
    name: run.name,
    number: run.runNumber,
    startedAt: run.createdAt,
    status: run.status,
    updatedAt: run.updatedAt,
    url: run.htmlUrl,
    workflowDatabaseId: run.workflowId,
    workflowName: run.workflowName,
  };
}

/**
 * Convert a run detail to JSON format.
 */
export function runDetailToJson(run: RunDetail): Record<string, JsonValue> {
  return {
    ...runListItemToJson(run),
    jobs: run.jobs.map((job) => jobToJson(job)),
  };
}

/**
 * Format a list of runs as JSON with optional field selection.
 */
export function formatRunListJson(runs: RunListItem[], fields?: string[]): string {
  const jsonRuns = runs.map((run) => runListItemToJson(run));

  if (fields) {
    const filtered = jsonRuns.map((run) => pick(run, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonRuns, null, 2);
}

/**
 * Format a run detail as JSON with optional field selection.
 */
export function formatRunViewJson(run: RunDetail, fields?: string[]): string {
  const jsonRun = runDetailToJson(run);

  if (fields) {
    return JSON.stringify(pick(jsonRun, fields), null, 2);
  }

  return JSON.stringify(jsonRun, null, 2);
}

/**
 * Format a job as JSON with optional field selection.
 */
export function formatJobViewJson(job: RunJob, fields?: string[]): string {
  const jsonJob = jobToJson(job);

  if (fields) {
    return JSON.stringify(pick(jsonJob, fields), null, 2);
  }

  return JSON.stringify(jsonJob, null, 2);
}
