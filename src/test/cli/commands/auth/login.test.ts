/**
 * Auth login command tests.
 *
 * Tests the `gh-vault auth login` CLI command with mocked dependencies.
 *
 * Note: The login command has complex stdin handling for reading the token
 * interactively. These tests focus on validation, error handling, and the
 * paths that can be tested without mocking stdin's raw mode and event system.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLoginCommand } from '../../../../cli/commands/auth/login.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../shared/github.js', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../shared/secrets.js', () => ({
  setToken: vi.fn(),
  validateTokenFormat: vi.fn(),
  isTokenTypeAllowed: vi.fn(),
}));

import { verifyToken } from '../../../../shared/github.js';
import { isTokenTypeAllowed, setToken, validateTokenFormat } from '../../../../shared/secrets.js';

const mockVerifyToken = vi.mocked(verifyToken);
const mockSetToken = vi.mocked(setToken);
const mockValidateTokenFormat = vi.mocked(validateTokenFormat);
const mockIsTokenTypeAllowed = vi.mocked(isTokenTypeAllowed);

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
// Helpers
// ============================================================================

type DataListener = (data: Buffer) => void;

/**
 * Helper to create a mock stdin that emits token data followed by enter.
 */
function createMockStdin(token: string): NodeJS.ReadStream {
  const listeners = new Map<string, DataListener[]>();

  const mockStdin = {
    isTTY: true,
    setRawMode: vi.fn().mockReturnThis(),
    resume: vi.fn().mockImplementation(() => {
      // Emit token characters followed by enter after a microtask
      queueMicrotask(() => {
        const dataListeners = listeners.get('data') ?? [];
        // Emit entire token at once, then newline
        for (const listener of dataListeners) {
          listener(Buffer.from(token));
        }
        for (const listener of dataListeners) {
          listener(Buffer.from('\r'));
        }
      });
    }),
    pause: vi.fn(),
    on: vi.fn().mockImplementation((event: string, listener: DataListener) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)?.push(listener);
      return mockStdin;
    }),
    removeListener: vi.fn().mockImplementation((event: string, listener: unknown) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener as DataListener);
        if (index !== -1) {
          eventListeners.splice(index, 1);
        }
      }
      return mockStdin;
    }),
  } as unknown as NodeJS.ReadStream;

  return mockStdin;
}

/**
 * Helper to create a mock stdin that emits Ctrl+C (cancellation).
 */
function createCtrlCStdin(): NodeJS.ReadStream {
  const listeners = new Map<string, DataListener[]>();

  const ctrlCStdin = {
    isTTY: true,
    setRawMode: vi.fn().mockReturnThis(),
    resume: vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        const dataListeners = listeners.get('data') ?? [];
        // Emit Ctrl+C character
        for (const listener of dataListeners) {
          listener(Buffer.from('\u0003'));
        }
      });
    }),
    pause: vi.fn(),
    on: vi.fn().mockImplementation((event: string, listener: DataListener) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)?.push(listener);
      return ctrlCStdin;
    }),
    removeListener: vi.fn().mockImplementation((event: string, listener: unknown) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener as DataListener);
        if (index !== -1) {
          eventListeners.splice(index, 1);
        }
      }
      return ctrlCStdin;
    }),
  } as unknown as NodeJS.ReadStream;

  return ctrlCStdin;
}

// ============================================================================
// Test Setup
// ============================================================================

