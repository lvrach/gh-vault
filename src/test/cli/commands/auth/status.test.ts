/**
 * Auth status command tests.
 *
 * Tests the `gh-vault auth status` CLI command with mocked dependencies.
 * The command throws errors which are handled by the central error handler.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStatusCommand } from '../../../../cli/commands/auth/status.js';
import { AuthenticationError } from '../../../../shared/errors.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/github.js', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../shared/secrets.js', () => ({
  getToken: vi.fn(),
  validateTokenFormat: vi.fn(),
}));

import { verifyToken } from '../../../../shared/github.js';
import { getToken, validateTokenFormat } from '../../../../shared/secrets.js';

const mockVerifyToken = vi.mocked(verifyToken);
const mockGetToken = vi.mocked(getToken);
const mockValidateTokenFormat = vi.mocked(validateTokenFormat);

interface MockOutput {
  print: ReturnType<typeof vi.fn>;
  printError: ReturnType<typeof vi.fn>;
}

function createMockOutput(): MockOutput {
  return {
    print: vi.fn(),
    printError: vi.fn(),
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('auth status command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Command Creation
  // ============================================================================

  describe('command creation', () => {
    it('creates command with correct name', () => {
      const cmd = createStatusCommand(mockOutput as unknown as Output);
      expect(cmd.name()).toBe('status');
    });

    it('creates command with description', () => {
      const cmd = createStatusCommand(mockOutput as unknown as Output);
      expect(cmd.description()).toBe('Show authentication status');
    });
  });

  // ============================================================================
  // Authenticated State
  // ============================================================================

  describe('authenticated state', () => {
    it('displays user information with fine-grained token', async () => {
      mockGetToken.mockResolvedValue('github_pat_validtoken12345678901');
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: [],
        rateLimit: { remaining: 4999, limit: 5000 },
      });
      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'fine-grained' });

      const cmd = createStatusCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockGetToken).toHaveBeenCalled();
      expect(mockVerifyToken).toHaveBeenCalledWith('github_pat_validtoken12345678901');
      expect(mockOutput.print).toHaveBeenCalledWith('User: octocat');
      expect(mockOutput.print).toHaveBeenCalledWith('Token type: fine-grained');
      expect(mockOutput.print).toHaveBeenCalledWith('Rate limit: 4999/5000');
      expect(process.exitCode).toBeUndefined();
    });

    it('displays token type for classic token (if stored before policy change)', async () => {
      mockGetToken.mockResolvedValue('ghp_validtoken');
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: ['repo', 'user'],
        rateLimit: { remaining: 4999, limit: 5000 },
      });
      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'classic' });

      const cmd = createStatusCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.print).toHaveBeenCalledWith('User: octocat');
      expect(mockOutput.print).toHaveBeenCalledWith('Token type: classic');
      expect(mockOutput.print).toHaveBeenCalledWith('Rate limit: 4999/5000');
      expect(process.exitCode).toBeUndefined();
    });

    it('displays low rate limit warning-worthy information', async () => {
      mockGetToken.mockResolvedValue('github_pat_validtoken12345678901');
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: [],
        rateLimit: { remaining: 100, limit: 5000 },
      });
      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'fine-grained' });

      const cmd = createStatusCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.print).toHaveBeenCalledWith('Rate limit: 100/5000');
      expect(process.exitCode).toBeUndefined();
    });
  });

  // ============================================================================
  // Unauthenticated State
  // ============================================================================

  describe('unauthenticated state', () => {
    it('throws AuthenticationError when no token is configured', async () => {
      mockGetToken.mockResolvedValue(null);

      const cmd = createStatusCommand(mockOutput as unknown as Output);

      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow(AuthenticationError);
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Cases (errors bubble up to central handler)
  // ============================================================================

  describe('error cases', () => {
    it('throws error on token verification failure (bad credentials)', async () => {
      mockGetToken.mockResolvedValue('ghp_invalidtoken');
      mockVerifyToken.mockRejectedValue(new Error('Bad credentials'));

      const cmd = createStatusCommand(mockOutput as unknown as Output);

      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow('Bad credentials');
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockVerifyToken).toHaveBeenCalledWith('ghp_invalidtoken');
    });

    it('throws error on network error', async () => {
      mockGetToken.mockResolvedValue('ghp_validtoken');
      mockVerifyToken.mockRejectedValue(new Error('Network error'));

      const cmd = createStatusCommand(mockOutput as unknown as Output);

      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow('Network error');
    });

    it('throws error on keychain access error', async () => {
      mockGetToken.mockRejectedValue(new Error('Failed to retrieve token from Keychain'));

      const cmd = createStatusCommand(mockOutput as unknown as Output);

      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow(
        'Failed to retrieve token from Keychain'
      );
    });

    it('throws error for unknown error type', async () => {
      mockGetToken.mockResolvedValue('ghp_validtoken');
      mockVerifyToken.mockRejectedValue('Unknown error string');

      const cmd = createStatusCommand(mockOutput as unknown as Output);

      // Non-Error values are wrapped by the Promise rejection
      await expect(cmd.parseAsync(['node', 'test'])).rejects.toBe('Unknown error string');
    });

    it('throws error for expired token', async () => {
      mockGetToken.mockResolvedValue('ghp_expiredtoken');
      mockVerifyToken.mockRejectedValue(new Error('Token has expired'));

      const cmd = createStatusCommand(mockOutput as unknown as Output);

      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow('Token has expired');
    });
  });
});
