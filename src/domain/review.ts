export type ReviewStage = "self_declared" | "review" | "learning";
export type ReviewResult = "pass" | "fail";

export type ReviewSchedule = {
  stage: ReviewStage;
  dueAt: Date;
  intervalDays: number;
  consecutiveSuccesses: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

export function scheduleMasteryDeclaration(now: Date): ReviewSchedule {
  return {
    stage: "self_declared",
    dueAt: addDays(now, 1),
    intervalDays: 1,
    consecutiveSuccesses: 0,
  };
}

export function scheduleLearnedItem(now: Date): ReviewSchedule {
  return {
    stage: "review",
    dueAt: addDays(now, 1),
    intervalDays: 1,
    consecutiveSuccesses: 0,
  };
}

export function scheduleReview(
  previous: ReviewSchedule,
  result: ReviewResult,
  now: Date,
): ReviewSchedule {
  if (result === "fail") {
    return {
      stage: "learning",
      dueAt: addDays(now, 1),
      intervalDays: 1,
      consecutiveSuccesses: 0,
    };
  }

  const intervalDays =
    previous.stage === "self_declared"
      ? 3
      : Math.min(365, Math.max(3, previous.intervalDays * 2));

  return {
    stage: "review",
    dueAt: addDays(now, intervalDays),
    intervalDays,
    consecutiveSuccesses: previous.consecutiveSuccesses + 1,
  };
}
