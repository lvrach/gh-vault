# Architecture

This document describes the technical architecture and design decisions of gh-vault.

## Project Structure

```
src/
├── cli/
│   ├── index.ts              # Main CLI entry point
│   └── commands/             # Top-level commands (auth, api)
├── domains/                   # Domain-driven feature modules
│   ├── pr/                   # Pull Request domain
│   │   ├── api.ts            # Business logic (GitHub API calls)
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── cli/              # Commander.js commands
│   │   │   ├── index.ts      # Creates pr command group
│   │   │   ├── list.ts       # gh-vault pr list
│   │   │   ├── view.ts       # gh-vault pr view
│   │   │   └── ...           # Other PR commands
│   │   └── formatters/
│   │       ├── text.ts       # CLI human-readable output
│   │       └── json.ts       # --json flag output
│   ├── run/                  # GitHub Actions workflow runs
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── cli/
│   │   └── formatters/
│   └── search/               # GitHub search
│       └── ...
├── shared/                   # Cross-domain utilities
│   ├── github.ts             # Octokit client wrapper
│   ├── secrets.ts            # macOS Keychain integration
│   ├── repo.ts               # Git remote detection
│   ├── output.ts             # CLI output abstraction
│   └── jq.ts                 # jq filtering support
└── test/
    ├── setup.ts
    └── mocks/
```

## Design Principles

### Functional Core, Imperative Shell

Business logic in `domains/*/api.ts` is pure and testable. I/O operations (network, filesystem, Keychain) happen only at the boundaries.

### Domain-Driven Design

Each domain is self-contained with its own:
- **api.ts** - Pure functions that call GitHub API and return typed data
- **types.ts** - TypeScript interfaces for the domain model
- **cli/** - Commander.js command definitions
- **formatters/** - Output formatters for different consumers

### Output Formats

Each domain has formatters for different consumers:

| Formatter | Purpose | Consumer |
|-----------|---------|----------|
| `text.ts` | ANSI-colored terminal output | Human (CLI) |
| `json.ts` | Structured data with field selection | Scripts (`--json`, `--jq`) |

### Guard Clauses Over Nesting

```typescript
// Preferred
if (!input.valid) {
  return { error: 'Invalid input' };
}
// Continue with main logic...

// Avoided
if (input.valid) {
  // Nested logic...
}
```

### Explicit Return Types

All functions declare their return types for clarity and type safety.

## Security Architecture

```
┌─────────────────┐                       ┌─────────────────┐
│    gh-vault     │ ──────────────────►   │ macOS Keychain  │
│      CLI        │                       │  (encrypted)    │
└────────┬────────┘                       └─────────────────┘
         │
         ▼
┌─────────────────┐
│   GitHub API    │
└─────────────────┘
```

**Key security decisions:**
- Token stored in macOS Keychain (not config files)
- No `auth token` command (never output token to stdout)
- Token never exposed in command output or environment variables

## Adding a New Domain

1. Create the domain directory: `src/domains/<name>/`
2. Define types in `types.ts`
3. Implement API functions in `api.ts`
4. Create formatters in `formatters/`
5. Add CLI commands in `cli/`
6. Wire up in `src/cli/index.ts`

## Testing Strategy

- **Unit/Integration tests** use MSW to mock GitHub API with 100% fidelity
- **Keychain mocked** in `src/test/setup.ts` - tests don't need real tokens

## Development

```bash
pnpm dev        # CLI in watch mode
pnpm test       # Run tests
pnpm check      # Type check, lint, format, knip
```

## Known Gotchas

- GitHub repo names can contain dots - regex must use `[^/]+?` not `[^/.]+`
- `mergeable` field can be `null` while GitHub computes - handle gracefully
- macOS only: uses `security` CLI for Keychain (no cross-platform fallback)
- exactOptionalPropertyTypes enabled - optional props need `| undefined`
