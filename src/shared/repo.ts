import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { createGitHubClient } from './github.js';

const execFileAsync = promisify(execFile);

// ============================================================================
// CLI Utility Types and Functions
// ============================================================================

/**
 * Result of resolving a repository from CLI options.
 */
export type ResolveRepoResult =
  | { success: true; owner: string; repo: string }
  | { success: false; error: string };

/**
 * Resolve repository from CLI --repo option or git detection.
 * Use this in CLI commands to avoid duplicating the resolution logic.
 */
export async function resolveRepository(repoOption?: string): Promise<ResolveRepoResult> {
  if (repoOption) {
    const parts = repoOption.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { success: false, error: 'Invalid repository format. Use owner/repo' };
    }
    return { success: true, owner: parts[0], repo: parts[1] };
  }

  const detection = await detectRepo();
  if (!detection.success) {
    return { success: false, error: 'Could not detect repository. Use -R owner/repo to specify.' };
  }
  return { success: true, owner: detection.info.owner, repo: detection.info.repo };
}

/**
 * Result of resolving a PR number from CLI arguments.
 * When a URL is provided, owner and repo are also extracted.
 */
export type ResolvePrResult =
  | { success: true; pullNumber: number; owner?: string; repo?: string }
  | { success: false; error: string };

/**
 * Resolve PR number from CLI argument (number, branch, or URL).
 * If no argument provided, tries to find PR for current branch.
 */
export async function resolvePrNumber(
  prArg: string | undefined,
  owner: string,
  repo: string,
  listPrs: (opts: {
    owner: string;
    repo: string;
    head: string;
    state: 'open' | 'closed' | 'all';
  }) => Promise<{ number: number }[]>
): Promise<ResolvePrResult> {
  if (!prArg) {
    // No arg - try to find PR for current branch
    const branch = await getCurrentBranch();
    if (!branch) {
      return { success: false, error: 'Could not determine current branch' };
    }

    const prs = await listPrs({ owner, repo, head: `${owner}:${branch}`, state: 'open' });
    const firstPr = prs[0];
    if (!firstPr) {
      return { success: false, error: `No open PR found for branch '${branch}'` };
    }
    return { success: true, pullNumber: firstPr.number };
  }

  const parsed = parsePrRef(prArg);
  if (!parsed) {
    return { success: false, error: 'Invalid PR reference' };
  }

  if (parsed.type === 'number') {
    // If owner/repo were extracted from URL, include them in the result
    const result: ResolvePrResult = { success: true, pullNumber: parsed.value };
    if (parsed.owner) result.owner = parsed.owner;
    if (parsed.repo) result.repo = parsed.repo;
    return result;
  }

  // Branch name - find PR
  const prs = await listPrs({ owner, repo, head: `${owner}:${parsed.value}`, state: 'open' });
  const firstPr = prs[0];
  if (!firstPr) {
    return { success: false, error: `No open PR found for branch '${parsed.value}'` };
  }
  return { success: true, pullNumber: firstPr.number };
}

// ============================================================================
// Repository Detection
// ============================================================================

export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  remoteUrl: string;
}

/**
 * Parse a GitHub remote URL to extract owner and repo.
 * Supports both HTTPS and SSH formats:
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - https://github.com/owner/repo
 */
export function parseGitHubRemoteUrl(url: string): RepoInfo | null {
  // HTTPS format: https://github.com/owner/repo.git or https://github.com/owner/repo
  // Repo names can contain dots, so we match everything except / and strip .git suffix
  const httpsRegex = /https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/;
  const httpsMatch = httpsRegex.exec(url);
  if (httpsMatch?.[1] && httpsMatch[2]) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
      fullName: `${httpsMatch[1]}/${httpsMatch[2]}`,
      remoteUrl: url,
    };
  }

  // SSH format: git@github.com:owner/repo.git
  const sshRegex = /git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/;
  const sshMatch = sshRegex.exec(url);
  if (sshMatch?.[1] && sshMatch[2]) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
      fullName: `${sshMatch[1]}/${sshMatch[2]}`,
      remoteUrl: url,
    };
  }

  return null;
}

