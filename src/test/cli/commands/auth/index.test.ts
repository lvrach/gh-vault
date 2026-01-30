/**
 * Auth command group tests.
 *
 * Tests the `gh-vault auth` command group registration and structure.
 */

import { describe, expect, it, vi } from 'vitest';

import { createAuthCommand } from '../../../../cli/commands/auth/index.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

// Mock dependencies used by subcommands
vi.mock('../../../../shared/github.js', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../shared/secrets.js', () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  deleteToken: vi.fn(),
  validateTokenFormat: vi.fn(),
  isTokenTypeAllowed: vi.fn(),
}));

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
// Tests
// ============================================================================

describe('auth command group', () => {
  describe('command registration', () => {
    it('creates command with correct name', () => {
      const mockOutput = createMockOutput();
      const cmd = createAuthCommand(mockOutput as unknown as Output);

      expect(cmd.name()).toBe('auth');
    });

    it('creates command with description', () => {
      const mockOutput = createMockOutput();
      const cmd = createAuthCommand(mockOutput as unknown as Output);

      expect(cmd.description()).toBe('Manage GitHub authentication');
    });

    it('registers all subcommands', () => {
      const mockOutput = createMockOutput();
      const cmd = createAuthCommand(mockOutput as unknown as Output);

      const subcommands = cmd.commands.map((c) => c.name());

      expect(subcommands).toContain('login');
      expect(subcommands).toContain('logout');
      expect(subcommands).toContain('status');
      expect(subcommands).toContain('token');
      expect(subcommands).toHaveLength(4);
    });
  });
});
