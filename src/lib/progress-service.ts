import { and, eq, lte } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  attempts,
  knowledgePoints as knowledgePointRows,
  masteryDeclarations,
  reviewLogs,
  reviewStates,
  users,
} from "@/db/schema";
import {
  scheduleMasteryDeclaration,
  scheduleReview,
  type ReviewSchedule,
} from "@/domain/review";
import {
  createReviewQuestion,
  findKnowledgePoint,
  getCorrectReviewAnswer,
} from "@/lib/knowledge";

export const LOCAL_USER_ID = "local-user";

export type ProgressState = {
  knowledgePointId: string;
  stage: ReviewSchedule["stage"];
  dueAt: string;
  intervalDays: number;
  consecutiveSuccesses: number;
};

function toSchedule(row: typeof reviewStates.$inferSelect): ReviewSchedule {
  return {
    stage: row.stage,
    dueAt: row.dueAt,
    intervalDays: row.intervalDays,
    consecutiveSuccesses: row.consecutiveSuccesses,
  };
}

function toProgressState(
  row: typeof reviewStates.$inferSelect,
): ProgressState {
  return {
    knowledgePointId: row.knowledgePointId,
    stage: row.stage,
    dueAt: row.dueAt.toISOString(),
    intervalDays: row.intervalDays,
    consecutiveSuccesses: row.consecutiveSuccesses,
  };
}

export async function listProgress() {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(reviewStates)
    .where(eq(reviewStates.userId, LOCAL_USER_ID));

  return rows.map(toProgressState);
}

export async function declareMastery(
  knowledgePointId: string,
  now = new Date(),
) {
  const item = findKnowledgePoint(knowledgePointId);
  if (!item) {
    throw new Error("UNKNOWN_KNOWLEDGE_POINT");
  }

  const db = getDatabase();
  return db.transaction(async (transaction) => {
    await transaction
      .insert(users)
      .values({ id: LOCAL_USER_ID })
      .onConflictDoNothing();
    await transaction
      .insert(knowledgePointRows)
      .values({
        id: item.id,
        kind: item.kind,
        level: item.level,
        contentVersion: item.contentVersion,
      })
      .onConflictDoUpdate({
        target: knowledgePointRows.id,
        set: {
          kind: item.kind,
          level: item.level,
          contentVersion: item.contentVersion,
        },
      });

    const [previousRow] = await transaction
      .select()
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.userId, LOCAL_USER_ID),
          eq(reviewStates.knowledgePointId, item.id),
        ),
      )
      .limit(1);

    if (previousRow) {
      return toProgressState(previousRow);
    }

    const nextState = scheduleMasteryDeclaration(now);
    await transaction.insert(masteryDeclarations).values({
      userId: LOCAL_USER_ID,
      knowledgePointId: item.id,
      declaredAt: now,
    });
    const [inserted] = await transaction
      .insert(reviewStates)
      .values({
        userId: LOCAL_USER_ID,
        knowledgePointId: item.id,
        ...nextState,
        updatedAt: now,
      })
      .returning();
    await transaction.insert(reviewLogs).values({
      userId: LOCAL_USER_ID,
      knowledgePointId: item.id,
      eventType: "mastery_declared",
      previousState: null,
      nextState,
      createdAt: now,
    });

    return toProgressState(inserted);
  });
}

export async function listDueReviews(now = new Date()) {
  const db = getDatabase();
  const allStates = await db
    .select()
    .from(reviewStates)
    .where(eq(reviewStates.userId, LOCAL_USER_ID));

  const dueStates = allStates.filter(
    (state) => state.stage !== "learning" && state.dueAt <= now,
  );
  const items = dueStates.flatMap((state) => {
    const item = findKnowledgePoint(state.knowledgePointId);
    if (!item) {
      return [];
    }
    return [
      {
        ...createReviewQuestion(item),
        dueAt: state.dueAt.toISOString(),
        stage: state.stage,
      },
    ];
  });

  return {
    items,
    upcomingCount: allStates.filter(
      (state) => state.stage !== "learning" && state.dueAt > now,
    ).length,
    learningCount: allStates.filter((state) => state.stage === "learning")
      .length,
  };
}

export async function submitReview(
  knowledgePointId: string,
  answer: string,
  now = new Date(),
) {
  const item = findKnowledgePoint(knowledgePointId);
  if (!item) {
    throw new Error("UNKNOWN_KNOWLEDGE_POINT");
  }

  const db = getDatabase();
  return db.transaction(async (transaction) => {
    const [currentRow] = await transaction
      .select()
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.userId, LOCAL_USER_ID),
          eq(reviewStates.knowledgePointId, knowledgePointId),
          lte(reviewStates.dueAt, now),
        ),
      )
      .limit(1);

    if (!currentRow || currentRow.stage === "learning") {
      throw new Error("REVIEW_NOT_DUE");
    }

    const correct = answer === getCorrectReviewAnswer(item);
    const previousState = toSchedule(currentRow);
    const nextState = scheduleReview(
      previousState,
      correct ? "pass" : "fail",
      now,
    );

    await transaction.insert(attempts).values({
      userId: LOCAL_USER_ID,
      knowledgePointId,
      exerciseType: "meaning_choice",
      answer,
      correct,
      createdAt: now,
    });
    await transaction
      .update(reviewStates)
      .set({ ...nextState, updatedAt: now })
      .where(
        and(
          eq(reviewStates.userId, LOCAL_USER_ID),
          eq(reviewStates.knowledgePointId, knowledgePointId),
        ),
      );
    await transaction.insert(reviewLogs).values({
      userId: LOCAL_USER_ID,
      knowledgePointId,
      eventType: "reviewed",
      previousState,
      nextState,
      createdAt: now,
    });

    return {
      correct,
      stage: nextState.stage,
      dueAt: nextState.dueAt.toISOString(),
      correctAnswer: getCorrectReviewAnswer(item),
    };
  });
}
