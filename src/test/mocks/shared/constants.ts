/**
 * HTTP Status Code Constants for Test Infrastructure.
 *
 * Uses http-status-codes library for RFC-compliant status codes.
 * These constants are used in the magic number pattern for error testing.
 */

import { getReasonPhrase, StatusCodes } from 'http-status-codes';

/**
 * Magic number pattern for error testing.
 *
 * When a test uses one of these IDs (e.g., PR #404), the mock handler
 * will return the corresponding HTTP error instead of success data.
 *
 * @example
 * ```typescript
 * // In a test - triggers 404 Not Found response
 * await prApi.getPr({ owner: 'test', repo: 'repo', pullNumber: MAGIC_ERROR_IDS.NOT_FOUND });
 *
 * // In a test - triggers 403 Forbidden response
 * await prApi.getPr({ owner: 'test', repo: 'repo', pullNumber: MAGIC_ERROR_IDS.FORBIDDEN });
 * ```
 */
export const MAGIC_ERROR_IDS = {
  /** Use ID 404 to trigger 404 Not Found */
  NOT_FOUND: StatusCodes.NOT_FOUND,
  /** Use ID 403 to trigger 403 Forbidden */
  FORBIDDEN: StatusCodes.FORBIDDEN,
  /** Use ID 409 to trigger 409 Conflict (e.g., merge conflicts) */
  CONFLICT: StatusCodes.CONFLICT,
  /** Use ID 422 to trigger 422 Unprocessable Entity (validation errors) */
  UNPROCESSABLE_ENTITY: StatusCodes.UNPROCESSABLE_ENTITY,
  /** Use ID 500 to trigger 500 Internal Server Error */
  INTERNAL_SERVER_ERROR: StatusCodes.INTERNAL_SERVER_ERROR,
} as const;

export type MagicErrorId = (typeof MAGIC_ERROR_IDS)[keyof typeof MAGIC_ERROR_IDS];

/**
 * Check if a given ID is a magic error ID that should trigger an error response.
 */
export function isMagicErrorId(id: number): id is MagicErrorId {
  return Object.values(MAGIC_ERROR_IDS).includes(id as MagicErrorId);
}

/**
 * Get the error message for a magic error ID.
 */
export function getMagicErrorMessage(id: MagicErrorId): string {
  return getReasonPhrase(id);
}

// Re-export StatusCodes for convenience

export { getReasonPhrase, StatusCodes } from 'http-status-codes';
