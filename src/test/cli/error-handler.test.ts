/**
 * Error handler tests.
 */

import { describe, expect, it, vi } from 'vitest';

import { handleError } from '../../cli/error-handler.js';
import {
  AuthenticationError,
  ClassicTokenError,
  InvalidTokenFormatError,
  TokenDisplayDisabledError,
} from '../../shared/errors.js';
import type { Output } from '../../shared/output.js';

// ============================================================================
// Helpers
// ============================================================================

function createMockOutput(): { print: ReturnType<typeof vi.fn>; printError: ReturnType<typeof vi.fn> } {
  return { print: vi.fn(), printError: vi.fn() };
}

function getOutput(mock: ReturnType<typeof createMockOutput>): string[] {
  return mock.printError.mock.calls.map((call) => call[0] as string);
}

// ============================================================================
// Tests
// ============================================================================

describe('handleError', () => {
  const errorCases = [
    {
      name: 'AuthenticationError',
      error: new AuthenticationError(),
      titleContains: 'GitHub token not configured',
      detailContains: 'gh-vault auth login',
    },
    {
      name: 'InvalidTokenFormatError',
      error: new InvalidTokenFormatError(),
      titleContains: 'Invalid token format',
      detailContains: 'github_pat_',
    },
    {
      name: 'ClassicTokenError',
      error: new ClassicTokenError(),
      titleContains: 'Classic personal access tokens',
      detailContains: null, // No extra details in registry
    },
    {
      name: 'TokenDisplayDisabledError',
      error: new TokenDisplayDisabledError(),
      titleContains: 'Token display is disabled',
      detailContains: 'gh-vault auth status',
    },
  ];

  it.each(errorCases)('formats $name with correct message', ({ error, titleContains }) => {
    const mock = createMockOutput();

    handleError(error, mock as unknown as Output);

    expect(getOutput(mock)[0]).toContain(titleContains);
  });

  it.each(errorCases.filter((c) => c.detailContains))(
    'includes details for $name',
    ({ error, detailContains }) => {
      const mock = createMockOutput();

      handleError(error, mock as unknown as Output);

      const output = getOutput(mock).join('\n');
      expect(output).toContain(detailContains);
    }
  );

  it('uses error message for generic Error', () => {
    const mock = createMockOutput();

    handleError(new Error('Custom message'), mock as unknown as Output);

    expect(getOutput(mock)).toEqual(['Error: Custom message']);
  });

  it('handles non-Error values', () => {
    const mock = createMockOutput();

    handleError('string', mock as unknown as Output);

    expect(getOutput(mock)).toEqual(['Error: Unknown error']);
  });

  it('uses custom message when provided', () => {
    const mock = createMockOutput();

    handleError(new AuthenticationError('Custom auth message'), mock as unknown as Output);

    const output = getOutput(mock);
    expect(output[0]).toBe('Error: Custom auth message');
    expect(output).toContain('Run: gh-vault auth login'); // Still has details
  });
});
