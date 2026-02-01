/**
 * Text formatters for CLI output - human-readable format matching `gh` CLI style.
 */

import type { Repository, RepositoryListItem } from '../types.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const _GRAY = '\x1b[90m';
const MAGENTA = '\x1b[35m';

function getVisibilityIcon(repo: Repository | RepositoryListItem): string {
  if (repo.archived) return '📦';
  if (repo.private) return '🔒';
  if (repo.fork) return '🔀';
  return '📂';
}

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

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}m`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return String(num);
}

/**
 * Format repository list for CLI output.
 */
export function formatRepoListText(repos: RepositoryListItem[], color = true): string {
  if (repos.length === 0) {
    return 'No repositories found';
  }

  const lines: string[] = [];
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';
  const yellow = color ? YELLOW : '';

  for (const repo of repos) {
    const icon = getVisibilityIcon(repo);
    const description = repo.description ? ` - ${repo.description}` : '';
    const language = repo.language ?? '';
    const stars = repo.stargazersCount > 0 ? `⭐${formatNumber(repo.stargazersCount)}` : '';
    const forks = repo.forksCount > 0 ? `🔀${formatNumber(repo.forksCount)}` : '';
    const archived = repo.archived ? `${yellow}[archived]${reset}` : '';
    const template = repo.isTemplate ? `${dim}[template]${reset}` : '';

    const stats = [language, stars, forks].filter(Boolean).join(' ');
    const badges = [archived, template].filter(Boolean).join(' ');

    lines.push(
      `${icon} ${bold}${repo.fullName}${reset}${description}`,
      `  ${dim}${stats}${reset} ${badges} ${cyan}${formatDate(repo.pushedAt ?? repo.updatedAt)}${reset}`
    );
  }

  return lines.join('\n');
}

/**
 * Format single repository view for CLI output.
 */
export function formatRepoViewText(repo: Repository, readme?: string | null, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';
  const yellow = color ? YELLOW : '';
  const green = color ? GREEN : '';

  const visibilityBadge = repo.private
    ? `${yellow}private${reset}`
    : repo.visibility === 'internal'
      ? `${yellow}internal${reset}`
      : `${green}public${reset}`;

  const lines: string[] = [
    `${bold}${repo.fullName}${reset} ${visibilityBadge}`,
    `${cyan}${repo.htmlUrl}${reset}`,
    '',
  ];

  if (repo.description) {
    lines.push(repo.description, '');
  }

  // Stats line
  const stats: string[] = [];
  if (repo.stargazersCount > 0) stats.push(`⭐ ${formatNumber(repo.stargazersCount)} stars`);
  if (repo.forksCount > 0) stats.push(`🔀 ${formatNumber(repo.forksCount)} forks`);
  if (repo.openIssuesCount > 0) stats.push(`📋 ${formatNumber(repo.openIssuesCount)} open issues`);
  if (repo.watchersCount > 0) stats.push(`👀 ${formatNumber(repo.watchersCount)} watching`);

  if (stats.length > 0) {
    lines.push(stats.join(' • '), '');
  }

  // Details
  lines.push(
    `${dim}Language:${reset}       ${repo.language ?? 'Not specified'}`,
    `${dim}Default branch:${reset} ${repo.defaultBranch}`,
    `${dim}License:${reset}        ${repo.license?.name ?? 'No license'}`,
    `${dim}Created:${reset}        ${formatDate(repo.createdAt)}`,
    `${dim}Updated:${reset}        ${formatDate(repo.updatedAt)}`
  );

  if (repo.topics.length > 0) {
    lines.push(`${dim}Topics:${reset}         ${repo.topics.join(', ')}`);
  }

  if (repo.archived) {
    lines.push('', `${yellow}⚠ This repository is archived${reset}`);
  }

  if (repo.fork && repo.parent) {
    lines.push('', `${dim}Forked from ${repo.parent.fullName}${reset}`);
  }

  // README
  if (readme) {
    lines.push('', `${dim}─── README ───${reset}`, '', readme);
  }

  return lines.join('\n');
}

/**
 * Format repository creation result.
 */
export function formatRepoCreatedText(repo: Repository, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? GREEN : '';
  const cyan = color ? CYAN : '';

  return `${green}Created${reset} repository ${bold}${repo.fullName}${reset}\n${cyan}${repo.htmlUrl}${reset}`;
}

/**
 * Format repository fork result.
 */
export function formatRepoForkedText(repo: Repository, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? GREEN : '';
  const cyan = color ? CYAN : '';

  const parentInfo = repo.parent ? ` from ${bold}${repo.parent.fullName}${reset}` : '';

  return `${green}Forked${reset}${parentInfo} to ${bold}${repo.fullName}${reset}\n${cyan}${repo.htmlUrl}${reset}`;
}

/**
 * Format repository edit result.
 */
export function formatRepoEditedText(repo: Repository, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const green = color ? GREEN : '';

  return `${green}Updated${reset} repository ${bold}${repo.fullName}${reset}`;
}

/**
 * Format repository delete result.
 */
export function formatRepoDeletedText(fullName: string, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const magenta = color ? MAGENTA : '';

  return `${magenta}Deleted${reset} repository ${bold}${fullName}${reset}`;
}

/**
 * Format repository archive result.
 */
export function formatRepoArchivedText(repo: Repository, archived: boolean, color = true): string {
  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const yellow = color ? YELLOW : '';
  const green = color ? GREEN : '';

  const action = archived ? `${yellow}Archived${reset}` : `${green}Unarchived${reset}`;

  return `${action} repository ${bold}${repo.fullName}${reset}`;
}

/**
 * Format clone instructions.
 */
export function formatCloneInstructions(repo: Repository, color = true): string {
  const reset = color ? RESET : '';
  const dim = color ? DIM : '';

  return [
    `${dim}Clone with HTTPS:${reset}  git clone ${repo.cloneUrl}`,
    `${dim}Clone with SSH:${reset}    git clone ${repo.sshUrl}`,
  ].join('\n');
}
