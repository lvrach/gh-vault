import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { deleteToken } from '../../../shared/secrets.js';

export function createLogoutCommand(output: Output): Command {
  return new Command('logout').description('Remove stored GitHub credentials').action(async () => {
    try {
      await deleteToken();
      output.print('✓ Token removed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      output.printError(`Error: ${message}`);
      process.exitCode = 1;
    }
  });
}
