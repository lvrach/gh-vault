/**
 * Output utility tests.
 *
 * Tests the Output class that wraps console for CLI output.
 * Uses dependency injection pattern for testability.
 */

import { beforeEach,describe, expect, it, vi } from 'vitest';

import { type ConsoleInterface, Output } from '../../shared/output.js';

// ============================================================================
// Test Setup
// ============================================================================

interface MockConsole {
  log: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

function createMockConsole(): MockConsole {
  return {
    log: vi.fn(),
    error: vi.fn(),
  };
}

// ============================================================================
// Output.print Tests
// ============================================================================

describe('Output', () => {
  let mockConsole: MockConsole;
  let output: Output;

  beforeEach(() => {
    mockConsole = createMockConsole();
    output = new Output(mockConsole as ConsoleInterface);
  });

  describe('print', () => {
    it('calls console.log with the message', () => {
      output.print('Hello, world!');

      expect(mockConsole.log).toHaveBeenCalledWith('Hello, world!');
    });

    it('passes message exactly as provided', () => {
      const message = 'Test message with special chars: @#$%^&*()';
      output.print(message);

      expect(mockConsole.log).toHaveBeenCalledWith(message);
    });

    it('handles empty string', () => {
      output.print('');

      expect(mockConsole.log).toHaveBeenCalledWith('');
    });

    it('handles multi-line messages', () => {
      const message = 'Line 1\nLine 2\nLine 3';
      output.print(message);

      expect(mockConsole.log).toHaveBeenCalledWith(message);
    });

    it('handles unicode characters', () => {
      const message = '✅ Success! 日本語 🎉';
      output.print(message);

      expect(mockConsole.log).toHaveBeenCalledWith(message);
    });

    it('can be called multiple times', () => {
      output.print('First');
      output.print('Second');
      output.print('Third');

      expect(mockConsole.log).toHaveBeenCalledTimes(3);
      expect(mockConsole.log).toHaveBeenNthCalledWith(1, 'First');
      expect(mockConsole.log).toHaveBeenNthCalledWith(2, 'Second');
      expect(mockConsole.log).toHaveBeenNthCalledWith(3, 'Third');
    });

    it('does not call console.error', () => {
      output.print('Test');

      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Output.printError Tests
  // ============================================================================

  describe('printError', () => {
    it('calls console.error with the message', () => {
      output.printError('Error occurred!');

      expect(mockConsole.error).toHaveBeenCalledWith('Error occurred!');
    });

    it('passes message exactly as provided', () => {
      const message = 'Error: Something went wrong at line 42';
      output.printError(message);

      expect(mockConsole.error).toHaveBeenCalledWith(message);
    });

    it('handles empty string', () => {
      output.printError('');

      expect(mockConsole.error).toHaveBeenCalledWith('');
    });

    it('handles multi-line error messages', () => {
      const message = 'Error: Invalid input\n  at function foo\n  at function bar';
      output.printError(message);

      expect(mockConsole.error).toHaveBeenCalledWith(message);
    });

    it('does not call console.log', () => {
      output.printError('Error');

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('can be called multiple times', () => {
      output.printError('Error 1');
      output.printError('Error 2');

      expect(mockConsole.error).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // Mixed Usage Tests
  // ============================================================================

  describe('mixed print and printError', () => {
    it('correctly routes to log and error', () => {
      output.print('Normal output');
      output.printError('Error output');
      output.print('More normal output');

      expect(mockConsole.log).toHaveBeenCalledTimes(2);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.log).toHaveBeenCalledWith('Normal output');
      expect(mockConsole.error).toHaveBeenCalledWith('Error output');
    });
  });

  // ============================================================================
  // Dependency Injection Tests
  // ============================================================================

  describe('dependency injection', () => {
    it('uses the injected console', () => {
      const customConsole = createMockConsole();
      const customOutput = new Output(customConsole as ConsoleInterface);

      customOutput.print('Test');

      expect(customConsole.log).toHaveBeenCalledWith('Test');
      // Original mock should not be called
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('different Output instances use different consoles', () => {
      const console1 = createMockConsole();
      const console2 = createMockConsole();
      const output1 = new Output(console1 as ConsoleInterface);
      const output2 = new Output(console2 as ConsoleInterface);

      output1.print('From output1');
      output2.print('From output2');

      expect(console1.log).toHaveBeenCalledWith('From output1');
      expect(console2.log).toHaveBeenCalledWith('From output2');
      expect(console1.log).not.toHaveBeenCalledWith('From output2');
      expect(console2.log).not.toHaveBeenCalledWith('From output1');
    });
  });
});
