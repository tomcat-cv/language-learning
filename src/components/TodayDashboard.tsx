"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { defaultSettings,loadSettings,type UserSettings } from "@/lib/storage";

export function TodayDashboard(){
  const [settings,setSettings]=useState<UserSettings>(defaultSettings);
  useEffect(()=>{const timer=window.setTimeout(()=>setSettings(loadSettings()),0);return()=>window.clearTimeout(timer)},[]);
  const tasks=[
    {index:"01",title:"到期复习",detail:"先巩固，再继续向前",count:12,href:"/review"},
    {index:"02",title:"新文法",detail:`今日计划 ${settings.dailyGrammar} 个`,count:settings.dailyGrammar,href:"/grammar/study"},
    {index:"03",title:"新单词",detail:`今日计划 ${settings.dailyVocabulary} 个`,count:settings.dailyVocabulary,href:"/vocabulary"},
    {index:"04",title:"综合听读",detail:"一段便利店里的对话",count:1,href:"/review"},
  ];
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">Tuesday · N5 Sprint</div><h1 className="page-title">今天，也向前一点。</h1><p className="page-lead">复习优先 · 预计 {settings.dailyMinutes} 分钟 · 当前冲刺 {settings.targetLevel}</p></div><span className="pill">火种 1 天　·　累计 0 分钟</span></header>
    <section className="hero-grid">
      <article className="card focus-card"><div className="focus-top"><span className="focus-label">TODAY&apos;S FIRST STEP</span><span className="pill">12 项到期</span></div><h2>{settings.kanaSkipped?"从第一次复习开始":"先认识日语的声音"}</h2><p>{settings.kanaSkipped?"系统会先唤醒快要忘记的内容，再安排今天的新知识。":"用五分钟认识第一行平假名。每个假名都可以点击听音，你也可以在设置中跳过入门。"}</p><div className="focus-actions"><Link className="primary-button" href={settings.kanaSkipped?"/review":"/kana"}>开始今日学习 <span>→</span></Link><Link className="secondary-button" href="/settings">调整计划</Link></div></article>
      <article className="card progress-card"><span className="page-eyebrow">今日完成度</span><div className="progress-ring"><span>0<small>%</small></span></div><div className="progress-meta"><div><b>0 / 73</b><small>今日任务</small></div><div><b>{settings.dailyMinutes} min</b><small>目标时间</small></div></div></article>
    </section>
    <div className="section-head"><div><h2>今日路径</h2><p>会根据复习积压自动调整新内容</p></div><span className="pill">预计 {settings.dailyMinutes} 分钟</span></div>
    <section className="task-list">{tasks.map(task=><Link href={task.href} className="card task-card" key={task.index}><span className="task-index">{task.index} / 04</span><h3>{task.title}　{task.count}</h3><p>{task.detail}</p><div className="mini-progress"><span style={{width:"0%"}}/></div></Link>)}</section>
    <article className="card quote-card"><span className="quote-mark">「</span><p>毎日の小さな一歩が、いつか大きな力になる。</p><small>每天的一小步，终会成为强大的力量。</small></article>
  </div>;
}
