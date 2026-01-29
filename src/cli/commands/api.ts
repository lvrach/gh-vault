/**
 * gh api command - make raw GitHub API requests.
 * Matches official gh CLI behavior for basic operations.
 */

import * as fs from 'node:fs';

import { Command } from 'commander';

import { makeApiRequest } from '../../core/api/request.js';
import { filterWithJq, JqError } from '../../shared/jq.js';
import type { Output } from '../../shared/output.js';
import { detectRepo, getCurrentBranch } from '../../shared/repo.js';

interface ApiOptions {
  method?: string | undefined;
  rawField?: string[] | undefined;
  field?: string[] | undefined;
  header?: string[] | undefined;
  input?: string | undefined;
  jq?: string | undefined;
  include?: boolean | undefined;
  silent?: boolean | undefined;
}

/**
 * Parse -f/--raw-field parameters into key-value pairs.
 * Format: key=value
 */
function parseRawFields(rawFields: string[] | undefined): Map<string, string> {
  const result = new Map<string, string>();
  if (!rawFields) return result;

  for (const field of rawFields) {
    const eqIndex = field.indexOf('=');
    if (eqIndex === -1) {
      throw new Error(`Invalid field format: ${field}. Expected key=value`);
    }
    const key = field.slice(0, eqIndex);
    const value = field.slice(eqIndex + 1);
    result.set(key, value);
  }

  return result;
}

/**
 * Parse -F/--field parameters with type conversion.
 * Supports: booleans (true/false), numbers, and strings.
 */
function parseTypedFields(fields: string[] | undefined): Map<string, unknown> {
  const result = new Map<string, unknown>();
  if (!fields) return result;

  for (const field of fields) {
    const eqIndex = field.indexOf('=');
    if (eqIndex === -1) {
      throw new Error(`Invalid field format: ${field}. Expected key=value`);
    }
    const key = field.slice(0, eqIndex);
    const rawValue = field.slice(eqIndex + 1);

    // Type conversion
    switch (rawValue) {
      case 'true': {
        result.set(key, true);

        break;
      }
      case 'false': {
        result.set(key, false);

        break;
      }
      case 'null': {
        result.set(key, null);

        break;
      }
      default: {
        if (/^-?\d+$/.test(rawValue)) {
          result.set(key, Number.parseInt(rawValue, 10));
        } else if (/^-?\d+\.\d+$/.test(rawValue)) {
          result.set(key, Number.parseFloat(rawValue));
        } else {
          result.set(key, rawValue);
        }
      }
    }
  }

  return result;
}

/**
 * Parse -H/--header parameters into key-value pairs.
 * Format: key:value
 */
