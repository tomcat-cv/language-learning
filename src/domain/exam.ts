export type ExamLevel = "N5" | "N4" | "N3" | "N2" | "N1";
export type ExamMode = "mock" | "official";
export type ExamSection = "language" | "reading" | "listening";

export const PASSING_RULES: Record<ExamLevel, { total: number; sections: Record<ExamSection, number> }> = {
  N1: { total: 100, sections: { language: 19, reading: 19, listening: 19 } },
  N2: { total: 90, sections: { language: 19, reading: 19, listening: 19 } },
  N3: { total: 95, sections: { language: 19, reading: 19, listening: 19 } },
  N4: { total: 90, sections: { language: 38, reading: 0, listening: 19 } },
  N5: { total: 80, sections: { language: 38, reading: 0, listening: 19 } },
};

export type ExamAnswer = { section: "vocabulary" | "grammar" | "reading" | "listening"; correct: boolean };

export function scoreExam(level: ExamLevel, answers: ExamAnswer[]) {
  const rules = PASSING_RULES[level];
  const sectionAnswers: Record<ExamSection, ExamAnswer[]> = { language: [], reading: [], listening: [] };
  for (const answer of answers) {
    const section: ExamSection = answer.section === "reading" ? "reading" : answer.section === "listening" ? "listening" : "language";
    sectionAnswers[section].push(answer);
  }
  const requiredSections = level === "N4" || level === "N5" ? ["language", "listening"] as const : ["language", "reading", "listening"] as const;
  const complete = requiredSections.every((section) => sectionAnswers[section].length > 0);
  const scores = Object.fromEntries((Object.keys(sectionAnswers) as ExamSection[]).map((section) => {
    const items = sectionAnswers[section];
    const max = section === "language" && (level === "N4" || level === "N5") ? 120 : 60;
    return [section, items.length === 0 ? 0 : Math.round(items.filter((item) => item.correct).length / items.length * max)];
  })) as Record<ExamSection, number>;
  const total = scores.language + scores.reading + scores.listening;
  const passed = complete && total >= rules.total && requiredSections.every((section) => scores[section] >= rules.sections[section]);
  return { complete, passed, total, scores, rules };
}
