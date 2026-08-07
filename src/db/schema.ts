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

export type ContentImportStatus = "running" | "completed" | "failed";

export type JmdictPayload = {
  sequence: string;
  kanji: Array<{ text: string; info: string[]; priority: string[] }>;
  readings: Array<{
    text: string;
    noKanji: boolean;
    restrictions: string[];
    info: string[];
    priority: string[];
  }>;
  senses: Array<{
    restrictedKanji: string[];
    restrictedReadings: string[];
    partsOfSpeech: string[];
    crossReferences: string[];
    antonyms: string[];
    fields: string[];
    misc: string[];
    dialects: string[];
    information: string[];
    glosses: Array<{ language: string; type: string | null; text: string }>;
  }>;
};

export type KanjidicPayload = {
  literal: string;
  codepoints: Array<{ type: string | null; value: string }>;
  radicals: Array<{ type: string | null; value: string }>;
  misc: {
    grade: number | null;
    strokeCounts: number[];
    variants: Array<{ type: string | null; value: string }>;
    frequency: number | null;
    radicalNames: string[];
    jlptLegacy: number | null;
  };
  dictionaryReferences: Array<{
    type: string | null;
    volume: string | null;
    page: string | null;
    value: string;
  }>;
  queryCodes: Array<{
    type: string | null;
    skipMisclassification: string | null;
    value: string;
  }>;
  readingMeaningGroups: Array<{
    readings: Array<{
      type: string | null;
      status: string | null;
      restrictions: string[];
      value: string;
    }>;
    meanings: Array<{ language: string; value: string }>;
    additionalTypes: string[];
  }>;
  nanori: string[];
};

export const contentSources = pgTable("content_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  homepageUrl: text("homepage_url").notNull(),
  downloadUrl: text("download_url").notNull(),
  licenseName: text("license_name").notNull(),
  licenseUrl: text("license_url").notNull(),
  attributionText: text("attribution_text").notNull(),
  updateFrequency: text("update_frequency").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contentImports = pgTable(
  "content_imports",
  {
    id: serial("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => contentSources.id),
    sourceVersion: text("source_version").notNull(),
    sourceUrl: text("source_url").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    status: text("status").notNull().$type<ContentImportStatus>(),
    recordCount: integer("record_count").notNull().default(0),
    errorSummary: text("error_summary"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("content_imports_source_started_idx").on(table.sourceId, table.startedAt)],
);

export const dictionaryEntries = pgTable(
  "dictionary_entries",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => contentSources.id),
    sourceEntryId: text("source_entry_id").notNull(),
    primaryKanji: text("primary_kanji"),
    primaryReading: text("primary_reading").notNull(),
    isCommon: boolean("is_common").notNull().default(false),
    active: boolean("active").notNull().default(true),
    payload: jsonb("payload").notNull().$type<JmdictPayload>(),
    lastImportId: integer("last_import_id")
      .notNull()
      .references(() => contentImports.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("dictionary_entries_source_entry_idx").on(
      table.sourceId,
      table.sourceEntryId,
    ),
    index("dictionary_entries_primary_kanji_idx").on(table.primaryKanji),
    index("dictionary_entries_primary_reading_idx").on(table.primaryReading),
  ],
);

export const kanjiEntries = pgTable(
  "kanji_entries",
  {
    literal: text("literal").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => contentSources.id),
    strokeCount: integer("stroke_count"),
    grade: integer("grade"),
    frequency: integer("frequency"),
    jlptLegacy: integer("jlpt_legacy"),
    active: boolean("active").notNull().default(true),
    payload: jsonb("payload").notNull().$type<KanjidicPayload>(),
    lastImportId: integer("last_import_id")
      .notNull()
      .references(() => contentImports.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("kanji_entries_grade_idx").on(table.grade),
    index("kanji_entries_frequency_idx").on(table.frequency),
  ],
);

export const curriculumMappings = pgTable(
  "curriculum_mappings",
  {
    id: serial("id").primaryKey(),
    curriculumVersion: text("curriculum_version").notNull(),
    level: text("level").notNull().$type<"N5" | "N4" | "N3" | "N2" | "N1">(),
    kind: text("kind").notNull().$type<"vocabulary" | "kanji">(),
    dictionaryEntryId: text("dictionary_entry_id").references(
      () => dictionaryEntries.id,
    ),
    kanjiLiteral: text("kanji_literal").references(() => kanjiEntries.literal),
    rationale: text("rationale").notNull(),
    reviewStatus: text("review_status")
      .notNull()
      .$type<"draft" | "reviewed" | "published">()
      .default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("curriculum_mappings_level_kind_idx").on(table.level, table.kind),
    uniqueIndex("curriculum_mappings_dictionary_version_idx").on(
      table.curriculumVersion,
      table.dictionaryEntryId,
    ),
    uniqueIndex("curriculum_mappings_kanji_version_idx").on(
      table.curriculumVersion,
      table.kanjiLiteral,
    ),
  ],
);

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
