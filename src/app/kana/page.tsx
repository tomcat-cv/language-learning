"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { hiragana } from "@/data/n5";

export default function KanaPage(){
  const [playing,setPlaying]=useState<string>(); const router=useRouter();
  function speak(char:string){setPlaying(char);if("speechSynthesis" in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(char);u.lang="ja-JP";u.rate=.7;u.onend=()=>setPlaying(undefined);speechSynthesis.speak(u)}}
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">Before N5 · Hiragana</div><h1 className="page-title">先认识日语的声音。</h1><p className="page-lead">点击假名听音。这里先放入五十音前五行，后续会加入辨音与听写。</p></div><button className="secondary-button" onClick={()=>router.push("/settings")}>跳过假名入门</button></header>
    <section className="grid kana-grid">{hiragana.map(([char,romaji])=><button onClick={()=>speak(char)} className={`card kana-card ${playing===char?"playing":""}`} key={char}><b>{char}</b><small>{romaji}</small></button>)}</section>
  </div>;
}
