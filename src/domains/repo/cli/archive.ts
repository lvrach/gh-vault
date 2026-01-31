import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { RepoApi } from '../api.js';
import { formatRepoArchivedText } from '../formatters/text.js';

interface ArchiveOptions {
  yes?: boolean | undefined;
}

export function createArchiveCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('archive')
    .description('Archive a GitHub repository')
    .argument('[repository]', 'Repository to archive in owner/repo format')
    .option('-y, --yes', 'Skip the confirmation prompt')
    .action(async (repoArg: string | undefined, options: ArchiveOptions) => {
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

        if (!options.yes) {
          output.printError(`Error: to archive ${fullName}, use -y or --yes to confirm`);
          output.printError(`Run: gh-vault repo archive ${fullName} --yes`);
          process.exitCode = 1;
          return;
        }

        // Archive the repository
        const repo = await repoApi.setArchived({
          owner,
          repo: repoName,
          archived: true,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatRepoArchivedText(repo, true, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}

export function createUnarchiveCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('unarchive')
    .description('Unarchive a GitHub repository')
    .argument('[repository]', 'Repository to unarchive in owner/repo format')
    .option('-y, --yes', 'Skip the confirmation prompt')
    .action(async (repoArg: string | undefined, options: ArchiveOptions) => {
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

        if (!options.yes) {
          output.printError(`Error: to unarchive ${fullName}, use -y or --yes to confirm`);
          output.printError(`Run: gh-vault repo unarchive ${fullName} --yes`);
          process.exitCode = 1;
          return;
        }

        // Unarchive the repository
        const repo = await repoApi.setArchived({
          owner,
          repo: repoName,
          archived: false,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatRepoArchivedText(repo, false, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