export interface RepoDetectionResult {
  success: true;
  info: RepoInfo;
  remoteName: string;
  directory: string;
}

export interface RepoDetectionError {
  success: false;
  error: 'not-git-repo' | 'no-remotes' | 'no-github-remote';
  directory: string;
  remoteNames?: string[];
}

export type RepoDetection = RepoDetectionResult | RepoDetectionError;

/**
 * Get the current GitHub repository from git remote.
 * Checks the 'origin' remote first, then falls back to any GitHub remote.
 */
export async function detectRepo(directory?: string): Promise<RepoDetection> {
  const cwd = directory ?? process.cwd();

  // First check if we're in a git repository
  try {
    await execFileAsync('git', ['rev-parse', '--git-dir'], { cwd });
  } catch {
    return { success: false, error: 'not-git-repo', directory: cwd };
  }

  // Get all remotes
  let remotes: string;
  try {
    const result = await execFileAsync('git', ['remote', '-v'], { cwd });
    remotes = result.stdout;
  } catch {
    return { success: false, error: 'no-remotes', directory: cwd };
  }

  if (!remotes.trim()) {
    return { success: false, error: 'no-remotes', directory: cwd };
  }

  // Parse remotes - format: "name\turl (fetch|push)"
  const remoteLines = remotes.trim().split('\n');
  const remoteMap = new Map<string, string>();

  const remoteLineRegex = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/;
  for (const line of remoteLines) {
    const match = remoteLineRegex.exec(line);
    if (match?.[1] && match[2] && match[3] === 'fetch') {
      remoteMap.set(match[1], match[2]);
    }
  }

  // Try origin first
  const originUrl = remoteMap.get('origin');
  if (originUrl) {
    const info = parseGitHubRemoteUrl(originUrl);
    if (info) {
      return { success: true, info, remoteName: 'origin', directory: cwd };
    }
  }

  // Try any GitHub remote
  for (const [name, url] of remoteMap) {
    const info = parseGitHubRemoteUrl(url);
    if (info) {
      return { success: true, info, remoteName: name, directory: cwd };
    }
  }

  // No GitHub remote found
  return {
    success: false,
    error: 'no-github-remote',
    directory: cwd,
    remoteNames: [...remoteMap.keys()],
  };
}

/**
 * Get the current branch name.
 */
