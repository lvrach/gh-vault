/**
 * Markdown formatters for MCP output.
 * These match the original MCP server output format for compatibility.
 */

import type { RunConclusion, RunDetail, RunListItem, RunStatus } from '../types.js';

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return 'N/A';
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes % 60)}m ${String(seconds % 60)}s`;
  }
  if (minutes > 0) {
    return `${String(minutes)}m ${String(seconds % 60)}s`;
  }
  return `${String(seconds)}s`;
}

function getStatusEmoji(status: RunStatus, conclusion: RunConclusion): string {
  if (status !== 'completed') {
    if (status === 'in_progress') return '🔄';
    if (status === 'queued') return '⏳';
    if (status === 'waiting') return '⏸️';
    return '⏳';
  }

  switch (conclusion) {
    case 'success': {
      return '✅';
    }
    case 'failure': {
      return '❌';
    }
    case 'cancelled': {
      return '🚫';
    }
    case 'skipped': {
      return '⏭️';
    }
    case 'timed_out': {
      return '⏱️';
    }
    case 'neutral': {
      return '⚪';
    }
    case 'stale': {
      return '🕒';
    }
    case 'startup_failure': {
      return '💥';
    }
    case null: {
      return '❓';
    }
  }
}

function formatStatus(status: RunStatus, conclusion: RunConclusion): string {
  if (status !== 'completed') {
    return status.replace('_', ' ').toUpperCase();
  }
  return (conclusion ?? 'unknown').toUpperCase();
}

// ============================================================================
// Formatters
// ============================================================================

export function formatRunListMarkdown(runs: RunListItem[]): string {
  if (runs.length === 0) {
    return 'No workflow runs found.';
  }

  const lines = runs.map((run) => {
    const emoji = getStatusEmoji(run.status, run.conclusion);
    const status = formatStatus(run.status, run.conclusion);
    const actor = run.actor?.login ?? 'unknown';
    const workflow = run.workflowName ?? `Workflow #${String(run.workflowId)}`;

    return `- ${emoji} **${run.displayTitle}**
  - Workflow: ${workflow} | Run #${String(run.runNumber)}
  - Status: ${status} | Event: ${run.event}
  - Branch: \`${run.headBranch}\` | Actor: @${actor}
  - Created: ${formatDate(run.createdAt)}
  - [View](${run.htmlUrl})`;
  });

  return `# Workflow Runs (${String(runs.length)})\n\n${lines.join('\n\n')}`;
}

export function formatRunViewMarkdown(run: RunDetail): string {
  const emoji = getStatusEmoji(run.status, run.conclusion);
  const status = formatStatus(run.status, run.conclusion);
  const actor = run.actor?.login ?? 'unknown';
  const actorUrl = run.actor?.htmlUrl ?? '#';
  const workflow = run.workflowName ?? `Workflow #${String(run.workflowId)}`;

  const lines: string[] = [
    `# ${emoji} ${run.displayTitle}`,
    '',
    `**Status:** ${status}`,
    `**Workflow:** ${workflow}`,
    `**Event:** ${run.event}`,
    `**Branch:** \`${run.headBranch}\``,
    `**Commit:** \`${run.headSha.slice(0, 7)}\``,
    `**Actor:** [@${actor}](${actorUrl})`,
    `**Run:** #${String(run.runNumber)} (Attempt ${String(run.runAttempt)})`,
    '',
    '## Timeline',
    `- **Created:** ${formatDate(run.createdAt)}`,
    `- **Updated:** ${formatDate(run.updatedAt)}`,
  ];

  if (run.jobs.length > 0) {
    lines.push('', '## Jobs', '');

    for (const job of run.jobs) {
      const jobEmoji = getStatusEmoji(job.status, job.conclusion);
      const jobStatus = formatStatus(job.status, job.conclusion);
      const duration = formatDuration(job.startedAt, job.completedAt);

      lines.push(
        `### ${jobEmoji} ${job.name}`,
        '',
        `- **Status:** ${jobStatus}`,
        `- **Duration:** ${duration}`,
        `- [View Job](${job.htmlUrl})`
      );

      if (job.steps.length > 0) {
        lines.push('', '**Steps:**');
        for (const step of job.steps) {
          const stepEmoji = getStatusEmoji(step.status, step.conclusion);
          const stepDuration = formatDuration(step.startedAt, step.completedAt);
          lines.push(`- ${stepEmoji} ${step.name} (${stepDuration})`);
        }
      }

      lines.push('');
    }
  }

  lines.push('---', `[View on GitHub](${run.htmlUrl})`);

  return lines.join('\n');
}

export function formatRunCancelledMarkdown(run: RunListItem): string {
  return `# 🚫 Workflow Run Cancelled

**Run:** #${String(run.runNumber)} - ${run.displayTitle}
**Workflow:** ${run.workflowName ?? `Workflow #${String(run.workflowId)}`}

The workflow run has been cancelled.

[View on GitHub](${run.htmlUrl})`;
}

export function formatRunRerunMarkdown(
  run: RunListItem,
  mode: 'full' | 'failed' | 'job',
  jobName?: string
): string {
  const modeDescription =
    mode === 'full'
      ? 'A full rerun of the workflow has been triggered.'
      : mode === 'failed'
        ? 'A rerun of failed jobs has been triggered.'
        : `A rerun of job "${jobName ?? 'unknown'}" has been triggered.`;

  return `# 🔄 Workflow Run Rerun Triggered

**Run:** #${String(run.runNumber)} - ${run.displayTitle}
**Workflow:** ${run.workflowName ?? `Workflow #${String(run.workflowId)}`}

${modeDescription}

[View on GitHub](${run.htmlUrl})`;
}

export function formatRunDeletedMarkdown(runId: number): string {
  return `# 🗑️ Workflow Run Deleted

**Run ID:** ${String(runId)}

The workflow run has been permanently deleted.`;
}

export function formatRunLogsMarkdown(logs: string, jobName?: string): string {
  const title = jobName ? `Logs for Job: ${jobName}` : 'Workflow Run Logs';

  return `# 📋 ${title}

\`\`\`
${logs}
\`\`\``;
}
