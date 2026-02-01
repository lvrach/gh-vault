import { Command } from 'commander';

import { AuthenticationError } from '../../../shared/errors.js';
import { verifyToken } from '../../../shared/github.js';
import type { Output } from '../../../shared/output.js';
import { getToken, validateTokenFormat } from '../../../shared/secrets.js';

export function createStatusCommand(output: Output): Command {
  return new Command('status').description('Show authentication status').action(async () => {
    const token = await getToken();
    if (!token) {
      throw new AuthenticationError();
    }

    const info = await verifyToken(token);
    const tokenInfo = validateTokenFormat(token);

    output.print(`User: ${info.login}`);
    output.print(`Token type: ${tokenInfo.type}`);
    output.print(`Rate limit: ${String(info.rateLimit.remaining)}/${String(info.rateLimit.limit)}`);
  });
}