function parseHeaders(headers: string[] | undefined): Map<string, string> {
  const result = new Map<string, string>();
  if (!headers) return result;

  for (const header of headers) {
    const colonIndex = header.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid header format: ${header}. Expected key:value`);
    }
    const key = header.slice(0, colonIndex);
    const value = header.slice(colonIndex + 1).trim();
    result.set(key, value);
  }

  return result;
}

/**
 * Read input from file or stdin.
 * Use "-" or "/dev/stdin" for stdin.
 */
function readInput(inputPath: string): unknown {
  let content: string;

  if (inputPath === '-' || inputPath === '/dev/stdin') {
    // Read from stdin
    content = fs.readFileSync(0, 'utf8');
  } else {
    // CLI tool - user specifies file path via --input flag
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    content = fs.readFileSync(inputPath, 'utf8');
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error(`Invalid JSON in input: ${inputPath}`);
  }
}

/**
 * Resolve placeholders in the endpoint.
 * Supports: {owner}, {repo}, {branch}
 */
async function resolvePlaceholders(endpoint: string): Promise<string> {
  let resolved = endpoint;

  if (resolved.includes('{owner}') || resolved.includes('{repo}')) {
    // Check GH_REPO env var first (official gh behavior)
    const ghRepo = process.env['GH_REPO'];
    if (ghRepo?.includes('/')) {
      const [envOwner, envRepo] = ghRepo.split('/');
      if (envOwner && envRepo) {
        resolved = resolved.replaceAll('{owner}', envOwner);
        resolved = resolved.replaceAll('{repo}', envRepo);
      }
    } else {
      const detection = await detectRepo();
      if (!detection.success) {
        throw new Error('Could not determine repository. Set GH_REPO or run from a git repo.');
      }
      resolved = resolved.replaceAll('{owner}', detection.info.owner);
      resolved = resolved.replaceAll('{repo}', detection.info.repo);
    }
  }

  if (resolved.includes('{branch}')) {
    const branch = await getCurrentBranch();
    if (!branch) {
      throw new Error('Could not determine current branch.');
    }
    resolved = resolved.replaceAll('{branch}', branch);
  }

  // Validate no unresolved placeholders remain
  const placeholderMatch = /\{[^}]+\}/.exec(resolved);
  if (placeholderMatch) {
    throw new Error(`Unresolved placeholder: ${placeholderMatch[0]}`);
  }

  return resolved;
}

export function createApiCommand(output: Output): Command {
  return new Command('api')
    .description('Make an authenticated GitHub API request')
    .argument('<endpoint>', 'GitHub API endpoint (use {owner}/{repo}/{branch} as placeholders)')
    .option('-X, --method <method>', 'HTTP method (default: GET, or POST with parameters)')
    .option('-f, --raw-field <field...>', 'Add a string parameter in key=value format')
    .option('-F, --field <field...>', 'Add a typed parameter in key=value format')
    .option('-H, --header <header...>', 'Add HTTP header in key:value format')
    .option('--input <file>', 'Read request body from file (use "-" for stdin)')
    .option('-q, --jq <expression>', 'Filter JSON output with jq syntax')
    .option('-i, --include', 'Include HTTP response status and headers')
    .option('--silent', 'Do not print the response body')
    .action(async (endpoint: string, options: ApiOptions) => {
      try {
        // Resolve placeholders
        const resolvedEndpoint = await resolvePlaceholders(endpoint);

        // Parse parameters - combine input body, raw fields, and typed fields
        // Later values override earlier ones (input < raw < typed)
        let inputBody: Record<string, unknown> = {};
        if (options.input) {
          const parsed = readInput(options.input);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            inputBody = parsed as Record<string, unknown>;
          } else {
            throw new Error('Input must be a JSON object');
          }
        }

        const rawParams = parseRawFields(options.rawField);
        const typedParams = parseTypedFields(options.field);

        // Merge params: inputBody first, then Maps (later values override)
        // Using Object.fromEntries to avoid prototype pollution (detect-object-injection)
        const params: Record<string, unknown> = {
          ...inputBody,
          ...Object.fromEntries(rawParams),
          ...Object.fromEntries(typedParams),
        };

        const headers = parseHeaders(options.header);
        const headersObj = Object.fromEntries(headers);

        const hasParams = Object.keys(params).length > 0;
        const method = options.method ?? (hasParams ? 'POST' : 'GET');

        const response = await makeApiRequest({
          endpoint: resolvedEndpoint,
          method,
          params: hasParams ? params : undefined,
          headers: headers.size > 0 ? headersObj : undefined,
        });

        // Output: include headers if -i
        if (options.include) {
          output.print(`HTTP/1.1 ${String(response.status)} ${response.statusText}`);
          for (const [key, value] of Object.entries(response.headers)) {
            output.print(`${key}: ${value}`);
          }
          output.print('');
        }

        // Output: response body
        if (!options.silent) {
          if (options.jq) {
            try {
              const filtered = await filterWithJq(response.data, options.jq);
              output.print(filtered);
            } catch (error) {
              if (error instanceof JqError) {
                output.printError('jq error: ' + error.message);
                process.exitCode = 1;
              } else {
                throw error;
              }
            }
          } else {
            output.print(JSON.stringify(response.data, null, 2));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        output.printError(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
