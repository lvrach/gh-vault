# gh-vault

GitHub CLI for Pull Request operations with secure token storage. Acts as an alias for `gh pr` commands.

## Commands

- `pnpm dev` - Start CLI in watch mode
- `pnpm build` - Compile TypeScript to dist/
- `pnpm check` - Run all checks (typecheck, lint, format, knip)
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run tests with Vitest

## CLI Usage

```bash
# List pull requests
gh-vault pr list
gh-vault pr list --state closed
gh-vault pr list --author octocat --json number,title

# View a pull request
gh-vault pr view 123
gh-vault pr view 123 --comments --json
gh-vault pr view --web  # Opens current branch's PR in browser

# View PR diff
gh-vault pr diff 123
gh-vault pr diff --name-only

# Authentication
gh-vault auth login
gh-vault auth status
gh-vault auth logout
```

## Architecture

```
src/
├── cli/
│   ├── index.ts              # Main CLI entry point
│   └── commands/             # CLI command implementations
├── domains/                   # Domain-driven feature modules
│   └── pr/                   # Pull Request domain
│       ├── api.ts            # Business logic (GitHub API calls)
│       ├── types.ts          # TypeScript interfaces
│       ├── cli/              # Commander.js commands
│       │   ├── index.ts      # Creates pr command group
│       │   ├── list.ts       # gh-vault pr list
│       │   ├── view.ts       # gh-vault pr view
│       │   └── ...           # Other PR commands
│       └── formatters/
│           ├── text.ts       # CLI human-readable output
│           └── json.ts       # --json flag output
├── shared/                   # Cross-domain utilities
│   ├── github.ts             # Octokit client wrapper
│   ├── secrets.ts            # macOS Keychain integration
│   ├── repo.ts               # Git remote detection
│   └── jq.ts                 # jq filtering support
└── test/
    ├── setup.ts
    └── mocks/
```

### Design Principles

- **Functional core, imperative shell** - Pure business logic in domains/, I/O at boundaries
- **Guard clauses over nesting** - Early returns for error conditions
- **Explicit return types** - All functions have declared return types

## gh CLI Parity Requirements

**CRITICAL**: gh-vault MUST maintain 100% parity with the official GitHub CLI (`gh`).

Before implementing or modifying any command:

1. **Check official gh CLI help**: Run `/opt/homebrew/bin/gh <command> --help` to see all flags, aliases, and options
2. **Match ALL flags**: Every flag from `gh` must be supported with the same short/long form (e.g., `-a, --assignee`)
3. **Match ALL aliases**: Command aliases must match (e.g., `gh pr ls` for `gh pr list`)
4. **Match behavior**: Default values, output format, and error messages should closely match

Example verification:
```bash
# Compare gh-vault command with official gh CLI
/opt/homebrew/bin/gh pr create --help
# Then ensure gh-vault pr create supports ALL the same flags
```

When adding a new command or flag:
- Document which gh CLI flags are supported
- Document any flags intentionally omitted (with justification)
- Test that behavior matches gh CLI

## Code Style

- Use pnpm exclusively (npm/yarn blocked by hook)
- No `any` types
- No `eslint-disable` comments (except `no-console` for CLI output)
- Use `import type` for type-only imports
- Use `regex.exec(str)` instead of `str.match(regex)` (ESLint rule)

## Testing

- Tests use MSW to mock GitHub API with 100% fidelity
- Mock keychain in `src/test/setup.ts` - tests don't need real tokens

## Gotchas

- GitHub repo names can contain dots - regex must use `[^/]+?` not `[^/.]+`
- `mergeable` field can be `null` while GitHub computes - handle gracefully
- macOS only: uses `security` CLI for Keychain (no cross-platform fallback)

## Token Requirements

gh-vault requires **fine-grained personal access tokens** only.
Classic tokens (`ghp_*`) are rejected for security reasons.

### Why Fine-Grained Tokens?

- **Scoped to specific repositories** - Limit access to only what's needed
- **Granular permissions** - Enable only required capabilities
- **Required expiration** - Built-in token rotation

### Creating a Token

1. Go to https://github.com/settings/personal-access-tokens
2. Click "Generate new token"
3. Select repository access (specific repos recommended)
4. Enable required permissions (see table below)
5. Generate and copy the token

### Required Permissions

| Permission      | Access | Commands That Need It                                    |
|-----------------|--------|----------------------------------------------------------|
| `pull_requests` | read   | `pr list`, `pr view`, `pr diff`, `pr checks`             |
| `pull_requests` | write  | `pr create`, `pr edit`, `pr merge`, `pr close`, `pr reopen`, `pr comment`, `pr review` |
| `actions`       | read   | `run list`, `run view`                                   |
| `actions`       | write  | `run cancel`, `run rerun`, `run delete`                  |
| `contents`      | write  | `pr merge --delete-branch`                               |
| `checks`        | read   | `pr checks`                                              |
| `statuses`      | read   | `pr checks`                                              |

### Troubleshooting Permission Errors

If a command fails with "Permission denied", the error message
will tell you which permission is needed and how to fix it.

## Token Setup

```bash
# Configure GitHub token (stored in macOS Keychain)
gh-vault auth login

# Verify token permissions
gh-vault auth status

# Remove token
gh-vault auth logout
```

## Shell Alias Setup

To use `gh-vault` as a shell alias:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias gh-vault='node /path/to/gh-vault/dist/cli/index.js'

# Or link globally after npm/pnpm global install
npm link  # from the project directory
```
