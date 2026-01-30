import { Command } from 'commander';

import { ClassicTokenError, InvalidTokenFormatError } from '../../../shared/errors.js';
import { verifyToken } from '../../../shared/github.js';
import type { Output } from '../../../shared/output.js';
import { isTokenTypeAllowed, setToken, validateTokenFormat } from '../../../shared/secrets.js';

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
            // Ctrl+C - exit cleanly (default exit code is 0)
            cleanup();
            output.print('\nCancelled.');
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

  const helpText = `
Token Requirements:
  gh-vault requires fine-grained personal access tokens (github_pat_*).
  Classic tokens (ghp_*) are rejected for security reasons.

  Create a token at: https://github.com/settings/personal-access-tokens

Required Permissions:
  Permission          Access       Commands
  ─────────────────────────────────────────────────────────────────
  pull_requests       read         pr list, pr view, pr diff
  pull_requests       write        pr create, pr edit, pr merge, pr close, pr reopen, pr comment, pr review
  actions             read         run list, run view
  actions             write        run cancel, run rerun, run delete
  contents            write        pr merge --delete-branch
  checks              read         pr checks
  statuses            read         pr checks
`;

  return new Command('login')
    .description('Authenticate with GitHub')
    .addHelpText('after', helpText)
    .action(async () => {
      output.print('gh-vault requires a fine-grained personal access token.');
      output.print('');
      output.print('Create one at: https://github.com/settings/personal-access-tokens');
      output.print('');
      output.print('Required permissions:');
      output.print('  • Pull requests: Read and write');
      output.print('  • Actions: Read and write (for workflow commands)');
      output.print('  • Contents: Read and write (for branch deletion)');
      output.print('  • Checks: Read');
      output.print('  • Commit statuses: Read');
      output.print('');
      output.print('Run "gh-vault auth login --help" to see which commands need each permission.');
      output.print('');
      output.print('Paste your token below (input is hidden):');

      const token = await readHiddenInput();
      output.print(''); // New line after input

      if (!token) {
        return;
      }

      const validation = validateTokenFormat(token);
      if (!validation.valid) {
        throw new InvalidTokenFormatError();
      }

      // Policy check: only allow fine-grained tokens
      if (!isTokenTypeAllowed(validation.type)) {
        throw new ClassicTokenError();
      }

      output.print(`Token type: ${validation.type}`);

      const info = await verifyToken(token);
      output.print(`✓ Valid for user: ${info.login}`);
      output.print(`✓ Scopes: ${info.scopes.join(', ') || '(fine-grained PAT)'}`);
      output.print(
        `✓ Rate limit: ${String(info.rateLimit.remaining)}/${String(info.rateLimit.limit)}`
      );

      await setToken(token);
      output.print('✓ Token saved to macOS Keychain');
    });
}
