import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import {
  parseEntityDeclarations,
  parseJmdictEntry,
  parseKanjidicCharacter,
  readGzipPrefix,
  streamGzipRecords,
} from "./content/xml-parsers.mjs";

const root = process.cwd();
const inputDirectory = path.resolve(process.env.HIBI_CONTENT_DIR ?? ".cache/hibi-content");
const outputDirectory = path.resolve(process.env.HIBI_SOURCE_CATALOG_DIR ?? ".local/source-catalog");
const levels = ["N5", "N4", "N3", "N2", "N1", "unranked"];

function legacyLevel(value) {
  return ({ 4: "N5", 3: "N4", 2: "N3", 1: "N2" })[value] ?? "unranked";
}

function levelFromCharacters(text, characterLevels, isCommon) {
  const assigned = [...text].map((character) => characterLevels.get(character)).filter((level) => /^N[1-5]$/.test(level ?? ""));
  if (assigned.length === 0) return isCommon ? "N1" : "unranked";
  return assigned.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))[0];
}

async function writeJsonLines(streams, level, value) {
  const stream = streams.get(level);
  if (!stream.write(`${JSON.stringify(value)}\n`)) await once(stream, "drain");
}

async function closeStreams(streams) {
  await Promise.all([...streams.values()].map(async (stream) => {
    stream.end();
    await once(stream, "close");
  }));
}

async function main() {
  const jmdictPath = path.join(inputDirectory, "JMdict.gz");
  const kanjidicPath = path.join(inputDirectory, "kanjidic2.xml.gz");
  await readFile(`${jmdictPath}.metadata.json`);
  await readFile(`${kanjidicPath}.metadata.json`);
  const grammarPath = path.join(root, "content", "grammar", "japanese-language-data.json");
  const grammarPayload = JSON.parse(await readFile(grammarPath, "utf8"));
  await mkdir(outputDirectory, { recursive: true });
  const characterLevels = new Map();
  const counts = {
    vocabulary: Object.fromEntries(levels.map((level) => [level, 0])),
    kanji: Object.fromEntries(levels.map((level) => [level, 0])),
    grammar: Object.fromEntries(levels.filter((level) => level !== "unranked").map((level) => [level, 0])),
  };
  const streams = new Map();
  for (const level of levels) {
    streams.set(`vocabulary:${level}`, createWriteStream(path.join(outputDirectory, `vocabulary-${level}.ndjson`), { encoding: "utf8" }));
    streams.set(`kanji:${level}`, createWriteStream(path.join(outputDirectory, `kanji-${level}.ndjson`), { encoding: "utf8" }));
    if (level !== "unranked") {
      streams.set(`grammar:${level}`, createWriteStream(path.join(outputDirectory, `grammar-${level}.ndjson`), { encoding: "utf8" }));
    }
  }

  for await (const xml of streamGzipRecords(kanjidicPath, "character")) {
    const entry = parseKanjidicCharacter(xml);
    const level = entry.jlptLegacy === null && entry.frequency !== null && entry.frequency <= 1500 ? "N1" : legacyLevel(entry.jlptLegacy);
    characterLevels.set(entry.literal, level);
    await writeJsonLines(streams, `kanji:${level}`, {
      id: `kanji:${entry.literal}`,
      literal: entry.literal,
      level,
      levelBasis: entry.jlptLegacy !== null ? "KANJIDIC2 legacy jlpt field" : level === "N1" ? "frequency heuristic draft; not official JLPT classification" : "unranked",
      strokeCount: entry.strokeCount,
      grade: entry.grade,
      frequency: entry.frequency,
      readings: entry.payload.readingMeaningGroups.flatMap((group) => group.readings.map((reading) => reading.value)),
      meanings: entry.payload.readingMeaningGroups.flatMap((group) => group.meanings.filter((meaning) => meaning.language === "en").map((meaning) => meaning.value)),
      source: "EDRDG KANJIDIC2",
    });
    counts.kanji[level] += 1;
  }

  const entityMap = parseEntityDeclarations(await readGzipPrefix(jmdictPath, "<entry>"));
  for await (const xml of streamGzipRecords(jmdictPath, "entry")) {
    const entry = parseJmdictEntry(xml, entityMap);
    const level = levelFromCharacters(entry.primaryKanji ?? entry.primaryReading, characterLevels, entry.isCommon);
    const sense = entry.payload.senses.find((candidate) => candidate.glosses.some((gloss) => gloss.language === "eng"));
    await writeJsonLines(streams, `vocabulary:${level}`, {
      id: entry.id,
      word: entry.primaryKanji ?? entry.primaryReading,
      reading: entry.primaryReading,
      level,
      levelBasis: level === "N1" && ![...(entry.primaryKanji ?? entry.primaryReading)].some((character) => /^N[1-5]$/.test(characterLevels.get(character) ?? "")) ? "common-word heuristic draft; not official JLPT classification" : level === "unranked" ? "No reliable level in JMdict/KANJIDIC2" : "Derived from KANJIDIC2 legacy character fields",
      common: entry.isCommon,
      partsOfSpeech: sense?.partsOfSpeech ?? [],
      glosses: sense?.glosses.filter((gloss) => gloss.language === "eng").map((gloss) => gloss.text) ?? [],
      source: "EDRDG JMdict",
    });
    counts.vocabulary[level] += 1;
  }

  for (const point of grammarPayload.grammar_points) {
    const level = /^N[1-5]$/.test(point.level) ? point.level : "unranked";
    if (level === "unranked") continue;
    await writeJsonLines(streams, `grammar:${level}`, {
      id: `japanese-language-data:${point.id}`,
      pattern: point.pattern,
      level,
      hibiLevel: level,
      levelBasis: "Japanese Language Data project level; not JLPT official classification",
      meaning: point.meaning_detailed ?? point.meaning_en ?? "",
      meaningEnglish: point.meaning_en ?? "",
      connection: point.formation ?? "",
      formationNotes: point.formation_notes ?? [],
      formality: point.formality ?? null,
      related: point.related ?? [],
      examples: point.examples ?? [],
      source: "Japanese Language Data",
      sourceUrl: "https://github.com/jkindrix/japanese-language-data",
      license: "CC BY-SA 4.0",
      reviewStatus: point.review_status ?? "draft",
    });
    counts.grammar[level] += 1;
  }

  await closeStreams(streams);
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceDirectory: path.relative(root, inputDirectory),
    outputDirectory: path.relative(root, outputDirectory),
    levelPolicy: "Vocabulary/kanji use existing source hints; grammar uses the Japanese Language Data project's hibi_level values N5-N1 and is not claimed as official JLPT classification.",
    counts,
  };
  await writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`已生成本地源数据目录：${path.relative(root, outputDirectory)}`);
  console.log(JSON.stringify(counts));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
