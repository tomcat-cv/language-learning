import Link from "next/link";
import { readCatalogEntries, readCatalogManifest, type CatalogKind, type CatalogLevel } from "@/lib/source-catalog";

const levels: CatalogLevel[] = ["N5", "N4", "N3", "N2", "N1", "unranked"];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ level?: string; kind?: string; q?: string }> }) {
  const params = await searchParams;
  const level = levels.includes(params.level as CatalogLevel) ? params.level as CatalogLevel : "N5";
  const kind: CatalogKind = params.kind === "kanji" ? "kanji" : "vocabulary";
  const query = params.q ?? "";
  const [manifest, entries] = await Promise.all([readCatalogManifest(), readCatalogEntries(kind, level, query)]);
  const counts = manifest?.counts[kind] ?? {};

  return <div className="page-container">
    <header className="page-header">
      <div><div className="page-eyebrow">Source-backed content</div><h1 className="page-title">先把可靠资料全部放进来。</h1><p className="page-lead">词汇与汉字来自本地 JMdict / KANJIDIC2 快照。等级标签是课程草稿映射，不冒充 JLPT 官方完整清单。</p></div>
      <Link href="/settings" className="secondary-button">更新内容源</Link>
    </header>
    <form className="card content-toolbar">
      <label>资料类型 <select name="kind" defaultValue={kind}><option value="vocabulary">词汇</option><option value="kanji">汉字</option></select></label>
      <label>等级 <select name="level" defaultValue={level}>{levels.map((item) => <option key={item} value={item}>{item === "unranked" ? "未分级" : item}（{counts[item] ?? 0}）</option>)}</select></label>
      <label>搜索 <input name="q" defaultValue={query} placeholder="日文、读音或英文释义" /></label>
      <button className="primary-button" type="submit">筛选</button>
    </form>
    {!manifest && <article className="card empty-state"><h2>本地源数据尚未生成</h2><p>先运行 <code>npm run content:download</code>，再运行 <code>npm run content:catalog</code>。</p></article>}
    {manifest && <section className="grid catalog-grid">{entries.map((entry) => <article className="card knowledge-card" key={entry.id}>
      <div className="knowledge-card-top"><span>{level === "unranked" ? "未分级" : level}</span><span>{entry.source}</span></div>
      <h2>{entry.word ?? entry.literal}</h2>
      {entry.reading && <div className="reading">{entry.reading}</div>}
      {entry.readings && <div className="reading">{entry.readings.join("、")}</div>}
      <p>{(entry.glosses ?? entry.meanings ?? []).slice(0, 3).join("；") || "暂无英文释义"}</p>
      <small>{entry.levelBasis}{entry.frequency ? ` · 频率 ${entry.frequency}` : ""}</small>
    </article>)}</section>}
  </div>;
}
