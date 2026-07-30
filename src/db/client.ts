import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDatabase = globalThis as typeof globalThis & {
  hibiPostgresPool?: Pool;
};

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("未配置 DATABASE_URL，学习进度暂时无法保存。");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new DatabaseNotConfiguredError();
  }

  const pool =
    globalForDatabase.hibiPostgresPool ??
    new Pool({
      connectionString,
      max: process.env.NODE_ENV === "production" ? 10 : 3,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDatabase.hibiPostgresPool = pool;
  }

  return drizzle({ client: pool, schema });
}

export async function closeDatabase() {
  const pool = globalForDatabase.hibiPostgresPool;
  if (!pool) {
    return;
  }

  delete globalForDatabase.hibiPostgresPool;
  await pool.end();
}
