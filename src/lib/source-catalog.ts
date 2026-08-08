import { readFile } from "node:fs/promises";
import path from "node:path";

export type CatalogLevel = "N5" | "N4" | "N3" | "N2" | "N1" | "unranked";
export type CatalogKind = "vocabulary" | "kanji";

export type CatalogEntry = {
  id: string;
  level: CatalogLevel;
  levelBasis: string;
  source: string;
  word?: string;
  reading?: string;
  common?: boolean;
  partsOfSpeech?: string[];
  glosses?: string[];
  literal?: string;
  readings?: string[];
  meanings?: string[];
  strokeCount?: number | null;
  grade?: number | null;
  frequency?: number | null;
};

const catalogDirectory = path.join(process.cwd(), ".local", "source-catalog");

export async function readCatalogManifest(): Promise<{ counts: Record<CatalogKind, Record<string, number>> } | null> {
  try {
    return JSON.parse(await readFile(path.join(catalogDirectory, "manifest.json"), "utf8")) as { counts: Record<CatalogKind, Record<string, number>> };
  } catch {
    return null;
  }
}

export async function readCatalogEntries(kind: CatalogKind, level: CatalogLevel, query = "", limit = 100) {
  try {
    const contents = await readFile(path.join(catalogDirectory, `${kind}-${level}.ndjson`), "utf8");
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return contents
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CatalogEntry)
      .filter((entry) => {
        if (!normalizedQuery) return true;
        const searchable = [entry.word, entry.reading, entry.literal, ...(entry.glosses ?? []), ...(entry.meanings ?? [])].filter(Boolean).join(" ").toLocaleLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .slice(0, Number.isFinite(limit) ? limit : undefined);
  } catch {
    return [];
  }
}
