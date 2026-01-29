/**
 * Markdown formatters for MCP output.
 * Returns Markdown that LLMs can easily parse and understand.
 */

import type {
  SearchCodeResult,
  SearchCommit,
  SearchIssue,
  SearchPullRequest,
  SearchRepository,
  SearchResult,
} from '../types.js';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

export function formatReposMarkdown(result: SearchResult<SearchRepository>): string {
  if (result.items.length === 0) {
    return 'No repositories match your search.';
  }

  const lines: string[] = [
    `# Repository Search Results (${formatNumber(result.totalCount)} total)`,
    '',
  ];

  for (const repo of result.items) {
    const badges: string[] = [];
    if (repo.isArchived) badges.push('archived');
    if (repo.isPrivate) badges.push('private');
    if (repo.isFork) badges.push('fork');
    const badgeText = badges.length > 0 ? ` (${badges.join(', ')})` : '';

    lines.push(`## [${repo.fullName}](${repo.htmlUrl})${badgeText}`, '');

    if (repo.description) {
      lines.push(repo.description, '');
    }

    const stats: string[] = [
      `⭐ ${formatNumber(repo.stargazersCount)}`,
      `🍴 ${formatNumber(repo.forksCount)}`,
    ];
    if (repo.language) stats.push(`📝 ${repo.language}`);
    if (repo.license) stats.push(`📜 ${repo.license.name}`);

    lines.push(stats.join(' | '), '', `Updated: ${formatDate(repo.updatedAt)}`);

    if (repo.topics.length > 0) {
      lines.push(`Topics: ${repo.topics.map((t) => `\`${t}\``).join(', ')}`);
    }

    lines.push('', '---', '');
  }

  return lines.join('\n').trim();
}

export function formatIssuesMarkdown(result: SearchResult<SearchIssue>): string {
  if (result.items.length === 0) {
    return 'No issues match your search.';
  }

  const lines: string[] = [`# Issue Search Results (${formatNumber(result.totalCount)} total)`, ''];

  for (const issue of result.items) {
    const stateEmoji = issue.state === 'open' ? '🟢' : '🔴';
    const labels =
      issue.labels.length > 0 ? ` [${issue.labels.map((l) => l.name).join(', ')}]` : '';

    lines.push(
      `## ${stateEmoji} [${issue.repository.fullName}#${String(issue.number)}](${issue.htmlUrl})`,
      '',
      `**${issue.title}**${labels}`,
      '',
      `Author: @${issue.user?.login ?? 'unknown'} | Comments: ${String(issue.commentsCount)} | Updated: ${formatDate(issue.updatedAt)}`
    );

    if (issue.assignees.length > 0) {
      lines.push(`Assignees: ${issue.assignees.map((a) => `@${a.login}`).join(', ')}`);
    }

    lines.push('', '---', '');
  }

  return lines.join('\n').trim();
}

export function formatPrsMarkdown(result: SearchResult<SearchPullRequest>): string {
  if (result.items.length === 0) {
    return 'No pull requests match your search.';
  }

  const lines: string[] = [
    `# Pull Request Search Results (${formatNumber(result.totalCount)} total)`,
    '',
  ];

  for (const pr of result.items) {
    let stateEmoji: string;
    if (pr.isDraft) {
      stateEmoji = '⚪';
    } else if (pr.state === 'open') {
      stateEmoji = '🟢';
    } else {
      stateEmoji = '🔴';
    }

    const labels = pr.labels.length > 0 ? ` [${pr.labels.map((l) => l.name).join(', ')}]` : '';
    const draft = pr.isDraft ? ' (draft)' : '';

    lines.push(
      `## ${stateEmoji} [${pr.repository.fullName}#${String(pr.number)}](${pr.htmlUrl})`,
      '',
      `**${pr.title}**${draft}${labels}`,
      '',
      `Author: @${pr.user?.login ?? 'unknown'} | Comments: ${String(pr.commentsCount)} | Updated: ${formatDate(pr.updatedAt)}`
    );

    if (pr.assignees.length > 0) {
      lines.push(`Assignees: ${pr.assignees.map((a) => `@${a.login}`).join(', ')}`);
    }

    lines.push('', '---', '');
  }

  return lines.join('\n').trim();
}

export function formatCommitsMarkdown(result: SearchResult<SearchCommit>): string {
  if (result.items.length === 0) {
    return 'No commits match your search.';
  }

  const lines: string[] = [
    `# Commit Search Results (${formatNumber(result.totalCount)} total)`,
    '',
  ];

  for (const commit of result.items) {
    const shortSha = commit.sha.slice(0, 7);
    const firstLine = commit.message.split('\n')[0] ?? '';
    const author = commit.author.name;
    const date = formatDate(commit.author.date);

    lines.push(
      `## [\`${shortSha}\`](${commit.htmlUrl}) - ${commit.repository.fullName}`,
      '',
      `**${firstLine}**`,
      '',
      `Author: ${author} | Date: ${date}`
    );

    // Show full message if multi-line
    const messageLines = commit.message.split('\n');
    if (messageLines.length > 1) {
      lines.push('', '```', commit.message, '```');
    }

    lines.push('', '---', '');
  }

  return lines.join('\n').trim();
}

export function formatCodeMarkdown(result: SearchResult<SearchCodeResult>): string {
  if (result.items.length === 0) {
    return 'No code matches your search.';
  }

  const lines: string[] = [`# Code Search Results (${formatNumber(result.totalCount)} total)`, ''];

  for (const item of result.items) {
    lines.push(
      `## [${item.path}](${item.htmlUrl})`,
      '',
      `Repository: [${item.repository.fullName}](${item.repository.htmlUrl})`,
      ''
    );

    // Show text matches if available
    if (item.textMatches && item.textMatches.length > 0) {
      lines.push('**Matches:**', '');
      for (const match of item.textMatches) {
        lines.push('```', match.fragment, '```', '');
      }
    }

    lines.push('---', '');
  }

  return lines.join('\n').trim();
}