export async function getCurrentBranch(directory?: string): Promise<string | null> {
  const cwd = directory ?? process.cwd();
  try {
    const result = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Get the default branch for a repository.
 */
export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const client = await createGitHubClient();
  const { data } = await client.rest.repos.get({ owner, repo });
  return data.default_branch;
}

export interface PrRefNumber {
  type: 'number';
  value: number;
  /** Owner extracted from URL, if provided */
  owner?: string;
  /** Repo extracted from URL, if provided */
  repo?: string;
}

export interface PrRefBranch {
  type: 'branch';
  value: string;
}

export type PrRef = PrRefNumber | PrRefBranch;

/**
 * Parse a GitHub PR URL using the built-in URL API.
 * More maintainable than regex - uses structured URL parsing.
 *
 * Supports:
 * - https://github.com/owner/repo/pull/123
 * - github.com/owner/repo/pull/123 (without protocol)
 * - URLs with query strings or fragments
 *
 * @returns Extracted owner, repo, and PR number, or null if not a valid PR URL
 */
function parseGitHubPrUrl(
  ref: string
): { owner: string; repo: string; prNumber: number } | null {
  try {
    // Normalize URL - add protocol if missing
    const urlString = ref.startsWith('http') ? ref : `https://${ref}`;
    const url = new URL(urlString);

    // Validate hostname
    if (!url.hostname.includes('github.com')) {
      return null;
    }

    // Parse pathname: /owner/repo/pull/123
    // Filter removes empty strings from leading/trailing slashes
    const parts = url.pathname.split('/').filter(Boolean);

    // Validate structure: expect ['owner', 'repo', 'pull', 'number']
    const owner = parts[0];
    const repo = parts[1];
    const pullSegment = parts[2];
    const prNumberStr = parts[3];

    if (!owner || !repo || pullSegment !== 'pull' || !prNumberStr) {
      return null;
    }

    const prNumber = Number.parseInt(prNumberStr, 10);

    // Validate PR number
    if (Number.isNaN(prNumber) || prNumber <= 0) {
      return null;
    }

    return { owner, repo, prNumber };
  } catch {
    // Invalid URL format
    return null;
  }
}

/**
 * Parse a PR reference which can be:
 * - A number: 123
 * - A branch name: feature-branch
 * - A URL: https://github.com/owner/repo/pull/123
 *
 * When a URL is provided, owner and repo are extracted and included in the result.
 */
export function parsePrRef(ref: string): PrRef | null {
  // Try as number first
  const num = Number.parseInt(ref, 10);
  if (!Number.isNaN(num) && num > 0 && String(num) === ref) {
    return { type: 'number', value: num };
  }

  // Try as GitHub URL using structured URL parsing
  const urlParsed = parseGitHubPrUrl(ref);
  if (urlParsed) {
    return {
      type: 'number',
      value: urlParsed.prNumber,
      owner: urlParsed.owner,
      repo: urlParsed.repo,
    };
  }

  // Treat as branch name
  if (ref && !ref.includes(' ')) {
    return { type: 'branch', value: ref };
  }

  return null;
}

/**
 * Fetch a ref from a remote.
 */
export async function gitFetch(remote: string, ref: string, directory?: string): Promise<void> {
  const cwd = directory ?? process.cwd();
  await execFileAsync('git', ['fetch', remote, ref], { cwd });
}

/**
 * Checkout a branch or commit.
 */
export async function gitCheckout(
  target: string,
  options?: {
    create?: boolean | undefined;
    detach?: boolean | undefined;
    force?: boolean | undefined;
  },
  directory?: string
): Promise<void> {
  const cwd = directory ?? process.cwd();
  const args = ['checkout'];

  if (options?.detach) {
    args.push('--detach');
  } else if (options?.create) {
    args.push('-b');
  }

  if (options?.force) {
    args.push('-f');
  }

  args.push(target);
  await execFileAsync('git', args, { cwd });
}

/**
 * Check if a local branch exists.
 */
export async function localBranchExists(branch: string, directory?: string): Promise<boolean> {
  const cwd = directory ?? process.cwd();
  try {
    await execFileAsync('git', ['rev-parse', '--verify', `refs/heads/${branch}`], { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Update submodules recursively.
 */
export async function updateSubmodules(directory?: string): Promise<void> {
  const cwd = directory ?? process.cwd();
  await execFileAsync('git', ['submodule', 'update', '--init', '--recursive'], { cwd });
}

/**
 * Reset a branch to match a ref.
 */
export async function gitReset(ref: string, hard = false, directory?: string): Promise<void> {
  const cwd = directory ?? process.cwd();
  const args = ['reset'];
  if (hard) args.push('--hard');
  args.push(ref);
  await execFileAsync('git', args, { cwd });
}

/**
 * Get commit info for the --fill flag.
 * Returns the subject and body of the latest commit on the current branch
 * that's not on the base branch.
 */
export async function getCommitInfo(
  baseBranch: string,
  directory?: string
): Promise<{ title: string; body: string }> {
  const cwd = directory ?? process.cwd();

  // Get the first commit that differs from base
  try {
    // Get the subject (first line) of the first new commit
    const subjectResult = await execFileAsync(
      'git',
      ['log', `${baseBranch}..HEAD`, '--format=%s', '-n', '1'],
      { cwd }
    );
    const title = subjectResult.stdout.trim();

    // Get the body (everything after first line) of the first new commit
    const bodyResult = await execFileAsync(
      'git',
      ['log', `${baseBranch}..HEAD`, '--format=%b', '-n', '1'],
      { cwd }
    );
    const body = bodyResult.stdout.trim();

    return { title: title || '', body: body || '' };
  } catch {
    // If there are no new commits, get the HEAD commit
    const subjectResult = await execFileAsync('git', ['log', '--format=%s', '-n', '1'], { cwd });
    const bodyResult = await execFileAsync('git', ['log', '--format=%b', '-n', '1'], { cwd });

    return {
      title: subjectResult.stdout.trim(),
      body: bodyResult.stdout.trim(),
    };
  }
}
