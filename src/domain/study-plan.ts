export type PlanKind = "grammar" | "vocabulary";

export type PlanCandidate = {
  knowledgePointId: string;
  kind: PlanKind;
};

export type PlannedTask = PlanCandidate & {
  taskType: "review" | "relearning" | "new";
  estimatedMinutes: number;
};

export type StudyPlanInput = {
  dailyMinutes: number;
  grammarLimit: number;
  vocabularyLimit: number;
  due: PlanCandidate[];
  relearning: PlanCandidate[];
  newGrammar: PlanCandidate[];
  newVocabulary: PlanCandidate[];
};

const REVIEW_MINUTES = 2;
const NEW_MINUTES: Record<PlanKind, number> = {
  grammar: 4,
  vocabulary: 2,
};

export function buildStudyPlan(input: StudyPlanInput): PlannedTask[] {
  const tasks: PlannedTask[] = input.due.map((candidate) => ({
    ...candidate,
    taskType: "review",
    estimatedMinutes: REVIEW_MINUTES,
  }));
  tasks.push(
    ...input.relearning.map((candidate) => ({
      ...candidate,
      taskType: "relearning" as const,
      estimatedMinutes: NEW_MINUTES[candidate.kind],
    })),
  );
  let remainingMinutes = Math.max(
    0,
    input.dailyMinutes -
      tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
  );
  const queues = {
    grammar: input.newGrammar.slice(0, input.grammarLimit),
    vocabulary: input.newVocabulary.slice(0, input.vocabularyLimit),
  };

  let kind: PlanKind = "grammar";
  while (queues.grammar.length > 0 || queues.vocabulary.length > 0) {
    const alternate: PlanKind = kind === "grammar" ? "vocabulary" : "grammar";
    const selectedKind = queues[kind].length > 0 ? kind : alternate;
    const estimate = NEW_MINUTES[selectedKind];

    if (queues[selectedKind].length > 0 && estimate <= remainingMinutes) {
      const candidate = queues[selectedKind].shift();
      if (candidate) {
        tasks.push({
          ...candidate,
          taskType: "new",
          estimatedMinutes: estimate,
        });
        remainingMinutes -= estimate;
      }
    } else {
      queues[selectedKind] = [];
    }
    kind = alternate;
  }

  return tasks;
}
