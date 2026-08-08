import Link from "next/link";
import { readCatalogManifest } from "@/lib/source-catalog";

export default async function GrammarPage() {
  const manifest = await readCatalogManifest();
  const counts = manifest?.counts.grammar ?? {};
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">Grammar · Japanese Language Data</div><h1 className="page-title">先理解句子的骨架。</h1><p className="page-lead">当前文法来自 Japanese Language Data，日々使用自己的 hibi_level（N5–N1）参与学习计划。该等级不是 JLPT 官方清单。</p></div><Link href="/grammar/study" className="secondary-button">开始文法学习 →</Link></header>
    {total > 0 ? <article className="card"><div className="big">文</div><h2>已载入 {total} 个文法点</h2><p>N5 {counts.N5 ?? 0} · N4 {counts.N4 ?? 0} · N3 {counts.N3 ?? 0} · N2 {counts.N2 ?? 0} · N1 {counts.N1 ?? 0}</p><p className="source-note">来源内容当前保留原始来源、许可和草稿状态；质量审核暂按项目决定不作为学习入口门槛。</p></article> : <article className="card empty-state"><div className="big">文</div><h2>文法源数据尚未生成</h2><p>先运行内容下载和导入，再生成本地内容目录。</p></article>}
  </div>;
}
