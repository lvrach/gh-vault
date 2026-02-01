import { Command } from 'commander';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import type { RepoApi } from '../api.js';
import { formatRepoListJson, repoListItemToJson } from '../formatters/json.js';
import { formatRepoListText } from '../formatters/text.js';
import type { RepositoryListItem, RepoVisibility } from '../types.js';

interface ListOptions {
  limit?: string | undefined;
  visibility?: string | undefined;
  language?: string | undefined;
  topic?: string[] | undefined;
  archived?: boolean | undefined;
  noArchived?: boolean | undefined;
  fork?: boolean | undefined;
  source?: boolean | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
}

export function createListCommand(output: Output, repoApi: RepoApi): Command {
  return new Command('list')
    .alias('ls')
    .description('List repositories owned by user or organization')
    .argument('[owner]', 'User or organization to list repos for')
    .option('-L, --limit <number>', 'Maximum number of repositories to list', '30')
    .option('--visibility <visibility>', 'Filter by visibility: public, private, internal')
    .option('-l, --language <language>', 'Filter by primary coding language')
    .option('--topic <topics...>', 'Filter by topic')
    .option('--archived', 'Show only archived repositories')
    .option('--no-archived', 'Omit archived repositories')
    .option('--fork', 'Show only forks')
    .option('--source', 'Show only non-forks')
    .option('--json [fields]', 'Output JSON with the specified fields')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .action(async (ownerArg: string | undefined, options: ListOptions) => {
      try {
        const limit = Number.parseInt(options.limit ?? '30', 10);

        let repos = await repoApi.listRepos({
          owner: ownerArg,
          perPage: limit,
          visibility: options.visibility as RepoVisibility | undefined,
        });

        // Client-side filtering
        repos = applyFilters(repos, options);

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            output.printError('Example: gh-vault repo list --json name,url --jq ".[].name"');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = repos.map((r) => repoListItemToJson(r));
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
          output.print(formatRepoListText(repos, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatRepoListJson(repos, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}

function applyFilters(repos: RepositoryListItem[], options: ListOptions): RepositoryListItem[] {
  let filtered = repos;

  // Language filter
  if (options.language) {
    const lang = options.language.toLowerCase();
    filtered = filtered.filter((r) => r.language?.toLowerCase() === lang);
  }

  // Topic filter
  // Note: We don't have topics in list items, so this would require fetching each repo
  // For now, skip topic filtering in list (matches gh CLI limitation)

  // Archived filter
  if (options.archived === true) {
    filtered = filtered.filter((r) => r.archived);
  } else if (options.noArchived === true || options.archived === false) {
    filtered = filtered.filter((r) => !r.archived);
  }

  // Fork/source filter
  if (options.fork) {
    filtered = filtered.filter((r) => r.fork);
  } else if (options.source) {
    filtered = filtered.filter((r) => !r.fork);
  }

  return filtered;
}
