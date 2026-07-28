import {
  grammarItems,
  vocabularyItems,
  type GrammarItem,
  type VocabularyItem,
} from "@/data/n5";

export type KnowledgeKind = "grammar" | "vocabulary";

export type KnowledgePoint =
  | (GrammarItem & { kind: "grammar"; level: "N5"; contentVersion: 1 })
  | (VocabularyItem & {
      kind: "vocabulary";
      level: "N5";
      contentVersion: 1;
    });

export type ReviewQuestion = {
  knowledgePointId: string;
  kind: KnowledgeKind;
  label: string;
  prompt: string;
  options: string[];
};

export const knowledgePoints: KnowledgePoint[] = [
  ...grammarItems.map(
    (item): KnowledgePoint => ({
      ...item,
      kind: "grammar",
      level: "N5",
      contentVersion: 1,
    }),
  ),
  ...vocabularyItems.map(
    (item): KnowledgePoint => ({
      ...item,
      kind: "vocabulary",
      level: "N5",
      contentVersion: 1,
    }),
  ),
];

export function findKnowledgePoint(id: string) {
  return knowledgePoints.find((item) => item.id === id);
}

export function getCorrectReviewAnswer(item: KnowledgePoint) {
  return item.meaning;
}

export function createReviewQuestion(item: KnowledgePoint): ReviewQuestion {
  const sameKind = knowledgePoints.filter(
    (candidate) => candidate.kind === item.kind,
  );
  const itemIndex = sameKind.findIndex((candidate) => candidate.id === item.id);
  const distractors = sameKind
    .filter((candidate) => candidate.id !== item.id)
    .slice(itemIndex, itemIndex + 3);

  if (distractors.length < 3) {
    distractors.push(
      ...sameKind
        .filter(
          (candidate) =>
            candidate.id !== item.id && !distractors.includes(candidate),
        )
        .slice(0, 3 - distractors.length),
    );
  }

  const answers = [item, ...distractors].map((candidate) => candidate.meaning);
  const offset = Math.max(0, itemIndex) % answers.length;
  const options = [...answers.slice(offset), ...answers.slice(0, offset)];

  return {
    knowledgePointId: item.id,
    kind: item.kind,
    label: item.kind === "grammar" ? item.pattern : `${item.word}（${item.reading}）`,
    prompt:
      item.kind === "grammar"
        ? `下面哪一项最符合「${item.pattern}」的含义？`
        : `「${item.word}」最符合下面哪个含义？`,
    options,
  };
}
