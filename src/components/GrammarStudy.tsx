"use client";
import { useState } from "react";
import { grammarItems } from "@/data/n5";
import { SpeechButton } from "./SpeechButton";
import { loadSettings } from "@/lib/storage";

export function GrammarStudy(){
  const [answer,setAnswer]=useState(""); const [feedback,setFeedback]=useState(""); const [loading,setLoading]=useState(false);
  const item=grammarItems[0];
  async function evaluate(){
    if(!answer.trim()){setFeedback("先写一个包含「は～です」的句子吧。");return}
    const config=loadSettings();
    if(!config.apiKey||!config.model){setFeedback("示例反馈：句子已收到。配置模型后，将从目标文法、正确性、自然度和语境四个维度评分。");return}
    setLoading(true);setFeedback("");
    try{
      const res=await fetch("/api/ai/evaluate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({config,targetGrammar:item.pattern,userSentence:answer})});
      const data=await res.json(); setFeedback(data.feedback||data.error||"暂时无法取得反馈。");
    }catch{setFeedback("模型服务暂时不可用，你的答案没有丢失。")}finally{setLoading(false)}
  }
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">Grammar · 01 / 10</div><h1 className="page-title">先看懂，再说出来。</h1></div><span className="pill">N5 · 学习中</span></header>
    <section className="study-layout"><article className="card study-card">
      <span className="page-eyebrow">TARGET PATTERN</span><h2>{item.pattern}</h2><p className="page-lead">{item.connection}　·　{item.meaning}</p>
      <div className="sentence"><SpeechButton text={item.example}/>　{item.example}</div><p className="page-lead">{item.translation}</p>
      <textarea className="answer-area" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="请用「は～です」写一个介绍自己或他人的句子……"/>
      {feedback&&<div className="feedback">{feedback}</div>}
      <div className="study-actions"><button className="primary-button" onClick={evaluate} disabled={loading}>{loading?"正在请老师判断…":"提交造句"}</button><button className="secondary-button" onClick={()=>setAnswer("私は中国人です。")}>给我提示</button></div>
    </article><aside className="card study-side"><h3>本题观察点</h3><ul><li>一 <span>「は」在这里读作 wa。</span></li><li>二 <span>「です」让判断句保持礼貌。</span></li><li>三 <span>不要把中文“是”逐词套入所有句子。</span></li></ul></aside></section>
  </div>;
}
