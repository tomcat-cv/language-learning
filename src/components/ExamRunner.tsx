"use client";

import { useEffect, useState } from "react";

type Bank = { id: number; level: string; title: string; sourceType: "ai" | "official"; createdAt: string };
type Question = { id: number; section: string; prompt: string; options: string[]; explanation: string };
type BankDetail = { bank: { id: number; level: string; title: string }; questions: Question[] };

export function ExamRunner() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selected, setSelected] = useState<BankDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<"mock" | "official">("mock");
  const [result, setResult] = useState<{ total: number; passed: boolean; complete: boolean } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { void fetch("/api/exams/banks").then((response) => response.json() as Promise<{ banks?: Bank[] }>).then((data) => setBanks(data.banks ?? [])).catch(() => setMessage("题库暂时无法加载。")); }, []);

  async function openBank(id: number) {
    setMessage("正在打开题库…");
    const response = await fetch(`/api/exams/banks?id=${id}`);
    const data = await response.json() as { bank?: BankDetail };
    if (!response.ok || !data.bank) { setMessage("题库打开失败。"); return; }
    setSelected(data.bank); setAnswers({}); setResult(null); setMessage("");
  }

  async function submit() {
    if (!selected) return;
    const response = await fetch("/api/exams/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bankId: selected.bank.id, mode, answers }) });
    const data = await response.json() as { total?: number; passed?: boolean; complete?: boolean; error?: string };
    if (!response.ok || data.total === undefined || data.passed === undefined || data.complete === undefined) { setMessage(data.error ?? "考试提交失败。"); return; }
    setResult({ total: data.total, passed: data.passed, complete: data.complete });
  }

  if (selected) return <section className="card exam-runner"><div className="exam-runner-top"><div><div className="page-eyebrow">{selected.bank.level} · {mode === "mock" ? "Mock" : "Official"}</div><h2>{selected.bank.title}</h2></div><button className="secondary-button" type="button" onClick={() => setSelected(null)}>返回题库</button></div><div className="exam-questions">{selected.questions.map((question, index) => <article key={question.id}><span className="page-eyebrow">{index + 1} · {question.section}</span><h3>{question.prompt}</h3><div className="exam-options">{question.options.map((option, optionIndex) => <button className={answers[String(question.id)] === optionIndex ? "selected" : ""} key={option} type="button" onClick={() => setAnswers((current) => ({ ...current, [String(question.id)]: optionIndex }))}>{option}</button>)}</div></article>)}</div><div className="exam-submit"><label><span>考试模式</span><select value={mode} onChange={(event) => setMode(event.target.value as "mock" | "official")}><option value="mock">模拟考试</option><option value="official">正式考试</option></select></label><button className="primary-button" type="button" onClick={() => void submit()}>提交考试</button></div>{result && <div className={`exam-result ${result.passed ? "passed" : "failed"}`}><b>{result.complete ? (result.passed ? "考试通过 · 已记录成绩" : "本次未通过") : "题库未覆盖全部考试分项"}</b><span>总分：{result.total}</span></div>}{message && <p className="exam-message">{message}</p>}</section>;

  return <section className="card exam-runner"><div className="page-eyebrow">Saved Question Banks</div><h2>开始一次测验</h2><p>选择已保存的 AI 题库开始模拟或正式考试。</p>{banks.length === 0 ? <div className="certificate-empty">还没有题库，请先生成一套 AI 模拟题。</div> : <div className="bank-list">{banks.map((bank) => <button key={bank.id} type="button" onClick={() => void openBank(bank.id)}><span className="pill">{bank.level} · {bank.sourceType === "ai" ? "AI" : "官方"}</span><b>{bank.title}</b><small>{new Date(bank.createdAt).toLocaleDateString("zh-CN")}</small></button>)}</div>}{message && <p className="exam-message">{message}</p>}</section>;
}
