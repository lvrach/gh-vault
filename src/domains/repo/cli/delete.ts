import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { RepoApi } from '../api.js';
import { formatRepoDeletedText } from '../formatters/text.js';

interface DeleteOptions {
  yes?: boolean | undefined;
}

export function createDeleteCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('delete')
    .description('Delete a GitHub repository')
    .argument('[repository]', 'Repository to delete in owner/repo format')
    .option('--yes', 'Confirm deletion without prompting')
    .action(async (repoArg: string | undefined, options: DeleteOptions) => {
      try {
        // Resolve repository
        const repoResult = await resolveRepository(repoArg);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo: repoName } = repoResult;

        const fullName = `${owner}/${repoName}`;

        // Require explicit repo argument and --yes for non-interactive deletion
        if (!repoArg) {
          output.printError('Error: for safety, --yes is ignored when no repository is specified');
          output.printError(
            `To delete this repository, run: gh-vault repo delete ${fullName} --yes`
          );
          process.exitCode = 1;
          return;
        }

        if (!options.yes) {
          output.printError(`Error: to delete ${fullName}, use --yes to confirm`);
          output.printError(`Run: gh-vault repo delete ${fullName} --yes`);
          process.exitCode = 1;
          return;
        }

        // Verify the repo exists before deletion
        await repoApi.getRepo({ owner, repo: repoName });

        // Delete the repository
        await repoApi.deleteRepo({ owner, repo: repoName });

        const useColor = process.stdout.isTTY;
        output.print(formatRepoDeletedText(fullName, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
