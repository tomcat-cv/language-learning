import { and, asc, eq, lte, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  attempts,
  knowledgePoints as knowledgePointRows,
  masteryDeclarations,
  reviewLogs,
  reviewStates,
  studyPlanItems,
  studyPlans,
  users,
} from "@/db/schema";
import {
  scheduleLearnedItem,
  scheduleMasteryDeclaration,
  scheduleReview,
  type ReviewSchedule,
} from "@/domain/review";
import { buildStudyPlan } from "@/domain/study-plan";
import {
  createReviewQuestion,
  findKnowledgePoint,
  getCorrectReviewAnswer,
  knowledgePoints,
  type KnowledgePoint,
} from "@/lib/knowledge";

export const LOCAL_USER_ID = "local-user";

export type ProgressState = {
  knowledgePointId: string;
  stage: ReviewSchedule["stage"];
  dueAt: string;
  intervalDays: number;
  consecutiveSuccesses: number;
};

export type DailyPlanTask = {
  id: number;
  knowledgePointId: string;
  taskType: "review" | "relearning" | "new";
  kind: "grammar" | "vocabulary";
  estimatedMinutes: number;
  status: "pending" | "completed";
  item: KnowledgePoint;
  question: ReturnType<typeof createReviewQuestion>;
};

export type DailyPlan = {
  id: number;
  planDate: string;
  dailyMinutes: number;
  estimatedMinutes: number;
  completedCount: number;
  tasks: DailyPlanTask[];
};

export type DailyPlanSettings = {
  planDate: string;
  timezoneOffset: number;
  dailyMinutes: number;
  grammarLimit: number;
  vocabularyLimit: number;
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
    await transaction
      .update(studyPlanItems)
      .set({ status: "completed", completedAt: now })
      .where(
        and(
          eq(studyPlanItems.knowledgePointId, item.id),
          eq(studyPlanItems.taskType, "new"),
          eq(studyPlanItems.status, "pending"),
        ),
      );

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

export async function completeLearning(
  knowledgePointId: string,
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
        ),
      )
      .limit(1);

    if (!currentRow || currentRow.stage !== "learning") {
      throw new Error("LEARNING_NOT_REQUIRED");
    }

    const previousState = toSchedule(currentRow);
    const nextState = scheduleLearnedItem(now);
    const [updated] = await transaction
      .update(reviewStates)
      .set({ ...nextState, updatedAt: now })
      .where(
        and(
          eq(reviewStates.userId, LOCAL_USER_ID),
          eq(reviewStates.knowledgePointId, knowledgePointId),
        ),
      )
      .returning();
    await transaction.insert(reviewLogs).values({
      userId: LOCAL_USER_ID,
      knowledgePointId,
      eventType: "learning_completed",
      previousState,
      nextState,
      createdAt: now,
    });
    await transaction
      .update(studyPlanItems)
      .set({ status: "completed", completedAt: now })
      .where(
        and(
          eq(studyPlanItems.knowledgePointId, knowledgePointId),
          eq(studyPlanItems.taskType, "relearning"),
          eq(studyPlanItems.status, "pending"),
        ),
      );

    return toProgressState(updated);
  });
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
    await transaction
      .update(studyPlanItems)
      .set(
        correct
          ? { status: "completed", completedAt: now }
          : {
              taskType: "relearning",
              estimatedMinutes: item.kind === "grammar" ? 4 : 2,
              status: "pending",
              completedAt: null,
            },
      )
      .where(
        and(
          eq(studyPlanItems.knowledgePointId, knowledgePointId),
          eq(studyPlanItems.taskType, "review"),
          eq(studyPlanItems.status, "pending"),
        ),
      );

    return {
      correct,
      stage: nextState.stage,
      dueAt: nextState.dueAt.toISOString(),
      correctAnswer: getCorrectReviewAnswer(item),
    };
  });
}

async function readDailyPlan(planId: number): Promise<DailyPlan> {
  const db = getDatabase();
  const [plan] = await db
    .select()
    .from(studyPlans)
    .where(eq(studyPlans.id, planId))
    .limit(1);
  if (!plan) {
    throw new Error("STUDY_PLAN_NOT_FOUND");
  }

  const rows = await db
    .select()
    .from(studyPlanItems)
    .where(eq(studyPlanItems.planId, plan.id))
    .orderBy(asc(studyPlanItems.position));
  const tasks = rows.flatMap((row): DailyPlanTask[] => {
    const item = findKnowledgePoint(row.knowledgePointId);
    if (!item) return [];
    return [
      {
        id: row.id,
        knowledgePointId: row.knowledgePointId,
        taskType: row.taskType,
        kind: row.kind,
        estimatedMinutes: row.estimatedMinutes,
        status: row.status,
        item,
        question: createReviewQuestion(item),
      },
    ];
  });

  return {
    id: plan.id,
    planDate: plan.planDate,
    dailyMinutes: plan.dailyMinutes,
    estimatedMinutes: tasks.reduce(
      (sum, task) => sum + task.estimatedMinutes,
      0,
    ),
    completedCount: tasks.filter((task) => task.status === "completed").length,
    tasks,
  };
}

export async function getDailyPlan(planDate: string) {
  const db = getDatabase();
  const [plan] = await db
    .select({ id: studyPlans.id })
    .from(studyPlans)
    .where(
      and(
        eq(studyPlans.userId, LOCAL_USER_ID),
        eq(studyPlans.planDate, planDate),
      ),
    )
    .limit(1);
  return plan ? readDailyPlan(plan.id) : null;
}

