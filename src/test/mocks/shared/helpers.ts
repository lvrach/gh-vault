/**
 * Shared mock helpers for MSW handlers.
 * These utilities are used across all domain handlers for consistent responses.
 */

import { HttpResponse } from 'msw';

import {
  getMagicErrorMessage,
  isMagicErrorId,
} from './constants.js';

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
 *
 * When a test uses one of these IDs, the mock handler returns the corresponding
 * HTTP error instead of success data. This allows testing error handling without
 * complex mock setup.
 *
 * Supported magic numbers:
 * - ID 404 → 404 Not Found
 * - ID 403 → 403 Forbidden
 * - ID 409 → 409 Conflict (merge conflicts, state conflicts)
 * - ID 422 → 422 Unprocessable Entity (validation errors)
 * - ID 500 → 500 Internal Server Error
 *
 * @example
 * ```typescript
 * // In a test file
 * import { MAGIC_ERROR_IDS } from '../mocks/shared/constants.js';
 *
 * it('handles 404 error', async () => {
 *   await expect(api.getPr(MAGIC_ERROR_IDS.NOT_FOUND)).rejects.toThrow();
 * });
 * ```
 *
 * @param id - The ID to check (PR number, run ID, issue number, etc.)
 * @returns An error Response if the ID matches a magic number, null otherwise
 */
export function handleMagicNumber(id: number): Response | null {
  if (!isMagicErrorId(id)) {
    return null;
  }

  return createErrorResponse(id, getMagicErrorMessage(id));
}

// Re-export constants for convenience


export {MAGIC_ERROR_IDS, StatusCodes} from './constants.js';