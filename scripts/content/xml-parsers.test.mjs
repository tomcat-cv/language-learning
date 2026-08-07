import { describe, expect, it } from "vitest";
import {
  parseEntityDeclarations,
  parseJmdictEntry,
  parseKanjidicCharacter,
} from "./xml-parsers.mjs";

describe("content XML parsers", () => {
  it("normalizes a JMdict entry while retaining multilingual senses", () => {
    const entities = parseEntityDeclarations(
      '<!ENTITY n "noun (common) (futsuumeishi)">',
    );
    const entry = parseJmdictEntry(
      `<entry>
        <ent_seq>1000010</ent_seq>
        <k_ele><keb>明日</keb><ke_pri>ichi1</ke_pri></k_ele>
        <r_ele><reb>あした</reb><re_pri>ichi1</re_pri></r_ele>
        <sense>
          <pos>&n;</pos>
          <gloss>tomorrow</gloss>
          <gloss xml:lang="ger">morgen</gloss>
        </sense>
      </entry>`,
      entities,
    );

    expect(entry).toMatchObject({
      id: "jmdict:1000010",
      sourceEntryId: "1000010",
      primaryKanji: "明日",
      primaryReading: "あした",
      isCommon: true,
    });
    expect(entry.payload.senses[0]).toMatchObject({
      partsOfSpeech: ["noun (common) (futsuumeishi)"],
      glosses: [
        { language: "eng", type: null, text: "tomorrow" },
        { language: "ger", type: null, text: "morgen" },
      ],
    });
  });

  it("normalizes a KANJIDIC2 character without treating legacy JLPT as current curriculum", () => {
    const entry = parseKanjidicCharacter(
      `<character>
        <literal>日</literal>
        <codepoint><cp_value cp_type="ucs">65E5</cp_value></codepoint>
        <radical><rad_value rad_type="classical">72</rad_value></radical>
        <misc><grade>1</grade><stroke_count>4</stroke_count><freq>1</freq><jlpt>4</jlpt></misc>
        <dic_number><dic_ref dr_type="nelson_c">2097</dic_ref></dic_number>
        <query_code><q_code qc_type="skip">3-3-1</q_code></query_code>
        <reading_meaning><rmgroup>
          <reading r_type="ja_on">ニチ</reading>
          <reading r_type="ja_kun">ひ</reading>
          <meaning>day</meaning>
          <meaning m_lang="fr">jour</meaning>
        </rmgroup><nanori>あ</nanori></reading_meaning>
      </character>`,
    );

    expect(entry).toMatchObject({
      literal: "日",
      strokeCount: 4,
      grade: 1,
      frequency: 1,
      jlptLegacy: 4,
    });
    expect(entry.payload.readingMeaningGroups[0].meanings).toEqual([
      { language: "en", value: "day" },
      { language: "fr", value: "jour" },
    ]);
  });
});
