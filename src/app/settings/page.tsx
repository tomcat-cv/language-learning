"use client";
import { useEffect,useState } from "react";
import { defaultSettings,loadSettings,saveSettings,type UserSettings } from "@/lib/storage";
import { ContentSourceStatus } from "@/components/ContentSourceStatus";

const providerNames={openai:"OpenAI",anthropic:"Anthropic",gemini:"Google Gemini",compatible:"OpenAI 兼容接口"};
export default function SettingsPage(){
  const [form,setForm]=useState<UserSettings>(defaultSettings);const [saved,setSaved]=useState(false);const [testing,setTesting]=useState("");
  useEffect(()=>{const timer=window.setTimeout(()=>setForm(loadSettings()),0);return()=>window.clearTimeout(timer)},[]);
  function patch<K extends keyof UserSettings>(key:K,value:UserSettings[K]){setSaved(false);setForm(v=>({...v,[key]:value}))}
  function save(){saveSettings(form);setSaved(true)}
  async function test(){
    if(!form.apiKey||!form.model){setTesting("请先填写模型名称和 API Key");return}
    setTesting("正在测试连接…");
    try{const res=await fetch("/api/ai/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({config:form})});const data=await res.json();setTesting(data.ok?"连接成功":data.error||"连接失败")}catch{setTesting("无法连接本地服务")}
  }
  return <div className="page-container">
    <header className="page-header"><div><div className="page-eyebrow">Personal · Settings</div><h1 className="page-title">让计划适合你的生活。</h1><p className="page-lead">设置只保存在当前浏览器。API Key 不会写入项目文件或 Git。</p></div></header>
    <section className="grid settings-grid">
      <article className="card settings-card"><h2>学习计划</h2><p>复习到期内容始终优先于新知识。</p>
        <div className="field"><label>当前冲刺等级</label><select value={form.targetLevel} onChange={e=>patch("targetLevel",e.target.value as UserSettings["targetLevel"])}>{["N5","N4","N3","N2","N1"].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field-row"><div className="field"><label>每日新文法</label><input type="number" min="0" max="20" value={form.dailyGrammar} onChange={e=>patch("dailyGrammar",Number(e.target.value))}/></div><div className="field"><label>每日新单词</label><input type="number" min="0" max="100" value={form.dailyVocabulary} onChange={e=>patch("dailyVocabulary",Number(e.target.value))}/></div></div>
        <div className="field"><label>每日目标时长（分钟）</label><input type="number" min="5" max="180" value={form.dailyMinutes} onChange={e=>patch("dailyMinutes",Number(e.target.value))}/></div>
        <div className="toggle-row"><div><b>跳过假名入门</b><small>可随时从首页再次进入</small></div><button aria-label="切换假名入门" className={`toggle ${form.kanaSkipped?"on":""}`} onClick={()=>patch("kanaSkipped",!form.kanaSkipped)}><span/></button></div>
      </article>
      <article className="card settings-card"><h2>AI 日语老师</h2><p>密钥仅从浏览器发送到你自己的服务端，再由服务端调用模型。</p>
        <div className="field"><label>服务商</label><select value={form.provider} onChange={e=>patch("provider",e.target.value as UserSettings["provider"])}>{Object.entries(providerNames).map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></div>
        <div className="field"><label>模型名称</label><input value={form.model} onChange={e=>patch("model",e.target.value)} placeholder="填写服务商提供的模型 ID"/></div>
        {form.provider==="compatible"&&<div className="field"><label>API Base URL</label><input value={form.baseUrl} onChange={e=>patch("baseUrl",e.target.value)} placeholder="https://example.com/v1"/></div>}
        <div className="field"><label>API Key</label><input type="password" autoComplete="off" value={form.apiKey} onChange={e=>patch("apiKey",e.target.value)} placeholder="不会提交到 Git"/></div>
        <div className="save-bar"><span className="save-status">{testing||saved&&"已保存到当前浏览器"}</span><button className="secondary-button" onClick={test}>测试连接</button><button className="primary-button" onClick={save}>保存设置</button></div>
      </article>
    </section>
    <section className="card settings-card content-source-card">
      <div className="page-eyebrow">Content · Sources</div>
      <h2>内容来源与许可</h2>
      <p>词典事实与日々课程分级分开保存；JLPT 等级是项目课程判断，不是官方完整清单。</p>
      <ContentSourceStatus />
    </section>
  </div>;
}
