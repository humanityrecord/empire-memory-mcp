/**
 * Memory store : abstraction read-only sur les fichiers memory + wiki externe.
 *
 * Convention paths empire Humanity Group :
 * - Memories actives : ~/.claude/projects/-Users-lauren/memory/*.md
 * - Wikis externes   : ~/Documents/wiki-internal/*.md
 *
 * Toutes les lectures sont synchrones (fast) car volumes modestes (<1MB total).
 * Si > 500 memories ou >10MB total : passer en async + cache LRU.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import matter from "gray-matter";

const HOME = homedir();
export const MEMORY_DIR = join(HOME, ".claude/projects/-Users-lauren/memory");
export const WIKI_DIR = join(HOME, "Documents/wiki-internal");

export interface MemoryEntry {
  name: string;          // file name without .md
  type: string;          // feedback | reference | project | other
  description: string;   // from front-matter or first paragraph
  sizeBytes: number;
  lastModified: string;  // ISO 8601
}

export interface WikiEntry {
  name: string;
  sizeBytes: number;
  lastModified: string;
}

export interface SearchHit {
  name: string;
  type: string;
  matches: string[];  // matching lines (max 3)
  totalMatches: number;
}

function inferType(name: string): string {
  if (name.startsWith("feedback_")) return "feedback";
  if (name.startsWith("reference_")) return "reference";
  if (name.startsWith("project_")) return "project";
  if (name === "MEMORY") return "index";
  return "other";
}

function safeReadFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function listMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

export function listMemories(): MemoryEntry[] {
  const files = listMdFiles(MEMORY_DIR);
  const entries: MemoryEntry[] = [];

  for (const file of files) {
    const path = join(MEMORY_DIR, file);
    const name = basename(file, ".md");
    const stat = statSync(path);
    const raw = safeReadFile(path) ?? "";

    let description = "";
    try {
      const parsed = matter(raw);
      description =
        (parsed.data.description as string | undefined) ??
        raw
          .split("\n")
          .find((l) => l.trim().length > 20 && !l.startsWith("#") && !l.startsWith("---"))
          ?.trim()
          .slice(0, 200) ??
        "";
    } catch {
      // gray-matter sometimes fails on malformed YAML — fall back to first line
      description = raw.split("\n").slice(0, 5).join(" ").slice(0, 200);
    }

    entries.push({
      name,
      type: inferType(name),
      description,
      sizeBytes: stat.size,
      lastModified: stat.mtime.toISOString(),
    });
  }

  return entries;
}

export function getMemory(name: string): { name: string; content: string } | null {
  // accept name with or without .md, with or without prefix
  const candidates = [name, `${name}.md`];
  for (const c of candidates) {
    const path = join(MEMORY_DIR, c);
    const content = safeReadFile(path);
    if (content !== null) {
      return { name: basename(c, ".md"), content };
    }
  }
  return null;
}

export function searchMemories(query: string, maxResults = 20): SearchHit[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const files = listMdFiles(MEMORY_DIR);
  const hits: SearchHit[] = [];

  for (const file of files) {
    const name = basename(file, ".md");
    const content = safeReadFile(join(MEMORY_DIR, file));
    if (!content) continue;

    const lines = content.split("\n");
    const matches: string[] = [];
    let totalMatches = 0;

    for (const line of lines) {
      if (line.toLowerCase().includes(q)) {
        totalMatches++;
        if (matches.length < 3) {
          matches.push(line.trim().slice(0, 300));
        }
      }
    }

    if (totalMatches > 0) {
      hits.push({
        name,
        type: inferType(name),
        matches,
        totalMatches,
      });
    }
  }

  // sort by relevance (totalMatches desc), then alpha
  hits.sort((a, b) => b.totalMatches - a.totalMatches || a.name.localeCompare(b.name));
  return hits.slice(0, maxResults);
}

export function listWikiDocs(): WikiEntry[] {
  const files = listMdFiles(WIKI_DIR);
  return files.map((file) => {
    const path = join(WIKI_DIR, file);
    const stat = statSync(path);
    return {
      name: basename(file, ".md"),
      sizeBytes: stat.size,
      lastModified: stat.mtime.toISOString(),
    };
  });
}

export function getWikiDoc(name: string): { name: string; content: string } | null {
  const candidates = [name, `${name}.md`];
  for (const c of candidates) {
    const path = join(WIKI_DIR, c);
    const content = safeReadFile(path);
    if (content !== null) {
      return { name: basename(c, ".md"), content };
    }
  }
  return null;
}
