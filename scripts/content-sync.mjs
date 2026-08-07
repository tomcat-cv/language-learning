import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import pg from "pg";
import {
  parseEntityDeclarations,
  parseJmdictEntry,
  parseKanjidicCharacter,
  readGzipPrefix,
  streamGzipRecords,
} from "./content/xml-parsers.mjs";

const { Client } = pg;
const DEFAULT_DATA_DIRECTORY = path.join(process.cwd(), ".cache", "hibi-content");
const SOURCE_FILE = path.join(process.cwd(), "content", "sources.json");
const BATCH_SIZE = 250;

function parseArguments(argv) {
  const [command, requestedSource = "all", ...options] = argv;
  const parsed = {
    command,
    requestedSource,
    dataDirectory: DEFAULT_DATA_DIRECTORY,
    limit: null,
  };
  for (let index = 0; index < options.length; index += 1) {
    if (options[index] === "--data-dir") {
      parsed.dataDirectory = path.resolve(options[index + 1] ?? "");
      index += 1;
    } else if (options[index] === "--limit") {
      const limit = Number.parseInt(options[index + 1] ?? "", 10);
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("--limit 必须是正整数。");
      }
      parsed.limit = limit;
      index += 1;
    } else {
      throw new Error(`未知参数：${options[index]}`);
    }
  }
  return parsed;
}

async function loadSources() {
  return JSON.parse(await readFile(SOURCE_FILE, "utf8"));
}

