import { Command } from 'commander';
import open from 'open';

import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import { formatPrFilesText } from '../formatters/text.js';

interface DiffOptions {
  color?: 'always' | 'never' | 'auto' | undefined;
  nameOnly?: boolean | undefined;
  patch?: boolean | undefined;
  web?: boolean | undefined;
  repo?: string | undefined;
}

export function createDiffCommand(output: Output, prApi: PrApi): Command {
  return new Command('diff')
    .description('View changes in a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('--color <when>', 'Use color in diff output: always, never, auto', 'auto')
    .option('--name-only', 'Show only file names')
    .option('--patch', 'Show full patch output')
    .option('-w, --web', 'Open the pull request diff in the browser')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: DiffOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        const prResult = await resolvePrNumber(prArg, owner, repo, prApi.listPrs.bind(prApi));
        if (!prResult.success) {
          output.printError(`Error: ${prResult.error}`);
          process.exitCode = 1;
          return;
        }
        const pullNumber = prResult.pullNumber;

        if (options.web) {
          const url = `https://github.com/${owner}/${repo}/pull/${String(pullNumber)}/files`;
          await open(url);
          return;
        }

        const files = await prApi.listPrFiles({ owner, repo, pullNumber });

        let useColor: boolean;
        if (options.color === 'always') {
          useColor = true;
        } else if (options.color === 'never') {
          useColor = false;
        } else {
          useColor = process.stdout.isTTY;
        }

        if (options.nameOnly) {
          output.print(formatPrFilesText(files, true, useColor));
        } else if (options.patch) {
          for (const file of files) {
            if (file.patch) {
              output.print(`diff --git a/${file.filename} b/${file.filename}`);
              output.print(file.patch);
              output.print('');
            }
          }
        } else {
          output.print(formatPrFilesText(files, false, useColor));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
