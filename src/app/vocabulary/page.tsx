import Link from "next/link";
import { MasteryButton } from "@/components/MasteryButton";
import { SpeechButton } from "@/components/SpeechButton";
import { readCatalogEntries } from "@/lib/source-catalog";

export default async function VocabularyPage() {
  const entries = await readCatalogEntries("vocabulary", "N5", "", 120);
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">N5 · JMdict source</div><h1 className="page-title">从正式词典开始。</h1><p className="page-lead">这里不再展示原型示例。词义和词性来自本地 JMdict 快照；没有可靠例句时不会自行编造。</p></div><Link href="/content?kind=vocabulary&level=N5" className="secondary-button">打开完整内容库 →</Link></header>
    {entries.length === 0 ? <article className="card empty-state"><h2>尚未生成源数据目录</h2><p>请先运行 <code>npm run content:download</code> 和 <code>npm run content:catalog</code>。</p></article> : <section className="grid catalog-grid">{entries.map((entry) => <article className="card knowledge-card" key={entry.id}>
      <div className="knowledge-card-top"><span>N5 · {entry.source}</span><SpeechButton text={entry.word ?? entry.reading ?? ""} /></div>
      <h2>{entry.word}</h2><div className="reading">{entry.reading} · {entry.partsOfSpeech?.join("、") || "词汇"}</div><p>{entry.glosses?.slice(0, 3).join("；") || "暂无英文释义"}</p>
      <small>{entry.levelBasis}</small><MasteryButton knowledgePointId={entry.id} />
    </article>)}</section>}
  </div>;
}
