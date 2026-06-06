# empire-memory-mcp

[![npm version](https://img.shields.io/npm/v/empire-memory-mcp.svg)](https://www.npmjs.com/package/empire-memory-mcp)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](https://nodejs.org/)

> An MCP server that turns a flat directory of Markdown notes into 5 first-class tools for Claude Code (and any MCP client). Originally built for an empire of 160+ personal memory files, agnostic to any Markdown-based knowledge base.

## Why

Claude Code (and the broader MCP ecosystem) shines when agents can query structured knowledge on demand. Most people keep that knowledge in Markdown files. This server exposes the simplest possible bridge:

- **No vector DB, no fine-tuning, no setup**: just a directory of `.md` files.
- **5 tools, all read-only**: list, get, search, list-wiki, get-wiki.
- **YAML front-matter aware** (via `gray-matter`): descriptions and types extracted automatically.
- **Filename prefix → type**: `feedback_*.md`, `reference_*.md`, `project_*.md` get categorized for free.
- **Companion "wiki" directory** for deep documents that are too heavy to auto-load into every session.

Designed to scale from 10 notes to 1000+ before you need embeddings.

## Install

```bash
npm install -g empire-memory-mcp
```

Or use it in a project:

```bash
pnpm add empire-memory-mcp
```

## Configure

By default the server reads:

| Source | Path |
|---|---|
| Memories | `~/.claude/projects/-Users-lauren/memory/*.md` |
| Wikis | `~/Documents/wiki-internal/*.md` |

These paths are currently constants in `src/memory-store.ts`. For your own setup, fork or override with env vars (issue/PR welcome — see roadmap).

## Wire to Claude Code

```bash
claude mcp add --scope user empire-memory \
  node /path/to/empire-memory-mcp/dist/index.js
```

Or in `~/.claude.json`:

```json
{
  "mcpServers": {
    "empire-memory": {
      "command": "empire-memory-mcp"
    }
  }
}
```

## The 5 tools

| Tool | What it does |
|---|---|
| `list_memories` | Lists all memory entries with name, type, description (from front-matter), size, last modified. Optional `type` filter. |
| `get_memory` | Returns the full content of a memory by name (`.md` suffix optional). |
| `search_memories` | Full-text substring search. Returns hits sorted by match count, with up to 3 matching lines per hit and the total count per file. |
| `list_wiki_docs` | Lists external wiki docs (the heavy stuff you keep out of the auto-loaded context). |
| `get_wiki_doc` | Returns the full content of a specific wiki doc. |

## Example session

```
> Find every memory where I talk about "Stripe"

  [calls empire-memory search_memories { query: "Stripe" }]

  → 3 hits, sorted by match count:
    project_funnel_os (12 matches)
    feedback_vercel_deploy_discipline (4 matches)
    project_admissions_os (2 matches)

  Pulling the top hit for full context...

  [calls empire-memory get_memory { name: "project_funnel_os" }]

  → Funnel OS uses Stripe Checkout hosted (not Elements) for zero PCI scope,
    with Adaptive Pricing gated behind STRIPE_ADAPTIVE_PRICING_ENABLED...
```

## Why MCP instead of just reading files

Three concrete reasons:

1. **Context economy.** Auto-loading 160 memories at session start costs ~25KB and starves the main context. Letting the agent query on demand keeps the session lean.
2. **Cross-session consistency.** The agent always sees the canonical store, not a stale copy from last week's transcript.
3. **Compose with other agents.** When an autonomous agent needs to know "what did Lauren decide about X", it queries the same store the interactive session does. One source of truth.

## Roadmap

- **0.2.0** — write tools (`add_memory`, `update_memory`, `archive_memory`)
- **0.3.0** — semantic search via embeddings (Voyage/OpenAI)
- **0.4.0** — env var override for memory + wiki paths
- **1.0.0** — stable API, breaking-change moratorium

## Develop

```bash
git clone https://github.com/humanityrecord/empire-memory-mcp.git
cd empire-memory-mcp
pnpm install
pnpm build
pnpm typecheck
```

## License

MIT © [Lauren Conforti](https://humanity-group.vercel.app) / Humanity Group.

---

Part of the **Empire Agents OS** stack: small, composable MCP servers for solo founders running AI agents in production.
