/**
 * Shared mock helpers for MSW handlers.
 * These utilities are used across all domain handlers for consistent responses.
 */

import { HttpResponse } from 'msw';

/**
 * Generate standard GitHub API rate limit headers.
 */
export function ratelimitHeaders(): Record<string, string> {
  return {
    'x-ratelimit-limit': '5000',
    'x-ratelimit-remaining': '4998',
    'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    'x-ratelimit-used': '2',
    'x-ratelimit-resource': 'core',
  };
}

/**
 * Generate rate limit headers for search endpoints (different limits).
 */
export function searchRatelimitHeaders(): Record<string, string> {
  return {
    'x-ratelimit-limit': '30',
    'x-ratelimit-remaining': '29',
    'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
    'x-ratelimit-used': '1',
    'x-ratelimit-resource': 'search',
  };
}

/**
 * Create a standard GitHub API error response.
 */
export function createErrorResponse(
  status: number,
  message: string,
  documentationUrl = 'https://docs.github.com/rest'
): Response {
  return HttpResponse.json(
    { message, documentation_url: documentationUrl },
    { status, headers: ratelimitHeaders() }
  );
}

/**
 * Magic number pattern for error testing.
 * PR/Run/Issue #404 returns 404, #403 returns 403, etc.
 *
 * Returns an error response if the ID matches a magic number, null otherwise.
 */
export function handleMagicNumber(id: number): Response | null {
  if (id === 404) {
    return createErrorResponse(404, 'Not Found');
  }
  if (id === 403) {
    return createErrorResponse(403, 'Forbidden');
  }
  if (id === 500) {
    return createErrorResponse(500, 'Internal Server Error');
  }
  if (id === 422) {
    return createErrorResponse(422, 'Validation Failed');
  }
  return null;
}
