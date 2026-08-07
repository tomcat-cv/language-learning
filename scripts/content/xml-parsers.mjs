import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";

const XML_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

function decodeXml(value, entityMap = {}) {
  return value.replaceAll(/&(#x[\da-f]+|#\d+|[\w.-]+);/gi, (match, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return entityMap[entity] ?? XML_ENTITIES[entity] ?? entity;
  });
}

function elements(xml, tag) {
  const pattern = new RegExp(
    `<${tag}(?:\\s+([^>]*))?>([\\s\\S]*?)<\\/${tag}>`,
    "g",
  );
  return [...xml.matchAll(pattern)].map((match) => ({
    attributes: match[1] ?? "",
    content: match[2],
  }));
}

function values(xml, tag, entityMap = {}) {
  return elements(xml, tag).map(({ content }) =>
    decodeXml(content.trim(), entityMap),
  );
}

function firstValue(xml, tag, entityMap = {}) {
  return values(xml, tag, entityMap)[0] ?? null;
}

function attribute(attributes, name) {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)')`),
  );
  return match?.[1] ?? match?.[2] ?? null;
}

function numberValue(xml, tag) {
  const value = firstValue(xml, tag);
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseEntityDeclarations(xmlPrefix) {
  const entities = {};
  const pattern = /<!ENTITY\s+([\w.-]+)\s+["']([^"']*)["']\s*>/g;
  for (const match of xmlPrefix.matchAll(pattern)) {
    entities[match[1]] = decodeXml(match[2], entities);
  }
  return entities;
}

export function parseJmdictEntry(xml, entityMap = {}) {
  const sequence = firstValue(xml, "ent_seq", entityMap);
  if (!sequence) throw new Error("JMdict entry 缺少 ent_seq。\n");

  const kanji = elements(xml, "k_ele").map(({ content }) => ({
    text: firstValue(content, "keb", entityMap) ?? "",
    info: values(content, "ke_inf", entityMap),
    priority: values(content, "ke_pri", entityMap),
  }));
  const readings = elements(xml, "r_ele").map(({ content }) => ({
    text: firstValue(content, "reb", entityMap) ?? "",
    noKanji: /<re_nokanji\s*\/>/.test(content),
    restrictions: values(content, "re_restr", entityMap),
    info: values(content, "re_inf", entityMap),
    priority: values(content, "re_pri", entityMap),
  }));
  const senses = elements(xml, "sense").map(({ content }) => ({
    restrictedKanji: values(content, "stagk", entityMap),
    restrictedReadings: values(content, "stagr", entityMap),
    partsOfSpeech: values(content, "pos", entityMap),
    crossReferences: values(content, "xref", entityMap),
    antonyms: values(content, "ant", entityMap),
    fields: values(content, "field", entityMap),
    misc: values(content, "misc", entityMap),
    dialects: values(content, "dial", entityMap),
    information: values(content, "s_inf", entityMap),
    glosses: elements(content, "gloss").map(({ attributes, content: gloss }) => ({
      language: attribute(attributes, "xml:lang") ?? "eng",
      type: attribute(attributes, "g_type"),
      text: decodeXml(gloss.trim(), entityMap),
    })),
  }));

  const primaryKanji =
    kanji.find((form) => form.priority.length > 0)?.text ?? kanji[0]?.text ?? null;
  const primaryReading =
    readings.find((form) => form.priority.length > 0)?.text ?? readings[0]?.text;
  if (!primaryReading) {
    throw new Error(`JMdict entry ${sequence} 缺少读音。`);
  }

  return {
    id: `jmdict:${sequence}`,
    sourceEntryId: sequence,
    primaryKanji,
    primaryReading,
    isCommon: [...kanji, ...readings].some((form) => form.priority.length > 0),
    payload: { sequence, kanji, readings, senses },
  };
}

function attributedValues(xml, tag, valueName, attributes) {
  return elements(xml, tag).map((element) => ({
    ...Object.fromEntries(
      attributes.map(([outputName, attributeName]) => [
        outputName,
        attribute(element.attributes, attributeName),
      ]),
    ),
    [valueName]: decodeXml(element.content.trim()),
  }));
}

export function parseKanjidicCharacter(xml) {
  const literal = firstValue(xml, "literal");
  if (!literal) throw new Error("KANJIDIC2 character 缺少 literal。");

  const miscBlock = elements(xml, "misc")[0]?.content ?? "";
  const payload = {
    literal,
    codepoints: attributedValues(xml, "cp_value", "value", [
      ["type", "cp_type"],
    ]),
    radicals: attributedValues(xml, "rad_value", "value", [
      ["type", "rad_type"],
    ]),
    misc: {
      grade: numberValue(miscBlock, "grade"),
      strokeCounts: values(miscBlock, "stroke_count").map(Number),
      variants: attributedValues(miscBlock, "variant", "value", [
        ["type", "var_type"],
      ]),
      frequency: numberValue(miscBlock, "freq"),
      radicalNames: values(miscBlock, "rad_name"),
      jlptLegacy: numberValue(miscBlock, "jlpt"),
    },
    dictionaryReferences: attributedValues(xml, "dic_ref", "value", [
      ["type", "dr_type"],
      ["volume", "m_vol"],
      ["page", "m_page"],
    ]),
    queryCodes: attributedValues(xml, "q_code", "value", [
      ["type", "qc_type"],
      ["skipMisclassification", "skip_misclass"],
    ]),
    readingMeaningGroups: elements(xml, "rmgroup").map(({ content }) => ({
      readings: attributedValues(content, "reading", "value", [
        ["type", "r_type"],
        ["status", "r_status"],
      ]).map((reading) => ({
        ...reading,
        restrictions: elements(content, "reading")
          .find((candidate) => decodeXml(candidate.content.trim()) === reading.value)
          ?.attributes.match(/r_restr=(?:"([^"]*)"|'([^']*)')/g)
          ?.map((raw) => raw.replace(/^r_restr=["']|["']$/g, "")) ?? [],
      })),
      meanings: attributedValues(content, "meaning", "value", [
        ["language", "m_lang"],
      ]).map((meaning) => ({
        ...meaning,
        language: meaning.language ?? "en",
      })),
      additionalTypes: values(content, "additional_info"),
    })),
    nanori: values(xml, "nanori"),
  };

  return {
    literal,
    strokeCount: payload.misc.strokeCounts[0] ?? null,
    grade: payload.misc.grade,
    frequency: payload.misc.frequency,
    jlptLegacy: payload.misc.jlptLegacy,
    payload,
  };
}

export async function* streamGzipRecords(filePath, tag) {
  const stream = createReadStream(filePath).pipe(createGunzip());
  const opening = `<${tag}>`;
  const closing = `</${tag}>`;
  let buffer = "";
  stream.setEncoding("utf8");

  for await (const chunk of stream) {
    buffer += chunk;
    while (true) {
      const start = buffer.indexOf(opening);
      if (start < 0) {
        if (buffer.length > opening.length) buffer = buffer.slice(-opening.length);
        break;
      }
      const end = buffer.indexOf(closing, start);
      if (end < 0) {
        if (start > 0) buffer = buffer.slice(start);
        break;
      }
      const recordEnd = end + closing.length;
      yield buffer.slice(start, recordEnd);
      buffer = buffer.slice(recordEnd);
    }
  }

  if (buffer.includes(opening)) {
    throw new Error(`${filePath} 包含未闭合的 <${tag}> 记录。`);
  }
}

export async function readGzipPrefix(filePath, stopMarker, maxBytes = 2_000_000) {
  const stream = createReadStream(filePath).pipe(createGunzip());
  stream.setEncoding("utf8");
  let result = "";
  for await (const chunk of stream) {
    result += chunk;
    const stop = result.indexOf(stopMarker);
    if (stop >= 0) {
      stream.destroy();
      return result.slice(0, stop);
    }
    if (result.length > maxBytes) {
      stream.destroy();
      throw new Error(`在 ${maxBytes} 字符内未找到 ${stopMarker}。`);
    }
  }
  return result;
}
