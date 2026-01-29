import { Command } from 'commander';

import { verifyToken } from '../../../shared/github.js';
import type { Output } from '../../../shared/output.js';
import { getToken } from '../../../shared/secrets.js';

export function createStatusCommand(output: Output): Command {
  return new Command('status').description('Show authentication status').action(async () => {
    try {
      const token = await getToken();
      if (!token) {
        output.printError('No token configured.');
        output.printError('Run: gh-vault auth login');
        process.exitCode = 1;
        return;
      }

      const info = await verifyToken(token);
      output.print(`User: ${info.login}`);
      output.print(`Scopes: ${info.scopes.join(', ') || '(fine-grained PAT)'}`);
      output.print(
        `Rate limit: ${String(info.rateLimit.remaining)}/${String(info.rateLimit.limit)}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      output.printError(`Error: ${message}`);
      process.exitCode = 1;
    }
  });
}
