import Link from "next/link";
import { grammarItems } from "@/data/n5";
import { SpeechButton } from "@/components/SpeechButton";
import { MasteryButton } from "@/components/MasteryButton";

export default function GrammarPage(){
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">N5 · Grammar</div><h1 className="page-title">文法，不只是规则。</h1><p className="page-lead">在句子和场景里理解结构，再试着亲自表达。</p></div><Link href="/grammar/study" className="primary-button">开始今日文法 →</Link></header>
    <section className="grid catalog-grid">{grammarItems.map((item,i)=><article className="card knowledge-card" key={item.id} style={{"--accent":"#56705b"} as React.CSSProperties}>
      <div className="knowledge-card-top"><span>N5 · {String(i+1).padStart(2,"0")}</span><span>文法</span></div>
      <h2>{item.pattern}</h2><div className="reading">{item.connection}</div><p>{item.meaning}</p>
      <div className="example"><SpeechButton text={item.example}/><br/>{item.example}<small>{item.translation}</small></div>
      <MasteryButton knowledgePointId={item.id}/>
    </article>)}</section>
  </div>;
}
