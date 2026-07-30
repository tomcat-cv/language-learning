"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { defaultSettings,loadSettings,type UserSettings } from "@/lib/storage";
import { useKnowledgeProgress } from "./ProgressProvider";

export function TodayDashboard(){
  const [settings,setSettings]=useState<UserSettings>(defaultSettings);
  const {states}=useKnowledgeProgress();
  useEffect(()=>{const timer=window.setTimeout(()=>setSettings(loadSettings()),0);return()=>window.clearTimeout(timer)},[]);
  const dueCount=states.filter(state=>state.stage!=="learning"&&new Date(state.dueAt)<=new Date()).length;
  const learningStates=states.filter(state=>state.stage==="learning");
  const learningCount=learningStates.length;
  const relearningPath=learningStates.some(state=>state.knowledgePointId.startsWith("v-"))?"/vocabulary":"/grammar";
  const tasks=[
    {index:"01",title:"复习与补学",detail:learningCount>0?`${learningCount} 项需要重新学习`:"先巩固，再继续向前",count:dueCount+learningCount,href:learningCount>0?relearningPath:"/review"},
    {index:"02",title:"新文法",detail:`今日计划 ${settings.dailyGrammar} 个`,count:settings.dailyGrammar,href:"/grammar/study"},
    {index:"03",title:"新单词",detail:`今日计划 ${settings.dailyVocabulary} 个`,count:settings.dailyVocabulary,href:"/vocabulary"},
    {index:"04",title:"综合听读",detail:"一段便利店里的对话",count:1,href:"/review"},
  ];
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">Tuesday · N5 Sprint</div><h1 className="page-title">今天，也向前一点。</h1><p className="page-lead">复习优先 · 预计 {settings.dailyMinutes} 分钟 · 当前冲刺 {settings.targetLevel}</p></div><span className="pill">火种 1 天　·　累计 0 分钟</span></header>
    <section className="hero-grid">
      <article className="card focus-card"><div className="focus-top"><span className="focus-label">TODAY&apos;S FIRST STEP</span><span className="pill">{learningCount>0?`${learningCount} 项待补学`:`${dueCount} 项到期`}</span></div><h2>{learningCount>0?"先补上未通过的内容":dueCount>0?"从到期复习开始":settings.kanaSkipped?"开始今天的新内容":"先认识日语的声音"}</h2><p>{learningCount>0?"重新看一遍解释和例句，确认完成后，系统会安排明日短测。":dueCount>0?"系统会先验证已经到期的内容，再安排今天的新知识。":settings.kanaSkipped?"今天没有到期项目，可以学习新文法或单词。":"用五分钟认识第一行平假名。每个假名都可以点击听音，你也可以在设置中跳过入门。"}</p><div className="focus-actions"><Link className="primary-button" href={learningCount>0?relearningPath:dueCount>0?"/review":settings.kanaSkipped?"/grammar":"/kana"}>开始今日学习 <span>→</span></Link><Link className="secondary-button" href="/settings">调整计划</Link></div></article>
      <article className="card progress-card"><span className="page-eyebrow">今日完成度</span><div className="progress-ring"><span>0<small>%</small></span></div><div className="progress-meta"><div><b>0 / 73</b><small>今日任务</small></div><div><b>{settings.dailyMinutes} min</b><small>目标时间</small></div></div></article>
    </section>
    <div className="section-head"><div><h2>今日路径</h2><p>会根据复习积压自动调整新内容</p></div><span className="pill">预计 {settings.dailyMinutes} 分钟</span></div>
    <section className="task-list">{tasks.map(task=><Link href={task.href} className="card task-card" key={task.index}><span className="task-index">{task.index} / 04</span><h3>{task.title}　{task.count}</h3><p>{task.detail}</p><div className="mini-progress"><span style={{width:"0%"}}/></div></Link>)}</section>
    <article className="card quote-card"><span className="quote-mark">「</span><p>毎日の小さな一歩が、いつか大きな力になる。</p><small>每天的一小步，终会成为强大的力量。</small></article>
  </div>;
}
