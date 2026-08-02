"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DailyPlan } from "@/lib/progress-service";
import { ensureDailyPlan } from "@/lib/study-plan-client";
import { loadSettings } from "@/lib/storage";
import { useKnowledgeProgress } from "./ProgressProvider";
import { SpeechButton } from "./SpeechButton";

type StudyKind = "grammar" | "vocabulary";

export function StudySession({ kind }: { kind: StudyKind }) {
  const { reload: reloadProgress } = useKnowledgeProgress();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sentence, setSentence] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      setPlan(await ensureDailyPlan(loadSettings()));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法读取学习任务。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nextPlan = await ensureDailyPlan(loadSettings());
        if (active) {
          setPlan(nextPlan);
          setError("");
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "暂时无法读取学习任务。",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function answer(planItemId: number, selectedAnswer: string) {
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/progress/study", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planItemId, answer: selectedAnswer }),
      });
      const data = (await response.json()) as {
        correct?: boolean;
        correctAnswer?: string;
        error?: string;
      };
      if (!response.ok || typeof data.correct !== "boolean") {
        throw new Error(data.error ?? "暂时无法保存学习结果。");
      }
      if (!data.correct) {
        setMessage(`还不对。正确答案是“${data.correctAnswer}”，再看一遍后重试。`);
        return;
      }
      setMessage("回答正确，已完成学习并安排明日复习。");
      setSentence("");
      setAiFeedback("");
      await Promise.all([loadPlan(), reloadProgress()]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法保存学习结果。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function evaluateSentence(targetGrammar: string) {
    if (!sentence.trim()) {
      setAiFeedback(`先写一个包含「${targetGrammar}」的句子吧。`);
      return;
    }
    const config = loadSettings();
    if (!config.apiKey || !config.model) {
      setAiFeedback(
        "示例反馈：句子已收到。配置模型后，将从目标文法、正确性、自然度和语境四个维度评价。",
      );
      return;
    }
    setAiLoading(true);
    setAiFeedback("");
    try {
      const response = await fetch("/api/ai/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          config,
          targetGrammar,
          userSentence: sentence,
        }),
      });
      const data = (await response.json()) as { feedback?: string; error?: string };
      setAiFeedback(data.feedback ?? data.error ?? "暂时无法取得反馈。");
    } catch {
      setAiFeedback("模型服务暂时不可用，你的答案没有丢失。");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <article className="card empty-state">
          <div className="big">々</div>
          <h2>正在整理今天的学习内容…</h2>
        </article>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="page-container">
        <article className="card empty-state">
          <div className="big">!</div>
          <h2>学习任务暂时不可用</h2>
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={() => void loadPlan()}>
            重试
          </button>
        </article>
      </div>
    );
  }

  const priorityTask = plan.tasks.find(
    (task) => task.status === "pending" && task.taskType !== "new",
  );
  if (priorityTask) {
    const isReview = priorityTask.taskType === "review";
    const href = isReview
      ? "/review"
      : priorityTask.kind === "grammar"
        ? "/grammar"
        : "/vocabulary";
    return (
      <div className="page-container">
        <article className="card empty-state">
          <div className="big">↺</div>
          <h2>{isReview ? "先完成到期复习" : "先完成需要补学的内容"}</h2>
          <p>今日计划会先处理旧知识，再开放新的学习任务。</p>
          <Link className="primary-button" href={href}>
            {isReview ? "开始复习" : "前往补学"} →
          </Link>
        </article>
      </div>
    );
  }

  const current = plan.tasks.find(
    (task) =>
      task.status === "pending" && task.taskType === "new" && task.kind === kind,
  );
  if (!current) {
    return (
      <div className="page-container">
        <article className="card empty-state">
          <div className="big">✓</div>
          <h2>今天的{kind === "grammar" ? "文法" : "单词"}已完成</h2>
          <p>已完成的内容会在到期后自动进入复习队列。</p>
          <Link className="primary-button" href="/">
            返回今日计划 →
          </Link>
        </article>
      </div>
    );
  }

  const item = current.item;
  const title = item.kind === "grammar" ? item.pattern : item.word;
  const subtitle =
    item.kind === "grammar" ? item.connection : `${item.reading} · ${item.partOfSpeech}`;
  const remaining = plan.tasks.filter(
    (task) => task.status === "pending" && task.taskType === "new" && task.kind === kind,
  ).length;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">
            {kind === "grammar" ? "Grammar" : "Vocabulary"} · 今日剩余 {remaining}
          </div>
          <h1 className="page-title">先理解，再回忆。</h1>
        </div>
        <span className="pill">N5 · 学习中</span>
      </header>
      <section className="study-layout">
        <article className="card study-card">
          <span className="page-eyebrow">TODAY&apos;S NEW ITEM</span>
          <h2>{title}</h2>
          <p className="page-lead">{subtitle}　·　{item.meaning}</p>
          <div className="sentence">
            <SpeechButton text={item.example} />　{item.example}
          </div>
          <p className="page-lead">{item.translation}</p>
          {item.kind === "grammar" && (
            <div className="optional-output">
              <span className="page-eyebrow">可选 · 主动输出</span>
              <textarea
                className="answer-area"
                value={sentence}
                onChange={(event) => setSentence(event.target.value)}
                placeholder={`请用「${item.pattern}」写一个句子……`}
              />
              <button
                className="secondary-button"
                type="button"
                disabled={aiLoading}
                onClick={() => void evaluateSentence(item.pattern)}
              >
                {aiLoading ? "正在取得反馈…" : "提交造句反馈"}
              </button>
              {aiFeedback && <div className="feedback">{aiFeedback}</div>}
            </div>
          )}
          <div className="study-question">
            <h3>{current.question.prompt}</h3>
            <div className="review-options">
              {current.question.options.map((option) => (
                <button
                  className="review-option"
                  type="button"
                  key={option}
                  disabled={submitting}
                  onClick={() => void answer(current.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          {message && <div className="feedback">{message}</div>}
          {error && <div className="inline-error">{error}</div>}
        </article>
        <aside className="card study-side">
          <h3>完成后会发生什么？</h3>
          <ul>
            <li>一 <span>本次作答会保存到学习记录。</span></li>
            <li>二 <span>答对后建立独立的复习状态。</span></li>
            <li>三 <span>明日到期后优先进入复习队列。</span></li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
