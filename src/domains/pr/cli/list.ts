import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { resolveRepository } from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import { formatPrListJson, prListItemToJson } from '../formatters/json.js';
import { formatPrListText } from '../formatters/text.js';

interface ListOptions {
  state?: 'open' | 'closed' | 'all' | undefined;
  author?: string | undefined;
  assignee?: string | undefined;
  label?: string[] | undefined;
  base?: string | undefined;
  head?: string | undefined;
  draft?: boolean | undefined;
  limit?: string | undefined;
  search?: string | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
  web?: boolean | undefined;
  repo?: string | undefined;
}

export function createListCommand(output: Output, prApi: PrApi): Command {
  return new Command('list')
    .description('List pull requests in a repository')
    .option('-s, --state <state>', 'Filter by state: open, closed, all', 'open')
    .option('-A, --author <author>', 'Filter by author')
    .option('-a, --assignee <assignee>', 'Filter by assignee')
    .option('-l, --label <label...>', 'Filter by labels')
    .option('-B, --base <branch>', 'Filter by base branch')
    .option('-H, --head <branch>', 'Filter by head branch')
    .option('-d, --draft', 'Filter for draft PRs')
    .option('-L, --limit <number>', 'Maximum number of PRs to fetch', '30')
    .option('-S, --search <query>', 'Search PRs with query')
    .option('--json [fields]', 'Output JSON (optionally specify fields)')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the pull request list in the browser')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (options: ListOptions) => {
      try {
        const repoResult = await resolveRepository(options.repo);
        if (!repoResult.success) {
          output.printError(`Error: ${repoResult.error}`);
          process.exitCode = 1;
          return;
        }
        const { owner, repo } = repoResult;

        if (options.web) {
          const url = `https://github.com/${owner}/${repo}/pulls`;
          await open(url);
          return;
        }

        const prs = await prApi.listPrs({
          owner,
          repo,
          state: options.state ?? 'open',
          author: options.author,
          assignee: options.assignee,
          labels: options.label,
          base: options.base,
          head: options.head,
          draft: options.draft,
          perPage: Number.parseInt(options.limit ?? '30', 10),
          search: options.search,
        });

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            output.printError('Example: gh-vault pr list --json number,title --jq ".[].title"');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = prs.map((pr) => prListItemToJson(pr));
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

        if (options.json === undefined) {
          const useColor = process.stdout.isTTY;
          output.print(formatPrListText(prs, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatPrListJson(prs, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
