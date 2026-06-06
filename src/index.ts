#!/usr/bin/env node
/**
 * Empire Memory MCP server.
 *
 * Exposes the Humanity Group empire memories (Lauren's ~/.claude memories and
 * ~/Documents/wiki-internal wikis) via 5 read-only tools, over stdio transport.
 *
 * Designed to run as a local MCP server invoked by Claude Code (or any other
 * MCP client). See README.md for wiring instructions.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  listMemories,
  getMemory,
  searchMemories,
  listWikiDocs,
  getWikiDoc,
} from "./memory-store.js";

const server = new Server(
  {
    name: "empire-memory",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool declarations
// ─────────────────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_memories",
      description:
        "List all active memories from the empire memory store (~/.claude). " +
        "Returns an array of entries with name, type (feedback|reference|project|index|other), " +
        "description, size, and last modified date. Use to discover what memories exist " +
        "before fetching specific ones.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Optional filter by type (feedback|reference|project|index|other)",
            enum: ["feedback", "reference", "project", "index", "other"],
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "get_memory",
      description:
        "Fetch the full content of a specific memory by name. Use after list_memories to " +
        "retrieve detailed content. Name may include or omit .md suffix.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Memory file name (e.g. 'feedback_lauren_style' or 'project_funnel_os'). " +
              "Suffix .md optional.",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
    {
      name: "search_memories",
      description:
        "Full-text search across all empire memories. Returns hits sorted by match count, " +
        "with up to 3 matching lines per hit. Use for cross-memory questions like " +
        "'where do I mention X' or 'find decisions about Y'.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (case-insensitive substring match)",
          },
          maxResults: {
            type: "number",
            description: "Max hits to return (default 20)",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "list_wiki_docs",
      description:
        "List external wiki documents (~/Documents/wiki-internal/). These are large " +
        "detailed states (>10KB each) sorted out of the auto-loaded context to keep " +
        "session lean. Use to discover what deep states exist before fetching.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_wiki_doc",
      description:
        "Fetch the full content of a specific wiki document by name. These docs contain " +
        "the detailed historical state of a project (funnel_os, writer_os, etc.) that's " +
        "not auto-loaded but available on demand.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Wiki doc file name (e.g. 'funnel_os_full_state_2026-06-06'). Suffix .md optional.",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  ],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Tool dispatcher
// ─────────────────────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_memories": {
        const typeFilter = (args?.type as string | undefined) ?? undefined;
        const all = listMemories();
        const filtered = typeFilter ? all.filter((m) => m.type === typeFilter) : all;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  total: filtered.length,
                  totalAllTypes: all.length,
                  filter: typeFilter ?? null,
                  memories: filtered,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_memory": {
        const memName = args?.name as string;
        if (!memName) {
          return {
            content: [{ type: "text", text: "Error: 'name' parameter required" }],
            isError: true,
          };
        }
        const memory = getMemory(memName);
        if (!memory) {
          return {
            content: [
              { type: "text", text: `Memory '${memName}' not found in empire memory store.` },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `# ${memory.name}\n\n${memory.content}`,
            },
          ],
        };
      }

      case "search_memories": {
        const query = args?.query as string;
        const maxResults = (args?.maxResults as number | undefined) ?? 20;
        if (!query) {
          return {
            content: [{ type: "text", text: "Error: 'query' parameter required" }],
            isError: true,
          };
        }
        const hits = searchMemories(query, maxResults);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  totalHits: hits.length,
                  hits,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_wiki_docs": {
        const docs = listWikiDocs();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  total: docs.length,
                  totalSizeKB: Math.round(
                    docs.reduce((sum, d) => sum + d.sizeBytes, 0) / 1024
                  ),
                  docs,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_wiki_doc": {
        const docName = args?.name as string;
        if (!docName) {
          return {
            content: [{ type: "text", text: "Error: 'name' parameter required" }],
            isError: true,
          };
        }
        const doc = getWikiDoc(docName);
        if (!doc) {
          return {
            content: [
              { type: "text", text: `Wiki doc '${docName}' not found in ~/Documents/wiki-internal/.` },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `# ${doc.name}\n\n${doc.content}`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Tool '${name}' error: ${msg}` }],
      isError: true,
    };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Stdio transport
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // server is now running over stdio — Claude Code will pipe requests/responses.
}

main().catch((err) => {
  process.stderr.write(`empire-memory-mcp fatal: ${err}\n`);
  process.exit(1);
});
