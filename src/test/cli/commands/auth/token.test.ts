/**
 * Auth token command tests.
 *
 * Tests the `gh-vault auth token` CLI command which is disabled for security.
 * The command throws TokenDisplayDisabledError which is formatted by the
 * central error handler.
 */

import { describe, expect, it, vi } from 'vitest';

import { createTokenCommand } from '../../../../cli/commands/auth/token.js';
import { TokenDisplayDisabledError } from '../../../../shared/errors.js';

// ============================================================================
// Mocks
// ============================================================================

// Mock secrets module - token command should NEVER call getToken
vi.mock('../../../../shared/secrets.js', () => ({
  getToken: vi.fn(),
}));

import { getToken } from '../../../../shared/secrets.js';

const mockGetToken = vi.mocked(getToken);

// ============================================================================
// Tests
// ============================================================================

describe('auth token command', () => {
  // ============================================================================
  // Command Creation
  // ============================================================================

  describe('command creation', () => {
    it('creates command with correct name', () => {
      const cmd = createTokenCommand();
      expect(cmd.name()).toBe('token');
    });

    it('creates command with description indicating disabled', () => {
      const cmd = createTokenCommand();
      expect(cmd.description()).toContain('disabled');
    });
  });

  // ============================================================================
  // Security Behavior
  // ============================================================================

  describe('security behavior', () => {
    it('throws TokenDisplayDisabledError', async () => {
      const cmd = createTokenCommand();

      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow(TokenDisplayDisabledError);
    });

    it('throws error with security message', async () => {
      const cmd = createTokenCommand();

      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow('Token display is disabled');
    });

    it('never calls getToken (security critical)', async () => {
      const cmd = createTokenCommand();

      try {
        await cmd.parseAsync(['node', 'test']);
      } catch {
        // Expected to throw
      }

      expect(mockGetToken).not.toHaveBeenCalled();
    });
  });
});
