# gh-vault

A GitHub CLI for Pull Request operations with **secure token storage** and **MCP server support** for AI assistant integration.

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
| AI integration | None | Native MCP server |
| Attack surface | Full GitHub CLI | PR operations only |

### The MCP Advantage

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) lets AI assistants like Claude Code use tools safely. With gh-vault's MCP server:

- Claude Code can list, view, create, and manage PRs
- Your token stays in the Keychain — never exposed in prompts or logs
- You can use a **separate, scoped token** just for AI operations
- Full audit trail of what the AI accessed

```
┌─────────────────┐     MCP Protocol      ┌─────────────────┐
│   Claude Code   │ ◄──────────────────►  │    gh-vault     │
│   (AI Agent)    │    JSON-RPC stdio     │   MCP Server    │
└─────────────────┘                       └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ macOS Keychain  │
                                          │  (encrypted)    │
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │   GitHub API    │
                                          └─────────────────┘
```

### Security Model

**With `gh`**: Your token has access to everything — repos, gists, orgs, SSH keys, GPG keys. If you share this with an AI tool, you're trusting it with all of that.

**With gh-vault**:
- Create a fine-grained PAT scoped to just the repos you want
- Store it separately from your main `gh` authentication
- The AI only gets access to PR operations on repos you choose
- Token never appears in environment variables, command history, or AI context

## Installation

```bash
# Clone the repository
git clone https://github.com/lvrach/gh-vault.git
cd gh-vault

# Install dependencies
pnpm install

# Build
pnpm build

# Link globally (optional)
npm link
```

## Using as a `gh` Extension (Recommended)

You can install gh-vault as a `gh` CLI extension, allowing you to use it as `gh vault`:

```bash
# Install as gh extension
gh extension install lvrach/gh-vault

# Now use it like any gh command
gh vault pr list
gh vault pr view 123
gh vault auth login
```

This integrates seamlessly with your existing `gh` workflow while keeping tokens isolated.

### Alternative: Shell Alias

If you prefer not to use the extension system:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias gh-vault='node /path/to/gh-vault/dist/cli/index.js'

# Or create a gh alias
gh alias set vault '!/path/to/gh-vault/dist/cli/index.js'
```

## Quick Start

### 1. Create a Scoped Token

Go to [GitHub Settings → Fine-grained PATs](https://github.com/settings/tokens?type=beta):

- Set expiration (90 days recommended)
- Select only the repositories you want to expose
- Permissions: **Pull requests** (Read/Write), **Contents** (Read)

### 2. Store the Token

```bash
gh-vault auth login
# Paste your token when prompted — it's stored in Keychain
```

### 3. Use the CLI

```bash
gh-vault pr list
gh-vault pr view 123
gh-vault pr create --title "Fix bug" --body "Description"
```

### 4. Enable MCP for Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "gh-vault": {
      "command": "node",
      "args": ["/path/to/gh-vault/dist/cli/index.js", "mcp"]
    }
  }
}
```

Now Claude Code can work with your PRs directly.

## CLI Commands

gh-vault mirrors the `gh pr` command structure:

```bash
# List PRs
gh-vault pr list                     # Open PRs in current repo
gh-vault pr list --state closed      # Closed PRs
gh-vault pr list --author octocat    # Filter by author
gh-vault pr list --json number,title # JSON output

# View PRs
gh-vault pr view 123                 # View PR #123
gh-vault pr view --comments          # Include comments
gh-vault pr view --web               # Open in browser

# Create PRs
gh-vault pr create -t "Title" -b "Body"
gh-vault pr create --draft           # Create as draft
gh-vault pr create -r reviewer       # Request reviewer

# Manage PRs
gh-vault pr edit 123 --add-label bug
gh-vault pr merge 123 --squash
gh-vault pr close 123
gh-vault pr checkout 123

# View changes
gh-vault pr diff 123
gh-vault pr diff --patch             # Full diff
gh-vault pr checks 123               # CI status
```

## MCP Tools

When running as an MCP server, gh-vault exposes these tools to AI assistants:

| Tool | Description |
|------|-------------|
| `list_pull_requests` | List and filter PRs |
| `get_pull_request` | Get PR details with comments |
| `create_pull_request` | Create a new PR |
| `edit_pull_request` | Update PR title, body, labels, reviewers |
| `merge_pull_request` | Merge a PR |
| `get_pull_request_diff` | Get file changes |
| `get_pull_request_checks` | Get CI/CD status |
| `search_code` | Search code in repositories |
| `search_issues` | Search issues and PRs |

## Comparison with gh

### What gh-vault does differently

- **Keychain storage**: Token encrypted at rest, accessed via system APIs
- **MCP-first design**: Built for AI assistant integration from day one
- **Focused scope**: PR operations only (not a full GitHub CLI replacement)
- **Token isolation**: Use different tokens for different tools

### Roadmap: Pending `gh` Compatibility

These `gh` features are not yet implemented but may be added in future versions:

| Feature | gh command | Status |
|---------|------------|--------|
| Repository management | `gh repo` | Planned |
| Issues | `gh issue` | Planned |
| GitHub Actions | `gh run`, `gh workflow` | Under consideration |
| Releases | `gh release` | Under consideration |
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
