/**
 * Secrets utility tests.
 *
 * Tests the macOS Keychain integration for secure token storage.
 * Note: The setup.ts mocks this module globally, so these tests use vi.doUnmock
 * to test the real implementation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// validateTokenFormat Tests (Pure Function)
// ============================================================================

describe('validateTokenFormat', () => {
  // Need to get the real implementation, not the mocked one from setup.ts
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('classic PAT tokens (ghp_)', () => {
    it('validates correct classic token format', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      // Exactly 36 alphanumeric characters after ghp_
      const token = 'ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('classic');
    });

    it('rejects classic token with wrong length (too short)', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const token = 'ghp_tooshort';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('rejects classic token with wrong length (too long)', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const token = 'ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789EXTRA';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('rejects classic token with special characters', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      // 36 chars but with special character
      const token = 'ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345!@';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('validates exact 36 character alphanumeric suffix', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      // Exactly 36 alphanumeric characters after ghp_
      const token = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('classic');
    });
  });

  describe('fine-grained PAT tokens (github_pat_)', () => {
    it('validates correct fine-grained token format', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      // 22+ alphanumeric/underscore chars after github_pat_
      const token = 'github_pat_11ABCDEFGHIJ1234567890ab';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('fine-grained');
    });

    it('validates fine-grained token with minimum length (22 chars after prefix)', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      // Minimum 22 characters after github_pat_
      const token = 'github_pat_1234567890123456789012';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('fine-grained');
    });

    it('validates fine-grained token with underscores', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const token = 'github_pat_11ABC_DEF_12345678901234567890';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('fine-grained');
    });

    it('validates long fine-grained tokens', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const token = 'github_pat_' + 'A'.repeat(100);
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('fine-grained');
    });

    it('rejects fine-grained token that is too short', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      // Only 10 chars after github_pat_ (needs 22+)
      const token = 'github_pat_tooshort12';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });
  });

  describe('unknown token formats', () => {
    it('returns unknown for empty string', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const result = validateTokenFormat('');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('returns unknown for random string', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const result = validateTokenFormat('some_random_token');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('returns unknown for OAuth tokens (gho_)', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const result = validateTokenFormat('gho_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('returns unknown for GitHub App tokens (ghs_)', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const result = validateTokenFormat('ghs_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('returns unknown for tokens with spaces', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const result = validateTokenFormat('ghp_abc def ghi jkl mno pqr stu vwx yz01');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('returns unknown for ghp_ with underscores', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const result = validateTokenFormat('ghp_aBcD_FgHiJkLmNoPqRsTuVwXyZ012345');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });
  });
});

// ============================================================================
// isTokenTypeAllowed Tests (Policy Function)
// ============================================================================

describe('isTokenTypeAllowed', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows fine-grained tokens', async () => {
    const { isTokenTypeAllowed } = await import('../../shared/secrets.js');
    expect(isTokenTypeAllowed('fine-grained')).toBe(true);
  });

  it('rejects classic tokens', async () => {
    const { isTokenTypeAllowed } = await import('../../shared/secrets.js');
    expect(isTokenTypeAllowed('classic')).toBe(false);
  });

  it('rejects unknown tokens', async () => {
    const { isTokenTypeAllowed } = await import('../../shared/secrets.js');
    expect(isTokenTypeAllowed('unknown')).toBe(false);
  });
});

// ============================================================================
// Keychain Functions Tests (Using Mocked execFile)
// ============================================================================

describe('keychain functions', () => {
  // Mock the child_process module for keychain tests
  let mockExecFileAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    // Create the mock function
    mockExecFileAsync = vi.fn();

    // Mock node:child_process
    vi.doMock('node:child_process', () => ({
      execFile: mockExecFileAsync,
    }));

    // Mock node:util to return our mock directly
    vi.doMock('node:util', () => ({
      promisify: () => mockExecFileAsync,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getToken', () => {
    it('returns token when found in keychain', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: 'ghp_test_token_123456789012345678901234\n' });

      const { getToken } = await import('../../shared/secrets.js');
      const token = await getToken();

      expect(token).toBe('ghp_test_token_123456789012345678901234');
    });

    it('returns null when token not found (exit code 44)', async () => {
      const error = new Error('security: The specified item could not be found');
      (error as Error & { code: number }).code = 44;
      mockExecFileAsync.mockRejectedValue(error);

      const { getToken } = await import('../../shared/secrets.js');
      const token = await getToken();

      expect(token).toBeNull();
    });

    it('throws error for other keychain errors', async () => {
      const error = new Error('security: unexpected error');
      (error as Error & { code: number }).code = 1;
      mockExecFileAsync.mockRejectedValue(error);

      const { getToken } = await import('../../shared/secrets.js');

      await expect(getToken()).rejects.toThrow('Failed to retrieve token from Keychain');
    });

    it('trims whitespace from token', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: '  ghp_token_with_spaces  \n' });

      const { getToken } = await import('../../shared/secrets.js');
      const token = await getToken();

      expect(token).toBe('ghp_token_with_spaces');
    });
  });

  describe('setToken', () => {
    it('stores token in keychain (delete existing first)', async () => {
      // First call deletes existing, second call stores new
      mockExecFileAsync
        .mockResolvedValueOnce({}) // delete succeeds
        .mockResolvedValueOnce({}); // add succeeds

      const { setToken } = await import('../../shared/secrets.js');
      await setToken('ghp_new_token_12345678901234567890123');

      // Verify it was called twice
      expect(mockExecFileAsync).toHaveBeenCalledTimes(2);
    });

    it('succeeds even if delete fails (token did not exist)', async () => {
      mockExecFileAsync
        .mockRejectedValueOnce(new Error('item not found')) // delete fails
        .mockResolvedValueOnce({}); // add succeeds

      const { setToken } = await import('../../shared/secrets.js');

      await expect(setToken('ghp_token')).resolves.toBeUndefined();
    });

    it('throws error if add fails', async () => {
      mockExecFileAsync
        .mockResolvedValueOnce({}) // delete succeeds
        .mockRejectedValueOnce(new Error('keychain locked')); // add fails

      const { setToken } = await import('../../shared/secrets.js');

      await expect(setToken('ghp_token')).rejects.toThrow('Failed to store token in Keychain');
    });
  });

  describe('deleteToken', () => {
    it('deletes token from keychain', async () => {
      mockExecFileAsync.mockResolvedValue({});

      const { deleteToken } = await import('../../shared/secrets.js');
      await deleteToken();

      expect(mockExecFileAsync).toHaveBeenCalled();
    });

    it('succeeds silently if token does not exist (exit code 44)', async () => {
      const error = new Error('item not found');
      (error as Error & { code: number }).code = 44;
      mockExecFileAsync.mockRejectedValue(error);

      const { deleteToken } = await import('../../shared/secrets.js');

      await expect(deleteToken()).resolves.toBeUndefined();
    });

    it('throws error for other deletion errors', async () => {
      const error = new Error('keychain locked');
      (error as Error & { code: number }).code = 1;
      mockExecFileAsync.mockRejectedValue(error);

      const { deleteToken } = await import('../../shared/secrets.js');

      await expect(deleteToken()).rejects.toThrow('Failed to delete token from Keychain');
    });
  });
});
