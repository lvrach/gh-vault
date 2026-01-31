/**
 * JSON formatters for --json flag output.
 * Supports field selection similar to `gh` CLI.
 */

import type { Workflow } from '../types.js';

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
 * Available fields for workflow JSON output (--json flag).
 * Matches gh CLI: id, name, path, state
 */

export function workflowToJson(workflow: Workflow): Record<string, JsonValue> {
  return {
    id: workflow.id,
    name: workflow.name,
    path: workflow.path,
    state: workflow.state,
  };
}

export function workflowToJsonFull(workflow: Workflow): Record<string, JsonValue> {
  return {
    id: workflow.id,
    nodeId: workflow.nodeId,
    name: workflow.name,
    path: workflow.path,
    state: workflow.state,
    url: workflow.url,
    htmlUrl: workflow.htmlUrl,
    badgeUrl: workflow.badgeUrl,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  };
}

export function formatWorkflowListJson(workflows: Workflow[], fields?: string[]): string {
  const jsonWorkflows = workflows.map((w) => workflowToJson(w));

  // Only filter if fields are explicitly provided and non-empty
  if (fields && fields.length > 0) {
    const filtered = jsonWorkflows.map((w) => pick(w, fields));
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(jsonWorkflows, null, 2);
}

export function formatWorkflowViewJson(workflow: Workflow, fields?: string[]): string {
  const jsonWorkflow = workflowToJsonFull(workflow);

  // Only filter if fields are explicitly provided and non-empty
  if (fields && fields.length > 0) {
    return JSON.stringify(pick(jsonWorkflow, fields), null, 2);
  }

  return JSON.stringify(jsonWorkflow, null, 2);
}
