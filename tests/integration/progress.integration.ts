import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import {
  createTestDatabase,
  dropTestDatabase,
  resetTestDatabase,
  testDatabaseUrl,
} from "../support/test-database";

const baseDatabaseUrl = process.env.DATABASE_URL;
const schemaName = `hibi_test_integration_${randomUUID().replaceAll("-", "")}`;

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function localDate(timezoneOffset: number) {
  return new Date(Date.now() - timezoneOffset * 60_000)
    .toISOString()
    .slice(0, 10);
}

describe("progress API with PostgreSQL", () => {
  beforeAll(async () => {
    if (!baseDatabaseUrl) {
      throw new Error("缺少 DATABASE_URL，无法运行 PostgreSQL 集成测试。");
    }
    await createTestDatabase(baseDatabaseUrl, schemaName);
    process.env.DATABASE_URL = testDatabaseUrl(baseDatabaseUrl, schemaName);
    process.env.HIBI_ALLOW_UNAUTHENTICATED = "true";
  });

  afterAll(async () => {
    if (!baseDatabaseUrl) return;
    const { closeDatabase } = await import("@/db/client");
    await closeDatabase();
    process.env.DATABASE_URL = baseDatabaseUrl;
    await dropTestDatabase(baseDatabaseUrl, schemaName);
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await resetTestDatabase(process.env.DATABASE_URL);
  });

  it("imports a checksummed JMdict snapshot idempotently", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "hibi-content-test-"));
    const source = {
      id: "edrdg-jmdict-test",
      name: "JMdict test fixture",
      homepageUrl: "https://example.invalid/jmdict",
      downloadUrl: "https://example.invalid/JMdict.gz",
      fileName: "JMdict.gz",
      recordTag: "entry",
      licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      attributionText: "JMdict test attribution",
      updateFrequency: "monthly",
    };
    const fixture = gzipSync(`<?xml version="1.0"?>
      <!DOCTYPE JMdict [<!ENTITY n "noun (common) (futsuumeishi)">]>
      <JMdict><entry><ent_seq>1000010</ent_seq>
      <k_ele><keb>明日</keb><ke_pri>ichi1</ke_pri></k_ele>
      <r_ele><reb>あした</reb><re_pri>ichi1</re_pri></r_ele>
      <sense><pos>&n;</pos><gloss>tomorrow</gloss></sense>
      </entry></JMdict>`);
    const checksumSha256 = createHash("sha256").update(fixture).digest("hex");
    await writeFile(path.join(directory, source.fileName), fixture);
    await writeFile(
      path.join(directory, `${source.fileName}.metadata.json`),
      JSON.stringify({
        sourceId: source.id,
        sourceUrl: source.downloadUrl,
        downloadedAt: "2026-08-03T00:00:00.000Z",
        etag: null,
        lastModified: "Sun, 03 Aug 2026 00:00:00 GMT",
        contentLength: String(fixture.length),
        checksumSha256,
      }),
    );

    try {
      const { importSource } = await import("../../scripts/content-sync.mjs");
      await importSource("jmdict", source, directory, 1);
      await importSource("jmdict", source, directory, 1);

      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      const entries = await client.query(
        `select primary_kanji, primary_reading, payload
           from dictionary_entries where source_id = $1`,
        [source.id],
      );
      const imports = await client.query(
        `select status, record_count from content_imports
          where source_id = $1 order by id`,
        [source.id],
      );
      await client.end();

      expect(entries.rows).toHaveLength(1);
      expect(entries.rows[0]).toMatchObject({
        primary_kanji: "明日",
        primary_reading: "あした",
      });
      expect(entries.rows[0].payload.senses[0].partsOfSpeech).toEqual([
        "noun (common) (futsuumeishi)",
      ]);
      expect(imports.rows).toEqual([
        { status: "completed", record_count: 1 },
        { status: "completed", record_count: 1 },
      ]);

      const sourceRoute = await import("@/app/api/content/sources/route");
      const response = await sourceRoute.GET(
        new Request("http://hibi.test/api/content/sources"),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        sources: [
          {
            id: source.id,
            licenseName: source.licenseName,
            latestImport: { status: "completed", recordCount: 1 },
          },
        ],
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("persists pass, fail, relearning, attempts, and review logs", async () => {
    const masteryRoute = await import("@/app/api/progress/mastery/route");
    const reviewRoute = await import("@/app/api/reviews/route");
    const learningRoute = await import("@/app/api/progress/learning/route");
    const progressRoute = await import("@/app/api/progress/route");

    for (const knowledgePointId of ["g-001", "v-001"]) {
      const response = await masteryRoute.POST(
        jsonRequest("http://hibi.test/api/progress/mastery", {
          knowledgePointId,
        }),
      );
      expect(response.status).toBe(200);
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(
      "UPDATE review_states SET due_at = now() - interval '1 minute'",
    );
    await client.end();

    const failed = await reviewRoute.POST(
      jsonRequest("http://hibi.test/api/reviews", {
        knowledgePointId: "g-001",
        answer: "不正确的答案",
      }),
    );
    expect(failed.status).toBe(200);
    await expect(failed.json()).resolves.toMatchObject({
      correct: false,
      stage: "learning",
    });

    const passed = await reviewRoute.POST(
      jsonRequest("http://hibi.test/api/reviews", {
        knowledgePointId: "v-001",
        answer: "我",
      }),
    );
    expect(passed.status).toBe(200);
    await expect(passed.json()).resolves.toMatchObject({
      correct: true,
      stage: "review",
    });

    const learned = await learningRoute.POST(
      jsonRequest("http://hibi.test/api/progress/learning", {
        knowledgePointId: "g-001",
      }),
    );
    expect(learned.status).toBe(200);
    await expect(learned.json()).resolves.toMatchObject({
      state: { knowledgePointId: "g-001", stage: "review" },
    });

    const progress = await progressRoute.GET(
      new Request("http://hibi.test/api/progress"),
    );
    const progressBody = (await progress.json()) as {
      states: Array<{ knowledgePointId: string; stage: string }>;
    };
    expect(progressBody.states).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ knowledgePointId: "g-001", stage: "review" }),
        expect.objectContaining({ knowledgePointId: "v-001", stage: "review" }),
      ]),
    );

    const audit = new Client({ connectionString: process.env.DATABASE_URL });
    await audit.connect();
    const attempts = await audit.query("SELECT correct FROM attempts");
    const logs = await audit.query(
      "SELECT event_type FROM review_logs ORDER BY id",
    );
    await audit.end();

    expect(attempts.rows.map((row) => row.correct)).toEqual([false, true]);
    expect(logs.rows.map((row) => row.event_type)).toEqual([
      "mastery_declared",
      "mastery_declared",
      "reviewed",
      "reviewed",
      "learning_completed",
    ]);
  });

  it("creates a review-first daily plan and completes initial learning", async () => {
    const masteryRoute = await import("@/app/api/progress/mastery/route");
    const planRoute = await import("@/app/api/study-plan/route");
    const studyRoute = await import("@/app/api/progress/study/route");
    const reviewRoute = await import("@/app/api/reviews/route");
    const learningRoute = await import("@/app/api/progress/learning/route");

    const mastered = await masteryRoute.POST(
      jsonRequest("http://hibi.test/api/progress/mastery", {
        knowledgePointId: "g-001",
      }),
    );
    expect(mastered.status).toBe(200);

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(
      "UPDATE review_states SET due_at = now() - interval '1 minute'",
    );
    await client.end();

    const planRequest = () =>
      planRoute.POST(
        jsonRequest("http://hibi.test/api/study-plan", {
        planDate: localDate(-480),
        timezoneOffset: -480,
        dailyMinutes: 5,
        grammarLimit: 10,
        vocabularyLimit: 50,
        }),
      );
    const [planned, concurrent] = await Promise.all([
      planRequest(),
      planRequest(),
    ]);
    expect(planned.status).toBe(200);
    expect(concurrent.status).toBe(200);
    const plannedBody = (await planned.json()) as {
      plan: {
        id: number;
        estimatedMinutes: number;
        tasks: Array<{
          id: number;
          knowledgePointId: string;
          taskType: string;
        }>;
      };
    };
    const concurrentBody = (await concurrent.json()) as {
      plan: { id: number };
    };
    expect(concurrentBody.plan.id).toBe(plannedBody.plan.id);
    expect(plannedBody.plan.estimatedMinutes).toBe(4);
    expect(plannedBody.plan.tasks[0]).toMatchObject({
      knowledgePointId: "g-001",
      taskType: "review",
    });
    const newTask = plannedBody.plan.tasks.find(
      (task) => task.taskType === "new",
    );
    expect(newTask).toMatchObject({ knowledgePointId: "v-001" });
    if (!newTask) throw new Error("计划中缺少新内容任务。");

    const blockedByReview = await studyRoute.POST(
      jsonRequest("http://hibi.test/api/progress/study", {
        planItemId: newTask.id,
        answer: "我",
      }),
    );
    expect(blockedByReview.status).toBe(409);

    const failedReview = await reviewRoute.POST(
      jsonRequest("http://hibi.test/api/reviews", {
        knowledgePointId: "g-001",
        answer: "错误答案",
      }),
    );
    await expect(failedReview.json()).resolves.toMatchObject({
      correct: false,
      stage: "learning",
    });

    const blockedByRelearning = await studyRoute.POST(
      jsonRequest("http://hibi.test/api/progress/study", {
        planItemId: newTask.id,
        answer: "我",
      }),
    );
    expect(blockedByRelearning.status).toBe(409);

    const relearned = await learningRoute.POST(
      jsonRequest("http://hibi.test/api/progress/learning", {
        knowledgePointId: "g-001",
      }),
    );
    expect(relearned.status).toBe(200);

    const incorrect = await studyRoute.POST(
      jsonRequest("http://hibi.test/api/progress/study", {
        planItemId: newTask.id,
        answer: "错误答案",
      }),
    );
    await expect(incorrect.json()).resolves.toMatchObject({ correct: false });

    const correct = await studyRoute.POST(
      jsonRequest("http://hibi.test/api/progress/study", {
        planItemId: newTask.id,
        answer: "我",
      }),
    );
    expect(correct.status).toBe(200);
    await expect(correct.json()).resolves.toMatchObject({
      correct: true,
      state: { knowledgePointId: "v-001", stage: "review" },
    });

    const reloaded = await planRoute.GET(
      new Request(
        `http://hibi.test/api/study-plan?date=${localDate(-480)}`,
      ),
    );
    const reloadedBody = (await reloaded.json()) as {
      plan: { completedCount: number };
    };
    expect(reloadedBody.plan.completedCount).toBe(2);

    const audit = new Client({ connectionString: process.env.DATABASE_URL });
    await audit.connect();
    const attempts = await audit.query(
      "SELECT correct FROM attempts WHERE knowledge_point_id = 'v-001' ORDER BY id",
    );
    const state = await audit.query(
      "SELECT stage, due_at FROM review_states WHERE knowledge_point_id = 'v-001'",
    );
    await audit.end();
    expect(attempts.rows.map((row) => row.correct)).toEqual([false, true]);
    expect(state.rows[0].stage).toBe("review");
    expect(new Date(state.rows[0].due_at).getTime()).toBeGreaterThan(Date.now());
  });
});
