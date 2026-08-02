import { describe, expect, it } from "vitest";
import { buildStudyPlan, type PlanCandidate } from "./study-plan";

const grammar = (id: string): PlanCandidate => ({
  knowledgePointId: id,
  kind: "grammar",
});
const vocabulary = (id: string): PlanCandidate => ({
  knowledgePointId: id,
  kind: "vocabulary",
});

describe("daily study planning", () => {
  it("keeps every due review even when reviews exceed the time budget", () => {
    const tasks = buildStudyPlan({
      dailyMinutes: 3,
      grammarLimit: 10,
      vocabularyLimit: 50,
      due: [grammar("g-001"), vocabulary("v-001")],
      relearning: [],
      newGrammar: [grammar("g-002")],
      newVocabulary: [vocabulary("v-002")],
    });

    expect(tasks.map((task) => task.knowledgePointId)).toEqual([
      "g-001",
      "v-001",
    ]);
    expect(tasks.every((task) => task.taskType === "review")).toBe(true);
  });

  it("alternates new grammar and vocabulary inside the remaining budget", () => {
    const tasks = buildStudyPlan({
      dailyMinutes: 10,
      grammarLimit: 2,
      vocabularyLimit: 2,
      due: [vocabulary("v-001")],
      relearning: [],
      newGrammar: [grammar("g-001"), grammar("g-002")],
      newVocabulary: [vocabulary("v-002"), vocabulary("v-003")],
    });

    expect(tasks.map((task) => task.knowledgePointId)).toEqual([
      "v-001",
      "g-001",
      "v-002",
      "v-003",
    ]);
    expect(tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)).toBe(
      10,
    );
  });

  it("honors both new-content limits", () => {
    const tasks = buildStudyPlan({
      dailyMinutes: 30,
      grammarLimit: 1,
      vocabularyLimit: 1,
      due: [],
      relearning: [],
      newGrammar: [grammar("g-001"), grammar("g-002")],
      newVocabulary: [vocabulary("v-001"), vocabulary("v-002")],
    });

    expect(tasks).toHaveLength(2);
  });
});
