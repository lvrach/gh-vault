/**
 * CLI error handling - central place for error formatting.
 *
 * Note: This module only FORMATS errors. It does NOT set process.exitCode.
 * The single exit point (main function in index.ts) sets exitCode.
 */

import {
  AuthenticationError,
  formatPermissionError,
  InvalidTokenFormatError,
  isPermissionError,
  TokenDisplayDisabledError,
} from '../shared/errors.js';
import type { Output } from '../shared/output.js';

// ============================================================================
// Error Details Registry
// ============================================================================

/**
 * Maps error classes to their CLI-friendly details.
 * The error's message property is used as the title.
 * Details are additional lines shown after the title.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CLI_ERROR_DETAILS = new Map<new (...args: any[]) => Error, string[]>([
  [AuthenticationError, ['', 'Run: gh-vault auth login']],
  [
    InvalidTokenFormatError,
    [
      '',
      'Expected: github_pat_... (fine-grained personal access token)',
      '',
      'Create a token at: https://github.com/settings/personal-access-tokens',
    ],
  ],
  [
    TokenDisplayDisabledError,
    [
      '',
      'Tokens in terminal output can leak to shell history and logs.',
      '',
      'To verify authentication: gh-vault auth status',
    ],
  ],
]);

// ============================================================================
// Error Handler
// ============================================================================

/**
 * Format and output an error message.
 *
 * Domain-specific errors get tailored user-friendly messages.
 * Does NOT set process.exitCode - caller is responsible for that.
 */
export function handleError(error: unknown, output: Output): void {
  // Permission error (403) - special handling with permission context
  if (isPermissionError(error)) {
    output.printError(formatPermissionError('unknown'));
    return;
  }

  // Handle Error instances
  if (error instanceof Error) {
    output.printError(`Error: ${error.message}`);

    // Look up additional details for known error types
    const details = CLI_ERROR_DETAILS.get(error.constructor as new (...args: unknown[]) => Error);
    if (details) {
      for (const line of details) {
        output.printError(line);
      }
    }
    return;
  }

  // Unknown error type
  output.printError('Error: Unknown error');
}
