import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const envPath = resolve(".env.local");

if (existsSync(envPath)) {
  console.error(".env.local 已存在，拒绝覆盖现有运行配置。");
  process.exit(1);
}

function postgresQuery(sql) {
  const result = spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "--quiet", "-At"],
    {
      encoding: "utf8",
      input: sql,
    },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "PostgreSQL 命令执行失败。");
  }
  return result.stdout.trim();
}

const roleExists = postgresQuery(
  "select 1 from pg_roles where rolname = 'hibi';",
);
const databaseExists = postgresQuery(
  "select 1 from pg_database where datname = 'hibi';",
);

if (roleExists || databaseExists) {
  console.error("hibi 角色或数据库已经存在，拒绝修改未知的现有实例。");
  process.exit(1);
}

const password = randomBytes(32).toString("hex");

try {
  postgresQuery(`
    create role hibi
      login
      password '${password}'
      nosuperuser
      nocreatedb
      nocreaterole;
    create database hibi
      owner hibi
      encoding 'UTF8'
      template template0;
  `);

  await writeFile(
    envPath,
    `DATABASE_URL=postgresql://hibi:${password}@127.0.0.1:5432/hibi\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  console.log("hibi 数据库、受限角色和 .env.local 已创建。");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "本地数据库初始化失败。",
  );
  process.exitCode = 1;
}
