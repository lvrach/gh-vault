/**
 * CLI output with dependency-injected Console.
 *
 * Main creates Output instance and passes to commands.
 * Tests create Output with mock console.
 */

/** Interface matching Node's Console (subset we use) */
export interface ConsoleInterface {
  log(message: string): void;
  error(message: string): void;
}

/** CLI output with injected console dependency */
export class Output {
  constructor(private readonly console: ConsoleInterface) {}

  /** Print to stdout (command results, data, JSON) */
  print(message: string): void {
    this.console.log(message);
  }

  /** Print to stderr (errors, warnings, diagnostics) */
  printError(message: string): void {
    this.console.error(message);
  }
}
