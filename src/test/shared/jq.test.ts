/**
 * jq filtering utility tests.
 *
 * Tests the jq wrapper that filters JSON data using jq expressions.
 * Note: These tests require node-jq to be installed with its bundled jq binary.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { filterWithJq, JqError } from '../../shared/jq.js';

// ============================================================================
// filterWithJq Tests - Valid Expressions
// ============================================================================

describe('filterWithJq', () => {
  describe('valid expressions', () => {
    it('returns entire input with identity expression', async () => {
      const data = { name: 'test', value: 42 };
      const result = await filterWithJq(data, '.');

      // node-jq with output: 'string' returns prettified JSON
      const parsed = JSON.parse(result) as unknown;
      expect(parsed).toEqual(data);
    });

    it('extracts a single field', async () => {
      const data = { name: 'test', value: 42 };
      const result = await filterWithJq(data, '.name');

      expect(result.trim()).toBe('"test"');
    });

    it('extracts nested field', async () => {
      const data = { user: { name: 'octocat', id: 1 } };
      const result = await filterWithJq(data, '.user.name');

      expect(result.trim()).toBe('"octocat"');
    });

    it('extracts first element from array', async () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = await filterWithJq(data, '.[0]');

      const parsed = JSON.parse(result) as unknown;
      expect(parsed).toEqual({ id: 1 });
    });

    it('extracts field from all array elements', async () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = await filterWithJq(data, '.[].id');

      // Multiple values are output as newline-separated
      expect(result.trim()).toBe('1\n2\n3');
    });

    it('filters array with select', async () => {
      const data = [
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ];
      const result = await filterWithJq(data, '.[] | select(.value > 15)');

      // Multiple objects returned as newline-separated JSON
      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(2);
    });

    it('handles null input', async () => {
      const result = await filterWithJq(null, '.');

      expect(result.trim()).toBe('null');
    });

    it('handles numeric input', async () => {
      const result = await filterWithJq(42, '.');

      expect(result.trim()).toBe('42');
    });

    it('handles string input', async () => {
      const result = await filterWithJq('hello', '.');

      expect(result.trim()).toBe('"hello"');
    });

    it('handles empty array', async () => {
      const result = await filterWithJq([], '.');

      expect(result.trim()).toBe('[]');
    });

    it('handles empty object', async () => {
      const result = await filterWithJq({}, '.');

      expect(result.trim()).toBe('{}');
    });

    it('creates new objects with field selection', async () => {
      const data = { name: 'test', value: 42, extra: 'ignored' };
      const result = await filterWithJq(data, '{name, value}');

      const parsed = JSON.parse(result) as unknown;
      expect(parsed).toEqual({ name: 'test', value: 42 });
    });

    it('maps array elements', async () => {
      const data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
      const result = await filterWithJq(data, '[.[] | .a]');

      const parsed = JSON.parse(result) as unknown;
      expect(parsed).toEqual([1, 3]);
    });

    it('handles keys function', async () => {
      const data = { z: 1, a: 2, m: 3 };
      const result = await filterWithJq(data, 'keys');

      const parsed = JSON.parse(result) as unknown;
      expect(parsed).toEqual(['a', 'm', 'z']); // jq sorts keys
    });

    it('handles length function', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await filterWithJq(data, 'length');

      expect(result.trim()).toBe('5');
    });

    it('handles type function', async () => {
      const data = { test: 'value' };
      const result = await filterWithJq(data, 'type');

      expect(result.trim()).toBe('"object"');
    });
  });

  // ============================================================================
  // filterWithJq Tests - Error Cases
  // ============================================================================

  describe('error handling', () => {
    it('throws JqError for invalid expression syntax', async () => {
      const data = { name: 'test' };

      await expect(filterWithJq(data, '.[[')).rejects.toThrow(JqError);
    });

    it('includes expression in JqError', async () => {
      const data = { name: 'test' };
      const expression = '.[[invalid';

      await expect(filterWithJq(data, expression)).rejects.toSatisfy((error) => {
        return error instanceof JqError && error.expression === expression;
      });
    });

    it('handles missing field gracefully (returns null)', async () => {
      const data = { name: 'test' };
      const result = await filterWithJq(data, '.nonexistent');

      expect(result.trim()).toBe('null');
    });

    it('handles array index out of bounds (returns null)', async () => {
      const data = [1, 2, 3];
      const result = await filterWithJq(data, '.[100]');

      expect(result.trim()).toBe('null');
    });
  });
});

// ============================================================================
// JqError Class Tests
// ============================================================================

describe('JqError', () => {
  it('has correct name', () => {
    const error = new JqError('test message', '.invalid');

    expect(error.name).toBe('JqError');
  });

  it('stores expression', () => {
    const error = new JqError('test message', '.test.expression');

    expect(error.expression).toBe('.test.expression');
  });

  it('stores message', () => {
    const error = new JqError('Custom error message', '.');

    expect(error.message).toBe('Custom error message');
  });

  it('stores cause when provided', () => {
    const cause = new Error('Original error');
    const error = new JqError('Wrapped error', '.expr', cause);

    expect(error.cause).toBe(cause);
  });

  it('handles undefined cause', () => {
    const error = new JqError('No cause', '.expr');

    expect(error.cause).toBeUndefined();
  });

  it('is instance of Error', () => {
    const error = new JqError('test', '.');

    expect(error).toBeInstanceOf(Error);
  });
});

// ============================================================================
// filterWithJq Tests - Mocked Failures (Binary Not Found)
// ============================================================================

describe('filterWithJq with mocked node-jq', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws JqError with helpful message when jq binary not found', async () => {
    // Mock node-jq to simulate binary not found
    vi.doMock('node-jq', () => ({
      run: vi.fn().mockRejectedValue(new Error('spawn jq ENOENT')),
    }));

    // Re-import the module to get the mocked version
    const { filterWithJq: mockedFilter } = await import('../../shared/jq.js');

    await expect(mockedFilter({}, '.')).rejects.toThrow('jq binary not found');
  });

  it('wraps compile errors with descriptive message', async () => {
    vi.doMock('node-jq', () => ({
      run: vi.fn().mockRejectedValue(new Error('jq: compile error: syntax error')),
    }));

    const { filterWithJq: mockedFilter, JqError: MockedJqError } = await import('../../shared/jq.js');

    await expect(mockedFilter({}, '.invalid[[')).rejects.toSatisfy((error) => {
      return error instanceof MockedJqError && error.message.includes('Invalid jq expression');
    });
  });

  it('wraps parse errors with descriptive message', async () => {
    vi.doMock('node-jq', () => ({
      run: vi.fn().mockRejectedValue(new Error('jq: parse error: unexpected token')),
    }));

    const { filterWithJq: mockedFilter } = await import('../../shared/jq.js');

    await expect(mockedFilter({}, '.bad')).rejects.toThrow('Invalid jq expression');
  });

  it('wraps unknown errors with generic message', async () => {
    vi.doMock('node-jq', () => ({
      run: vi.fn().mockRejectedValue(new Error('Some unknown error')),
    }));

    const { filterWithJq: mockedFilter } = await import('../../shared/jq.js');

    await expect(mockedFilter({}, '.')).rejects.toThrow('jq error:');
  });
});
