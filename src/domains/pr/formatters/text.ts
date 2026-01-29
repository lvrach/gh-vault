/**
 * Text formatters for CLI output - human-readable format matching `gh` CLI style.
 */

import type {
  EditPrResult,
  MergeResult,
  PrChecksResult,
  PrComment,
  PrFile,
  PrReview,
  PrStatusResult,
  PullRequest,
  PullRequestListItem,
} from '../types.js';

function formatDate(dateString: string): string {
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

function getStatusIcon(pr: PullRequest | PullRequestListItem): string {
  if ('merged' in pr && pr.merged) return '✓';
  if (pr.draft) return '○';
  if (pr.state === 'closed') return '✗';
  return '●';
}

function getStatusColor(pr: PullRequest | PullRequestListItem): string {
  if ('merged' in pr && pr.merged) return '\x1b[35m'; // magenta
  if (pr.draft) return '\x1b[90m'; // gray
  if (pr.state === 'closed') return '\x1b[31m'; // red
  return '\x1b[32m'; // green
}

function getConflictStatus(pr: PullRequestListItem, color = true): string {
  if (pr.mergeable === undefined) return '';

  const red = color ? '\x1b[31m' : '';
  const green = color ? '\x1b[32m' : '';
  const yellow = color ? '\x1b[33m' : '';
  const reset = color ? '\x1b[0m' : '';

  if (pr.mergeable === null) {
    return ` ${yellow}(checking...)${reset}`;
  }
  if (!pr.mergeable) {
    return ` ${red}(conflicts)${reset}`;
  }
  if (pr.mergeableState === 'clean') {
    return ` ${green}(mergeable)${reset}`;
  }
  if (pr.mergeableState === 'blocked') {
    return ` ${yellow}(blocked)${reset}`;
  }
  if (pr.mergeableState === 'behind') {
    return ` ${yellow}(behind)${reset}`;
  }
  return '';
}

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';

export function formatPrListText(prs: PullRequestListItem[], color = true): string {
  if (prs.length === 0) {
    return 'No pull requests match your search';
  }

  const lines: string[] = [];

  for (const pr of prs) {
    const icon = getStatusIcon(pr);
    const statusColor = color ? getStatusColor(pr) : '';
    const reset = color ? RESET : '';
    const dim = color ? DIM : '';
    const bold = color ? BOLD : '';

    const labels = pr.labels.length > 0 ? ` ${pr.labels.map((l) => l.name).join(', ')}` : '';
    const author = pr.user?.login ?? 'unknown';
    const time = formatDate(pr.updatedAt);
    const branch = pr.head.ref ? ` ${pr.head.ref}` : '';

    lines.push(
      `${statusColor}${icon}${reset} ${bold}#${String(pr.number)}${reset} ${pr.title}${dim}${labels}${reset}`,
      `  ${dim}${author}${branch} • ${time}${reset}`
    );
  }

  return lines.join('\n');
}

export function formatPrViewText(pr: PullRequest, color = true): string {
  const icon = getStatusIcon(pr);
  const statusColor = color ? getStatusColor(pr) : '';
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';

  const status = pr.merged
    ? 'Merged'
    : pr.draft
      ? 'Draft'
      : pr.state === 'closed'
        ? 'Closed'
        : 'Open';
  const labels = pr.labels.length > 0 ? pr.labels.map((l) => l.name).join(', ') : 'none';
  const author = pr.user?.login ?? 'unknown';

  const lines: string[] = [
    `${bold}${pr.title}${reset} ${statusColor}${icon} ${status}${reset}`,
    `${cyan}${pr.htmlUrl}${reset}`,
    '',
    `${dim}author:${reset}    ${author}`,
    `${dim}branch:${reset}    ${pr.head.ref} -> ${pr.base.ref}`,
    `${dim}labels:${reset}    ${labels}`,
    `${dim}changes:${reset}   +${String(pr.additions)} -${String(pr.deletions)} in ${String(pr.changedFiles)} files`,
    `${dim}updated:${reset}   ${formatDate(pr.updatedAt)}`,
  ];

  if (pr.body) {
    lines.push('', `${dim}──${reset}`, '', pr.body);
  }

  return lines.join('\n');
}

export function formatPrFilesText(files: PrFile[], nameOnly = false, color = true): string {
  if (files.length === 0) {
    return 'No files changed';
  }

  if (nameOnly) {
    return files.map((f) => f.filename).join('\n');
  }

  const dim = color ? DIM : '';
  const reset = color ? RESET : '';
  const green = color ? '\x1b[32m' : '';
  const red = color ? '\x1b[31m' : '';

  const lines: string[] = [];
  for (const file of files) {
    const changes = `${green}+${String(file.additions)}${reset} ${red}-${String(file.deletions)}${reset}`;
    lines.push(`${dim}${file.status.padEnd(8)}${reset} ${file.filename} ${changes}`);
  }

  const totalAdd = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDel = files.reduce((sum, f) => sum + f.deletions, 0);
  lines.push(
    '',
    `${String(files.length)} files changed, ${green}${String(totalAdd)} insertions(+)${reset}, ${red}${String(totalDel)} deletions(-)${reset}`
  );

  return lines.join('\n');
}

export function formatPrCommentsText(comments: PrComment[], color = true): string {
  if (comments.length === 0) {
    return 'No comments';
  }

  const dim = color ? DIM : '';
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';

  const lines: string[] = [];
  for (const comment of comments) {
    const author = comment.user?.login ?? 'unknown';
    const time = formatDate(comment.createdAt);
    lines.push(`${bold}${author}${reset} ${dim}• ${time}${reset}`, comment.body, '');
  }

  return lines.join('\n').trim();
}

export function formatPrStateChangeText(
  pr: PullRequest,
  action: 'closed' | 'reopened' | 'ready' | 'draft',
  color = true
): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';
  const magenta = color ? '\x1b[35m' : '';

  const actionColor = action === 'closed' ? magenta : green;
  const actionText =
    action === 'closed'
      ? 'Closed'
      : action === 'reopened'
        ? 'Reopened'
        : action === 'ready'
          ? 'Marked as ready for review'
          : 'Converted to draft';

  return `${actionColor}${actionText}${reset} pull request ${bold}#${String(pr.number)}${reset} (${pr.title})`;
}

