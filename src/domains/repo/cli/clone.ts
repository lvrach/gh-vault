import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Command } from 'commander';

import type { Output } from '../../../shared/output.js';
import type { RepoApi } from '../api.js';

const execFileAsync = promisify(execFile);

interface CloneOptions {
  upstreamRemoteName?: string | undefined;
}

export function createCloneCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('clone')
    .description('Clone a repository locally')
    .argument('<repository>', 'Repository to clone (owner/repo or URL)')
    .argument('[directory]', 'Directory to clone into')
    .argument('[gitflags...]', 'Additional git clone flags (after --)')
    .option(
      '-u, --upstream-remote-name <name>',
      'Upstream remote name when cloning a fork',
      'upstream'
    )
    .allowUnknownOption(true)
    .action(
      async (
        repoArg: string,
        directory: string | undefined,
        gitflags: string[],
        options: CloneOptions
      ) => {
        try {
          // Parse repository argument
          let cloneUrl: string;
          let owner: string;
          let repoName: string;

          if (repoArg.startsWith('http') || repoArg.startsWith('git@')) {
            // It's already a URL
            cloneUrl = repoArg;

            // Extract owner/repo from URL
            const urlMatch = /(?:github\.com[/:])([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(repoArg);
            if (urlMatch?.[1] && urlMatch[2]) {
              owner = urlMatch[1];
              repoName = urlMatch[2];
            } else {
              output.printError('Error: could not parse repository URL');
              process.exitCode = 1;
              return;
            }
          } else if (repoArg.includes('/')) {
            // It's owner/repo format
            const parts = repoArg.split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
              output.printError('Error: invalid repository format. Use owner/repo');
              process.exitCode = 1;
              return;
            }
            owner = parts[0];
            repoName = parts[1];

            // Get the clone URL from the API
            const repo = await repoApi.getRepo({ owner, repo: repoName });
            cloneUrl = repo.cloneUrl;
          } else {
            // Just a repo name - assume it's the current user's repo
            const currentUser = await repoApi.getCurrentUser();
            owner = currentUser;
            repoName = repoArg;

            const repo = await repoApi.getRepo({ owner, repo: repoName });
            cloneUrl = repo.cloneUrl;
          }

          // Build git clone command - using execFile for safety (no shell injection risk)
          const args = ['clone', cloneUrl];

          if (directory) {
            args.push(directory);
          }

          // Add any additional git flags
          if (gitflags.length > 0) {
            args.push(...gitflags);
          }

          output.print(`Cloning into '${directory ?? repoName}'...`);

          // Execute git clone using execFile (safe from shell injection)
          await execFileAsync('git', args);

          // Check if it's a fork and add upstream remote
          try {
            const repo = await repoApi.getRepo({ owner, repo: repoName });
            if (repo.fork && repo.parent) {
              const cloneDir = directory ?? repoName;
              const upstreamName = options.upstreamRemoteName ?? 'upstream';

              output.print(`\nAdding upstream remote '${upstreamName}'...`);
              await execFileAsync('git', ['remote', 'add', upstreamName, repo.parent.cloneUrl], {
                cwd: cloneDir,
              });
            }
          } catch {
            // Ignore errors when checking fork status
          }

          output.print('Done.');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          output.printError(`Error: ${message}`);
          process.exitCode = 1;
        }
      }
    );
}
