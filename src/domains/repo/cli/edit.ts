import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { RepoApi } from '../api.js';
import { formatRepoEditedText } from '../formatters/text.js';
import type { RepoVisibility } from '../types.js';

interface EditOptions {
  description?: string | undefined;
  homepage?: string | undefined;
  visibility?: string | undefined;
  defaultBranch?: string | undefined;
  enableIssues?: boolean | undefined;
  enableProjects?: boolean | undefined;
  enableWiki?: boolean | undefined;
  enableDiscussions?: boolean | undefined;
  enableMergeCommit?: boolean | undefined;
  enableSquashMerge?: boolean | undefined;
  enableRebaseMerge?: boolean | undefined;
  enableAutoMerge?: boolean | undefined;
  deleteBranchOnMerge?: boolean | undefined;
  allowForking?: boolean | undefined;
  allowUpdateBranch?: boolean | undefined;
  template?: boolean | undefined;
  addTopic?: string[] | undefined;
  removeTopic?: string[] | undefined;
  acceptVisibilityChangeConsequences?: boolean | undefined;
}

export function createEditCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('edit')
    .description('Edit repository settings')
    .argument('[repository]', 'Repository in owner/repo format')
    .option('-d, --description <description>', 'Description of the repository')
    .option('-h, --homepage <url>', 'Repository home page URL')
    .option('--visibility <visibility>', 'Change the visibility: public, private, internal')
    .option('--default-branch <name>', 'Set the default branch name')
    .option('--enable-issues', 'Enable issues in the repository')
    .option('--enable-projects', 'Enable projects in the repository')
    .option('--enable-wiki', 'Enable wiki in the repository')
    .option('--enable-discussions', 'Enable discussions in the repository')
    .option('--enable-merge-commit', 'Enable merging pull requests via merge commit')
    .option('--enable-squash-merge', 'Enable merging pull requests via squashed commit')
    .option('--enable-rebase-merge', 'Enable merging pull requests via rebase')
    .option('--enable-auto-merge', 'Enable auto-merge functionality')
    .option('--delete-branch-on-merge', 'Delete head branch when pull requests are merged')
    .option('--allow-forking', 'Allow forking of an organization repository')
    .option('--allow-update-branch', 'Allow a PR head branch behind base to be updated')
    .option('--template', 'Make the repository available as a template')
    .option('--add-topic <topics...>', 'Add repository topic')
    .option('--remove-topic <topics...>', 'Remove repository topic')
    .option(
      '--accept-visibility-change-consequences',
      'Accept the consequences of changing visibility'
    )
    .action(async (repoArg: string | undefined, options: EditOptions) => {
      try {
        // Resolve repository
        const repoResult = await resolveRepository(repoArg);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo: repoName } = repoResult;

        // Visibility change requires confirmation
        if (options.visibility && !options.acceptVisibilityChangeConsequences) {
          output.printError(
            'Error: changing visibility requires --accept-visibility-change-consequences'
          );
          output.printError(
            'This confirms you understand the consequences of changing repository visibility.'
          );
          process.exitCode = 1;
          return;
        }

        const repo = await repoApi.editRepo({
          owner,
          repo: repoName,
          description: options.description,
          homepage: options.homepage,
          visibility: options.visibility as RepoVisibility | undefined,
          defaultBranch: options.defaultBranch,
          hasIssues: options.enableIssues,
          hasProjects: options.enableProjects,
          hasWiki: options.enableWiki,
          hasDiscussions: options.enableDiscussions,
          allowMergeCommit: options.enableMergeCommit,
          allowSquashMerge: options.enableSquashMerge,
          allowRebaseMerge: options.enableRebaseMerge,
          allowAutoMerge: options.enableAutoMerge,
          deleteBranchOnMerge: options.deleteBranchOnMerge,
          allowForking: options.allowForking,
          isTemplate: options.template,
          addTopics: options.addTopic,
          removeTopics: options.removeTopic,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatRepoEditedText(repo, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
