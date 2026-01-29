/**
 * jq filtering utility for JSON output.
 * Uses node-jq which bundles the jq binary.
 */

import { run } from 'node-jq';

export class JqError extends Error {
  constructor(
    message: string,
    public readonly expression: string,
    public readonly cause?: Error | undefined
  ) {
    super(message);
    this.name = 'JqError';
  }
}

/**
 * Filter JSON data using a jq expression.
 * Returns the filtered result as a string.
 */
export async function filterWithJq(data: unknown, expression: string): Promise<string> {
  try {
    const jsonString = JSON.stringify(data);

    // IMPORTANT: Use output: 'string' for raw output (like jq -r)
    // NOTE: 'raw: true' is NOT a valid option - it doesn't exist in node-jq
    const result = await run(expression, jsonString, {
      input: 'string',
      output: 'string',
    });

    // node-jq returns string | object depending on options
    if (typeof result !== 'string') {
      return JSON.stringify(result);
    }

    return result;
  } catch (error) {
    const originalMessage = error instanceof Error ? error.message : String(error);

    // Check for common jq error patterns
    if (
      originalMessage.includes('compile error') ||
      originalMessage.includes('parse error') ||
      originalMessage.includes('syntax error')
    ) {
      throw new JqError(
        `Invalid jq expression: ${expression}`,
        expression,
        error instanceof Error ? error : undefined
      );
    }

    if (originalMessage.includes('ENOENT') || originalMessage.includes('not found')) {
      throw new JqError(
        'jq binary not found. Try reinstalling node-jq.',
        expression,
        error instanceof Error ? error : undefined
      );
    }

    throw new JqError(
      `jq error: ${originalMessage}`,
      expression,
      error instanceof Error ? error : undefined
    );
  }
}
