/**
 * Markdown formatters for MCP output.
 * These match the original MCP server output format for compatibility.
 */

import type {
  EditPrResult,
  MergeResult,
  PrChecksResult,
  PrComment,
  PrFile,
  PrReview,
  PrReviewComment,
  PrStatusResult,
  PullRequest,
  PullRequestListItem,
} from '../types.js';

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

export function formatPrViewMarkdown(pr: PullRequest): string {
  const status = pr.merged
    ? 'Merged'
    : pr.draft
      ? 'Draft'
      : pr.state === 'closed'
        ? 'Closed'
        : 'Open';

  const labels = pr.labels.length > 0 ? pr.labels.map((l) => `\`${l.name}\``).join(', ') : 'None';
  const mergeStatus = pr.mergeable === null ? 'Calculating...' : pr.mergeable ? 'Yes' : 'No';
  const author = pr.user?.login ?? 'unknown';
  const authorUrl = pr.user?.htmlUrl ?? '#';

  return `# PR #${String(pr.number)}: ${pr.title}

**Status:** ${status}
**Author:** [@${author}](${authorUrl})
**Branch:** \`${pr.head.ref}\` -> \`${pr.base.ref}\`
**Labels:** ${labels}

## Stats
- **Changes:** +${String(pr.additions)} / -${String(pr.deletions)} in ${String(pr.changedFiles)} files
- **Mergeable:** ${mergeStatus} (${pr.mergeableState})

## Dates
- **Created:** ${formatDate(pr.createdAt)}
- **Updated:** ${formatDate(pr.updatedAt)}
${pr.mergedAt ? `- **Merged:** ${formatDate(pr.mergedAt)}` : ''}
${pr.closedAt && !pr.mergedAt ? `- **Closed:** ${formatDate(pr.closedAt)}` : ''}

## Description
${pr.body ?? '*No description provided*'}

---
[View on GitHub](${pr.htmlUrl})`;
}

export function formatPrListMarkdown(prs: PullRequestListItem[]): string {
  if (prs.length === 0) {
    return 'No pull requests found.';
  }

  const lines = prs.map((pr) => {
    const status = pr.draft ? 'Draft' : pr.state === 'open' ? 'Open' : 'Closed';
    const labels = pr.labels.length > 0 ? ` [${pr.labels.map((l) => l.name).join(', ')}]` : '';
    const author = pr.user?.login ?? 'unknown';

    return `- **#${String(pr.number)}** ${pr.title}
  - Status: ${status} | Author: @${author}${labels}
  - Updated: ${formatDate(pr.updatedAt)}
  - [View](${pr.htmlUrl})`;
  });

  return `# Pull Requests (${String(prs.length)})\n\n${lines.join('\n\n')}`;
}

export function formatPrFilesMarkdown(files: PrFile[]): string {
  if (files.length === 0) {
    return 'No files changed in this PR.';
  }

  const lines = files.map((file) => {
    const changes = `+${String(file.additions)} -${String(file.deletions)}`;
    return `- **${file.filename}** (${file.status}) ${changes}`;
  });

  return `## Files Changed (${String(files.length)})\n\n${lines.join('\n')}`;
}

export function formatPrCommentsMarkdown(comments: PrComment[]): string {
  if (comments.length === 0) {
    return 'No comments found.';
  }

  const lines = comments.map((c) => {
    const author = c.user?.login ?? 'unknown';
    const authorUrl = c.user?.htmlUrl ?? '#';
    return `### [@${author}](${authorUrl}) - ${formatDate(c.createdAt)}

${c.body || '*Empty comment*'}

[View](${c.htmlUrl})`;
  });

  return `# Comments (${String(comments.length)})\n\n${lines.join('\n\n---\n\n')}`;
}

export function formatPrReviewCommentsMarkdown(comments: PrReviewComment[]): string {
  if (comments.length === 0) {
    return 'No review comments found.';
  }

  const lines = comments.map((c) => {
    const location = c.line === null ? 'File' : `Line ${String(c.line)}`;
    const replyNote = c.inReplyToId ? ' (reply)' : '';
    const author = c.user?.login ?? 'unknown';
    const authorUrl = c.user?.htmlUrl ?? '#';

    return `### [@${author}](${authorUrl}) on \`${c.path}\`${replyNote}

**Location:** ${location}

\`\`\`diff
${c.diffHunk}
\`\`\`

${c.body}

[View](${c.htmlUrl}) | ${formatDate(c.createdAt)}`;
  });

  return `# Review Comments (${String(comments.length)})\n\n${lines.join('\n\n---\n\n')}`;
}

export function formatPrReviewsMarkdown(reviews: PrReview[]): string {
  if (reviews.length === 0) {
    return 'No reviews found.';
  }

  const stateLabels: Record<string, string> = {
    APPROVED: 'Approved',
    CHANGES_REQUESTED: 'Changes Requested',
    COMMENTED: 'Commented',
    DISMISSED: 'Dismissed',
    PENDING: 'Pending',
  };

  const lines = reviews.map((r) => {
    const state = stateLabels[r.state] ?? r.state;
    const date = r.submittedAt ? formatDate(r.submittedAt) : 'Not submitted';
    const author = r.user?.login ?? 'unknown';
    const authorUrl = r.user?.htmlUrl ?? '#';

    return `### [@${author}](${authorUrl}) - ${state}

${r.body ?? '*No comment*'}

[View](${r.htmlUrl}) | ${date}`;
  });

  return `# Reviews (${String(reviews.length)})\n\n${lines.join('\n\n---\n\n')}`;
}

export function formatCreatedCommentMarkdown(comment: PrComment): string {
  const author = comment.user?.login ?? 'unknown';
  return `# Comment Created

**Author:** @${author}
**Created:** ${formatDate(comment.createdAt)}

${comment.body || '*Empty comment*'}

[View on GitHub](${comment.htmlUrl})`;
}

