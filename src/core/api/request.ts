/**
 * Core API request functionality for raw GitHub API calls.
 */

import { createGitHubClient } from '../../shared/github.js';

export interface ApiRequestInput {
  endpoint: string;
  method?: string | undefined;
  params?: Record<string, unknown> | undefined;
  headers?: Record<string, string> | undefined;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
}

/**
 * Make a raw GitHub API request.
 * Uses the authenticated Octokit client.
 */
export async function makeApiRequest(input: ApiRequestInput): Promise<ApiResponse> {
  const client = await createGitHubClient();

  // Normalize endpoint (ensure leading slash)
  const path = input.endpoint.startsWith('/') ? input.endpoint : `/${input.endpoint}`;

  const method = (input.method ?? 'GET').toUpperCase();

  const requestOptions: Record<string, unknown> = {
    ...input.params,
  };
  if (input.headers) {
    requestOptions['headers'] = input.headers;
  }

  const response = await client.request(`${method} ${path}`, requestOptions);

  // Convert headers to Map then to plain object for safe iteration
  const responseHeaders = new Map<string, string>();
  for (const [key, value] of Object.entries(response.headers)) {
    if (typeof value === 'string') {
      responseHeaders.set(key, value);
    } else if (typeof value === 'number') {
      responseHeaders.set(key, String(value));
    }
  }

  return {
    status: response.status,
    statusText: getStatusText(response.status),
    data: response.data,
    headers: Object.fromEntries(responseHeaders),
  };
}

const STATUS_TEXTS = new Map<number, string>([
  [200, 'OK'],
  [201, 'Created'],
  [204, 'No Content'],
  [301, 'Moved Permanently'],
  [304, 'Not Modified'],
  [400, 'Bad Request'],
  [401, 'Unauthorized'],
  [403, 'Forbidden'],
  [404, 'Not Found'],
  [422, 'Unprocessable Entity'],
  [500, 'Internal Server Error'],
  [502, 'Bad Gateway'],
  [503, 'Service Unavailable'],
]);

function getStatusText(status: number): string {
  return STATUS_TEXTS.get(status) ?? 'Unknown';
}
