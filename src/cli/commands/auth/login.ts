import { Command } from 'commander';

import { verifyToken } from '../../../shared/github.js';
import type { Output } from '../../../shared/output.js';
import { setToken, validateTokenFormat } from '../../../shared/secrets.js';

export function createLoginCommand(output: Output): Command {
  const readHiddenInput = (): Promise<string> => {
    return new Promise((resolve) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      let token = '';

      const cleanup = (): void => {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
      };

      const onData = (data: Buffer): void => {
        const char = data.toString();
        switch (char) {
          case '\n':
          case '\r': {
            cleanup();
            resolve(token);

            break;
          }
          case '\u0003': {
            // Ctrl+C
            cleanup();
            output.print('\nCancelled.');
            process.exitCode = 0;
            resolve('');

            break;
          }
          case '\u007F':
          case '\b': {
            // Backspace
            token = token.slice(0, -1);

            break;
          }
          default: {
            if (char.charCodeAt(0) >= 32) {
              // Printable characters only
              token += char;
            }
          }
        }
      };

      process.stdin.on('data', onData);
    });
  };

  return new Command('login').description('Authenticate with GitHub').action(async () => {
    output.print('Enter your GitHub Personal Access Token:');
    output.print('(Input will be hidden)\n');

    const token = await readHiddenInput();
    output.print(''); // New line after input

    if (!token) {
      return;
    }

    const validation = validateTokenFormat(token);
    if (!validation.valid) {
      output.printError('Invalid token format.');
      output.printError('Expected: ghp_... (classic) or github_pat_... (fine-grained)');
      process.exitCode = 1;
      return;
    }

    output.print(`Token type: ${validation.type}`);

    try {
      const info = await verifyToken(token);
      output.print(`✓ Valid for user: ${info.login}`);
      output.print(`✓ Scopes: ${info.scopes.join(', ') || '(fine-grained PAT)'}`);
      output.print(
        `✓ Rate limit: ${String(info.rateLimit.remaining)}/${String(info.rateLimit.limit)}`
      );

      await setToken(token);
      output.print('✓ Token saved to macOS Keychain');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      output.printError(`Error: ${message}`);
      process.exitCode = 1;
    }
  });
}
