import { loadEnvConfig } from "@next/env";
import {
  createTestDatabase,
  dropTestDatabase,
  testDatabaseUrl,
} from "../support/test-database";

loadEnvConfig(process.cwd(), true);

export const baseDatabaseUrl = process.env.DATABASE_URL;
export const e2eSchemaName = "hibi_test_e2e";

export const e2eDatabaseUrl = baseDatabaseUrl
  ? testDatabaseUrl(baseDatabaseUrl, e2eSchemaName)
  : undefined;

export async function prepareE2eDatabase() {
  if (!baseDatabaseUrl) {
    throw new Error("缺少 DATABASE_URL，无法运行浏览器端到端测试。");
  }
  await dropTestDatabase(baseDatabaseUrl, e2eSchemaName);
  await createTestDatabase(baseDatabaseUrl, e2eSchemaName);
}

export async function removeE2eDatabase() {
  if (!baseDatabaseUrl) return;
  await dropTestDatabase(baseDatabaseUrl, e2eSchemaName);
}
