import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { RepoApi } from '../api.js';
import { formatRepoForkedText } from '../formatters/text.js';

interface ForkOptions {
  clone?: boolean | undefined;
  remote?: boolean | undefined;
  remoteName?: string | undefined;
  org?: string | undefined;
  forkName?: string | undefined;
  defaultBranchOnly?: boolean | undefined;
}

export function createForkCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('fork')
    .description('Create a fork of a repository')
    .argument('[repository]', 'Repository to fork in owner/repo format')
    .option('--clone', 'Clone the fork')
    .option('--remote', 'Add a git remote for the fork')
    .option('--remote-name <name>', 'Specify the name for the new remote', 'origin')
    .option('--org <org>', 'Create the fork in an organization')
    .option('--fork-name <name>', 'Rename the forked repository')
    .option('--default-branch-only', 'Only include the default branch in the fork')
    .action(async (repoArg: string | undefined, options: ForkOptions) => {
      try {
        // Resolve repository
        const repoResult = await resolveRepository(repoArg);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo: repoName } = repoResult;

        // Create the fork
        const forkedRepo = await repoApi.forkRepo({
          owner,
          repo: repoName,
          organization: options.org,
          name: options.forkName,
          defaultBranchOnly: options.defaultBranchOnly,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatRepoForkedText(forkedRepo, useColor));

        if (options.clone) {
          output.print('\nTo clone the fork:');
          output.print(`  git clone ${forkedRepo.cloneUrl}`);

          if (forkedRepo.parent) {
            output.print('\nTo set up upstream remote:');
            output.print(`  git remote add upstream ${forkedRepo.parent.cloneUrl}`);
          }
        }

        if (options.remote) {
          output.print('\nTo add the fork as a remote:');
          output.print(
            `  git remote add ${options.remoteName ?? 'origin'} ${forkedRepo.cloneUrl}`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
