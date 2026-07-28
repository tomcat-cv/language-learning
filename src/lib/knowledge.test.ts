import { describe, expect, it } from "vitest";
import {
  createReviewQuestion,
  findKnowledgePoint,
  getCorrectReviewAnswer,
} from "./knowledge";

describe("review question generation", () => {
  it("creates a four-option grammar question without exposing another kind", () => {
    const item = findKnowledgePoint("g-001");
    expect(item).toBeDefined();
    if (!item) return;

    const question = createReviewQuestion(item);

    expect(question.kind).toBe("grammar");
    expect(question.options).toHaveLength(4);
    expect(question.options).toContain(getCorrectReviewAnswer(item));
  });

  it("creates a four-option vocabulary question", () => {
    const item = findKnowledgePoint("v-001");
    expect(item).toBeDefined();
    if (!item) return;

    const question = createReviewQuestion(item);

    expect(question.kind).toBe("vocabulary");
    expect(new Set(question.options).size).toBe(4);
    expect(question.options).toContain("我");
  });
});
