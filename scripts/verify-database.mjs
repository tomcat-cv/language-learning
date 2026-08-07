import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("缺少 DATABASE_URL，无法验证数据库。");
  process.exit(1);
}

const requiredTables = [
  "content_sources",
  "content_imports",
  "dictionary_entries",
  "kanji_entries",
  "curriculum_mappings",
  "users",
  "knowledge_points",
  "mastery_declarations",
  "review_states",
  "attempts",
  "review_logs",
  "study_plans",
  "study_plan_items",
];
const verificationId = `__hibi_verify_${process.pid}`;
const client = new Client({ connectionString });

try {
  await client.connect();

  const tableResult = await client.query(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])`,
    [requiredTables],
  );
  const existingTables = new Set(
    tableResult.rows.map((row) => row.table_name),
  );
  const missingTables = requiredTables.filter(
    (table) => !existingTables.has(table),
  );
  if (missingTables.length > 0) {
    throw new Error(`缺少数据表：${missingTables.join(", ")}`);
  }

  await client.query("begin");
  await client.query(
    `insert into content_sources
       (id, name, homepage_url, download_url, license_name, license_url,
        attribution_text, update_frequency)
     values ('__verify_source', 'verify', 'https://example.invalid',
             'https://example.invalid/data', 'verify',
             'https://example.invalid/license', 'verify', 'manual')`,
  );
  const imported = await client.query(
    `insert into content_imports
       (source_id, source_version, source_url, checksum_sha256, status)
     values ('__verify_source', 'verify', 'https://example.invalid/data',
             'verify', 'completed') returning id`,
  );
  const importId = imported.rows[0].id;
  await client.query(
    `insert into dictionary_entries
       (id, source_id, source_entry_id, primary_kanji, primary_reading,
        payload, last_import_id)
     values ('__verify_dictionary', '__verify_source', 'verify', '日', 'ひ',
             $1::jsonb, $2)`,
    [JSON.stringify({ sequence: "verify", kanji: [], readings: [], senses: [] }), importId],
  );
  await client.query(
    `insert into kanji_entries
       (literal, source_id, stroke_count, payload, last_import_id)
     values ('々', '__verify_source', 3, $1::jsonb, $2)`,
    [
      JSON.stringify({
        literal: "々",
        codepoints: [],
        radicals: [],
        misc: {
          grade: null,
          strokeCounts: [3],
          variants: [],
          frequency: null,
          radicalNames: [],
          jlptLegacy: null,
        },
        dictionaryReferences: [],
        queryCodes: [],
        readingMeaningGroups: [],
        nanori: [],
      }),
      importId,
    ],
  );
  await client.query(
    `insert into curriculum_mappings
       (curriculum_version, level, kind, dictionary_entry_id, rationale)
     values ('verify', 'N5', 'vocabulary', '__verify_dictionary', 'verify')`,
  );
  await client.query("insert into users (id) values ($1)", [verificationId]);
  await client.query(
    `insert into knowledge_points (id, kind, level, content_version)
     values ($1, 'grammar', 'N5', 1)`,
    [verificationId],
  );
  await client.query(
    `insert into mastery_declarations (user_id, knowledge_point_id)
     values ($1, $1)`,
    [verificationId],
  );
  await client.query(
    `insert into review_states
       (user_id, knowledge_point_id, stage, due_at, interval_days, consecutive_successes)
     values ($1, $1, 'self_declared', now(), 1, 0)`,
    [verificationId],
  );
  await client.query(
    `insert into attempts
       (user_id, knowledge_point_id, exercise_type, answer, correct)
     values ($1, $1, 'deployment_check', 'ok', true)`,
    [verificationId],
  );
  await client.query(
    `insert into study_plans
       (user_id, plan_date, timezone_offset, daily_minutes, grammar_limit, vocabulary_limit)
     values ($1, '2099-01-01', -480, 30, 10, 50)`,
    [verificationId],
  );
  await client.query(
    `insert into study_plan_items
       (plan_id, knowledge_point_id, task_type, kind, position, estimated_minutes, status)
     select id, $1, 'new', 'grammar', 0, 4, 'pending'
       from study_plans where user_id = $1`,
    [verificationId],
  );
  await client.query(
    `insert into review_logs
       (user_id, knowledge_point_id, event_type, previous_state, next_state)
     values ($1, $1, 'mastery_declared', null, $2::jsonb)`,
    [
      verificationId,
      JSON.stringify({
        stage: "self_declared",
        dueAt: new Date().toISOString(),
        intervalDays: 1,
        consecutiveSuccesses: 0,
      }),
    ],
  );
  await client.query("rollback");

  console.log("数据库迁移与事务写入验证通过；验证数据已回滚。");
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // The transaction may not have started.
  }
  console.error(
    error instanceof Error ? error.message : "数据库验证失败。",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
