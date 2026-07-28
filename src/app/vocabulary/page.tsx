import { vocabularyItems } from "@/data/n5";
import { SpeechButton } from "@/components/SpeechButton";

export default function VocabularyPage(){
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">N5 · Vocabulary</div><h1 className="page-title">把词放回生活里。</h1><p className="page-lead">词义、读音、搭配和语境一起记，才是真正认识一个词。</p></div><span className="pill">今日新词 0 / 50</span></header>
    <section className="grid catalog-grid">{vocabularyItems.map((item,i)=><article className="card knowledge-card" key={item.id} style={{"--accent":item.status==="review"?"#d94a38":"#41506c"} as React.CSSProperties}>
      <div className="knowledge-card-top"><span>N5 · {item.partOfSpeech}</span><SpeechButton text={item.word}/></div>
      <h2>{item.word}</h2><div className="reading">{item.reading}</div><p>{item.meaning}</p>
      <div className="example">{item.example}<small>{item.translation}</small></div>
      <div className="mini-progress"><span style={{width:`${i===0?36:0}%`}}/></div>
    </article>)}</section>
  </div>;
}
