import type { DailyPlan } from "@/lib/progress-service";
import type { UserSettings } from "@/lib/storage";

export function getLocalPlanDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function ensureDailyPlan(settings: UserSettings) {
  const response = await fetch("/api/study-plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      planDate: getLocalPlanDate(),
      timezoneOffset: new Date().getTimezoneOffset(),
      targetLevel: settings.targetLevel,
      dailyMinutes: settings.dailyMinutes,
      grammarLimit: settings.dailyGrammar,
      vocabularyLimit: settings.dailyVocabulary,
    }),
  });
  const data = (await response.json()) as { plan?: DailyPlan; error?: string };
  if (!response.ok || !data.plan) {
    throw new Error(data.error ?? "暂时无法生成今日计划。");
  }
  return data.plan;
}
