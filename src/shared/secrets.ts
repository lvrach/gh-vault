import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SERVICE_NAME = 'gh-vault-mcp';
const ACCOUNT_NAME = 'github-token';

/**
 * Retrieve the GitHub token from macOS Keychain.
 * Returns null if the token is not found.
 */
export async function getToken(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-s',
      SERVICE_NAME,
      '-a',
      ACCOUNT_NAME,
      '-w',
    ]);
    return stdout.trim();
  } catch (error) {
    // Exit code 44 means "item not found" - this is expected
    if (isExecError(error) && error.code === 44) {
      return null;
    }
    throw new Error(`Failed to retrieve token from Keychain: ${getErrorMessage(error)}`);
  }
}

/**
 * Store a GitHub token in macOS Keychain.
 * Replaces any existing token.
 */
export async function setToken(token: string): Promise<void> {
  // First try to delete existing token (ignore errors if not found)
  try {
    await execFileAsync('security', [
      'delete-generic-password',
      '-s',
      SERVICE_NAME,
      '-a',
      ACCOUNT_NAME,
    ]);
  } catch {
    // Ignore errors - token might not exist yet
  }

  // Store the new token
  try {
    await execFileAsync('security', [
      'add-generic-password',
      '-s',
      SERVICE_NAME,
      '-a',
      ACCOUNT_NAME,
      '-w',
      token,
    ]);
  } catch (error) {
    throw new Error(`Failed to store token in Keychain: ${getErrorMessage(error)}`);
  }
}

/**
 * Delete the GitHub token from macOS Keychain.
 * Does not throw if the token does not exist.
 */
export async function deleteToken(): Promise<void> {
  try {
    await execFileAsync('security', [
      'delete-generic-password',
      '-s',
      SERVICE_NAME,
      '-a',
      ACCOUNT_NAME,
    ]);
  } catch (error) {
    // Exit code 44 means "item not found" - this is not an error
    if (isExecError(error) && error.code === 44) {
      return;
    }
    throw new Error(`Failed to delete token from Keychain: ${getErrorMessage(error)}`);
  }
}

/**
 * Validate the format of a GitHub token and determine its type.
 */
export function validateTokenFormat(token: string): {
  valid: boolean;
  type: 'classic' | 'fine-grained' | 'unknown';
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

// Type guard for exec errors with code property
interface ExecError extends Error {
  code: number;
}

function isExecError(error: unknown): error is ExecError {
  return error instanceof Error && 'code' in error && typeof (error as ExecError).code === 'number';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
