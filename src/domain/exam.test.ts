import { describe, expect, it } from "vitest";
import { scoreExam } from "./exam";

describe("JLPT-style exam scoring", () => {
  it("requires every scoring section", () => {
    const result = scoreExam("N5", [
      ...Array.from({ length: 10 }, () => ({ section: "vocabulary" as const, correct: true })),
    ]);
    expect(result.complete).toBe(false);
    expect(result.passed).toBe(false);
  });

  it("applies the N5 overall and sectional pass marks", () => {
    const result = scoreExam("N5", [
      ...Array.from({ length: 10 }, () => ({ section: "vocabulary" as const, correct: true })),
      ...Array.from({ length: 10 }, () => ({ section: "listening" as const, correct: true })),
    ]);
    expect(result.total).toBe(180);
    expect(result.passed).toBe(true);
  });
});
