import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import { resetLevelProgress } from "@/lib/progress-service";
import type { CurriculumLevel } from "@/db/schema";

const levels = new Set<CurriculumLevel>(["N5", "N4", "N3", "N2", "N1"]);

export async function POST(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;
  try {
    const body = await request.json() as { level?: unknown };
    if (typeof body.level !== "string" || !levels.has(body.level as CurriculumLevel)) {
      return NextResponse.json({ error: "等级格式不正确。" }, { status: 400 });
    }
    await resetLevelProgress(body.level as CurriculumLevel);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "等级学习记录重置失败。" }, { status: 500 });
  }
}
