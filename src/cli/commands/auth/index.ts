import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { createLoginCommand } from './login.js';
import { createLogoutCommand } from './logout.js';
import { createStatusCommand } from './status.js';
import { createTokenCommand } from './token.js';

export function createAuthCommand(output: Output): Command {
  return new Command('auth')
    .description('Manage GitHub authentication')
    .addCommand(createLoginCommand(output))
    .addCommand(createLogoutCommand(output))
    .addCommand(createStatusCommand(output))
    .addCommand(createTokenCommand());
}
