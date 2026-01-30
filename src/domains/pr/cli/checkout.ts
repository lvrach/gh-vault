import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import {
  detectRepo,
  gitCheckout,
  gitFetch,
  gitReset,
  localBranchExists,
  resolvePrNumber,
  resolveRepository,
  updateSubmodules,
} from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import { formatCheckoutText } from '../formatters/text.js';

interface CheckoutOptions {
  branch?: string | undefined;
  detach?: boolean | undefined;
  force?: boolean | undefined;
  recurseSubmodules?: boolean | undefined;
  repo?: string | undefined;
}

export function createCheckoutCommand(output: Output, prApi: PrApi): Command {
  return new Command('checkout')
    .description('Check out a pull request in git')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('-b, --branch <name>', 'Local branch name to use')
    .option('--detach', 'Checkout PR HEAD in detached mode')
    .option('-f, --force', 'Force checkout even if there are local changes')
    .option('--recurse-submodules', 'Update submodules after checkout')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: CheckoutOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        let remoteName = 'origin';
        if (!options.repo) {
          const detection = await detectRepo();
          if (detection.success) {
            remoteName = detection.remoteName;
          }
        }

        const prResult = await resolvePrNumber(prArg, owner, repo, prApi.listPrs.bind(prApi));
        if (!prResult.success) {
          output.printError(`Error: ${prResult.error}`);
          process.exitCode = 1;
          return;
        }
        const pullNumber = prResult.pullNumber;

        const pr = await prApi.getPr({ owner, repo, pullNumber });
        const prRef = `pull/${String(pullNumber)}/head`;
        const localBranch = options.branch ?? pr.head.ref;

        await gitFetch(remoteName, prRef);

        if (options.detach) {
          await gitCheckout('FETCH_HEAD', { detach: true, ...(options.force && { force: true }) });
        } else {
          const branchExists = await localBranchExists(localBranch);

          if (branchExists) {
            if (options.force) {
              await gitCheckout(localBranch, { force: true });
              await gitReset('FETCH_HEAD', true);
            } else {
              await gitCheckout(localBranch);
              try {
                await gitReset('FETCH_HEAD', true);
              } catch {
                output.printError(
                  `Warning: Could not update branch '${localBranch}'. Use --force to overwrite.`
                );
              }
            }
          } else {
            await gitCheckout(localBranch, { create: true });
            await gitReset('FETCH_HEAD', true);
          }
        }

        if (options.recurseSubmodules) {
          await updateSubmodules();
        }

        const useColor = process.stdout.isTTY;
        output.print(
          formatCheckoutText(pullNumber, options.detach ? 'DETACHED HEAD' : localBranch, useColor)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