export function formatCreatedReviewMarkdown(review: PrReview, event: string): string {
  const author = review.user?.login ?? 'unknown';
  return `# Review Submitted

**Author:** @${author}
**Action:** ${event}
**Submitted:** ${review.submittedAt ? formatDate(review.submittedAt) : 'N/A'}

${review.body ?? '*No comment*'}

[View on GitHub](${review.htmlUrl})`;
}

export function formatPrStateChangeMarkdown(
  pr: PullRequest,
  action: 'closed' | 'reopened' | 'ready' | 'draft'
): string {
  const actionText =
    action === 'closed'
      ? 'Closed'
      : action === 'reopened'
        ? 'Reopened'
        : action === 'ready'
          ? 'Marked Ready for Review'
          : 'Converted to Draft';

  return `# PR ${actionText}

**PR:** #${String(pr.number)} - ${pr.title}
**Status:** ${pr.state}
**Draft:** ${pr.draft ? 'Yes' : 'No'}

[View on GitHub](${pr.htmlUrl})`;
}

export function formatEditResultMarkdown(result: EditPrResult): string {
  const fields =
    result.updatedFields.length > 0
      ? result.updatedFields.map((f) => `- ${f}`).join('\n')
      : '*No fields changed*';

  return `# PR Updated

**PR:** #${String(result.number)} - ${result.title}

## Updated Fields
${fields}

[View on GitHub](${result.htmlUrl})`;
}

export function formatMergeResultMarkdown(
  result: MergeResult,
  pr: { number: number; title: string; htmlUrl: string },
  deletedBranch?: string
): string {
  const branchNote = deletedBranch ? `\n**Deleted Branch:** \`${deletedBranch}\`` : '';

  return `# PR Merged

**PR:** #${String(pr.number)} - ${pr.title}
**Merge Commit:** \`${result.sha}\`${branchNote}

${result.message}

[View on GitHub](${pr.htmlUrl})`;
}

// Note: formatAutoMergeMarkdown was removed as it wasn't being used.
// The CLI handles auto-merge output in text.ts formatAutoMergeText.

export function formatPrChecksMarkdown(checks: PrChecksResult): string {
  const stateEmoji =
    checks.overallState === 'success' ? '✅' : checks.overallState === 'failure' ? '❌' : '🔄';

  const lines: string[] = [
    `# CI Status ${stateEmoji}`,
    '',
    `**Commit:** \`${checks.sha.slice(0, 7)}\``,
    `**Overall:** ${checks.overallState.toUpperCase()}`,
    `**Summary:** ${String(checks.passing)} passing, ${String(checks.failing)} failing, ${String(checks.pending)} pending`,
    '',
  ];

  if (checks.checkRuns.length > 0) {
    lines.push('## Check Runs', '');
    for (const check of checks.checkRuns) {
      const emoji =
        check.status === 'completed'
          ? check.conclusion === 'success' || check.conclusion === 'skipped'
            ? '✅'
            : '❌'
          : '🔄';
      const conclusion =
        check.status === 'completed' ? (check.conclusion ?? 'unknown') : check.status;
      const link = check.detailsUrl ? ` [Details](${check.detailsUrl})` : '';
      lines.push(`- ${emoji} **${check.name}** (${conclusion})${link}`);
    }
    lines.push('');
  }

  if (checks.statuses.length > 0) {
    lines.push('## Commit Statuses', '');
    for (const status of checks.statuses) {
      const emoji = status.state === 'success' ? '✅' : status.state === 'pending' ? '🔄' : '❌';
      const link = status.targetUrl ? ` [Details](${status.targetUrl})` : '';
      lines.push(`- ${emoji} **${status.context}** (${status.state})${link}`);
    }
  }

  return lines.join('\n');
}

export function formatPrStatusMarkdown(status: PrStatusResult): string {
  const lines: string[] = ['# PR Status', ''];

  // Current branch PR
  if (status.currentBranchPr) {
    const pr = status.currentBranchPr;
    lines.push(
      '## Current Branch',
      `- **#${String(pr.number)}** ${pr.title} [View](${pr.htmlUrl})`,
      ''
    );
  }

  // Created by you
  if (status.createdByYou.length > 0) {
    lines.push(`## Created by You (${String(status.createdByYou.length)})`);
    for (const pr of status.createdByYou) {
      const state = pr.draft ? 'Draft' : pr.state;
      lines.push(`- **#${String(pr.number)}** ${pr.title} (${state}) [View](${pr.htmlUrl})`);
    }
    lines.push('');
  }

  // Review requested
  if (status.reviewRequested.length > 0) {
    lines.push(`## Review Requested (${String(status.reviewRequested.length)})`);
    for (const pr of status.reviewRequested) {
      const author = pr.user?.login ?? 'unknown';
      lines.push(`- **#${String(pr.number)}** ${pr.title} by @${author} [View](${pr.htmlUrl})`);
    }
    lines.push('');
  }

  // Assigned to you
  if (status.assignedToYou.length > 0) {
    lines.push(`## Assigned to You (${String(status.assignedToYou.length)})`);
    for (const pr of status.assignedToYou) {
      const author = pr.user?.login ?? 'unknown';
      lines.push(`- **#${String(pr.number)}** ${pr.title} by @${author} [View](${pr.htmlUrl})`);
    }
  }

  if (
    !status.currentBranchPr &&
    status.createdByYou.length === 0 &&
    status.reviewRequested.length === 0 &&
    status.assignedToYou.length === 0
  ) {
    lines.push('*No relevant open pull requests found.*');
  }

  return lines.join('\n');
}
