import { Octokit } from 'octokit';

import { AuthenticationError } from './errors.js';
import { getToken } from './secrets.js';

// Re-export Octokit type for consumers that need it for dependency injection
export type { Octokit } from 'octokit';

const USER_AGENT = 'gh-vault/0.1.0';
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Create an authenticated Octokit client using the token from Keychain.
 * Throws AuthenticationError if no token is configured.
 */
export async function createGitHubClient(): Promise<Octokit> {
  const token = await getToken();
  if (!token) {
    throw new AuthenticationError();
  }

  return new Octokit({
    auth: token,
    userAgent: USER_AGENT,
    request: {
      timeout: REQUEST_TIMEOUT_MS,
    },
  });
}

export interface TokenInfo {
  login: string;
  scopes: string[];
  rateLimit: {
    remaining: number;
    limit: number;
  };
}

/**
 * Verify a GitHub token and retrieve user information.
 * Useful for validating tokens before storing them.
 */
export async function verifyToken(token: string): Promise<TokenInfo> {
  const octokit = new Octokit({
    auth: token,
    userAgent: USER_AGENT,
    request: {
      timeout: REQUEST_TIMEOUT_MS,
    },
  });

  const response = await octokit.request('GET /user');

  // Extract OAuth scopes from response headers
  const scopesHeader = response.headers['x-oauth-scopes'];
  const scopes =
    typeof scopesHeader === 'string'
      ? scopesHeader
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  // Extract rate limit info from response headers
  const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
  const rateLimitLimit = response.headers['x-ratelimit-limit'];

  return {
    login: response.data.login,
    scopes,
    rateLimit: {
      remaining: parseHeaderNumber(rateLimitRemaining, 0),
      limit: parseHeaderNumber(rateLimitLimit, 0),
    },
  };
}

function parseHeaderNumber(value: string | number | undefined, defaultValue: number): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}
