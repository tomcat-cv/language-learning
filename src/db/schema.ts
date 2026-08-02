import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { ReviewSchedule, ReviewStage } from "@/domain/review";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const knowledgePoints = pgTable("knowledge_points", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().$type<"grammar" | "vocabulary">(),
  level: text("level").notNull(),
  contentVersion: integer("content_version").notNull().default(1),
});

export const masteryDeclarations = pgTable(
  "mastery_declarations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    knowledgePointId: text("knowledge_point_id")
      .notNull()
      .references(() => knowledgePoints.id),
    declaredAt: timestamp("declared_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("mastery_declarations_user_knowledge_idx").on(
      table.userId,
      table.knowledgePointId,
    ),
  ],
);

export const reviewStates = pgTable(
  "review_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    knowledgePointId: text("knowledge_point_id")
      .notNull()
      .references(() => knowledgePoints.id),
    stage: text("stage").notNull().$type<ReviewStage>(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    intervalDays: integer("interval_days").notNull(),
    consecutiveSuccesses: integer("consecutive_successes").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.knowledgePointId] }),
    index("review_states_due_idx").on(table.userId, table.stage, table.dueAt),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    knowledgePointId: text("knowledge_point_id")
      .notNull()
      .references(() => knowledgePoints.id),
    exerciseType: text("exercise_type").notNull(),
    answer: text("answer").notNull(),
    correct: boolean("correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("attempts_user_knowledge_idx").on(
      table.userId,
      table.knowledgePointId,
    ),
  ],
);

export const studyPlans = pgTable(
  "study_plans",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    planDate: text("plan_date").notNull(),
    timezoneOffset: integer("timezone_offset").notNull(),
    dailyMinutes: integer("daily_minutes").notNull(),
    grammarLimit: integer("grammar_limit").notNull(),
    vocabularyLimit: integer("vocabulary_limit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("study_plans_user_date_idx").on(table.userId, table.planDate),
  ],
);

export const studyPlanItems = pgTable(
  "study_plan_items",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => studyPlans.id),
    knowledgePointId: text("knowledge_point_id")
      .notNull()
      .references(() => knowledgePoints.id),
    taskType: text("task_type")
      .notNull()
      .$type<"review" | "relearning" | "new">(),
    kind: text("kind").notNull().$type<"grammar" | "vocabulary">(),
    position: integer("position").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    status: text("status").notNull().$type<"pending" | "completed">(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("study_plan_items_plan_knowledge_idx").on(
      table.planId,
      table.knowledgePointId,
    ),
    index("study_plan_items_plan_status_idx").on(table.planId, table.status),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    knowledgePointId: text("knowledge_point_id")
      .notNull()
      .references(() => knowledgePoints.id),
    eventType: text("event_type")
      .notNull()
      .$type<"mastery_declared" | "learning_completed" | "reviewed">(),
    previousState: jsonb("previous_state").$type<ReviewSchedule | null>(),
    nextState: jsonb("next_state").notNull().$type<ReviewSchedule>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("review_logs_user_knowledge_idx").on(
      table.userId,
      table.knowledgePointId,
    ),
  ],
);
