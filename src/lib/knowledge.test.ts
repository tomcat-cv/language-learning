import { describe, expect, it } from "vitest";
import { createReviewQuestion, getCorrectReviewAnswer, type VocabularyKnowledgePoint } from "./knowledge";

const item: VocabularyKnowledgePoint = {
  id: "jmdict:test",
  kind: "vocabulary",
  level: "N5",
  contentVersion: 1,
  word: "水",
  reading: "みず",
  meaning: "water",
  partOfSpeech: "noun",
  source: "test fixture",
  levelBasis: "test fixture",
};

describe("source-backed review question generation", () => {
  it("uses the formal vocabulary item and source-backed distractors", () => {
    const pool = [
      item,
      { ...item, id: "jmdict:test-2", word: "本", meaning: "book" },
      { ...item, id: "jmdict:test-3", word: "先生", meaning: "teacher" },
      { ...item, id: "jmdict:test-4", word: "学生", meaning: "student" },
    ];
    const question = createReviewQuestion(item, pool);

    expect(question.kind).toBe("vocabulary");
    expect(question.options).toHaveLength(4);
    expect(question.options).toContain(getCorrectReviewAnswer(item));
  });
});