function selectSources(sources, requestedSource) {
  if (requestedSource === "all") return Object.entries(sources);
  const source = sources[requestedSource];
  if (!source) {
    throw new Error(`未知数据源：${requestedSource}。可用值：all, ${Object.keys(sources).join(", ")}`);
  }
  return [[requestedSource, source]];
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function downloadSource(sourceKey, source, dataDirectory) {
  await mkdir(dataDirectory, { recursive: true });
  const destination = path.join(dataDirectory, source.fileName);
  const temporary = `${destination}.partial`;
  const response = await fetch(source.downloadUrl, {
    headers: { "user-agent": "Hibi content importer/0.1" },
    redirect: "follow",
  });
  if (!response.ok || !response.body) {
    throw new Error(`${source.name} 下载失败：HTTP ${response.status}`);
  }

  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }

  const metadata = {
    sourceId: source.id,
    sourceUrl: source.downloadUrl,
    downloadedAt: new Date().toISOString(),
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    contentLength: response.headers.get("content-length"),
    checksumSha256: await sha256(destination),
  };
  await writeFile(
    path.join(dataDirectory, `${source.fileName}.metadata.json`),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
  console.log(`${sourceKey}: 已下载 ${destination} (${metadata.checksumSha256.slice(0, 12)}…)`);
}

async function readMetadata(source, dataDirectory) {
  const filePath = path.join(dataDirectory, source.fileName);
  const metadataPath = `${filePath}.metadata.json`;
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const actualChecksum = await sha256(filePath);
  if (metadata.sourceId !== source.id || metadata.sourceUrl !== source.downloadUrl) {
    throw new Error(`${source.name} 元数据与来源配置不一致，请重新下载。`);
  }
  if (actualChecksum !== metadata.checksumSha256) {
    throw new Error(`${source.name} 文件校验和不匹配，请重新下载。`);
  }
  return { filePath, metadata };
}

async function upsertSource(client, source) {
  await client.query(
    `insert into content_sources
       (id, name, homepage_url, download_url, license_name, license_url,
        attribution_text, update_frequency, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict (id) do update set
       name = excluded.name,
       homepage_url = excluded.homepage_url,
       download_url = excluded.download_url,
       license_name = excluded.license_name,
       license_url = excluded.license_url,
       attribution_text = excluded.attribution_text,
       update_frequency = excluded.update_frequency,
       updated_at = now()`,
    [
      source.id,
      source.name,
      source.homepageUrl,
      source.downloadUrl,
      source.licenseName,
      source.licenseUrl,
      source.attributionText,
      source.updateFrequency,
    ],
  );
}

function sourceVersion(metadata) {
  return metadata.lastModified ?? metadata.etag ?? metadata.downloadedAt;
}

function placeholders(rows, columns) {
  return rows
    .map((_, rowIndex) => {
      const start = rowIndex * columns;
      return `(${Array.from({ length: columns }, (__, columnIndex) => `$${start + columnIndex + 1}`).join(", ")})`;
    })
    .join(", ");
}

async function insertDictionaryBatch(client, rows, sourceId, importId) {
  if (rows.length === 0) return;
  const values = rows.flatMap((entry) => [
    entry.id,
    sourceId,
    entry.sourceEntryId,
    entry.primaryKanji,
    entry.primaryReading,
    entry.isCommon,
    JSON.stringify(entry.payload),
    importId,
  ]);
  await client.query(
    `insert into dictionary_entries
       (id, source_id, source_entry_id, primary_kanji, primary_reading,
        is_common, payload, last_import_id)
     values ${placeholders(rows, 8)}
     on conflict (id) do update set
       source_id = excluded.source_id,
       source_entry_id = excluded.source_entry_id,
       primary_kanji = excluded.primary_kanji,
       primary_reading = excluded.primary_reading,
       is_common = excluded.is_common,
       active = true,
       payload = excluded.payload,
       last_import_id = excluded.last_import_id,
       updated_at = now()`,
    values,
  );
}

async function insertKanjiBatch(client, rows, sourceId, importId) {
  if (rows.length === 0) return;
  const values = rows.flatMap((entry) => [
    entry.literal,
    sourceId,
    entry.strokeCount,
    entry.grade,
    entry.frequency,
    entry.jlptLegacy,
    JSON.stringify(entry.payload),
    importId,
  ]);
  await client.query(
    `insert into kanji_entries
       (literal, source_id, stroke_count, grade, frequency, jlpt_legacy,
        payload, last_import_id)
     values ${placeholders(rows, 8)}
     on conflict (literal) do update set
       source_id = excluded.source_id,
       stroke_count = excluded.stroke_count,
       grade = excluded.grade,
       frequency = excluded.frequency,
       jlpt_legacy = excluded.jlpt_legacy,
       active = true,
       payload = excluded.payload,
       last_import_id = excluded.last_import_id,
       updated_at = now()`,
    values,
  );
}

async function importRecords(client, sourceKey, source, filePath, importId, limit) {
  const isJmdict = sourceKey === "jmdict";
  const entityMap = isJmdict
    ? parseEntityDeclarations(await readGzipPrefix(filePath, "<entry>"))
    : {};
  let batch = [];
  let count = 0;
  for await (const xml of streamGzipRecords(filePath, source.recordTag)) {
    batch.push(
      isJmdict ? parseJmdictEntry(xml, entityMap) : parseKanjidicCharacter(xml),
    );
    count += 1;
    if (batch.length >= BATCH_SIZE) {
      if (isJmdict) {
        await insertDictionaryBatch(client, batch, source.id, importId);
      } else {
        await insertKanjiBatch(client, batch, source.id, importId);
      }
      batch = [];
    }
    if (count % 10_000 === 0) console.log(`${sourceKey}: 已解析 ${count} 条`);
    if (limit && count >= limit) break;
  }
  if (isJmdict) {
    await insertDictionaryBatch(client, batch, source.id, importId);
  } else {
    await insertKanjiBatch(client, batch, source.id, importId);
  }
  return count;
}

/**
 * @param {string} sourceKey
 * @param {object} source
 * @param {string} dataDirectory
 * @param {number | null} limit
 */
export async function importSource(sourceKey, source, dataDirectory, limit = null) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("缺少 DATABASE_URL，无法导入内容数据库。");
  const { filePath, metadata } = await readMetadata(source, dataDirectory);
  const client = new Client({ connectionString });
  await client.connect();
  let importId = null;
  try {
    await upsertSource(client, source);
    const created = await client.query(
      `insert into content_imports
         (source_id, source_version, source_url, checksum_sha256, status)
       values ($1, $2, $3, $4, 'running') returning id`,
      [
        source.id,
        sourceVersion(metadata),
        source.downloadUrl,
        metadata.checksumSha256,
      ],
    );
    importId = created.rows[0].id;
    await client.query("begin");
    const table = sourceKey === "jmdict" ? "dictionary_entries" : "kanji_entries";
    if (!limit) {
      await client.query(`update ${table} set active = false where source_id = $1`, [source.id]);
    }
    const count = await importRecords(
      client,
      sourceKey,
      source,
      filePath,
      importId,
      limit,
    );
    const minimum = sourceKey === "jmdict" ? 100_000 : 10_000;
    if (!limit && count < minimum) {
      throw new Error(`${source.name} 仅解析到 ${count} 条，低于安全阈值 ${minimum}。`);
    }
    await client.query("commit");
    await client.query(
      `update content_imports
          set status = 'completed', record_count = $2, finished_at = now()
        where id = $1`,
      [importId, count],
    );
    console.log(`${sourceKey}: 导入完成，共 ${count} 条${limit ? "（受 --limit 限制）" : ""}`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (importId !== null) {
      await client.query(
        `update content_imports
            set status = 'failed', error_summary = $2, finished_at = now()
          where id = $1`,
        [importId, error instanceof Error ? error.message.slice(0, 1000) : "未知错误"],
      );
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  if (!new Set(["download", "import", "sync"]).has(args.command)) {
    throw new Error(
      "用法：node scripts/content-sync.mjs <download|import|sync> [all|jmdict|kanjidic2] [--data-dir PATH] [--limit N]",
    );
  }
  const selected = selectSources(await loadSources(), args.requestedSource);
  for (const [sourceKey, source] of selected) {
    if (args.command === "download" || args.command === "sync") {
      await downloadSource(sourceKey, source, args.dataDirectory);
    }
    if (args.command === "import" || args.command === "sync") {
      await importSource(sourceKey, source, args.dataDirectory, args.limit);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
