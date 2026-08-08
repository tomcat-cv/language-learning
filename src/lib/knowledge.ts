import { readCatalogEntries, type CatalogEntry, type CatalogLevel } from "@/lib/source-catalog";

export type KnowledgeKind = "grammar" | "vocabulary";

export type GrammarKnowledgePoint = {
  id: string;
  kind: "grammar";
  level: Exclude<CatalogLevel, "unranked">;
  contentVersion: 1;
  pattern: string;
  meaning: string;
  connection: string;
  example?: string;
  translation?: string;
  source: string;
  sourceUrl: string;
  license: string;
  levelBasis: string;
  formality?: string | null;
  related?: string[];
};

export type VocabularyKnowledgePoint = {
  id: string;
  kind: "vocabulary";
  level: Exclude<CatalogLevel, "unranked">;
  contentVersion: 1;
  word: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
  example?: string;
  translation?: string;
  source: string;
  levelBasis: string;
};

export type KnowledgePoint = GrammarKnowledgePoint | VocabularyKnowledgePoint;

export type ReviewQuestion = {
  knowledgePointId: string;
  kind: KnowledgeKind;
  label: string;
  prompt: string;
  options: string[];
};

const levels: Exclude<CatalogLevel, "unranked">[] = ["N5", "N4", "N3", "N2", "N1"];
let allKnowledgePointsPromise: Promise<KnowledgePoint[]> | null = null;

function toGrammarPoint(entry: CatalogEntry): GrammarKnowledgePoint {
  const example = entry.examples?.[0];
  return {
    id: entry.id,
    kind: "grammar",
    level: entry.level as Exclude<CatalogLevel, "unranked">,
    contentVersion: 1,
    pattern: entry.pattern ?? "",
    meaning: entry.meaning ?? entry.meaningEnglish ?? "",
    connection: entry.connection ?? "",
    example: example?.japanese,
    translation: example?.english,
    source: entry.source,
    sourceUrl: entry.sourceUrl ?? "https://github.com/jkindrix/japanese-language-data",
    license: entry.license ?? "CC BY-SA 4.0",
    levelBasis: entry.levelBasis,
    formality: entry.formality,
    related: entry.related,
  };
}

function toVocabularyPoint(entry: CatalogEntry): VocabularyKnowledgePoint {
  return {
    id: entry.id,
    kind: "vocabulary",
    level: entry.level as Exclude<CatalogLevel, "unranked">,
    contentVersion: 1,
    word: entry.word ?? entry.reading ?? "",
    reading: entry.reading ?? "",
    meaning: entry.glosses?.[0] ?? "暂无英文释义",
    partOfSpeech: entry.partsOfSpeech?.join("、") ?? "词汇",
    source: entry.source,
    levelBasis: entry.levelBasis,
  };
}

export async function loadKnowledgePoints(level?: Exclude<CatalogLevel, "unranked">): Promise<KnowledgePoint[]> {
  if (level) {
    const [grammarEntries, vocabularyEntries] = await Promise.all([
      readCatalogEntries("grammar", level, "", Number.MAX_SAFE_INTEGER),
      readCatalogEntries("vocabulary", level, "", Number.MAX_SAFE_INTEGER),
    ]);
    return [...grammarEntries.map(toGrammarPoint), ...vocabularyEntries.map(toVocabularyPoint)];
  }
  if (!allKnowledgePointsPromise) {
    allKnowledgePointsPromise = Promise.all(levels.map((item) => loadKnowledgePoints(item))).then((groups) => groups.flat());
  }
  return allKnowledgePointsPromise;
}

export async function findKnowledgePoint(id: string) {
  return (await loadKnowledgePoints()).find((item) => item.id === id);
}

export function getCorrectReviewAnswer(item: KnowledgePoint) {
  return item.meaning;
}

export function createReviewQuestion(item: KnowledgePoint, pool: KnowledgePoint[] = [item]): ReviewQuestion {
  const sameKind = pool.filter((candidate) => candidate.kind === item.kind && candidate.id !== item.id);
  const distractors = sameKind.slice(0, 3);
  const answers = [item, ...distractors].map((candidate) => candidate.meaning);
  const options = [...answers].sort((left, right) => left.localeCompare(right, "zh-CN"));
  return {
    knowledgePointId: item.id,
    kind: item.kind,
    label: item.kind === "grammar" ? item.pattern : `${item.word}（${item.reading}）`,
    prompt: item.kind === "grammar" ? `下面哪一项最符合「${item.pattern}」的含义？` : `「${item.word}」最符合下面哪个含义？`,
    options,
  };
}
