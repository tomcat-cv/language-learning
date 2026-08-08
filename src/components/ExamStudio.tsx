"use client";

import { useState } from "react";
import type { GeneratedExamQuestion } from "@/lib/ai/providers";
import { loadSettings } from "@/lib/storage";

export function ExamStudio() {
  const [level, setLevel] = useState<GeneratedExamQuestion["level"]>("N5");
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<GeneratedExamQuestion[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    const config = loadSettings();
    if (!config.apiKey || !config.model) {
      setMessage("请先在“我的”页面配置 AI 服务商、模型名称和 API Key。");
      return;
    }
    setLoading(true);
    setMessage("正在生成原创模拟题…");
    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config, level, count, sections: "词汇、文法、阅读、听力（文字模拟）", persist: true }),
      });
      const data = await response.json() as { questions?: GeneratedExamQuestion[]; bankId?: number; error?: string };
      if (!response.ok || !data.questions) throw new Error(data.error ?? "生成失败");
      setQuestions(data.questions);
      setMessage(`已生成并保存题库${data.bankId ? `（题库 #${data.bankId}）` : ""}。正式使用前请逐题审核。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return <section className="card exam-studio">
    <div className="page-eyebrow">AI · Original Bank</div>
    <h2>生成一套原创模拟题</h2>
    <p>题目不复制官方试题，生成后会保存为未审核题库。</p>
    <div className="field-row">
      <div className="field"><label>目标等级</label><select value={level} onChange={(event) => setLevel(event.target.value as GeneratedExamQuestion["level"])}>{["N5", "N4", "N3", "N2", "N1"].map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="field"><label>题目数量</label><input type="number" min="1" max="30" value={count} onChange={(event) => setCount(Number(event.target.value))}/></div>
    </div>
    <button className="primary-button" type="button" onClick={() => void generate()} disabled={loading}>{loading ? "生成中…" : "生成并保存题库"}</button>
    {message && <p className="exam-message">{message}</p>}
    {questions.length > 0 && <div className="exam-preview">{questions.map((question, index) => <article key={question.id}><span className="page-eyebrow">{index + 1} · {question.section}</span><h3>{question.prompt}</h3><ol>{question.options.map((option) => <li key={option}>{option}</li>)}</ol><small>答案：{question.options[question.answerIndex]} · {question.explanation}</small></article>)}</div>}
  </section>;
}
