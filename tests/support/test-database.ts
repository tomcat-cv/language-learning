import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const TABLES = [
  "attempts",
  "study_plan_items",
  "study_plans",
  "review_logs",
  "mastery_declarations",
  "review_states",
  "knowledge_points",
  "users",
];

function assertSchemaName(schemaName: string) {
  if (!/^hibi_test_[a-z0-9_]+$/.test(schemaName)) {
    throw new Error(`不安全的测试 schema 名称：${schemaName}`);
  }
}

export function testDatabaseUrl(
  connectionString: string,
  schemaName: string,
) {
  assertSchemaName(schemaName);
  const url = new URL(connectionString);
  url.searchParams.set("options", `-c search_path=${schemaName}`);
  return url.toString();
}

export async function createTestDatabase(
  connectionString: string,
  schemaName: string,
) {
  assertSchemaName(schemaName);
  const admin = new Client({ connectionString });
  await admin.connect();
  try {
    await admin.query(`CREATE SCHEMA "${schemaName}"`);
  } finally {
    await admin.end();
  }

  const migrationDirectory = path.join(process.cwd(), "drizzle");
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const client = new Client({
    connectionString: testDatabaseUrl(connectionString, schemaName),
  });
  await client.connect();
  try {
    for (const migrationFile of migrationFiles) {
      const migration = (
        await readFile(path.join(migrationDirectory, migrationFile), "utf8")
      ).replaceAll('"public".', `"${schemaName}".`);
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }
    }
  } catch (error) {
    await client.end();
    await dropTestDatabase(connectionString, schemaName);
    throw error;
  }
  await client.end();
}

export async function resetTestDatabase(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `TRUNCATE ${TABLES.map((table) => `"${table}"`).join(", ")}
       RESTART IDENTITY CASCADE`,
    );
  } finally {
    await client.end();
  }
}

export async function dropTestDatabase(
  connectionString: string,
  schemaName: string,
) {
  assertSchemaName(schemaName);
  const admin = new Client({ connectionString });
  await admin.connect();
  try {
    await admin.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    await admin.end();
  }
}
