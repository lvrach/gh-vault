# gh-vault

A GitHub CLI with **secure token storage** using macOS Keychain.

> **Note**: This is a vibe coded project — built collaboratively with Claude Code. The irony isn't lost on us: an AI-assisted tool designed to give AI assistants *less* access to your tokens.

## Why gh-vault?

The official GitHub CLI (`gh`) has several limitations that motivated this project:

### 1. Fine-Grained PATs are Second-Class Citizens

GitHub's [fine-grained Personal Access Tokens](https://github.blog/changelog/2025-03-18-fine-grained-pats-are-now-generally-available/) let you scope access to specific repositories — a major security improvement. But the official `gh` CLI treats them as second-class citizens.

You can't use the normal auth flow (`gh auth login`) with fine-grained tokens — you're forced to export them as environment variables, which:

1. **Still doesn't make all commands work** — several `gh pr` commands fail regardless ([#7978](https://github.com/cli/cli/issues/7978), [#9166](https://github.com/cli/cli/issues/9166))
2. **Exposes the token in your shell environment** — any process can read it
3. **Leaves it in shell history** — if you set it inline (`GH_TOKEN=xxx gh pr list`)

### 2. Token Storage Has Known Vulnerabilities

- **CVE-2024-53858**: `gh` leaked tokens when cloning repos with submodules on non-GitHub hosts (fixed in v2.63.0)
- **Silent fallback**: When keyring is unavailable, `gh` falls back to plaintext `~/.config/gh/hosts.yaml` without warning
- **Supply chain risks**: Attacks like [Shai-Hulud 2.0](https://www.wiz.io/blog/shai-hulud-2-0-ongoing-supply-chain-attack) (Nov 2025) target developer credentials — tokens stored in config files are prime targets

### 3. AI Assistants Amplify These Risks

When AI tools like Claude Code access your terminal, they can:
- Read environment variables containing tokens
- Execute commands that output tokens (`gh auth token`)
- Access config files with stored credentials

**gh-vault** takes a security-first approach:

| Feature | gh | gh-vault |
|---------|-----|----------|
| Token storage | Config file (plaintext fallback) | macOS Keychain only |
| Fine-grained PAT | Env var recommended | Native support |
| Token output command | `gh auth token` (prints to stdout) | Intentionally omitted |

### Security Model

**With `gh`**: Your token has access to everything — repos, gists, orgs, SSH keys, GPG keys. If you share this with an AI tool, you're trusting it with all of that.

**With gh-vault**:
- Create a fine-grained PAT scoped to just the repos you want
- Store it separately from your main `gh` authentication
- The AI only gets access to PR operations on repos you choose
- Token never appears in environment variables, command history, or AI context

## Installation

```bash
# Install globally from npm
npm install -g gh-vault

# Or run directly with npx
npx gh-vault pr list
```

### Shell Alias (Optional)

To use `gh` as an alias for `gh-vault`:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias gh='gh-vault'
```

## Quick Start

### 1. Create a Scoped Token

Go to [GitHub Settings → Fine-grained PATs](https://github.com/settings/personal-access-tokens):

- Set expiration (90 days recommended)
- Select only the repositories you want to expose
- Permissions: **Pull requests** (Read/Write), **Contents** (Read)

### 2. Store the Token

```bash
gh auth login
# Paste your token when prompted — it's stored in Keychain
```

### 3. Use the CLI

```bash
gh pr list
gh pr view 123
gh pr create --title "Fix bug" --body "Description"
```

## CLI Commands

Mirrors the `gh pr` command structure:

```bash
# List PRs
gh pr list                     # Open PRs in current repo
gh pr list --state closed      # Closed PRs
gh pr list --author octocat    # Filter by author
gh pr list --json number,title # JSON output

# View PRs
gh pr view 123                 # View PR #123
gh pr view --comments          # Include comments
gh pr view --web               # Open in browser

# Create PRs
gh pr create -t "Title" -b "Body"
gh pr create --draft           # Create as draft
gh pr create -r reviewer       # Request reviewer

# Manage PRs
gh pr edit 123 --add-label bug
gh pr merge 123 --squash
gh pr close 123
gh pr checkout 123

# View changes
gh pr diff 123
gh pr diff --patch             # Full diff
gh pr checks 123               # CI status
```

## Comparison with official gh

### What gh-vault does differently

- **Keychain storage**: Token encrypted at rest, accessed via system APIs
- **Fine-grained PAT first**: Native support for scoped tokens
- **Token isolation**: Use different tokens for different tools

### Supported Commands

| Feature | gh command | gh-vault |
|---------|------------|----------|
| Pull Requests | `gh pr` | ✅ Full support |
| Repository | `gh repo` | ✅ Full support |
| Actions Runs | `gh run` | ✅ Full support |
| Workflows | `gh workflow` | ✅ Full support |
| Search | `gh search` | ✅ Full support |
| API | `gh api` | ✅ Full support |
| Issues | `gh issue` | Not yet |
| Releases | `gh release` | Not yet |
| Gists | `gh gist` | Not planned |
| SSH keys | `gh ssh-key` | Not planned |

For operations not yet supported, continue using `gh`. gh-vault is designed to complement it.

### Intentionally Omitted: `auth token`

**gh-vault will never implement `gh auth token`** or any command that outputs the token to stdout.

The official `gh auth token` command prints your token in plaintext — convenient for scripting, but dangerous when AI assistants or other tools can capture command output. This directly contradicts gh-vault's security-first design.

The entire point of gh-vault is to keep your token **in the Keychain and nowhere else**:
- No token in environment variables
- No token in command output
- No token in shell history
- No token in AI context windows

If you need to extract a token for another tool, use the macOS Keychain Access app or `security` CLI directly — but understand you're bypassing gh-vault's security model.

## Requirements

- **Node.js 20+**
- **macOS** (uses Keychain for secure storage)
- **pnpm**

## Contributing

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details and development setup.

## License

MIT
