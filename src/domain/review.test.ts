import { describe, expect, it } from "vitest";
import {
  scheduleLearnedItem,
  scheduleMasteryDeclaration,
  scheduleReview,
} from "./review";

const NOW = new Date("2026-07-28T08:00:00.000Z");

describe("review scheduling", () => {
  it("schedules a self-declared item for verification on the next day", () => {
    const state = scheduleMasteryDeclaration(NOW);

    expect(state).toEqual({
      stage: "self_declared",
      dueAt: new Date("2026-07-29T08:00:00.000Z"),
      intervalDays: 1,
      consecutiveSuccesses: 0,
    });
  });

  it("schedules a normally learned item for the next day", () => {
    expect(scheduleLearnedItem(NOW)).toEqual({
      stage: "review",
      dueAt: new Date("2026-07-29T08:00:00.000Z"),
      intervalDays: 1,
      consecutiveSuccesses: 0,
    });
  });

  it("moves a passed mastery verification into review with a longer interval", () => {
    const previous = scheduleMasteryDeclaration(NOW);
    const reviewTime = previous.dueAt;

    expect(scheduleReview(previous, "pass", reviewTime)).toEqual({
      stage: "review",
      dueAt: new Date("2026-08-01T08:00:00.000Z"),
      intervalDays: 3,
      consecutiveSuccesses: 1,
    });
  });

  it("returns a failed verification to learning", () => {
    const previous = scheduleMasteryDeclaration(NOW);

    expect(scheduleReview(previous, "fail", previous.dueAt)).toEqual({
      stage: "learning",
      dueAt: new Date("2026-07-30T08:00:00.000Z"),
      intervalDays: 1,
      consecutiveSuccesses: 0,
    });
  });

  it("doubles established review intervals up to one year", () => {
    const state = scheduleReview(
      {
        stage: "review",
        dueAt: NOW,
        intervalDays: 200,
        consecutiveSuccesses: 4,
      },
      "pass",
      NOW,
    );

    expect(state.intervalDays).toBe(365);
    expect(state.consecutiveSuccesses).toBe(5);
  });
});
