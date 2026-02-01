import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import type { RepoApi } from '../api.js';
import { formatRepoCreatedText } from '../formatters/text.js';
import type { RepoVisibility } from '../types.js';

interface CreateOptions {
  description?: string | undefined;
  homepage?: string | undefined;
  public?: boolean | undefined;
  private?: boolean | undefined;
  internal?: boolean | undefined;
  clone?: boolean | undefined;
  addReadme?: boolean | undefined;
  disableIssues?: boolean | undefined;
  disableWiki?: boolean | undefined;
  gitignore?: string | undefined;
  license?: string | undefined;
  template?: string | undefined;
  team?: string | undefined;
  push?: boolean | undefined;
  source?: string | undefined;
  remote?: string | undefined;
  includeAllBranches?: boolean | undefined;
}

export function createCreateCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('create')
    .alias('new')
    .description('Create a new repository')
    .argument('[name]', 'Repository name (optionally with owner: owner/repo)')
    .option('-d, --description <description>', 'Description of the repository')
    .option('-h, --homepage <url>', 'Repository home page URL')
    .option('--public', 'Make the new repository public')
    .option('--private', 'Make the new repository private')
    .option('--internal', 'Make the new repository internal')
    .option('-c, --clone', 'Clone the new repository to the current directory')
    .option('--add-readme', 'Add a README file to the new repository')
    .option('--disable-issues', 'Disable issues in the new repository')
    .option('--disable-wiki', 'Disable wiki in the new repository')
    .option('-g, --gitignore <template>', 'Specify a gitignore template for the repository')
    .option('-l, --license <license>', 'Specify an Open Source License for the repository')
    .option('-p, --template <repository>', 'Make the new repository based on a template')
    .option('-t, --team <name>', 'The name of the organization team to be granted access')
    .option('--push', 'Push local commits to the new repository')
    .option('-s, --source <path>', 'Specify path to local repository to use as source')
    .option('-r, --remote <name>', 'Specify remote name for the new repository')
    .option('--include-all-branches', 'Include all branches from template repository')
    .action(async (nameArg: string | undefined, options: CreateOptions) => {
      try {
        if (!nameArg) {
          output.printError('Error: repository name is required');
          output.printError('Usage: gh-vault repo create <name> [flags]');
          process.exitCode = 1;
          return;
        }

        // Determine visibility
        let visibility: RepoVisibility | undefined;
        let isPrivate: boolean | undefined;

        if (options.public) {
          visibility = 'public';
          isPrivate = false;
        } else if (options.private) {
          visibility = 'private';
          isPrivate = true;
        } else if (options.internal) {
          visibility = 'internal';
        }

        // Check if visibility is specified
        if (!options.public && !options.private && !options.internal) {
          output.printError(
            'Error: visibility must be specified (--public, --private, or --internal)'
          );
          process.exitCode = 1;
          return;
        }

        // Parse owner/name
        let org: string | undefined;
        let name: string;

        if (nameArg.includes('/')) {
          const parts = nameArg.split('/');
          if (parts.length !== 2 || !parts[0] || !parts[1]) {
            output.printError('Error: invalid repository name format. Use owner/repo or just repo');
            process.exitCode = 1;
            return;
          }
          org = parts[0];
          name = parts[1];
        } else {
          name = nameArg;
        }

        // Note: --template, --clone, --push, --source are complex features that require git operations
        // For MVP, we'll just create the repo and show a message for unsupported options
        if (options.template) {
          output.printError('Error: --template is not yet supported');
          process.exitCode = 1;
          return;
        }

        if (options.source) {
          output.printError('Error: --source is not yet supported');
          process.exitCode = 1;
          return;
        }

        const repo = await repoApi.createRepo({
          name,
          org,
          description: options.description,
          homepage: options.homepage,
          private: isPrivate,
          visibility,
          hasIssues: options.disableIssues ? false : undefined,
          hasWiki: options.disableWiki ? false : undefined,
          autoInit: options.addReadme,
          gitignoreTemplate: options.gitignore,
          licenseTemplate: options.license,
        });

        const useColor = process.stdout.isTTY;
        output.print(formatRepoCreatedText(repo, useColor));

        if (options.clone) {
          output.print('\nTo clone the repository:');
          output.print(`  git clone ${repo.cloneUrl}`);
        }

        if (options.push) {
          output.print('\nTo push to the repository:');
          output.print(`  git remote add origin ${repo.cloneUrl}`);
          output.print('  git push -u origin main');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
