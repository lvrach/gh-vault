import { Command } from 'commander';
import open from 'open';

import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import type { SearchApi } from '../api.js';
import { formatPrsJson, prToJson } from '../formatters/json.js';
import { formatPrsText } from '../formatters/text.js';
import type { SearchPrsInput } from '../types.js';

interface PrsOptions {
  app?: string;
  archived?: boolean;
  assignee?: string;
  author?: string;
  base?: string;
  checks?: string;
  closed?: string;
  commenter?: string;
  comments?: string;
  created?: string;
  draft?: boolean;
  head?: string;
  interactions?: string;
  involves?: string;
  label?: string[];
  language?: string;
  limit?: string;
  locked?: boolean;
  match?: string[];
  mentions?: string;
  merged?: boolean;
  mergedAt?: string;
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
  review?: string;
  reviewRequested?: string;
  reviewedBy?: string;
  sort?: string;
  state?: string;
  teamMentions?: string;
  updated?: string;
  visibility?: string[];
  json?: string | boolean;
  jq?: string;
  web?: boolean;
}

export function createPrsCommand(output: Output, searchApi: SearchApi): Command {
  return new Command('prs')
    .description('Search for pull requests on GitHub')
    .argument('[query...]', 'Search keywords')
    .option('--app <app>', 'Filter by GitHub App author')
    .option('--archived', 'Filter based on the repository archived state')
    .option('--assignee <user>', 'Filter by assignee')
    .option('--author <user>', 'Filter by author')
    .option('-B, --base <branch>', 'Filter on base branch name')
    .option('--checks <status>', 'Filter based on status of the checks: {pending|success|failure}')
    .option('--closed <date>', 'Filter on closed at date')
    .option('--commenter <user>', 'Filter based on comments by user')
    .option('--comments <number>', 'Filter on number of comments')
    .option('--created <date>', 'Filter based on created at date')
    .option('--draft', 'Filter based on draft state')
    .option('-H, --head <branch>', 'Filter on head branch name')
    .option('--interactions <number>', 'Filter on number of reactions and comments')
    .option('--involves <user>', 'Filter based on involvement of user')
    .option('--label <label...>', 'Filter on label')
    .option('--language <lang>', 'Filter based on the coding language')
    .option('-L, --limit <number>', 'Maximum number of results to fetch', '30')
    .option('--locked', 'Filter on locked conversation status')
    .option('--match <field...>', 'Restrict search to specific field: {title|body|comments}')
    .option('--mentions <user>', 'Filter based on user mentions')
    .option('--merged', 'Filter based on merged state')
    .option('--merged-at <date>', 'Filter on merged at date')
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
      '--review <status>',
      'Filter based on review status: {none|required|approved|changes_requested}'
    )
    .option('--review-requested <user>', 'Filter on user or team requested to review')
    .option('--reviewed-by <user>', 'Filter on user who reviewed')
    .option(
      '--sort <sort>',
      'Sort fetched results: {comments|reactions|interactions|created|updated}'
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
    .action(async (queryParts: string[], options: PrsOptions) => {
      try {
        const query = queryParts.join(' ');

        // Open in browser if --web
        if (options.web) {
          const searchQuery = encodeURIComponent(query);
          const url = `https://github.com/search?q=${searchQuery}&type=pullrequests`;
          await open(url);
          return;
        }

        // Build search input
        const input: SearchPrsInput = {
          query,
          app: options.app,
          archived: options.archived,
          assignee: options.assignee,
          author: options.author,
          base: options.base,
          checks: options.checks as 'pending' | 'success' | 'failure' | undefined,
          closed: options.closed,
          commenter: options.commenter,
          comments: options.comments,
          created: options.created,
          draft: options.draft,
          head: options.head,
          interactions: options.interactions,
          involves: options.involves,
          label: options.label,
          language: options.language,
          locked: options.locked,
          match: options.match as ('title' | 'body' | 'comments')[] | undefined,
          mentions: options.mentions,
          merged: options.merged,
          mergedAt: options.mergedAt,
          milestone: options.milestone,
          noAssignee: options.noAssignee,
          noLabel: options.noLabel,
          noMilestone: options.noMilestone,
          noProject: options.noProject,
          owner: options.owner,
          project: options.project,
          reactions: options.reactions,
          repo: options.repo,
          review: options.review as
            | 'none'
            | 'required'
            | 'approved'
            | 'changes_requested'
            | undefined,
          reviewRequested: options.reviewRequested,
          reviewedBy: options.reviewedBy,
          state: options.state as 'open' | 'closed' | undefined,
          teamMentions: options.teamMentions,
          updated: options.updated,
          visibility: options.visibility as ('public' | 'private' | 'internal')[] | undefined,
          sort: options.sort as SearchPrsInput['sort'],
          order: options.order as 'asc' | 'desc' | undefined,
          perPage: Number.parseInt(options.limit ?? '30', 10),
        };

        const result = await searchApi.searchPrs(input);

        // Handle --jq filtering
        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = result.items.map((item) => prToJson(item));
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
          output.print(formatPrsText(result.items, useColor));
        } else {
          const fields =
            typeof options.json === 'string'
              ? options.json.split(',').map((f) => f.trim())
              : undefined;
          output.print(formatPrsJson(result.items, fields));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
