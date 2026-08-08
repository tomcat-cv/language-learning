import { execFile } from "node:child_process";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const inputDirectory = path.resolve(process.env.HIBI_JLPT_DIR ?? ".local/jlpt-official");
const outputDirectory = path.resolve(process.env.HIBI_QUESTION_BANK_DIR ?? ".local/question-bank/official-jlpt");
const sourceUrl = "https://www.jlpt.jp/e/samples/forteachers.html";
const copyrightUrl = "https://www.jlpt.jp/sp/e/policy.html";
const levels = ["N1", "N2", "N3", "N4", "N5"];
const soffice = process.env.SOFFICE ?? "/Users/lixiushi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice";
const tempDirectory = path.join("/private/tmp", "hibi-official-question-bank");

async function collectFiles(directory, prefix = "") {
  const result = [];
  for (const name of await readdir(directory)) {
    const absolute = path.join(directory, name);
    const relative = path.join(prefix, name);
    if ((await stat(absolute)).isDirectory()) result.push(...await collectFiles(absolute, relative));
    else result.push(relative);
  }
  return result;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#9;/g, " ")
    .trim();
}

function slideText(xml) {
  return [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map((match) => decodeXml(match[1]));
}

function extractOptions(tokens) {
  const options = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = tokens[index].match(/^\s*([1-4])\s*(.*)$/s);
    if (!match) continue;
    const optionText = match[2].trim() || tokens[index + 1]?.trim();
    if (!optionText || options.some((option) => option.index === Number(match[1]))) continue;
    options.push({ index: Number(match[1]), text: optionText });
  }
  return options.length >= 2 ? options.sort((a, b) => a.index - b.index) : [];
}

function inferExplicitAnswer(tokens) {
  const answerMarker = tokens.findIndex((token) => token.includes("正しい答え"));
  if (answerMarker < 0) return null;
  for (const token of tokens.slice(answerMarker + 1, answerMarker + 5)) {
    const match = token.match(/[１-４1-4]/);
    if (match) return Number(match[0].replace("１", "1").replace("２", "2").replace("３", "3").replace("４", "4"));
  }
  return null;
}

function inferKnownSampleAnswer(level, slideNumber) {
  if (level !== "N5") return null;
  return ({ 6: 1, 7: 2, 8: 3, 9: 3, 11: 2, 14: 3, 33: 2, 35: 2, 37: 2, 39: 2 })[slideNumber] ?? null;
}

function questionKind(text) {
  if (text.includes("聴解") || text.includes("音声")) return "listening";
  if (text.includes("読解") || text.includes("テキスト")) return "reading";
  return "language";
}

async function parseOfficialSlides(level, pptPath, pdfPath, audioFiles) {
  const convertedDirectory = path.join(tempDirectory, level);
  await mkdir(convertedDirectory, { recursive: true });
  await execFileAsync(soffice, [
    "--headless",
    `-env:UserInstallation=file://${path.join(tempDirectory, `soffice-${level}`)}`,
    "--convert-to",
    "pptx",
    "--outdir",
    convertedDirectory,
    pptPath,
  ]);
  const convertedPath = path.join(convertedDirectory, path.basename(pptPath).replace(/\.ppt$/i, ".pptx"));
  const listing = (await execFileAsync("unzip", ["-Z1", convertedPath])).stdout
    .split("\n")
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const questions = [];
  for (const slidePath of listing) {
    const slideNumber = Number(slidePath.match(/\d+/)[0]);
    const xml = (await execFileAsync("unzip", ["-p", convertedPath, slidePath])).stdout;
    const tokens = slideText(xml);
    const text = tokens.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const options = extractOptions(tokens);
    if (options.length < 2 || !text.includes("やってみましょう")) continue;
    const answerNumber = inferExplicitAnswer(tokens) ?? inferKnownSampleAnswer(level, slideNumber);
    questions.push({
      id: `${level.toLowerCase()}-official-slide-${slideNumber}`,
      level,
      sourceType: "official",
      kind: questionKind(text),
      prompt: text,
      options: options.map((option) => option.text),
      answerIndex: answerNumber === null ? null : answerNumber - 1,
      answerNumber,
      answerStatus: answerNumber === null ? "needs-official-key" : "verified-from-sample-material",
      source: { pdf: pdfPath, slide: slideNumber, original: path.relative(root, pptPath) },
      audio: audioFiles.length > 0 && questionKind(text) === "listening" ? audioFiles : undefined,
    });
  }
  return questions;
}

async function run() {
  await mkdir(outputDirectory, { recursive: true });
  const assets = [];

  for (const level of levels) {
    const archivePath = path.join(inputDirectory, `${level}.zip`);
    const levelDirectory = path.join(outputDirectory, level);
    await mkdir(levelDirectory, { recursive: true });
    await execFileAsync("unzip", ["-o", archivePath, "-d", levelDirectory]);

    const extractedLevelDirectory = path.join(levelDirectory, level);
    const files = (await readdir(extractedLevelDirectory)).sort();
    const slideFile = files.find((file) => file.endsWith("_slides.ppt"));
    if (slideFile) {
      await execFileAsync("soffice", [
        "--headless",
        `-env:UserInstallation=file://${path.join("/private/tmp", `hibi-soffice-${level}`)}`,
        "--convert-to",
        "pdf",
        "--outdir",
        extractedLevelDirectory,
        path.join(extractedLevelDirectory, slideFile),
      ]);
    }

    const audioFiles = files.filter((file) => file.endsWith(".mp3")).map((file) => path.join(level, level, file));
    const questions = slideFile
      ? await parseOfficialSlides(level, path.join(extractedLevelDirectory, slideFile), path.join(level, level, `${level}_slides.pdf`), audioFiles)
      : [];

    for (const file of await readdir(extractedLevelDirectory)) {
      const kind = file.endsWith(".mp3") ? "listening_audio" : file.endsWith(".pdf") ? "sample_slides" : "source_asset";
      assets.push({ level, kind, file: path.join(level, file), sourceUrl });
    }
    assets.push({ level, kind: "structured_question_bank", file: path.join(level, "questions.json"), sourceUrl, questionCount: questions.length });
    await writeFile(path.join(levelDirectory, "questions.json"), `${JSON.stringify({ schemaVersion: 1, level, sourceUrl, generatedAt: new Date().toISOString(), questions }, null, 2)}\n`, "utf8");
  }

  const supplementalDirectory = path.join(inputDirectory, "2018");
  try {
    for (const file of await collectFiles(supplementalDirectory)) {
      assets.push({ level: file.match(/N[1-5]/)?.[0] ?? "unknown", kind: file.endsWith(".mp3") ? "listening_audio" : "official_question_material", file: path.join("2018", file), sourceUrl: "https://www.jlpt.jp/e/samples/sampleindex.html" });
    }
  } catch {
    // The supplemental workbook download is optional; the teacher ZIPs remain importable.
  }

  const manifest = {
    schemaVersion: 1,
    importedAt: new Date().toISOString(),
    source: {
      name: "JLPT Official Sample Questions",
      url: sourceUrl,
      copyrightUrl,
      usage: "Personal study copy. Keep source attribution and follow per-item restrictions.",
    },
    assets,
  };
  await writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`已导入官方资料包：${assets.length} 个资源，清单位于 ${path.relative(root, path.join(outputDirectory, "manifest.json"))}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
