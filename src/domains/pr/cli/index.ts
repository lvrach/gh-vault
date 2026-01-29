import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { createCheckoutCommand } from './checkout.js';
import { createChecksCommand } from './checks.js';
import { createCloseCommand } from './close.js';
import { createCommentCommand } from './comment.js';
import { createCreateCommand } from './create.js';
import { createDiffCommand } from './diff.js';
import { createEditCommand } from './edit.js';
import { createListCommand } from './list.js';
import { createMergeCommand } from './merge.js';
import { createReadyCommand } from './ready.js';
import { createReopenCommand } from './reopen.js';
import { createReviewCommand } from './review.js';
import { createStatusCommand } from './status.js';
import { createViewCommand } from './view.js';

/**
 * Creates and returns the PR command with all subcommands registered.
 * Follows the domain registration pattern for CLI commands.
 */
export function createPrCommand(output: Output): Command {
  return new Command('pr')
    .description('Work with GitHub pull requests')
    .addCommand(createCheckoutCommand(output))
    .addCommand(createChecksCommand(output))
    .addCommand(createCloseCommand(output))
    .addCommand(createCommentCommand(output))
    .addCommand(createCreateCommand(output))
    .addCommand(createDiffCommand(output))
    .addCommand(createEditCommand(output))
    .addCommand(createListCommand(output))
    .addCommand(createMergeCommand(output))
    .addCommand(createReadyCommand(output))
    .addCommand(createReopenCommand(output))
    .addCommand(createReviewCommand(output))
    .addCommand(createStatusCommand(output))
    .addCommand(createViewCommand(output));
}
