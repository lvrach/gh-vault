import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { searchRepos } from '../api.js';
import { formatReposJson, repoToJson } from '../formatters/json.js';
import { formatReposText } from '../formatters/text.js';
import type { SearchReposInput } from '../types.js';

interface ReposOptions {
  archived?: boolean;
  created?: string;
  followers?: string;
  forks?: string;
  goodFirstIssues?: string;
  helpWantedIssues?: string;
  includeForks?: string;
  language?: string;
  license?: string[];
  limit?: string;
  match?: string[];
  numberTopics?: string;
  order?: string;
  owner?: string[];
  size?: string;
  sort?: string;
  stars?: string;
  topic?: string[];
  updated?: string;
  visibility?: string[];
  json?: string | boolean;
  jq?: string;
  web?: boolean;
}

export function createReposCommand(output: Output): Command {
  return new Command('repos')
    .description('Search for repositories on GitHub')
    .argument('[query...]', 'Search keywords')
    .option('--archived', 'Filter based on the repository archived state')
    .option('--created <date>', 'Filter based on created at date')
    .option('--followers <number>', 'Filter based on number of followers')
    .option('--forks <number>', 'Filter on number of forks')
    .option(
      '--good-first-issues <number>',
      "Filter on number of issues with the 'good first issue' label"
    )
    .option(
      '--help-wanted-issues <number>',
      "Filter on number of issues with the 'help wanted' label"
    )
    .option('--include-forks <value>', 'Include forks in fetched repositories: {false|true|only}')
    .option('--language <lang>', 'Filter based on the coding language')
    .option('--license <type...>', 'Filter based on license type')
    .option('-L, --limit <number>', 'Maximum number of repositories to fetch', '30')
    .option('--match <field...>', 'Restrict search to specific field: {name|description|readme}')
    .option('--number-topics <number>', 'Filter on number of topics')
    .option('--order <order>', 'Order of repositories returned: {asc|desc}', 'desc')
    .option('--owner <user...>', 'Filter on owner')
    .option('--size <size>', 'Filter on a size range, in kilobytes')
    .option('--sort <sort>', 'Sort fetched repositories: {forks|help-wanted-issues|stars|updated}')
    .option('--stars <number>', 'Filter on number of stars')
    .option('--topic <topic...>', 'Filter on topic')
    .option('--updated <date>', 'Filter on last updated at date')
    .option('--visibility <vis...>', 'Filter based on visibility: {public|private|internal}')
    .option('--json [fields]', 'Output JSON with the specified fields')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the search query in the web browser')
    .action(async (queryParts: string[], options: ReposOptions) => {
      try {
        const query = queryParts.join(' ');

        // Open in browser if --web
        if (options.web) {
          const searchQuery = encodeURIComponent(query);
          const url = `https://github.com/search?q=${searchQuery}&type=repositories`;
          await open(url);
          return;
        }

        // Build search input
        const input: SearchReposInput = {
          query,
          archived: options.archived,
          created: options.created,
          followers: options.followers,
          forks: options.forks,
          goodFirstIssues: options.goodFirstIssues,
          helpWantedIssues: options.helpWantedIssues,
          includeForks: options.includeForks as 'false' | 'true' | 'only' | undefined,
          language: options.language,
          license: options.license,
          match: options.match as ('name' | 'description' | 'readme')[] | undefined,
          numberTopics: options.numberTopics,
          owner: options.owner,
          size: options.size,
          stars: options.stars,
          topic: options.topic,
          updated: options.updated,
          visibility: options.visibility as ('public' | 'private' | 'internal')[] | undefined,
          sort: options.sort as 'forks' | 'help-wanted-issues' | 'stars' | 'updated' | undefined,
          order: options.order as 'asc' | 'desc' | undefined,
          perPage: Number.parseInt(options.limit ?? '30', 10),
        };

        const result = await searchRepos(input);

        // Handle --jq filtering
        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = result.items.map((item) => repoToJson(item));
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
          output.print(formatReposText(result.items, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatReposJson(result.items, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
