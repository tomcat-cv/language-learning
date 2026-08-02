"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DailyPlan, DailyPlanTask } from "@/lib/progress-service";
import { ensureDailyPlan } from "@/lib/study-plan-client";
import { defaultSettings, loadSettings, type UserSettings } from "@/lib/storage";

function taskHref(task: DailyPlanTask | undefined) {
  if (!task) return "/grammar/study";
  if (task.taskType === "review") return "/review";
  if (task.taskType === "relearning") {
    return task.kind === "grammar" ? "/grammar" : "/vocabulary";
  }
  return task.kind === "grammar" ? "/grammar/study" : "/vocabulary/study";
}

export function TodayDashboard() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPlan = useCallback(async () => {
    setLoading(true);
    const currentSettings = loadSettings();
    setSettings(currentSettings);
    try {
      setPlan(await ensureDailyPlan(currentSettings));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法生成今日计划。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const currentSettings = loadSettings();
      try {
        const nextPlan = await ensureDailyPlan(currentSettings);
        if (active) {
          setSettings(currentSettings);
          setPlan(nextPlan);
          setError("");
        }
      } catch (caught) {
        if (active) {
          setSettings(currentSettings);
          setError(
            caught instanceof Error ? caught.message : "暂时无法生成今日计划。",
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

  if (loading) {
    return (
      <div className="page-container">
        <article className="card empty-state">
          <div className="big">日</div>
          <h2>正在安排今日路径…</h2>
        </article>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div>
            <div className="page-eyebrow">TODAY · {settings.targetLevel}</div>
            <h1 className="page-title">今天，也向前一点。</h1>
          </div>
        </header>
        <article className="card empty-state">
          <div className="big">!</div>
          <h2>今日计划暂时不可用</h2>
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={() => void loadPlan()}>
            重试
          </button>
        </article>
      </div>
    );
  }

  const pending = plan.tasks.filter((task) => task.status === "pending");
  const priority = pending.filter((task) => task.taskType !== "new");
  const newGrammar = plan.tasks.filter(
    (task) => task.taskType === "new" && task.kind === "grammar",
  );
  const newVocabulary = plan.tasks.filter(
    (task) => task.taskType === "new" && task.kind === "vocabulary",
  );
  const first = priority[0] ?? pending[0];
  const total = plan.tasks.length;
  const percent = total === 0 ? 100 : Math.round((plan.completedCount / total) * 100);
  const summary = [
    {
      index: "01",
      title: "复习与补学",
      detail: priority.length > 0 ? "旧知识优先处理" : "当前没有积压",
      count: plan.tasks.filter((task) => task.taskType !== "new").length,
      completed: plan.tasks.filter(
        (task) => task.taskType !== "new" && task.status === "completed",
      ).length,
      href: taskHref(priority[0]),
    },
    {
      index: "02",
      title: "新文法",
      detail: `上限 ${settings.dailyGrammar} 个，按预算实际安排`,
      count: newGrammar.length,
      completed: newGrammar.filter((task) => task.status === "completed").length,
      href: "/grammar/study",
    },
    {
      index: "03",
      title: "新单词",
      detail: `上限 ${settings.dailyVocabulary} 个，按预算实际安排`,
      count: newVocabulary.length,
      completed: newVocabulary.filter((task) => task.status === "completed").length,
      href: "/vocabulary/study",
    },
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">{plan.planDate} · {settings.targetLevel}</div>
          <h1 className="page-title">今天，也向前一点。</h1>
          <p className="page-lead">
            复习优先 · 预计 {plan.estimatedMinutes} 分钟 · 时间预算 {plan.dailyMinutes} 分钟
          </p>
        </div>
        <span className="pill">今日完成 {plan.completedCount} / {total}</span>
      </header>
      <section className="hero-grid">
        <article className="card focus-card">
          <div className="focus-top">
            <span className="focus-label">TODAY&apos;S FIRST STEP</span>
            <span className="pill">{pending.length} 项待完成</span>
          </div>
          <h2>{first ? (first.taskType === "review" ? "先从到期复习开始" : first.taskType === "relearning" ? "先补上未通过的内容" : `学习「${first.item.kind === "grammar" ? first.item.pattern : first.item.word}」`) : "今天的计划已完成"}</h2>
          <p>
            {first
              ? "计划会保存完成状态；刷新页面或重启服务后，可以从未完成任务继续。"
              : "今天安排的任务已经全部完成，到期内容会自动回到后续复习队列。"}
          </p>
          <div className="focus-actions">
            <Link className="primary-button" href={first ? taskHref(first) : "/review"}>
              {first ? "继续今日学习" : "查看复习安排"} <span>→</span>
            </Link>
            <Link className="secondary-button" href="/settings">调整计划</Link>
          </div>
        </article>
        <article className="card progress-card">
          <span className="page-eyebrow">今日完成度</span>
          <div className="progress-ring" style={{ "--progress": percent } as React.CSSProperties}>
            <span>{percent}<small>%</small></span>
          </div>
          <div className="progress-meta">
            <div><b>{plan.completedCount} / {total}</b><small>今日任务</small></div>
            <div><b>{plan.estimatedMinutes} min</b><small>预计用时</small></div>
          </div>
        </article>
      </section>
      <div className="section-head">
        <div><h2>今日路径</h2><p>到期复习优先，剩余时间交替安排新文法和单词</p></div>
        <span className="pill">日期计划已保存</span>
      </div>
      <section className="task-list">
        {summary.map((task) => {
          const taskPercent = task.count === 0 ? 100 : Math.round((task.completed / task.count) * 100);
          return (
            <Link href={task.href} className="card task-card" key={task.index}>
              <span className="task-index">{task.index} / 03</span>
              <h3>{task.title}　{task.completed} / {task.count}</h3>
              <p>{task.detail}</p>
              <div className="mini-progress"><span style={{ width: `${taskPercent}%` }} /></div>
            </Link>
          );
        })}
      </section>
      <article className="card quote-card">
        <span className="quote-mark">「</span>
        <p>毎日の小さな一歩が、いつか大きな力になる。</p>
        <small>每天的一小步，终会成为强大的力量。</small>
      </article>
    </div>
  );
}
