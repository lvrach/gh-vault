/**
 * Text formatters for CLI output - human-readable format matching `gh` CLI style.
 */

import type { Workflow } from '../types.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

function getStateIcon(workflow: Workflow): string {
  if (workflow.state === 'active') return '✓';
  if (workflow.state.startsWith('disabled')) return '○';
  if (workflow.state === 'deleted') return '✗';
  return '?';
}

function getStateColor(workflow: Workflow, color: boolean): string {
  if (!color) return '';
  if (workflow.state === 'active') return GREEN;
  if (workflow.state.startsWith('disabled')) return YELLOW;
  if (workflow.state === 'deleted') return GRAY;
  return '';
}

function formatState(workflow: Workflow): string {
  switch (workflow.state) {
    case 'active': {
      return 'active';
    }
    case 'disabled_manually': {
      return 'disabled_manually';
    }
    case 'disabled_inactivity': {
      return 'disabled_inactivity';
    }
    case 'disabled_fork': {
      return 'disabled_fork';
    }
    case 'deleted': {
      return 'deleted';
    }
    case 'unknown': {
      return 'unknown';
    }
  }
}

/**
 * Format workflow list for CLI output.
 */
export function formatWorkflowListText(workflows: Workflow[], color = true): string {
  if (workflows.length === 0) {
    return 'No workflows found';
  }

  const lines: string[] = [];
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';

  for (const workflow of workflows) {
    const icon = getStateIcon(workflow);
    const stateColor = getStateColor(workflow, color);
    const state = formatState(workflow);

    // Extract filename from path
    const filename = workflow.path.split('/').pop() ?? workflow.path;

    lines.push(
      `${stateColor}${icon}${reset} ${bold}${workflow.name}${reset} ${dim}(${filename})${reset}`,
      `  ${dim}ID: ${String(workflow.id)} • State: ${state}${reset}`
    );
  }

  return lines.join('\n');
}

/**
 * Format single workflow view for CLI output.
 */
export function formatWorkflowViewText(workflow: Workflow, color = true): string {
  const icon = getStateIcon(workflow);
  const stateColor = getStateColor(workflow, color);
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';

  const lines: string[] = [
    `${bold}${workflow.name}${reset} ${stateColor}${icon} ${formatState(workflow)}${reset}`,
    `${cyan}${workflow.htmlUrl}${reset}`,
    '',
    `${dim}ID:${reset}        ${String(workflow.id)}`,
    `${dim}Path:${reset}      ${workflow.path}`,
    `${dim}Badge:${reset}     ${workflow.badgeUrl}`,
    `${dim}Created:${reset}   ${workflow.createdAt}`,
    `${dim}Updated:${reset}   ${workflow.updatedAt}`,
  ];

  return lines.join('\n');
}

/**
 * Format workflow run trigger result.
 */
export function formatWorkflowRunText(workflow: Workflow, ref: string, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? GREEN : '';

  return `${green}Triggered${reset} workflow ${bold}${workflow.name}${reset} on ${bold}${ref}${reset}`;
}

/**
 * Format workflow enable result.
 */
export function formatWorkflowEnableText(workflow: Workflow, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? GREEN : '';

  return `${green}Enabled${reset} workflow ${bold}${workflow.name}${reset}`;
}

/**
 * Format workflow disable result.
 */
export function formatWorkflowDisableText(workflow: Workflow, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const yellow = color ? YELLOW : '';

  return `${yellow}Disabled${reset} workflow ${bold}${workflow.name}${reset}`;
}

/**
 * Format workflow YAML content.
 */
export function formatWorkflowYamlText(yaml: string): string {
  return yaml;
}
