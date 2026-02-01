/**
 * Secrets utility tests.
 *
 * Tests the token storage integration using @napi-rs/keyring for vault access
 * and file fallback for CI/Docker environments.
 * Note: The setup.ts mocks this module globally, so these tests use vi.doUnmock
 * to test the real implementation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Helper to create a mock Entry class with configurable behavior
function createMockEntryClass(options: {
  getPasswordReturn?: string | null;
  getPasswordThrows?: Error;
  setPassword?: ReturnType<typeof vi.fn>;
  setPasswordThrows?: Error;
  deletePassword?: ReturnType<typeof vi.fn>;
  deletePasswordThrows?: Error;
}): new () => {
  getPassword: ReturnType<typeof vi.fn>;
  setPassword: ReturnType<typeof vi.fn>;
  deletePassword: ReturnType<typeof vi.fn>;
} {
  const mockSetPassword = options.setPassword ?? vi.fn();
  const mockDeletePassword = options.deletePassword ?? vi.fn();

  return class MockEntry {
    getPassword = options.getPasswordThrows
      ? vi.fn().mockImplementation(() => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- testing mock behavior
          throw options.getPasswordThrows;
        })
      : vi.fn().mockReturnValue(options.getPasswordReturn ?? null);
    setPassword = options.setPasswordThrows
      ? vi.fn().mockImplementation(() => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- testing mock behavior
          throw options.setPasswordThrows;
        })
      : mockSetPassword;
    deletePassword = options.deletePasswordThrows
      ? vi.fn().mockImplementation(() => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- testing mock behavior
          throw options.deletePasswordThrows;
        })
      : mockDeletePassword;
  };
}

// ============================================================================
// validateTokenFormat Tests (Pure Function)
// ============================================================================

describe('validateTokenFormat', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');
    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({}),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('classic PAT tokens (ghp_)', () => {
    it('validates correct classic token format', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
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
      const token = 'ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345!@';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('validates exact 36 character alphanumeric suffix', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const token = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('classic');
    });
  });

  describe('fine-grained PAT tokens (github_pat_)', () => {
    it('validates correct fine-grained token format', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
      const token = 'github_pat_11ABCDEFGHIJ1234567890ab';
      const result = validateTokenFormat(token);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('fine-grained');
    });

    it('validates fine-grained token with minimum length (22 chars after prefix)', async () => {
      const { validateTokenFormat } = await import('../../shared/secrets.js');
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
    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({}),
    }));
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
// getToken Tests
// ============================================================================

describe('getToken', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns token when found in vault', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: 'github_pat_test1234567890123456789012',
      }),
    }));

    const { getToken } = await import('../../shared/secrets.js');
    const token = await getToken();

    expect(token).toBe('github_pat_test1234567890123456789012');
  });

  it('returns token from file when vault returns null', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({ getPasswordReturn: null }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('github_pat_file_token_1234567890123\n'),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
    }));

    const { getToken } = await import('../../shared/secrets.js');
    const token = await getToken();

    expect(token).toBe('github_pat_file_token_1234567890123');
  });

  it('returns token from file when vault throws', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordThrows: new Error('Vault unavailable'),
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('github_pat_file_token_1234567890123\n'),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
    }));

    const { getToken } = await import('../../shared/secrets.js');
    const token = await getToken();

    expect(token).toBe('github_pat_file_token_1234567890123');
  });

  it('returns null when token not found in vault and file does not exist', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({ getPasswordReturn: null }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT: no such file')),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
    }));

    const { getToken } = await import('../../shared/secrets.js');
    const token = await getToken();

    expect(token).toBeNull();
  });

  it('trims whitespace from file token', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({ getPasswordReturn: null }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('  github_pat_token_with_spaces  \n'),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
    }));

    const { getToken } = await import('../../shared/secrets.js');
    const token = await getToken();

    expect(token).toBe('github_pat_token_with_spaces');
  });

  it('returns null for empty file', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({ getPasswordReturn: null }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('   \n'),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
    }));

    const { getToken } = await import('../../shared/secrets.js');
    const token = await getToken();

    expect(token).toBeNull();
  });

  it('prefers vault over file when both have tokens', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockReadFile = vi.fn().mockResolvedValue('github_pat_file_token_1234567890\n');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: 'github_pat_vault_token_123456789',
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: mockReadFile,
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
    }));

    const { getToken } = await import('../../shared/secrets.js');
    const token = await getToken();

    expect(token).toBe('github_pat_vault_token_123456789');
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it('falls back to file when vault unavailable', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordThrows: new Error('D-Bus connection failed'),
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('github_pat_from_file_123456789012\n'),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
    }));

    const { getToken } = await import('../../shared/secrets.js');
    const token = await getToken();

    expect(token).toBe('github_pat_from_file_123456789012');
  });
});

// ============================================================================
// setToken Tests
// ============================================================================

describe('setToken', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores token in vault by default and clears plaintext file', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockSetPassword = vi.fn();
    const mockUnlink = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: null,
        setPassword: mockSetPassword,
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: mockUnlink,
    }));

    const { setToken } = await import('../../shared/secrets.js');
    await setToken('github_pat_new_token_12345678901234');

    expect(mockSetPassword).toHaveBeenCalledWith('github_pat_new_token_12345678901234');
    expect(mockUnlink).toHaveBeenCalled(); // Clears plaintext file after vault success
  });

  it('stores token in file when skipVault=true and clears vault entry', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockSetPassword = vi.fn();
    const mockDeletePassword = vi.fn();
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: null,
        setPassword: mockSetPassword,
        deletePassword: mockDeletePassword,
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      unlink: vi.fn(),
    }));

    const { setToken } = await import('../../shared/secrets.js');
    await setToken('github_pat_file_token_1234567890123', true);

    expect(mockSetPassword).not.toHaveBeenCalled();
    expect(mockDeletePassword).toHaveBeenCalled(); // Clears vault entry
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('gh-vault/token'),
      'github_pat_file_token_1234567890123\n',
      { mode: 0o600 }
    );
  });

  it('throws error when vault unavailable and skipVault=false', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        setPasswordThrows: new Error('Secret Service unavailable'),
      }),
    }));

    const { setToken } = await import('../../shared/secrets.js');

    await expect(setToken('github_pat_token')).rejects.toThrow('No secure vault available');
  });

  it('creates directory with correct permissions when skipVault=true', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({ getPasswordReturn: null }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      unlink: vi.fn(),
    }));

    const { setToken } = await import('../../shared/secrets.js');
    await setToken('github_pat_test_token_1234567890123', true);

    expect(mockMkdir).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
      mode: 0o700,
    });
  });

  it('writes file with correct permissions when skipVault=true', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({ getPasswordReturn: null }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      unlink: vi.fn(),
    }));

    const { setToken } = await import('../../shared/secrets.js');
    await setToken('github_pat_test_token_1234567890123', true);

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('token'),
      'github_pat_test_token_1234567890123\n',
      { mode: 0o600 }
    );
  });
});

// ============================================================================
// deleteToken Tests
// ============================================================================

describe('deleteToken', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes token from both vault and file', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockDeletePassword = vi.fn();
    const mockUnlink = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: null,
        deletePassword: mockDeletePassword,
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: mockUnlink,
    }));

    const { deleteToken } = await import('../../shared/secrets.js');
    await deleteToken();

    expect(mockDeletePassword).toHaveBeenCalled();
    expect(mockUnlink).toHaveBeenCalled();
  });

  it('succeeds silently if vault token does not exist (not found error)', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockUnlink = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: null,
        deletePasswordThrows: new Error('password not found'),
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: mockUnlink,
    }));

    const { deleteToken } = await import('../../shared/secrets.js');

    await expect(deleteToken()).resolves.toBeUndefined();
    expect(mockUnlink).toHaveBeenCalled();
  });

  it('warns but continues if vault deletion fails with non-"not found" error', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockUnlink = vi.fn().mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally suppress console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: null,
        deletePasswordThrows: new Error('Permission denied'),
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: mockUnlink,
    }));

    const { deleteToken } = await import('../../shared/secrets.js');
    await deleteToken();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Warning: Could not delete token from system vault'
    );
    expect(mockUnlink).toHaveBeenCalled(); // Still tries to delete file

    consoleWarnSpy.mockRestore();
  });

  it('succeeds silently if file does not exist', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockDeletePassword = vi.fn();
    // Create a proper ENOENT error with code property
    const enoentError = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
    const mockUnlink = vi.fn().mockRejectedValue(enoentError);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: null,
        deletePassword: mockDeletePassword,
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: mockUnlink,
    }));

    const { deleteToken } = await import('../../shared/secrets.js');

    await expect(deleteToken()).resolves.toBeUndefined();
  });

  it('succeeds silently if both vault and file do not exist', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    // Create a proper ENOENT error with code property
    const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    const mockUnlink = vi.fn().mockRejectedValue(enoentError);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: null,
        deletePasswordThrows: new Error('No entry found'),
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: mockUnlink,
    }));

    const { deleteToken } = await import('../../shared/secrets.js');

    await expect(deleteToken()).resolves.toBeUndefined();
  });

  it('clears both vault and file', async () => {
    vi.resetModules();
    vi.doUnmock('../../shared/secrets.js');

    const mockDeletePassword = vi.fn();
    const mockUnlink = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@napi-rs/keyring', () => ({
      Entry: createMockEntryClass({
        getPasswordReturn: null,
        deletePassword: mockDeletePassword,
      }),
    }));

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      unlink: mockUnlink,
    }));

    const { deleteToken } = await import('../../shared/secrets.js');
    await deleteToken();

    expect(mockDeletePassword).toHaveBeenCalledTimes(1);
    expect(mockUnlink).toHaveBeenCalledTimes(1);
  });
});