export function formatEditResultText(result: EditPrResult, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';

  const lines: string[] = [
    `${green}Updated${reset} pull request ${bold}#${String(result.number)}${reset} (${result.title})`,
    '',
  ];

  if (result.updatedFields.length > 0) {
    lines.push('Updated fields:');
    for (const field of result.updatedFields) {
      lines.push(`  • ${field}`);
    }
  }

  return lines.join('\n');
}

export function formatMergeResultText(
  result: MergeResult,
  pr: { number: number; title: string },
  deletedBranch?: string,
  color = true
): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const magenta = color ? '\x1b[35m' : '';
  const dim = color ? DIM : '';

  const lines: string[] = [
    `${magenta}Merged${reset} pull request ${bold}#${String(pr.number)}${reset} (${pr.title})`,
  ];

  if (deletedBranch) {
    lines.push(`${dim}Deleted branch ${deletedBranch}${reset}`);
  }

  return lines.join('\n');
}

export function formatAutoMergeText(
  enabled: boolean,
  prNumber: number,
  method: string,
  color = true
): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';
  const yellow = color ? '\x1b[33m' : '';

  if (enabled) {
    return `${green}Enabled${reset} auto-merge for ${bold}#${String(prNumber)}${reset} (${method})`;
  }
  return `${yellow}Disabled${reset} auto-merge for ${bold}#${String(prNumber)}${reset}`;
}

export function formatPrChecksText(checks: PrChecksResult, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';
  const red = color ? '\x1b[31m' : '';
  const yellow = color ? '\x1b[33m' : '';
  const dim = color ? DIM : '';

  const stateColor =
    checks.overallState === 'success' ? green : checks.overallState === 'failure' ? red : yellow;
  const stateIcon =
    checks.overallState === 'success' ? '✓' : checks.overallState === 'failure' ? '✗' : '●';

  const lines: string[] = [
    `${stateColor}${stateIcon}${reset} ${bold}${String(checks.passing)} passing${reset}, ${checks.failing > 0 ? red : ''}${String(checks.failing)} failing${reset}, ${checks.pending > 0 ? yellow : ''}${String(checks.pending)} pending${reset}`,
    '',
  ];

  // Show check runs
  for (const check of checks.checkRuns) {
    let icon: string;
    let statusColor: string;

    if (check.status !== 'completed') {
      icon = '●';
      statusColor = yellow;
    } else if (check.conclusion === 'success' || check.conclusion === 'skipped') {
      icon = '✓';
      statusColor = green;
    } else {
      icon = '✗';
      statusColor = red;
    }

    const conclusion =
      check.status === 'completed' ? (check.conclusion ?? 'unknown') : check.status;
    lines.push(`${statusColor}${icon}${reset} ${check.name} ${dim}(${conclusion})${reset}`);
  }

  // Show commit statuses
  for (const status of checks.statuses) {
    let icon: string;
    let statusColor: string;

    if (status.state === 'success') {
      icon = '✓';
      statusColor = green;
    } else if (status.state === 'failure' || status.state === 'error') {
      icon = '✗';
      statusColor = red;
    } else {
      icon = '●';
      statusColor = yellow;
    }

    lines.push(`${statusColor}${icon}${reset} ${status.context} ${dim}(${status.state})${reset}`);
  }

  return lines.join('\n');
}

