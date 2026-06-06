# Changelog

All notable changes to `empire-memory-mcp` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for 0.2.0
- Write tools: `add_memory`, `update_memory`, `archive_memory`
- Optional front-matter validation hooks

### Planned for 0.3.0
- Vector embeddings + semantic search (`semantic_search` tool)
- Auto-consolidate scheduled task (merge duplicate memories)

## [0.1.0] — 2026-06-06

### Added
- Initial release.
- 5 read-only MCP tools exposed via stdio:
  - `list_memories` (filter by type: feedback / reference / project / index / other)
  - `get_memory` (fetch by name, with or without `.md` suffix)
  - `search_memories` (full-text, sorted by match count)
  - `list_wiki_docs` (companion external wiki directory)
  - `get_wiki_doc` (fetch a wiki document by name)
- Default paths:
  - Memories: `~/.claude/projects/-Users-lauren/memory/*.md`
  - Wikis: `~/Documents/wiki-internal/*.md`
- Type inference from filename prefix (`feedback_`, `reference_`, `project_`).
- Front-matter parsing via `gray-matter` (fail-soft on malformed YAML).
- TypeScript strict, Node.js >=18, stdio transport.
