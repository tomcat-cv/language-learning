"use client";

import { useState } from "react";
import { useKnowledgeProgress } from "./ProgressProvider";

export function MasteryButton({
  knowledgePointId,
  onMasteryDeclared,
}: {
  knowledgePointId: string;
  onMasteryDeclared?: () => void | Promise<void>;
}) {
  const {
    states,
    error: providerError,
    loading,
    declareMastery,
    completeLearning,
  } = useKnowledgeProgress();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const state = states.find(
    (candidate) => candidate.knowledgePointId === knowledgePointId,
  );

  async function handleMastery() {
    setSaving(true);
    setError("");
    try {
      await declareMastery(knowledgePointId);
      await onMasteryDeclared?.();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法保存掌握状态。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLearningCompleted() {
    setSaving(true);
    setError("");
    try {
      await completeLearning(knowledgePointId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法保存重新学习状态。",
      );
    } finally {
      setSaving(false);
    }
  }

  if (state) {
    const due = new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
    }).format(new Date(state.dueAt));
    if (state.stage === "learning") {
      return (
        <div className="mastery-control">
          <div className="mastery-status mastery-status-learning">
            <b>短测未通过，已回到学习</b>
            <small>复习上面的解释和例句，完成后安排明日短测。</small>
          </div>
          <button
            className="primary-button compact-button"
            type="button"
            onClick={handleLearningCompleted}
            disabled={saving}
          >
            {saving ? "正在保存…" : "我已重新学习，安排复习"}
          </button>
          {error && <small className="inline-error">{error}</small>}
        </div>
      );
    }

    return (
      <div className={`mastery-status mastery-status-${state.stage}`}>
        <b>
          {state.stage === "self_declared" ? "已跳过首次教学" : "已进入复习"}
        </b>
        <small>{due} 进行短测</small>
      </div>
    );
  }

  return (
    <div className="mastery-control">
      <button
        className="secondary-button compact-button"
        type="button"
        onClick={handleMastery}
        disabled={loading || saving || Boolean(providerError)}
      >
        {saving ? "正在保存…" : "我已掌握，跳过学习"}
      </button>
      {(error || providerError) && (
        <small className="inline-error">{error || providerError}</small>
      )}
    </div>
  );
}