export async function createDailyPlan(
  settings: DailyPlanSettings,
  now = new Date(),
) {
  const existing = await getDailyPlan(settings.planDate);
  if (existing) return existing;

  const db = getDatabase();
  const planId = await db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`daily-plan:${LOCAL_USER_ID}:${settings.planDate}`}))`,
    );
    const [concurrentPlan] = await transaction
      .select({ id: studyPlans.id })
      .from(studyPlans)
      .where(
        and(
          eq(studyPlans.userId, LOCAL_USER_ID),
          eq(studyPlans.planDate, settings.planDate),
        ),
      )
      .limit(1);
    if (concurrentPlan) return concurrentPlan.id;

    await transaction
      .insert(users)
      .values({ id: LOCAL_USER_ID })
      .onConflictDoNothing();

    const states = await transaction
      .select()
      .from(reviewStates)
      .where(eq(reviewStates.userId, LOCAL_USER_ID))
      .orderBy(asc(reviewStates.dueAt));
    const knownIds = new Set(states.map((state) => state.knowledgePointId));
    const due = states
      .filter((state) => state.stage !== "learning" && state.dueAt <= now)
      .flatMap((state) => {
        const item = findKnowledgePoint(state.knowledgePointId);
        return item
          ? [{ knowledgePointId: item.id, kind: item.kind }]
          : [];
      });
    const relearning = states
      .filter((state) => state.stage === "learning")
      .flatMap((state) => {
        const item = findKnowledgePoint(state.knowledgePointId);
        return item
          ? [{ knowledgePointId: item.id, kind: item.kind }]
          : [];
      });
    const available = knowledgePoints.filter((item) => !knownIds.has(item.id));
    const tasks = buildStudyPlan({
      dailyMinutes: settings.dailyMinutes,
      grammarLimit: settings.grammarLimit,
      vocabularyLimit: settings.vocabularyLimit,
      due,
      relearning,
      newGrammar: available
        .filter((item) => item.kind === "grammar")
        .map((item) => ({ knowledgePointId: item.id, kind: item.kind })),
      newVocabulary: available
        .filter((item) => item.kind === "vocabulary")
        .map((item) => ({ knowledgePointId: item.id, kind: item.kind })),
    });

    for (const task of tasks) {
      const item = findKnowledgePoint(task.knowledgePointId);
      if (!item) continue;
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
    }

    const [plan] = await transaction
      .insert(studyPlans)
      .values({
        userId: LOCAL_USER_ID,
        planDate: settings.planDate,
        timezoneOffset: settings.timezoneOffset,
        dailyMinutes: settings.dailyMinutes,
        grammarLimit: settings.grammarLimit,
        vocabularyLimit: settings.vocabularyLimit,
      })
      .returning({ id: studyPlans.id });
    if (tasks.length > 0) {
      await transaction.insert(studyPlanItems).values(
        tasks.map((task, position) => ({
          planId: plan.id,
          knowledgePointId: task.knowledgePointId,
          taskType: task.taskType,
          kind: task.kind,
          position,
          estimatedMinutes: task.estimatedMinutes,
          status: "pending" as const,
        })),
      );
    }
    return plan.id;
  });

  return readDailyPlan(planId);
}

export async function submitInitialLearning(
  planItemId: number,
  answer: string,
  now = new Date(),
) {
  const db = getDatabase();
  return db.transaction(async (transaction) => {
    const [row] = await transaction
      .select({
        planItem: studyPlanItems,
        planUserId: studyPlans.userId,
      })
      .from(studyPlanItems)
      .innerJoin(studyPlans, eq(studyPlanItems.planId, studyPlans.id))
      .where(eq(studyPlanItems.id, planItemId))
      .limit(1);
    if (
      !row ||
      row.planUserId !== LOCAL_USER_ID ||
      row.planItem.taskType !== "new" ||
      row.planItem.status !== "pending"
    ) {
      throw new Error("STUDY_TASK_NOT_AVAILABLE");
    }
    const [pendingPriority] = await transaction
      .select({ id: studyPlanItems.id })
      .from(studyPlanItems)
      .where(
        and(
          eq(studyPlanItems.planId, row.planItem.planId),
          eq(studyPlanItems.status, "pending"),
          ne(studyPlanItems.taskType, "new"),
        ),
      )
      .limit(1);
    if (pendingPriority) {
      throw new Error("PRIORITY_TASKS_PENDING");
    }

    const item = findKnowledgePoint(row.planItem.knowledgePointId);
    if (!item) throw new Error("UNKNOWN_KNOWLEDGE_POINT");
    const correct = answer === getCorrectReviewAnswer(item);
    await transaction.insert(attempts).values({
      userId: LOCAL_USER_ID,
      knowledgePointId: item.id,
      exerciseType: "initial_meaning_choice",
      answer,
      correct,
      createdAt: now,
    });

    if (!correct) {
      return { correct: false, correctAnswer: getCorrectReviewAnswer(item) };
    }

    const nextState = scheduleLearnedItem(now);
    await transaction.insert(reviewStates).values({
      userId: LOCAL_USER_ID,
      knowledgePointId: item.id,
      ...nextState,
      updatedAt: now,
    });
    await transaction.insert(reviewLogs).values({
      userId: LOCAL_USER_ID,
      knowledgePointId: item.id,
      eventType: "learning_completed",
      previousState: null,
      nextState,
      createdAt: now,
    });
    await transaction
      .update(studyPlanItems)
      .set({ status: "completed", completedAt: now })
      .where(eq(studyPlanItems.id, planItemId));

    return {
      correct: true,
      dueAt: nextState.dueAt.toISOString(),
      state: { knowledgePointId: item.id, ...nextState },
    };
  });
}
