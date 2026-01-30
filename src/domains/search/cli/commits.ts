import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import type { SearchApi } from '../api.js';
import { commitToJson, formatCommitsJson } from '../formatters/json.js';
import { formatCommitsText } from '../formatters/text.js';
import type { SearchCommitsInput } from '../types.js';

interface CommitsOptions {
  author?: string;
  authorDate?: string;
  authorEmail?: string;
  authorName?: string;
  committer?: string;
  committerDate?: string;
  committerEmail?: string;
  committerName?: string;
  hash?: string;
  limit?: string;
  merge?: boolean;
  order?: string;
  owner?: string[];
  parent?: string;
  repo?: string[];
  sort?: string;
  tree?: string;
  visibility?: string[];
  json?: string | boolean;
  jq?: string;
  web?: boolean;
}

export function createCommitsCommand(output: Output, searchApi: SearchApi): Command {
  return new Command('commits')
    .description('Search for commits on GitHub')
    .argument('[query...]', 'Search keywords')
    .option('--author <user>', 'Filter by author')
    .option('--author-date <date>', 'Filter based on authored date')
    .option('--author-email <email>', 'Filter on author email')
    .option('--author-name <name>', 'Filter on author name')
    .option('--committer <user>', 'Filter by committer')
    .option('--committer-date <date>', 'Filter based on committed date')
    .option('--committer-email <email>', 'Filter on committer email')
    .option('--committer-name <name>', 'Filter on committer name')
    .option('--hash <sha>', 'Filter by commit hash')
    .option('-L, --limit <number>', 'Maximum number of commits to fetch', '30')
    .option('--merge', 'Filter on merge commits')
    .option('--order <order>', 'Order of commits returned: {asc|desc}', 'desc')
    .option('--owner <user...>', 'Filter on repository owner')
    .option('--parent <sha>', 'Filter by parent hash')
    .option('-R, --repo <repo...>', 'Filter on repository')
    .option('--sort <sort>', 'Sort fetched commits: {author-date|committer-date}')
    .option('--tree <sha>', 'Filter by tree hash')
    .option(
      '--visibility <vis...>',
      'Filter based on repository visibility: {public|private|internal}'
    )
    .option('--json [fields]', 'Output JSON with the specified fields')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the search query in the web browser')
    .action(async (queryParts: string[], options: CommitsOptions) => {
      try {
        const query = queryParts.join(' ');

        // Open in browser if --web
        if (options.web) {
          const searchQuery = encodeURIComponent(query);
          const url = `https://github.com/search?q=${searchQuery}&type=commits`;
          await open(url);
          return;
        }

        // Build search input
        const input: SearchCommitsInput = {
          query,
          author: options.author,
          authorDate: options.authorDate,
          authorEmail: options.authorEmail,
          authorName: options.authorName,
          committer: options.committer,
          committerDate: options.committerDate,
          committerEmail: options.committerEmail,
          committerName: options.committerName,
          hash: options.hash,
          merge: options.merge,
          owner: options.owner,
          parent: options.parent,
          repo: options.repo,
          tree: options.tree,
          visibility: options.visibility as ('public' | 'private' | 'internal')[] | undefined,
          sort: options.sort as 'author-date' | 'committer-date' | undefined,
          order: options.order as 'asc' | 'desc' | undefined,
          perPage: Number.parseInt(options.limit ?? '30', 10),
        };

        const result = await searchApi.searchCommits(input);

        // Handle --jq filtering
        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = result.items.map((item) => commitToJson(item));
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

        // Output
        if (options.json === undefined) {
          const useColor = process.stdout.isTTY;
          output.print(formatCommitsText(result.items, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatCommitsJson(result.items, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
