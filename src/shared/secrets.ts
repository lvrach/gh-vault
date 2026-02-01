import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { Entry } from '@napi-rs/keyring';

const SERVICE_NAME = 'gh-vault';
const ACCOUNT_NAME = 'github-token';

/**
 * Get the path to the plaintext token file.
 * - Windows: %APPDATA%/gh-vault/token
 * - Linux: $XDG_CONFIG_HOME/gh-vault/token or ~/.config/gh-vault/token
 * - macOS: ~/.config/gh-vault/token
 */
function getTokenFilePath(): string {
  if (process.platform === 'win32') {
    // Windows: Use %APPDATA% (Roaming) for cross-machine sync
    const appData = process.env['APPDATA'] ?? path.join(homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'gh-vault', 'token');
  }

  // Linux/macOS: Use XDG_CONFIG_HOME or ~/.config
  const configDir = process.env['XDG_CONFIG_HOME'] ?? path.join(homedir(), '.config');
  return path.join(configDir, 'gh-vault', 'token');
}

/**
 * Safely delete the plaintext token file.
 * Silently ignores if file doesn't exist (ENOENT).
 * Throws on real errors (permission denied, etc.).
 */
async function deleteTokenFile(): Promise<void> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is computed from user's home dir
    await unlink(getTokenFilePath());
  } catch (error) {
    // Only ignore ENOENT (file doesn't exist)
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return; // File doesn't exist, that's fine
    }
    // Real error - propagate it
    throw error;
  }
}

/**
 * Check if an error message indicates "entry not found" (which is acceptable).
 * Covers error messages from different platforms and keyring implementations.
 */
function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('not found') ||
    message.includes('no password') ||
    message.includes('itemnotfound') ||
    message.includes('no entry') ||
    message.includes('no matching entry found') || // keyring-rs NoEntry error
    message.includes('element not found') || // Windows Credential Manager
    message.includes('secret not found') // Linux Secret Service
  );
}

/**
 * Safely delete the vault token entry.
 * Silently ignores if entry doesn't exist.
 * @returns true if deleted or didn't exist, false if vault error occurred
 */
function deleteVaultToken(): boolean {
  try {
    const entry = new Entry(SERVICE_NAME, ACCOUNT_NAME);
    entry.deletePassword();
    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return true; // Entry didn't exist, that's OK
    }
    // Real error (permission denied, vault locked, etc.)
    return false;
  }
}

/**
 * Retrieve the GitHub token.
 * Tries system vault first, then falls back to plaintext file.
 * Returns null if no token is found in either location.
 */
export async function getToken(): Promise<string | null> {
  // 1. Try system vault first (macOS Keychain, Windows Credential Manager, Linux Secret Service)
  try {
    const entry = new Entry(SERVICE_NAME, ACCOUNT_NAME);
    const token = entry.getPassword();
    if (token) {
      return token;
    }
  } catch {
    // Vault unavailable or token not found, continue to file fallback
  }

  // 2. Try file fallback
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is computed from user's home dir
    const token = await readFile(getTokenFilePath(), 'utf8');
    const trimmed = token.trim();
    return trimmed || null; // Return null for empty strings
  } catch {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Store a GitHub token.
 * By default stores in system vault. If skipVault is true,
 * stores in plaintext file (for CI/Docker environments).
 *
 * When storing to vault, any existing plaintext file is removed.
 * When storing to file (skipVault), any existing vault entry is removed.
 * This ensures only one authoritative token location exists.
 *
 * @param token - The GitHub token to store
 * @param skipVault - If true, store in plaintext file instead of system vault
 * @throws Error if vault is unavailable and skipVault is false
 */
export async function setToken(token: string, skipVault = false): Promise<void> {
  // Validate token is not empty
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error('Token cannot be empty');
  }

  if (skipVault) {
    // Clear vault entry first to ensure file becomes the authoritative source
    const vaultCleared = deleteVaultToken();
    if (!vaultCleared) {
      // eslint-disable-next-line no-console -- intentional warning for vault cleanup failure
      console.warn(
        'Warning: Could not clear existing vault token. Token may exist in both locations.'
      );
    }

    // Store in plaintext file
    const tokenFile = getTokenFilePath();
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is computed from user's home dir
    await mkdir(path.dirname(tokenFile), { recursive: true, mode: 0o700 });
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is computed from user's home dir
    await writeFile(tokenFile, token + '\n', { mode: 0o600 });
    return;
  }

  // Try to store in system vault directly (no separate availability check)
  try {
    const entry = new Entry(SERVICE_NAME, ACCOUNT_NAME);
    entry.setPassword(token);

    // Success - clear any stale plaintext file
    await deleteTokenFile();
  } catch {
    // Vault unavailable - provide clear error with guidance
    throw new Error(
      'No secure vault available.\n' +
        'Use --dangerously-skip-vault to store token in plaintext file.\n' +
        'This is NOT recommended for local development.'
    );
  }
}

/**
 * Delete the GitHub token from both vault and file.
 * Does not throw if the token does not exist in either location.
 * Logs warning if vault deletion fails for reasons other than "not found".
 */
export async function deleteToken(): Promise<void> {
  // Try to delete from vault
  const vaultDeleted = deleteVaultToken();
  if (!vaultDeleted) {
    // Vault had an error but we'll continue to try file deletion
    // The token may still be in the vault
    console.warn('Warning: Could not delete token from system vault');
  }

  // Also try to delete file
  await deleteTokenFile();
}

/** Token type as determined by validateTokenFormat */
export type TokenType = 'classic' | 'fine-grained' | 'unknown';

/**
 * Validate the format of a GitHub token and determine its type.
 */
export function validateTokenFormat(token: string): {
  valid: boolean;
  type: TokenType;
} {
  // Classic PAT: ghp_ prefix followed by alphanumeric characters
  if (/^ghp_[A-Za-z0-9]{36}$/.test(token)) {
    return { valid: true, type: 'classic' };
  }

  // Fine-grained PAT: github_pat_ prefix followed by alphanumeric and underscores
  if (/^github_pat_[A-Za-z0-9_]{22,}$/.test(token)) {
    return { valid: true, type: 'fine-grained' };
  }

  // Unknown format - might still work but we cannot validate
  return { valid: false, type: 'unknown' };
}

/**
 * Check if a token type is allowed by policy.
 *
 * gh-vault requires fine-grained tokens for security:
 * - Scoped to specific repositories
 * - Limited to required permissions only
 * - Required expiration date
 */
export function isTokenTypeAllowed(type: TokenType): boolean {
  return type === 'fine-grained';
}