export function formatPrStatusText(status: PrStatusResult, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';

  const lines: string[] = [];

  // Current branch PR
  if (status.currentBranchPr) {
    lines.push(`${bold}Current branch${reset}`);
    const pr = status.currentBranchPr;
    const icon = getStatusIcon(pr);
    const statusColor = color ? getStatusColor(pr) : '';
    const conflictStatus = getConflictStatus(pr, color);
    lines.push(
      `  ${statusColor}${icon}${reset} ${bold}#${String(pr.number)}${reset} ${pr.title}${conflictStatus} ${cyan}${pr.htmlUrl}${reset}`,
      ''
    );
  }

  // Created by you
  if (status.createdByYou.length > 0) {
    lines.push(`${bold}Created by you${reset}`);
    for (const pr of status.createdByYou) {
      const icon = getStatusIcon(pr);
      const statusColor = color ? getStatusColor(pr) : '';
      const conflictStatus = getConflictStatus(pr, color);
      lines.push(
        `  ${statusColor}${icon}${reset} ${bold}#${String(pr.number)}${reset} ${pr.title}${conflictStatus}`
      );
    }
    lines.push('');
  }

  // Review requested
  if (status.reviewRequested.length > 0) {
    lines.push(`${bold}Review requested${reset}`);
    for (const pr of status.reviewRequested) {
      const icon = getStatusIcon(pr);
      const statusColor = color ? getStatusColor(pr) : '';
      const author = pr.user?.login ?? 'unknown';
      const conflictStatus = getConflictStatus(pr, color);
      lines.push(
        `  ${statusColor}${icon}${reset} ${bold}#${String(pr.number)}${reset} ${pr.title}${conflictStatus} ${dim}by ${author}${reset}`
      );
    }
    lines.push('');
  }

  // Assigned to you
  if (status.assignedToYou.length > 0) {
    lines.push(`${bold}Assigned to you${reset}`);
    for (const pr of status.assignedToYou) {
      const icon = getStatusIcon(pr);
      const statusColor = color ? getStatusColor(pr) : '';
      const author = pr.user?.login ?? 'unknown';
      const conflictStatus = getConflictStatus(pr, color);
      lines.push(
        `  ${statusColor}${icon}${reset} ${bold}#${String(pr.number)}${reset} ${pr.title}${conflictStatus} ${dim}by ${author}${reset}`
      );
    }
  }

  if (lines.length === 0) {
    return 'No open pull requests';
  }

  return lines.join('\n').trim();
}

export function formatReviewSubmittedText(
  review: PrReview,
  event: string,
  prNumber: number,
  color = true
): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';

  const eventLabels = new Map<string, string>([
    ['APPROVE', 'Approved'],
    ['REQUEST_CHANGES', 'Requested changes on'],
    ['COMMENT', 'Reviewed'],
  ]);

  return `${green}${eventLabels.get(event) ?? event}${reset} pull request ${bold}#${String(prNumber)}${reset}`;
}

export function formatCommentCreatedText(
  comment: PrComment,
  prNumber: number,
  color = true
): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';
  const cyan = color ? CYAN : '';

  return `${green}Added comment${reset} to pull request ${bold}#${String(prNumber)}${reset}\n${cyan}${comment.htmlUrl}${reset}`;
}

export function formatCommentUpdatedText(
  comment: PrComment,
  prNumber: number,
  color = true
): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';
  const cyan = color ? CYAN : '';

  return `${green}Updated comment${reset} on pull request ${bold}#${String(prNumber)}${reset}\n${cyan}${comment.htmlUrl}${reset}`;
}

export function formatCommentDeletedText(prNumber: number, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';

  return `${green}Deleted comment${reset} from pull request ${bold}#${String(prNumber)}${reset}`;
}

export function formatCheckoutText(prNumber: number, branch: string, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? '\x1b[32m' : '';

  return `${green}Checked out${reset} pull request ${bold}#${String(prNumber)}${reset} to branch ${bold}${branch}${reset}`;
}
