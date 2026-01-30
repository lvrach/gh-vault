import { Command } from 'commander';

import { TokenDisplayDisabledError } from '../../../shared/errors.js';

/**
 * Create the `auth token` command.
 *
 * This command intentionally throws for security reasons.
 * Tokens in terminal output can leak to shell history and logs.
 */
export function createTokenCommand(): Command {
  return new Command('token')
    .description('Display auth token (disabled for security)')
    .action(() => {
      throw new TokenDisplayDisabledError();
    });
}
