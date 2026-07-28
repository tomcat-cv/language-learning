"use client";

import { useState } from "react";
import { useKnowledgeProgress } from "./ProgressProvider";

export function MasteryButton({
  knowledgePointId,
}: {
  knowledgePointId: string;
}) {
  const { states, error: providerError, loading, declareMastery } =
    useKnowledgeProgress();
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
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "暂时无法保存掌握状态。",
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
    return (
      <div className={`mastery-status mastery-status-${state.stage}`}>
        <b>
          {state.stage === "learning"
            ? "短测未通过，已回到学习"
            : state.stage === "self_declared"
              ? "已跳过首次教学"
              : "已进入复习"}
        </b>
        <small>
          {state.stage === "learning" ? "请重新学习此内容" : `${due} 进行短测`}
        </small>
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
