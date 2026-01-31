import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { RepoApi } from '../api.js';
import { formatRepoViewJson, repoToJson } from '../formatters/json.js';
import { formatRepoViewText } from '../formatters/text.js';

interface ViewOptions {
  branch?: string | undefined;
  web?: boolean | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
}

export function createViewCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('view')
    .description('Display the description and the README of a GitHub repository')
    .argument('[repository]', 'Repository in owner/repo format')
    .option('-b, --branch <branch>', 'View a specific branch of the repository')
    .option('-w, --web', 'Open a repository in the browser')
    .option('--json [fields]', 'Output JSON with the specified fields')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .action(async (repoArg: string | undefined, options: ViewOptions) => {
      try {
        // Resolve repository
        const repoResult = await resolveRepository(repoArg);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo: repoName } = repoResult;

        if (options.web) {
          let url = `https://github.com/${owner}/${repoName}`;
          if (options.branch) {
            url += `/tree/${options.branch}`;
          }
          await open(url);
          return;
        }

        const repo = await repoApi.getRepo({ owner, repo: repoName });

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            output.printError(
              'Example: gh-vault repo view owner/repo --json name,url --jq ".name"'
            );
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = repoToJson(repo);
            const filtered = await filterWithJq(jsonData, options.jq);
            output.print(filtered);
          } catch (error) {
            if (error instanceof JqError) {
              output.printError('jq error: ' + error.message);
            } else {
              throw error;
            }
            process.exitCode = 1;
          }
          return;
        }

        if (options.json !== undefined) {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatRepoViewJson(repo, fields));
          return;
        }

        // Text output - include README
        const readme = await repoApi.getReadme({
          owner,
          repo: repoName,
          ...(options.branch && { ref: options.branch }),
        });

        const useColor = process.stdout.isTTY;
        output.print(formatRepoViewText(repo, readme, useColor));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
