import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import type { SearchApi } from '../api.js';
import { codeToJson, formatCodeJson } from '../formatters/json.js';
import { formatCodeText } from '../formatters/text.js';
import type { SearchCodeInput } from '../types.js';

interface CodeOptions {
  extension?: string;
  filename?: string;
  language?: string;
  limit?: string;
  match?: string[];
  owner?: string[];
  repo?: string[];
  size?: string;
  json?: string | boolean;
  jq?: string;
  web?: boolean;
}

export function createCodeCommand(output: Output, searchApi: SearchApi): Command {
  return new Command('code')
    .description('Search within code in GitHub repositories')
    .argument('<query...>', 'Search keywords (required)')
    .option('--extension <ext>', 'Filter on file extension')
    .option('--filename <name>', 'Filter on filename')
    .option('--language <lang>', 'Filter results by language')
    .option('-L, --limit <number>', 'Maximum number of code results to fetch', '30')
    .option('--match <type...>', 'Restrict search to file contents or file path: {file|path}')
    .option('--owner <user...>', 'Filter on owner')
    .option('-R, --repo <repo...>', 'Filter on repository')
    .option('--size <size>', 'Filter on size range, in kilobytes')
    .option('--json [fields]', 'Output JSON with the specified fields')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the search query in the web browser')
    .action(async (queryParts: string[], options: CodeOptions) => {
      try {
        const query = queryParts.join(' ');

        if (!query) {
          output.printError('Error: search query is required for code search');
          process.exitCode = 1;
          return;
        }

        // Open in browser if --web
        if (options.web) {
          const searchQuery = encodeURIComponent(query);
          const url = `https://github.com/search?q=${searchQuery}&type=code`;
          await open(url);
          return;
        }

        // Build search input
        const input: SearchCodeInput = {
          query,
          extension: options.extension,
          filename: options.filename,
          language: options.language,
          match: options.match as ('file' | 'path')[] | undefined,
          owner: options.owner,
          repo: options.repo,
          size: options.size,
          perPage: Number.parseInt(options.limit ?? '30', 10),
        };

        const result = await searchApi.searchCode(input);

        // Handle --jq filtering
        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = result.items.map((item) => codeToJson(item));
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
          output.print(formatCodeText(result.items, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatCodeJson(result.items, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