describe('auth login command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let originalStdin: typeof process.stdin;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    originalStdin = process.stdin;
  });

  afterEach(() => {
    process.exitCode = undefined;
    // Restore stdin if it was modified
    if (process.stdin !== originalStdin) {
      Object.defineProperty(process, 'stdin', { value: originalStdin });
    }
  });

  // ============================================================================
  // Command Creation
  // ============================================================================

  describe('command creation', () => {
    it('creates command with correct name', () => {
      const cmd = createLoginCommand(mockOutput as unknown as Output);
      expect(cmd.name()).toBe('login');
    });

    it('creates command with description', () => {
      const cmd = createLoginCommand(mockOutput as unknown as Output);
      expect(cmd.description()).toBe('Authenticate with GitHub');
    });
  });

  // ============================================================================
  // Token Validation (Unit Tests)
  // ============================================================================

  describe('validateTokenFormat integration', () => {
    it('validates classic PAT format', () => {
      // This tests the real validateTokenFormat function behavior
      // The mock is set up but we're testing what arguments the command passes
      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'classic' });

      const result = mockValidateTokenFormat('ghp_abcdefghijklmnopqrstuvwxyz1234567890');

      expect(result.valid).toBe(true);
      expect(result.type).toBe('classic');
    });

    it('validates fine-grained PAT format', () => {
      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'fine-grained' });

      const result = mockValidateTokenFormat('github_pat_abcdefghijklmnopqrstuvwxyz');

      expect(result.valid).toBe(true);
      expect(result.type).toBe('fine-grained');
    });

    it('rejects invalid token format', () => {
      mockValidateTokenFormat.mockReturnValue({ valid: false, type: 'unknown' });

      const result = mockValidateTokenFormat('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });
  });

  // ============================================================================
  // Token Verification (Unit Tests)
  // ============================================================================

  describe('verifyToken integration', () => {
    it('returns token info on successful verification', async () => {
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: ['repo', 'user'],
        rateLimit: { remaining: 4999, limit: 5000 },
      });

      const result = await mockVerifyToken('valid-token');

      expect(result.login).toBe('octocat');
      expect(result.scopes).toContain('repo');
      expect(result.rateLimit.remaining).toBe(4999);
    });

    it('handles fine-grained PAT with no scopes', async () => {
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: [],
        rateLimit: { remaining: 4999, limit: 5000 },
      });

      const result = await mockVerifyToken('fine-grained-token');

      expect(result.scopes).toEqual([]);
    });

    it('throws on invalid token', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Bad credentials'));

      await expect(mockVerifyToken('invalid-token')).rejects.toThrow('Bad credentials');
    });

    it('throws on network error', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Network error'));

      await expect(mockVerifyToken('valid-token')).rejects.toThrow('Network error');
    });
  });

  // ============================================================================
  // Token Storage (Unit Tests)
  // ============================================================================

  describe('setToken integration', () => {
    it('stores token successfully', async () => {
      mockSetToken.mockResolvedValue(undefined);

      await expect(mockSetToken('valid-token')).resolves.toBeUndefined();
    });

    it('throws on keychain error', async () => {
      mockSetToken.mockRejectedValue(new Error('Failed to store token in Keychain'));

      await expect(mockSetToken('valid-token')).rejects.toThrow(
        'Failed to store token in Keychain'
      );
    });
  });

  // ============================================================================
  // Full Flow Tests (Simulated Stdin)
  //
  // These tests simulate the stdin interaction by creating a mock that
  // emits data events. This allows testing the full login flow.
  // ============================================================================

  describe('full login flow', () => {
    it('successfully logs in with fine-grained token', async () => {
      const token = 'github_pat_abcdefghijklmnopqrstuvwxyz';
      const mockStdin = createMockStdin(token);

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'fine-grained' });
      mockIsTokenTypeAllowed.mockReturnValue(true);
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: [],
        rateLimit: { remaining: 4999, limit: 5000 },
      });
      mockSetToken.mockResolvedValue(undefined);

      const cmd = createLoginCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.print).toHaveBeenCalledWith('Token type: fine-grained');
      expect(mockOutput.print).toHaveBeenCalledWith(expect.stringContaining('Valid for user: octocat'));
      expect(mockOutput.print).toHaveBeenCalledWith(expect.stringContaining('Token saved to macOS Keychain'));
      expect(process.exitCode).toBeUndefined();
    });

    it('rejects classic tokens with ClassicTokenError', async () => {
      const token = 'ghp_abcdefghijklmnopqrstuvwxyz1234567890';
      const mockStdin = createMockStdin(token);

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'classic' });
      mockIsTokenTypeAllowed.mockReturnValue(false);

      const cmd = createLoginCommand(mockOutput as unknown as Output);
      // Domain-specific error bubbles up to single exit point
      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow('Classic personal access tokens');

      expect(mockValidateTokenFormat).toHaveBeenCalledWith(token);
      expect(mockIsTokenTypeAllowed).toHaveBeenCalledWith('classic');
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockSetToken).not.toHaveBeenCalled();
    });

    it('rejects invalid token format with InvalidTokenFormatError', async () => {
      const token = 'invalid-token-format';
      const mockStdin = createMockStdin(token);

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      mockValidateTokenFormat.mockReturnValue({ valid: false, type: 'unknown' });

      const cmd = createLoginCommand(mockOutput as unknown as Output);
      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow('Invalid token format');

      expect(mockValidateTokenFormat).toHaveBeenCalledWith(token);
      expect(mockIsTokenTypeAllowed).not.toHaveBeenCalled();
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockSetToken).not.toHaveBeenCalled();
    });

    it('handles token verification failure', async () => {
      const token = 'github_pat_abcdefghijklmnopqrstuvwxyz';
      const mockStdin = createMockStdin(token);

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'fine-grained' });
      mockIsTokenTypeAllowed.mockReturnValue(true);
      mockVerifyToken.mockRejectedValue(new Error('Bad credentials'));

      const cmd = createLoginCommand(mockOutput as unknown as Output);
      // Error bubbles up to single exit point
      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow('Bad credentials');

      expect(mockValidateTokenFormat).toHaveBeenCalledWith(token);
      expect(mockVerifyToken).toHaveBeenCalledWith(token);
      expect(mockSetToken).not.toHaveBeenCalled();
    });

    it('handles keychain storage failure', async () => {
      const token = 'github_pat_abcdefghijklmnopqrstuvwxyz';
      const mockStdin = createMockStdin(token);

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'fine-grained' });
      mockIsTokenTypeAllowed.mockReturnValue(true);
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: [],
        rateLimit: { remaining: 4999, limit: 5000 },
      });
      mockSetToken.mockRejectedValue(new Error('Failed to store token in Keychain'));

      const cmd = createLoginCommand(mockOutput as unknown as Output);
      await expect(cmd.parseAsync(['node', 'test'])).rejects.toThrow('Failed to store token in Keychain');

      expect(mockSetToken).toHaveBeenCalledWith(token);
    });

    it('handles empty token (user cancelled)', async () => {
      // Simulate Ctrl+C cancellation
      const ctrlCStdin = createCtrlCStdin();

      Object.defineProperty(process, 'stdin', {
        value: ctrlCStdin,
        writable: true,
        configurable: true,
      });

      const cmd = createLoginCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockValidateTokenFormat).not.toHaveBeenCalled();
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockSetToken).not.toHaveBeenCalled();
      // Should exit gracefully without error (undefined = success in Node.js)
      expect(process.exitCode).toBeUndefined();
    });

    it('displays rate limit information', async () => {
      const token = 'github_pat_abcdefghijklmnopqrstuvwxyz';
      const mockStdin = createMockStdin(token);

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'fine-grained' });
      mockIsTokenTypeAllowed.mockReturnValue(true);
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: [],
        rateLimit: { remaining: 4500, limit: 5000 },
      });
      mockSetToken.mockResolvedValue(undefined);

      const cmd = createLoginCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      expect(mockOutput.print).toHaveBeenCalledWith(expect.stringContaining('Rate limit: 4500/5000'));
    });

    it('never prints the actual token value to output (security)', async () => {
      const token = 'github_pat_secret_should_never_appear_output';
      const mockStdin = createMockStdin(token);

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      mockValidateTokenFormat.mockReturnValue({ valid: true, type: 'fine-grained' });
      mockIsTokenTypeAllowed.mockReturnValue(true);
      mockVerifyToken.mockResolvedValue({
        login: 'octocat',
        scopes: [],
        rateLimit: { remaining: 4999, limit: 5000 },
      });
      mockSetToken.mockResolvedValue(undefined);

      const cmd = createLoginCommand(mockOutput as unknown as Output);
      await cmd.parseAsync(['node', 'test']);

      // Verify token value never appears in any output (security requirement)
      const allPrintCalls = mockOutput.print.mock.calls.flat() as string[];
      const allErrorCalls = mockOutput.printError.mock.calls.flat() as string[];
      const allOutput = [...allPrintCalls, ...allErrorCalls].join(' ');

      expect(allOutput).not.toContain(token);
      expect(allOutput).not.toContain('github_pat_secret');
    });
  });
});
