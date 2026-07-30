import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import {
  createTestDatabase,
  dropTestDatabase,
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
});
