# I gave Claude Code five tools to read 160 markdown files. Then I stopped worrying about context windows.

*Draft article for Substack / Medium / dev.to / HG blog — 06/06/2026*

---

**TL;DR.** I open-sourced `empire-memory-mcp`, a tiny MCP server (≈300 lines TS) that exposes a flat directory of markdown notes to Claude Code via 5 read-only tools. It started as plumbing for my own 160-file empire memory store. It ended up doing something I didn't expect: it solved my context-window problem without a vector DB.

If you're building agentic workflows with Claude Code, Cursor, Continue, Goose, or any MCP client, this might be useful to you too.

`npm install -g empire-memory-mcp` · MIT · [GitHub](https://github.com/humanityrecord/empire-memory-mcp)

---

## The shape of the problem

I'm a solo founder running 8 brands, 11 production apps, and roughly 200 ongoing decisions per quarter. To stay sane I keep everything in markdown files — about 160 of them right now, organized as:

```
~/.claude/projects/-Users-lauren/memory/
├── feedback_*.md   # rules (permanent preferences)
├── reference_*.md  # pointers (where to find things)
├── project_*.md    # state (where each chantier stands)
└── MEMORY.md       # the index
```

Claude Code reads `MEMORY.md` on every session start. That's the bridge between sessions: the model rehydrates context from my own notes.

This worked beautifully until the index file crossed 20 KB. Then it started to crowd out the actual session context. Two heavy project notes (one 67 KB, one 45 KB) were getting auto-loaded as full text every time I opened a new session, even when I wanted to talk about something else entirely.

The default fix is a vector DB. Embed everything, do RAG, query by similarity. I tried it. It works, but it's heavy:
- separate infra to run and pay for,
- embedding model to pick,
- re-index on every change,
- and worst, a black-box scoring step between me and the source-of-truth files I actually trust.

For 160 files, that's overengineering.

## The shape of the fix

MCP (Model Context Protocol) is Anthropic's plug-in standard for letting Claude call out to external tools. Most people use it to wrap third-party APIs (Notion, Stripe, Vercel). Almost nobody uses it to wrap their *local files*.

So I did. `empire-memory-mcp` exposes the directory through 5 tools:

```
list_memories      → array of entries (name, type, description, size)
get_memory         → full content of a single file by name
search_memories    → full-text substring search, ranked by match count
list_wiki_docs     → companion "heavy" docs kept out of the auto-load
get_wiki_doc       → full content of a wiki doc
```

That's it. No vector DB. No embeddings. No scoring. The agent decides what to load and when.

## What changed in practice

**Before**: every session started with 25 KB of context preloaded from `MEMORY.md` and friends. The model "knew everything", which meant it also dragged everything into every reasoning step.

**After**: my session starts with a lean 12 KB index. When I ask "what did I decide about Stripe?", the model calls `search_memories({ query: "Stripe" })`, gets a ranked list of 3 hits, then `get_memory({ name: "project_funnel_os" })` for the top one. Total: about 8 KB pulled into context, exactly when needed.

The actual conversation that motivated this article involved a Claude session correctly identifying that one of my projects had an issue with Vercel CLI's stderr output, fixing it, and committing — all by calling `search_memories` for "Vercel" twice. Without the MCP server, that lookup would have required either preloading the relevant file or asking me to paste it. With the server, the agent just queried.

## Five things I'd do differently next time (and might still)

**1. Build it from day one, not day 47.** I lived with the context bloat for six weeks before fixing it. That's six weeks of slightly-degraded sessions multiplied across all my chantiers. Build the bridge early.

**2. Version your memory schema.** I have a `MEMORY.md` index that humans and agents both read. It's drifted over time. Version it (mine is implicit "v3 / 06-06-2026 refonte") and write a migration when you change conventions. This pays off if you ever fork the layout.

**3. Resist the urge to add write tools immediately.** Read-only is a feature. If the agent can mutate your notes, it will, and you'll spend the next month un-doing edits you don't remember authorizing. v0.2 will add `add_memory` / `update_memory` / `archive_memory` — gated behind explicit confirmation.

**4. Companion wiki for heavy docs.** Some project notes legitimately want to be long (50 KB+). Don't fight that — sort them out of the auto-loaded directory into a companion "wiki" and expose them through `get_wiki_doc`. The agent retrieves them only when needed. My main memory dropped 25% the moment I moved two files.

**5. Make the bridge agnostic.** This server has the path to my memory hardcoded. v0.4 will accept env vars. If you wire it to your own store, the rest works the same.

## What it doesn't try to be

`empire-memory-mcp` isn't a personal knowledge management system. It's not a second brain. It's not Obsidian or Notion replacement. It's a single, focused bridge: from a directory of markdown files to an MCP-aware agent. That's it.

If you already have a working markdown notes setup and you've started running AI agents, this is a 5-minute install that meaningfully improves their grasp of your context. If you don't have markdown notes yet, this isn't going to be the right starting point.

## Open-source story

This is the first piece of public infrastructure from a larger private stack I've been building — what I call **Empire Agents OS** — that runs the operations side of my brands while I focus on creative work. There's more coming (a state aggregator, a brand-naming linter, a publish-check workflow) but `empire-memory-mcp` is the most reusable.

Source: [github.com/humanityrecord/empire-memory-mcp](https://github.com/humanityrecord/empire-memory-mcp)
Issues/PRs welcome — especially around the env var override path and the v0.3 semantic search design.

---

*Lauren Conforti is the founder of Humanity Group. She runs 8 brands, swims weekly, and writes [here](#) when an open-source release is worth a story.*
