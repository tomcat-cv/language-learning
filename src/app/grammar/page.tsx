import Link from "next/link";

export default function GrammarPage() {
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">Grammar · source status</div><h1 className="page-title">正式文法资料还在整理。</h1><p className="page-lead">当前已移除原型示例文法。JMdict 和 KANJIDIC2 是词典/汉字数据源，不包含完整的 JLPT N5–N1 文法课程。</p></div><Link href="/exams" className="secondary-button">先做正式样题 →</Link></header>
    <article className="card empty-state"><div className="big">文</div><h2>没有用示例内容填充</h2><p>后续接入经过来源、等级和人工审核的文法课程后，这里才会开放学习。</p></article>
  </div>;
}
