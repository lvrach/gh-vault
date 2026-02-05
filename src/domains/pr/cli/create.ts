import * as fs from 'node:fs';

import { Command } from 'commander';
import open from 'open';

import type { Output } from '../../../shared/output.js';
import {
  getCommitInfo,
  getCurrentBranch,
  getDefaultBranch,
  resolveRepository,
} from '../../../shared/repo.js';
import type { PrApi } from '../api.js';

interface CreateOptions {
  title?: string | undefined;
  body?: string | undefined;
  bodyFile?: string | undefined;
  base?: string | undefined;
  head?: string | undefined;
  draft?: boolean | undefined;
  web?: boolean | undefined;
  repo?: string | undefined;
  assignee?: string[] | undefined;
  label?: string[] | undefined;
  reviewer?: string[] | undefined;
  milestone?: string | undefined;
  noMaintainerEdit?: boolean | undefined;
  fill?: boolean | undefined;
}

function readBodyFile(path: string): string {
  if (path === '-' || path === '/dev/stdin') {
    return fs.readFileSync(0, 'utf8');
  }
  // CLI tool - user specifies file path via -F flag
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return fs.readFileSync(path, 'utf8');
}

/**
 * Collect multiple flag values into an array.
 * Supports both comma-separated values (--flag a,b) and repeated flags (--flag a --flag b).
 * This matches the official gh CLI behavior.
 */
function collect(value: string, previous: string[]): string[] {
  // Split by comma to support comma-separated values like "--reviewer user1,user2"
  const values = value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return [...previous, ...values];
}

export function createCreateCommand(output: Output, prApi: PrApi): Command {
  return new Command('create')
    .description('Create a pull request')
    .option('-t, --title <title>', 'Title for the pull request')
    .option('-b, --body <body>', 'Body for the pull request')
    .option('-F, --body-file <file>', 'Read body from file (use "-" for stdin)')
    .option('-B, --base <branch>', 'The branch into which you want your code merged')
    .option('-H, --head <branch>', 'The branch that contains commits for your PR')
    .option('-d, --draft', 'Create the PR as a draft')
    .option('-w, --web', 'Open the web browser to create a PR')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .option(
      '-a, --assignee <login>',
      'Assign people by their login (use "@me" to self-assign)',
      collect,
      []
    )
    .option('-l, --label <name>', 'Add labels by name', collect, [])
    .option('-r, --reviewer <handle>', 'Request reviews from people by their handle', collect, [])
    .option('-m, --milestone <name>', 'Add the pull request to a milestone by name')
    .option('--no-maintainer-edit', "Disable maintainer's ability to modify pull request")
    .option('-f, --fill', 'Use commit info for title and body')
    .action(async (options: CreateOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        const head = options.head ?? (await getCurrentBranch());
        if (!head) {
          output.printError('Error: Could not determine head branch. Use -H to specify.');
          process.exitCode = 1;
          return;
        }

        const base = options.base ?? (await getDefaultBranch(owner, repo));

        if (options.web) {
          const title = options.title ? encodeURIComponent(options.title) : '';
          const body = options.body ? encodeURIComponent(options.body) : '';
          let url = `https://github.com/${owner}/${repo}/compare/${base}...${head}?expand=1`;
          if (title) url += `&title=${title}`;
          if (body) url += `&body=${body}`;
          await open(url);
          return;
        }

        let title = options.title;
        let body = options.body ?? '';

        if (options.fill) {
          const commitInfo = await getCommitInfo(base);
          if (!title && commitInfo.title) {
            title = commitInfo.title;
          }
          if (!body && commitInfo.body) {
            body = commitInfo.body;
          }
        }

        if (options.bodyFile) {
          body = readBodyFile(options.bodyFile);
        }

        if (!title) {
          output.printError('Error: --title is required (or use --fill to use commit info)');
          process.exitCode = 1;
          return;
        }

        let assignees = options.assignee;
        if (assignees?.includes('@me')) {
          const currentUser = await prApi.getCurrentUser();
          assignees = assignees.map((a) => (a === '@me' ? currentUser : a));
        }

        const pr = await prApi.createPr({
          owner,
          repo,
          title,
          body,
          head,
          base,
          draft: options.draft,
          assignees: assignees && assignees.length > 0 ? assignees : undefined,
          labels: options.label && options.label.length > 0 ? options.label : undefined,
          reviewers: options.reviewer && options.reviewer.length > 0 ? options.reviewer : undefined,
          milestone: options.milestone,
          maintainerCanModify: options.noMaintainerEdit !== true,
        });

        output.print(pr.htmlUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
