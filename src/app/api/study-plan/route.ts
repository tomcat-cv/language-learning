import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import { progressErrorResponse } from "@/lib/api-response";
import {
  createDailyPlan,
  getDailyPlan,
  type DailyPlanSettings,
} from "@/lib/progress-service";
import type { CurriculumLevel } from "@/db/schema";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LEVELS = new Set<CurriculumLevel>(["N5", "N4", "N3", "N2", "N1"]);

function validInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isCurrentLocalDate(planDate: string, timezoneOffset: number) {
  const localNow = new Date(Date.now() - timezoneOffset * 60_000);
  return localNow.toISOString().slice(0, 10) === planDate;
}

function parseSettings(value: unknown): DailyPlanSettings | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.planDate !== "string" ||
    !DATE_PATTERN.test(body.planDate) ||
    (body.targetLevel !== undefined && typeof body.targetLevel !== "string") ||
    (body.targetLevel !== undefined && !LEVELS.has(body.targetLevel as CurriculumLevel)) ||
    !validInteger(body.timezoneOffset, -840, 840) ||
    !validInteger(body.dailyMinutes, 5, 240) ||
    !validInteger(body.grammarLimit, 0, 50) ||
    !validInteger(body.vocabularyLimit, 0, 200) ||
    !isCurrentLocalDate(body.planDate, body.timezoneOffset)
  ) {
    return null;
  }
  return { ...body, targetLevel: (body.targetLevel ?? "N5") as CurriculumLevel } as DailyPlanSettings;
}

export async function GET(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;
  const planDate = new URL(request.url).searchParams.get("date");
  if (!planDate || !DATE_PATTERN.test(planDate)) {
    return NextResponse.json({ error: "日期格式不正确。" }, { status: 400 });
  }

  try {
    return NextResponse.json({ plan: await getDailyPlan(planDate) });
  } catch (error) {
    return progressErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;

  try {
    const settings = parseSettings(await request.json());
    if (!settings) {
      return NextResponse.json(
        { error: "每日计划设置格式不正确。" },
        { status: 400 },
      );
    }
    return NextResponse.json({ plan: await createDailyPlan(settings) });
  } catch (error) {
    return progressErrorResponse(error);
  }
}
