/**
 * Auth logout command tests.
 *
 * Tests the `gh-vault auth logout` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogoutCommand } from '../../../../cli/commands/auth/logout.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/secrets.js', () => ({
  deleteToken: vi.fn(),
}));

import { deleteToken } from '../../../../shared/secrets.js';

const mockDeleteToken = vi.mocked(deleteToken);

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

describe('auth logout command', () => {
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
      const cmd = createLogoutCommand(mockOutput as unknown as Output);
      expect(cmd.name()).toBe('logout');
    });

    it('creates command with description', () => {
      const cmd = createLogoutCommand(mockOutput as unknown as Output);
      expect(cmd.description()).toBe('Remove stored GitHub credentials');
    });
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('successfully removes token', async () => {
      mockDeleteToken.mockResolvedValue(undefined);

      const cmd = createLogoutCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockDeleteToken).toHaveBeenCalled();
      expect(mockOutput.print).toHaveBeenCalledWith(
        expect.stringContaining('Token removed from Keychain')
      );
      expect(process.exitCode).toBeUndefined();
    });

    it('succeeds even if no token exists', async () => {
      // deleteToken does not throw if token doesn't exist
      mockDeleteToken.mockResolvedValue(undefined);

      const cmd = createLogoutCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockDeleteToken).toHaveBeenCalled();
      expect(mockOutput.print).toHaveBeenCalledWith(
        expect.stringContaining('Token removed from Keychain')
      );
      expect(process.exitCode).toBeUndefined();
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles keychain deletion error', async () => {
      mockDeleteToken.mockRejectedValue(new Error('Failed to delete token from Keychain'));

      const cmd = createLogoutCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockDeleteToken).toHaveBeenCalled();
      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: Failed to delete token from Keychain'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles unknown error type', async () => {
      mockDeleteToken.mockRejectedValue('Unknown error string');

      const cmd = createLogoutCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Unknown error');
      expect(process.exitCode).toBe(1);
    });

    it('handles permission denied error', async () => {
      mockDeleteToken.mockRejectedValue(new Error('Operation not permitted'));

      const cmd = createLogoutCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Operation not permitted');
      expect(process.exitCode).toBe(1);
    });
  });
});
