# empire-memory-mcp

MCP server exposing Humanity Group empire memories to Claude Code and other MCP clients.

## Vision

Premier MCP server custom maison du chantier Empire Agents OS. Débloque l'axe 7 (MCP servers buildés maison) du système agents IA empire.

## Architecture

```
~/.claude/projects/-Users-lauren/memory/    →  ~160 memory files (.md)
~/Documents/wiki-internal/                  →  ~11 wiki externes (>10KB chacun)
```

Le MCP server expose ces 2 sources via 5 tools.

## Tools exposés

| Tool | Description |
|---|---|
| `list_memories` | Liste toutes les memories actives avec métadonnées (nom, type, taille, description) |
| `get_memory` | Récupère le contenu complet d'une memory par nom |
| `search_memories` | Recherche full-text dans toutes les memories |
| `list_wiki_docs` | Liste les wikis externes (détails complets sortis du contexte auto-load) |
| `get_wiki_doc` | Récupère le contenu d'un wiki externe |

## Install (local)

```bash
cd ~/CascadeProjects/empire-memory-mcp
pnpm install
pnpm build
```

## Wire to Claude Code

Add to `~/.claude/settings.json` MCP servers section:

```json
{
  "mcpServers": {
    "empire-memory": {
      "command": "node",
      "args": ["/Users/lauren/CascadeProjects/empire-memory-mcp/dist/index.js"]
    }
  }
}
```

## Test (manual)

```bash
# CLI test (echo MCP request, get response)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | pnpm start
```

## Lifecycle

- v0.1 (06/06/2026) — MVP : 5 tools read-only sur memory + wiki
- v0.2 (planned) — Tools write : `add_memory`, `update_memory`, archive
- v0.3 (planned) — Vector search (embeddings) pour scaling memories >300
