import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import type { SearchApi } from '../api.js';
import { formatIssuesJson, issueToJson } from '../formatters/json.js';
import { formatIssuesText } from '../formatters/text.js';
import type { SearchIssuesInput } from '../types.js';

interface IssuesOptions {
  app?: string;
  archived?: boolean;
  assignee?: string;
  author?: string;
  closed?: string;
  commenter?: string;
  comments?: string;
  created?: string;
  includePrs?: boolean;
  interactions?: string;
  involves?: string;
  label?: string[];
  language?: string;
  limit?: string;
  locked?: boolean;
  match?: string[];
  mentions?: string;
  milestone?: string;
  noAssignee?: boolean;
  noLabel?: boolean;
  noMilestone?: boolean;
  noProject?: boolean;
  order?: string;
  owner?: string[];
  project?: string;
  reactions?: string;
  repo?: string[];
  sort?: string;
  state?: string;
  teamMentions?: string;
  updated?: string;
  visibility?: string[];
  json?: string | boolean;
  jq?: string;
  web?: boolean;
}

export function createIssuesCommand(output: Output, searchApi: SearchApi): Command {
  return new Command('issues')
    .description('Search for issues on GitHub')
    .argument('[query...]', 'Search keywords')
    .option('--app <app>', 'Filter by GitHub App author')
    .option('--archived', 'Filter based on the repository archived state')
    .option('--assignee <user>', 'Filter by assignee')
    .option('--author <user>', 'Filter by author')
    .option('--closed <date>', 'Filter on closed at date')
    .option('--commenter <user>', 'Filter based on comments by user')
    .option('--comments <number>', 'Filter on number of comments')
    .option('--created <date>', 'Filter based on created at date')
    .option('--include-prs', 'Include pull requests in results')
    .option('--interactions <number>', 'Filter on number of reactions and comments')
    .option('--involves <user>', 'Filter based on involvement of user')
    .option('--label <label...>', 'Filter on label')
    .option('--language <lang>', 'Filter based on the coding language')
    .option('-L, --limit <number>', 'Maximum number of results to fetch', '30')
    .option('--locked', 'Filter on locked conversation status')
    .option('--match <field...>', 'Restrict search to specific field: {title|body|comments}')
    .option('--mentions <user>', 'Filter based on user mentions')
    .option('--milestone <title>', 'Filter by milestone title')
    .option('--no-assignee', 'Filter on missing assignee')
    .option('--no-label', 'Filter on missing label')
    .option('--no-milestone', 'Filter on missing milestone')
    .option('--no-project', 'Filter on missing project')
    .option('--order <order>', 'Order of results returned: {asc|desc}', 'desc')
    .option('--owner <user...>', 'Filter on repository owner')
    .option('--project <owner/number>', 'Filter on project board owner/number')
    .option('--reactions <number>', 'Filter on number of reactions')
    .option('-R, --repo <repo...>', 'Filter on repository')
    .option(
      '--sort <sort>',
      'Sort fetched results: {comments|created|interactions|reactions|updated}'
    )
    .option('--state <state>', 'Filter based on state: {open|closed}')
    .option('--team-mentions <team>', 'Filter based on team mentions')
    .option('--updated <date>', 'Filter on last updated at date')
    .option(
      '--visibility <vis...>',
      'Filter based on repository visibility: {public|private|internal}'
    )
    .option('--json [fields]', 'Output JSON with the specified fields')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the search query in the web browser')
    .action(async (queryParts: string[], options: IssuesOptions) => {
      try {
        const query = queryParts.join(' ');

        // Open in browser if --web
        if (options.web) {
          const searchQuery = encodeURIComponent(query);
          const url = `https://github.com/search?q=${searchQuery}&type=issues`;
          await open(url);
          return;
        }

        // Build search input
        const input: SearchIssuesInput = {
          query,
          app: options.app,
          archived: options.archived,
          assignee: options.assignee,
          author: options.author,
          closed: options.closed,
          commenter: options.commenter,
          comments: options.comments,
          created: options.created,
          includePrs: options.includePrs,
          interactions: options.interactions,
          involves: options.involves,
          label: options.label,
          language: options.language,
          locked: options.locked,
          match: options.match as ('title' | 'body' | 'comments')[] | undefined,
          mentions: options.mentions,
          milestone: options.milestone,
          noAssignee: options.noAssignee,
          noLabel: options.noLabel,
          noMilestone: options.noMilestone,
          noProject: options.noProject,
          owner: options.owner,
          project: options.project,
          reactions: options.reactions,
          repo: options.repo,
          state: options.state as 'open' | 'closed' | undefined,
          teamMentions: options.teamMentions,
          updated: options.updated,
          visibility: options.visibility as ('public' | 'private' | 'internal')[] | undefined,
          sort: options.sort as SearchIssuesInput['sort'],
          order: options.order as 'asc' | 'desc' | undefined,
          perPage: Number.parseInt(options.limit ?? '30', 10),
        };

        const result = await searchApi.searchIssues(input);

        // Handle --jq filtering
        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = result.items.map((item) => issueToJson(item));
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
          output.print(formatIssuesText(result.items, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatIssuesJson(result.items, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
