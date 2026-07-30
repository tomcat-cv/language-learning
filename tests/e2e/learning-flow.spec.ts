import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { e2eDatabaseUrl } from "./database";
import { resetTestDatabase } from "../support/test-database";

test.beforeEach(async () => {
  if (!e2eDatabaseUrl) {
    throw new Error("缺少端到端测试数据库地址。");
  }
  await resetTestDatabase(e2eDatabaseUrl);
});

test("self-declared mastery returns to review after failed verification", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/grammar");
  const progressResponse = await page.request.get("/api/progress");
  expect(progressResponse.ok(), await progressResponse.text()).toBe(true);

  const grammarCard = page.locator("article", { hasText: "～は～です" });
  const [masteryResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/progress/mastery") &&
        response.request().method() === "POST",
    ),
    grammarCard
      .getByRole("button", { name: "我已掌握，跳过学习" })
      .click(),
  ]);
  expect(masteryResponse.ok(), await masteryResponse.text()).toBe(true);
  await expect(grammarCard.getByText("已跳过首次教学")).toBeVisible();

  const client = new Client({ connectionString: e2eDatabaseUrl });
  await client.connect();
  await client.query(
    "UPDATE review_states SET due_at = now() - interval '1 minute'",
  );
  await client.end();

  await page.goto("/review");
  await expect(page.getByText("首次掌握验证")).toBeVisible();
  await page.getByRole("button", { name: "……不是……" }).click();
  await expect(page.getByText("这次未通过", { exact: false })).toBeVisible();

  await page.goto("/grammar");
  await expect(grammarCard.getByText("短测未通过，已回到学习")).toBeVisible();
  await grammarCard.getByRole("button", {
    name: "我已重新学习，安排复习",
  }).click();
  await expect(grammarCard.getByText("已进入复习")).toBeVisible();
});

test("primary navigation and content fit the current viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "今天，也向前一点。" })).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
});
