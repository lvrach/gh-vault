/**
 * JSON formatters for --json flag output.
 * Supports field selection similar to `gh` CLI.
 */

import type {
  PrChecksResult,
  PrComment,
  PrFile,
  PrReview,
  PullRequest,
  PullRequestListItem,
} from '../types.js';

/**
 * Optional nested data that requires additional API calls.
 * These fields are fetched on-demand when requested via --json.
 */
export interface PrNestedData {
  files?: PrFile[] | undefined;
  comments?: PrComment[] | undefined;
  reviews?: PrReview[] | undefined;
  statusCheckRollup?: PrChecksResult | undefined;
}

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
 * Available fields for PR list JSON output (--json flag).
 * When no fields are specified, all fields are returned (matches gh CLI behavior).
 *
 * Common fields: number, title, state, draft, url, author, createdAt, updatedAt,
 *                headRefName, baseRefName, labels
 */

/**
 * Available fields for PR view JSON output (--json flag).
 * When no fields are specified, all fields are returned (matches gh CLI behavior).
 *
 * Common fields: number, title, body, state, draft, merged, mergeable, url, author,
 *                headRefName, baseRefName, additions, deletions, changedFiles,
 *                labels, createdAt, updatedAt, closedAt, mergedAt
 */

export function prListItemToJson(pr: PullRequestListItem): Record<string, JsonValue> {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    url: pr.htmlUrl,
    author: pr.user ? { login: pr.user.login } : null,
    headRefName: pr.head.ref,
    baseRefName: pr.base.ref,
    labels: pr.labels.map((l) => ({ name: l.name })),
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
  };
}

export function prToJson(pr: PullRequest, nestedData?: PrNestedData): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    draft: pr.draft,
    merged: pr.merged,
    mergeable: pr.mergeable,
    mergeableState: pr.mergeableState,
    url: pr.htmlUrl,
    author: pr.user ? { login: pr.user.login } : null,
    headRefName: pr.head.ref,
    headRefOid: pr.head.sha,
    baseRefName: pr.base.ref,
    baseRefOid: pr.base.sha,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
    labels: pr.labels.map((l) => ({ name: l.name })),
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    closedAt: pr.closedAt,
    mergedAt: pr.mergedAt,
  };

  // Add nested data if provided (fetched via additional API calls)
  if (nestedData?.files) {
    result['files'] = nestedData.files.map((f) => ({
      path: f.filename,
      additions: f.additions,
      deletions: f.deletions,
    }));
  }

  if (nestedData?.comments) {
    result['comments'] = nestedData.comments.map((c) => ({
      id: c.id,
      author: c.user ? { login: c.user.login } : null,
      body: c.body,
      createdAt: c.createdAt,
      url: c.htmlUrl,
    }));
  }

  if (nestedData?.reviews) {
    result['reviews'] = nestedData.reviews.map((r) => ({
      id: r.id,
      author: r.user ? { login: r.user.login } : null,
      body: r.body,
      state: r.state,
      submittedAt: r.submittedAt,
      url: r.htmlUrl,
    }));
  }

  // statusCheckRollup combines check runs and commit statuses
  // Format matches gh CLI's statusCheckRollup field
  if (nestedData?.statusCheckRollup) {
    const checks = nestedData.statusCheckRollup;
    const rollup: JsonValue[] = [];

    // Add check runs
    for (const c of checks.checkRuns) {
      rollup.push({
        name: c.name,
        status: c.status,
        conclusion: c.conclusion,
        detailsUrl: c.detailsUrl,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
      });
    }

    // Add commit statuses (legacy checks)
    for (const s of checks.statuses) {
      rollup.push({
        name: s.context,
        status: s.state === 'pending' ? 'pending' : 'completed',
        conclusion: s.state === 'pending' ? null : s.state,
        detailsUrl: s.targetUrl,
        startedAt: null,
        completedAt: null,
      });
    }

    result['statusCheckRollup'] = rollup;
  }

  return result;
}

export function formatPrListJson(prs: PullRequestListItem[], fields?: string[]): string {
  const jsonPrs = prs.map((pr) => prListItemToJson(pr));

  // Only filter if fields are explicitly provided and non-empty
  // Empty array or undefined returns full objects (matches gh CLI behavior)
  if (fields && fields.length > 0) {
    const filtered = jsonPrs.map((pr) => pick(pr, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonPrs, null, 2);
}

export function formatPrViewJson(
  pr: PullRequest,
  fields?: string[],
  nestedData?: PrNestedData
): string {
  const jsonPr = prToJson(pr, nestedData);

  // Only filter if fields are explicitly provided and non-empty
  // Empty array or undefined returns full object (matches gh CLI behavior)
  if (fields && fields.length > 0) {
    return JSON.stringify(pick(jsonPr, fields), null, 2);
  }

  return JSON.stringify(jsonPr, null, 2);
}

export function formatPrFilesJson(files: PrFile[]): string {
  return JSON.stringify(
    files.map((f) => ({
      path: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    })),
    null,
    2
  );
}

export function formatPrCommentsJson(comments: PrComment[]): string {
  return JSON.stringify(
    comments.map((c) => ({
      id: c.id,
      author: c.user ? { login: c.user.login } : null,
      body: c.body,
      createdAt: c.createdAt,
      url: c.htmlUrl,
    })),
    null,
    2
  );
}
