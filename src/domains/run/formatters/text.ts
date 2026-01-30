/**
 * Text formatters for CLI output - human-readable format matching `gh` CLI style.
 */

import type { RunConclusion, RunDetail, RunJob, RunListItem, RunStatus } from '../types.js';

// ============================================================================
// Constants
// ============================================================================

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${String(diffMins)}m ago`;
    }
    return `${String(diffHours)}h ago`;
  }
  if (diffDays < 7) {
    return `${String(diffDays)}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${String(weeks)}w ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '';
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${String(hours)}h${String(minutes % 60)}m`;
  }
  if (minutes > 0) {
    return `${String(minutes)}m${String(seconds % 60)}s`;
  }
  return `${String(seconds)}s`;
}

function getStatusIcon(status: RunStatus, conclusion: RunConclusion): string {
  if (status !== 'completed') {
    if (status === 'in_progress') return '●';
    if (status === 'queued') return '○';
    if (status === 'waiting') return '◐';
    return '○';
  }

  switch (conclusion) {
    case 'success': {
      return '✓';
    }
    case 'failure': {
      return '✗';
    }
    case 'cancelled': {
      return '⊘';
    }
    case 'skipped': {
      return '◌';
    }
    case 'timed_out': {
      return '⏱';
    }
    case 'neutral': {
      return '○';
    }
    case 'stale': {
      return '◐';
    }
    case 'startup_failure': {
      return '✗';
    }
    case null: {
      return '●';
    }
  }
}

function getStatusColor(status: RunStatus, conclusion: RunConclusion, color: boolean): string {
  if (!color) return '';

  if (status !== 'completed') {
    return YELLOW;
  }

  switch (conclusion) {
    case 'success': {
      return GREEN;
    }
    case 'failure':
    case 'timed_out':
    case 'startup_failure': {
      return RED;
    }
    case 'cancelled': {
      return MAGENTA;
    }
    case 'neutral':
    case 'skipped':
    case 'stale':
    case null: {
      return DIM;
    }
  }
}

function formatStatus(status: RunStatus, conclusion: RunConclusion): string {
  if (status !== 'completed') {
    return status.replace('_', ' ');
  }
  return conclusion ?? 'unknown';
}

// ============================================================================
// Formatters
// ============================================================================

export function formatRunListText(runs: RunListItem[], color = true): string {
  if (runs.length === 0) {
    return 'No workflow runs found';
  }

  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';

  const lines: string[] = [];

  for (const run of runs) {
    const icon = getStatusIcon(run.status, run.conclusion);
    const statusColor = getStatusColor(run.status, run.conclusion, color);
    const status = formatStatus(run.status, run.conclusion);
    const time = formatRelativeDate(run.createdAt);
    const actor = run.actor?.login ?? 'unknown';
    const workflow = run.workflowName ?? `workflow #${String(run.workflowId)}`;

    lines.push(
      `${statusColor}${icon}${reset} ${bold}${run.displayTitle}${reset} ${dim}${workflow}${reset}`,
      `  ${dim}${status} • #${String(run.runNumber)} • ${run.headBranch} • ${actor} • ${time}${reset}`,
      `  ${cyan}${run.htmlUrl}${reset}`,
      ''
    );
  }

  return lines.join('\n').trim();
}

export function formatRunViewText(run: RunDetail, verbose = false, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';

  const icon = getStatusIcon(run.status, run.conclusion);
  const statusColor = getStatusColor(run.status, run.conclusion, color);
  const status = formatStatus(run.status, run.conclusion);
  const actor = run.actor?.login ?? 'unknown';
  const workflow = run.workflowName ?? `workflow #${String(run.workflowId)}`;

  const lines: string[] = [
    `${statusColor}${icon}${reset} ${bold}${run.displayTitle}${reset}`,
    `${cyan}${run.htmlUrl}${reset}`,
    '',
    `${dim}workflow:${reset}   ${workflow}`,
    `${dim}status:${reset}     ${status}`,
    `${dim}event:${reset}      ${run.event}`,
    `${dim}branch:${reset}     ${run.headBranch}`,
    `${dim}commit:${reset}     ${run.headSha.slice(0, 7)}`,
    `${dim}actor:${reset}      ${actor}`,
    `${dim}run:${reset}        #${String(run.runNumber)} (attempt ${String(run.runAttempt)})`,
    `${dim}created:${reset}    ${formatRelativeDate(run.createdAt)}`,
  ];

  if (run.jobs.length > 0) {
    lines.push('', `${bold}JOBS${reset}`);

    for (const job of run.jobs) {
      const jobIcon = getStatusIcon(job.status, job.conclusion);
      const jobColor = getStatusColor(job.status, job.conclusion, color);
      const duration = formatDuration(job.startedAt, job.completedAt);
      const durationText = duration ? ` (${duration})` : '';

      lines.push(`${jobColor}${jobIcon}${reset} ${job.name}${dim}${durationText}${reset}`);

      if (verbose && job.steps.length > 0) {
        for (const step of job.steps) {
          const stepIcon = getStatusIcon(step.status, step.conclusion);
          const stepColor = getStatusColor(step.status, step.conclusion, color);
          const stepDuration = formatDuration(step.startedAt, step.completedAt);
          const stepDurationText = stepDuration ? ` (${stepDuration})` : '';

          lines.push(
            `  ${stepColor}${stepIcon}${reset} ${step.name}${dim}${stepDurationText}${reset}`
          );
        }
      }
    }
  }

  return lines.join('\n');
}

export function formatJobViewText(job: RunJob, verbose = false, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';

  const icon = getStatusIcon(job.status, job.conclusion);
  const statusColor = getStatusColor(job.status, job.conclusion, color);
  const status = formatStatus(job.status, job.conclusion);
  const duration = formatDuration(job.startedAt, job.completedAt);

  const lines: string[] = [
    `${statusColor}${icon}${reset} ${bold}${job.name}${reset}`,
    `${cyan}${job.htmlUrl}${reset}`,
    '',
    `${dim}status:${reset}     ${status}`,
    `${dim}duration:${reset}   ${duration || 'N/A'}`,
  ];

  if (verbose && job.steps.length > 0) {
    lines.push('', `${bold}STEPS${reset}`);

    for (const step of job.steps) {
      const stepIcon = getStatusIcon(step.status, step.conclusion);
      const stepColor = getStatusColor(step.status, step.conclusion, color);
      const stepDuration = formatDuration(step.startedAt, step.completedAt);
      const stepDurationText = stepDuration ? ` (${stepDuration})` : '';

      lines.push(`${stepColor}${stepIcon}${reset} ${step.name}${dim}${stepDurationText}${reset}`);
    }
  }

  return lines.join('\n');
}

export function formatRunCancelledText(run: RunListItem, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const magenta = color ? MAGENTA : '';

  return `${magenta}Cancelled${reset} workflow run ${bold}#${String(run.runNumber)}${reset} (${run.displayTitle})`;
}

export function formatRunRerunText(
  run: RunListItem,
  mode: 'full' | 'failed' | 'job',
  jobName?: string,
  color = true
): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? GREEN : '';

  const modeText =
    mode === 'full'
      ? 'Triggered rerun of'
      : mode === 'failed'
        ? 'Triggered rerun of failed jobs in'
        : `Triggered rerun of job "${jobName ?? 'unknown'}" in`;

  return `${green}${modeText}${reset} workflow run ${bold}#${String(run.runNumber)}${reset} (${run.displayTitle})`;
}

export function formatRunDeletedText(runId: number, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const red = color ? RED : '';

  return `${red}Deleted${reset} workflow run ${bold}#${String(runId)}${reset}`;
}
