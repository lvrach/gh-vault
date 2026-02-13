import { Command } from 'commander';
import open from 'open';

import { isPermissionError } from '../../../shared/errors.js';
import { filterWithJq, JqError } from '../../../shared/jq.js';
import type { Output } from '../../../shared/output.js';
import { resolvePrNumber, resolveRepository } from '../../../shared/repo.js';
import type { PrApi } from '../api.js';
import {
  formatPrCommentsJson,
  formatPrViewJson,
  type PrNestedData,
  prToJson,
} from '../formatters/json.js';
import { formatPrCommentsText, formatPrViewText } from '../formatters/text.js';

/** Fields that require additional API calls */
const NESTED_FIELDS = ['files', 'comments', 'reviews', 'statusCheckRollup'] as const;

/**
 * Parse requested JSON fields and determine which nested data to fetch.
 * Returns null if no JSON output requested.
 *
 * Note: Nested data (files, comments, reviews) is only fetched when explicitly requested.
 * Using `--json` without fields returns base PR data only (matches gh CLI's lazy loading).
 */
function parseJsonFields(
  jsonOption: string | boolean | undefined
): { fields: string[] | undefined; nestedFields: Set<string> } | null {
  if (jsonOption === undefined || jsonOption === false) {
    return null;
  }

  // --json without value = all base fields (no nested data)
  if (jsonOption === true || jsonOption === '') {
    return {
      fields: undefined, // undefined = return all base fields
      nestedFields: new Set<string>(), // don't fetch nested data by default
    };
  }

  // --json with specific fields - only fetch nested data if explicitly requested
  const fields = jsonOption.split(',').map((f: string) => f.trim());
  const nestedFields = new Set<string>(
    fields.filter((f: string) => NESTED_FIELDS.includes(f as (typeof NESTED_FIELDS)[number]))
  );

  return { fields, nestedFields };
}

interface ViewOptions {
  comments?: boolean | undefined;
  json?: string | boolean | undefined;
  jq?: string | undefined;
  web?: boolean | undefined;
  repo?: string | undefined;
}

export function createViewCommand(output: Output, prApi: PrApi): Command {
  return new Command('view')
    .description('View a pull request')
    .argument('[pr]', 'PR number, URL, or branch name')
    .option('-c, --comments', 'View comments on the pull request')
    .option('--json [fields]', 'Output JSON (optionally specify fields)')
    .option('-q, --jq <expression>', 'Filter JSON output using a jq expression')
    .option('-w, --web', 'Open the pull request in the browser')
    .option('-R, --repo <owner/repo>', 'Select another repository')
    .action(async (prArg: string | undefined, options: ViewOptions) => {
      try {
        // First try to resolve PR number - this may extract owner/repo from URL
        const prResult = await resolvePrNumber(prArg, '', '', prApi.listPrs.bind(prApi));

        let owner: string;
        let repo: string;
        let pullNumber: number;

        if (prResult.success && prResult.owner && prResult.repo) {
          // Owner/repo came from URL - use them directly
          owner = prResult.owner;
          repo = prResult.repo;
          pullNumber = prResult.pullNumber;
        } else {
          // No URL with owner/repo - resolve from --repo flag or local git
          const repoResult = await resolveRepository(options.repo);
          if (!repoResult.success) {
            output.printError(`Error: ${repoResult.error}`);
            process.exitCode = 1;
            return;
          }
          owner = repoResult.owner;
          repo = repoResult.repo;

          // Re-resolve PR number with proper owner/repo for branch lookup
          const prResult2 = await resolvePrNumber(prArg, owner, repo, prApi.listPrs.bind(prApi));
          if (!prResult2.success) {
            output.printError(`Error: ${prResult2.error}`);
            process.exitCode = 1;
            return;
          }
          pullNumber = prResult2.pullNumber;
        }

        if (options.web) {
          const url = `https://github.com/${owner}/${repo}/pull/${String(pullNumber)}`;
          await open(url);
          return;
        }

        const pr = await prApi.getPr({ owner, repo, pullNumber });
        const useColor = process.stdout.isTTY;
        const jsonConfig = parseJsonFields(options.json);

        // Fetch nested data if JSON output requested with those fields
        let nestedData: PrNestedData | undefined;
        if (jsonConfig && jsonConfig.nestedFields.size > 0) {
          const { nestedFields } = jsonConfig;
          nestedData = {};

          // Build array of fetch operations for requested fields
          const fetchOps: Promise<void>[] = [];

          if (nestedFields.has('files')) {
            fetchOps.push(
              prApi.listPrFiles({ owner, repo, pullNumber }).then((result) => {
                nestedData = { ...nestedData, files: result };
              })
            );
          }

          if (nestedFields.has('comments')) {
            fetchOps.push(
              prApi.listPrComments({ owner, repo, issueNumber: pullNumber }).then((result) => {
                nestedData = { ...nestedData, comments: result };
              })
            );
          }

          if (nestedFields.has('reviews')) {
            fetchOps.push(
              prApi.listPrReviews({ owner, repo, pullNumber }).then((result) => {
                nestedData = { ...nestedData, reviews: result };
              })
            );
          }

          if (nestedFields.has('statusCheckRollup')) {
            fetchOps.push(
              prApi
                .listPrChecks({ owner, repo, pullNumber })
                .then((result) => {
                  nestedData = { ...nestedData, statusCheckRollup: result };
                })
                .catch((error: unknown) => {
                  // Only suppress permission errors (403) - return null like gh CLI
                  // Re-throw other errors (network, server errors) to surface failures
                  if (isPermissionError(error)) {
                    nestedData = { ...nestedData, statusCheckRollup: null };
                  } else {
                    throw error;
                  }
                })
            );
          }

          await Promise.all(fetchOps);
        }

        if (options.jq) {
          if (options.json === undefined) {
            output.printError('Error: --jq requires --json to be specified');
            output.printError('Example: gh-vault pr view 123 --json title,state --jq ".title"');
            process.exitCode = 1;
            return;
          }

          try {
            const jsonData = prToJson(pr, nestedData);
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
          output.print(formatPrViewText(pr, useColor));
        } else {
          output.print(formatPrViewJson(pr, jsonConfig?.fields, nestedData));
        }

        if (options.comments) {
          // Use already-fetched comments if available, otherwise fetch
          const comments =
            nestedData?.comments ??
            (await prApi.listPrComments({ owner, repo, issueNumber: pullNumber }));
          output.print('');

          if (options.json === undefined) {
            output.print(formatPrCommentsText(comments, useColor));
          } else {
            output.print(formatPrCommentsJson(comments));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
