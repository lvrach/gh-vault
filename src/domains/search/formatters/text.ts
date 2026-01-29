/**
 * Text formatters for CLI output - human-readable format matching `gh` CLI style.
 */

import type {
  SearchCodeResult,
  SearchCommit,
  SearchIssue,
  SearchPullRequest,
  SearchRepository,
} from '../types.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';

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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return String(num);
}

export function formatReposText(repos: SearchRepository[], color = true): string {
  if (repos.length === 0) {
    return 'No repositories match your search';
  }

  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';
  const yellow = color ? YELLOW : '';

  const lines: string[] = [];

  for (const repo of repos) {
    const stars = `★ ${formatNumber(repo.stargazersCount)}`;
    const forks = repo.forksCount > 0 ? ` • ${formatNumber(repo.forksCount)} forks` : '';
    const lang = repo.language ? ` • ${repo.language}` : '';
    const archived = repo.isArchived ? ` ${yellow}(archived)${reset}` : '';
    const visibility = repo.isPrivate ? ` ${dim}(private)${reset}` : '';

    lines.push(`${bold}${repo.fullName}${reset}${archived}${visibility}`);

    if (repo.description) {
      lines.push(`  ${truncate(repo.description, 80)}`);
    }

    lines.push(
      `  ${cyan}${stars}${reset}${forks}${lang} • Updated ${formatDate(repo.updatedAt)}`,
      ''
    );
  }

  return lines.join('\n').trim();
}

export function formatIssuesText(issues: SearchIssue[], color = true): string {
  if (issues.length === 0) {
    return 'No issues match your search';
  }

  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const green = color ? GREEN : '';
  const red = color ? RED : '';

  const lines: string[] = [];

  for (const issue of issues) {
    const stateIcon = issue.state === 'open' ? '●' : '✗';
    const stateColor = issue.state === 'open' ? green : red;
    const labels =
      issue.labels.length > 0
        ? ` ${dim}[${issue.labels.map((l) => l.name).join(', ')}]${reset}`
        : '';
    const repo = `${dim}${issue.repository.fullName}${reset}`;

    lines.push(
      `${stateColor}${stateIcon}${reset} ${bold}${repo}#${String(issue.number)}${reset} ${issue.title}${labels}`,
      `  ${dim}@${issue.user?.login ?? 'unknown'} • ${formatDate(issue.updatedAt)}${reset}`
    );
  }

  return lines.join('\n');
}

export function formatPrsText(prs: SearchPullRequest[], color = true): string {
  if (prs.length === 0) {
    return 'No pull requests match your search';
  }

  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const green = color ? GREEN : '';
  const red = color ? RED : '';
  const magenta = color ? MAGENTA : '';

  const lines: string[] = [];

  for (const pr of prs) {
    let stateIcon: string;
    let stateColor: string;

    if (pr.isDraft) {
      stateIcon = '○';
      stateColor = dim;
    } else if (pr.state === 'open') {
      stateIcon = '●';
      stateColor = green;
    } else {
      stateIcon = '✗';
      stateColor = red;
    }

    const labels =
      pr.labels.length > 0 ? ` ${dim}[${pr.labels.map((l) => l.name).join(', ')}]${reset}` : '';
    const repo = `${dim}${pr.repository.fullName}${reset}`;
    const draft = pr.isDraft ? ` ${magenta}(draft)${reset}` : '';

    lines.push(
      `${stateColor}${stateIcon}${reset} ${bold}${repo}#${String(pr.number)}${reset} ${pr.title}${draft}${labels}`,
      `  ${dim}@${pr.user?.login ?? 'unknown'} • ${formatDate(pr.updatedAt)}${reset}`
    );
  }

  return lines.join('\n');
}

export function formatCommitsText(commits: SearchCommit[], color = true): string {
  if (commits.length === 0) {
    return 'No commits match your search';
  }

  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const yellow = color ? YELLOW : '';

  const lines: string[] = [];

  for (const commit of commits) {
    const shortSha = commit.sha.slice(0, 7);
    const firstLine = commit.message.split('\n')[0] ?? '';
    const author = commit.author.name;
    const date = formatDate(commit.author.date);
    const repo = `${dim}${commit.repository.fullName}${reset}`;

    lines.push(
      `${yellow}${shortSha}${reset} ${bold}${truncate(firstLine, 70)}${reset}`,
      `  ${repo} • ${author} • ${date}`
    );
  }

  return lines.join('\n');
}

export function formatCodeText(results: SearchCodeResult[], color = true): string {
  if (results.length === 0) {
    return 'No code matches your search';
  }

  const reset = color ? RESET : '';
  const bold = color ? BOLD : '';
  const dim = color ? DIM : '';
  const cyan = color ? CYAN : '';

  const lines: string[] = [];

  for (const result of results) {
    const repo = `${dim}${result.repository.fullName}${reset}`;

    lines.push(`${bold}${result.path}${reset}`, `  ${repo}`);

    // Show text matches if available
    if (result.textMatches && result.textMatches.length > 0) {
      for (const match of result.textMatches.slice(0, 2)) {
        const preview = truncate(match.fragment.replaceAll('\n', ' ').trim(), 80);
        lines.push(`  ${cyan}>${reset} ${preview}`);
      }
    }
  }

  return lines.join('\n');
}
