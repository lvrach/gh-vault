import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import type { PrApi } from '../api.js';
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
export function createPrCommand(output: Output, prApi: PrApi): Command {
  return new Command('pr')
    .description('Work with GitHub pull requests')
    .addCommand(createCheckoutCommand(output, prApi))
    .addCommand(createChecksCommand(output, prApi))
    .addCommand(createCloseCommand(output, prApi))
    .addCommand(createCommentCommand(output, prApi))
    .addCommand(createCreateCommand(output, prApi))
    .addCommand(createDiffCommand(output, prApi))
    .addCommand(createEditCommand(output, prApi))
    .addCommand(createListCommand(output, prApi))
    .addCommand(createMergeCommand(output, prApi))
    .addCommand(createReadyCommand(output, prApi))
    .addCommand(createReopenCommand(output, prApi))
    .addCommand(createReviewCommand(output, prApi))
    .addCommand(createStatusCommand(output, prApi))
    .addCommand(createViewCommand(output, prApi));
}
