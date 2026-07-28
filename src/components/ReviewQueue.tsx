"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useKnowledgeProgress } from "./ProgressProvider";

type ReviewItem = {
  knowledgePointId: string;
  kind: "grammar" | "vocabulary";
  label: string;
  prompt: string;
  options: string[];
  dueAt: string;
  stage: "self_declared" | "review";
};

type QueueResponse = {
  items?: ReviewItem[];
  upcomingCount?: number;
  learningCount?: number;
  error?: string;
};

async function fetchQueue() {
  const response = await fetch("/api/reviews", { cache: "no-store" });
  const data = (await response.json()) as QueueResponse;
  if (!response.ok) {
    throw new Error(data.error ?? "暂时无法读取复习队列。");
  }
  return data;
}

export function ReviewQueue() {
  const { reload: reloadProgress } = useKnowledgeProgress();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQueue();
      setItems(data.items ?? []);
      setUpcomingCount(data.upcomingCount ?? 0);
      setLearningCount(data.learningCount ?? 0);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法读取复习队列。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await fetchQueue();
        if (active) {
          setItems(data.items ?? []);
          setUpcomingCount(data.upcomingCount ?? 0);
          setLearningCount(data.learningCount ?? 0);
          setError("");
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "暂时无法读取复习队列。",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function answer(item: ReviewItem, selectedAnswer: string) {
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          knowledgePointId: item.knowledgePointId,
          answer: selectedAnswer,
        }),
      });
      const data = (await response.json()) as {
        correct?: boolean;
        correctAnswer?: string;
        error?: string;
      };
      if (!response.ok || typeof data.correct !== "boolean") {
        throw new Error(data.error ?? "暂时无法提交复习结果。");
      }
      setMessage(
        data.correct
          ? "回答正确，下一次复习间隔已延长。"
          : `这次未通过，正确答案是“${data.correctAnswer}”。该内容已回到学习队列。`,
      );
      await Promise.all([loadQueue(), reloadProgress()]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法提交复习结果。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <article className="card empty-state">
        <div className="big">↺</div>
        <h2>正在整理复习队列…</h2>
      </article>
    );
  }

  if (error) {
    return (
      <article className="card empty-state">
        <div className="big">!</div>
        <h2>复习记录暂时不可用</h2>
        <p>{error}</p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void loadQueue()}
          style={{ marginTop: 22 }}
        >
          重试
        </button>
      </article>
    );
  }

  const current = items[0];
  if (!current) {
    return (
      <article className="card empty-state">
        <div className="big">✓</div>
        <h2>现在没有到期复习</h2>
        <p>
          已安排 {upcomingCount} 项后续短测。
          {learningCount > 0 && `另有 ${learningCount} 项需要重新学习。`}
        </p>
        {message && <div className="feedback review-feedback">{message}</div>}
        <Link
          className="primary-button"
          href="/grammar"
          style={{ marginTop: 22 }}
        >
          浏览文法与单词 →
        </Link>
      </article>
    );
  }

  return (
    <article className="card review-card">
      <div className="review-meta">
        <span className="page-eyebrow">
          {current.kind === "grammar" ? "GRAMMAR" : "VOCABULARY"}
        </span>
        <span className="pill">
          {current.stage === "self_declared" ? "首次掌握验证" : "到期复习"}
        </span>
      </div>
      <h2>{current.label}</h2>
      <p className="page-lead">{current.prompt}</p>
      <div className="review-options">
        {current.options.map((option) => (
          <button
            className="review-option"
            type="button"
            key={option}
            onClick={() => void answer(current, option)}
            disabled={submitting}
          >
            {option}
          </button>
        ))}
      </div>
      {message && <div className="feedback">{message}</div>}
      <small className="review-remaining">本轮剩余 {items.length} 项</small>
    </article>
  );
}
