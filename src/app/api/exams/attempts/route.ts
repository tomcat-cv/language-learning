import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { enforcePersonalAccess } from "@/lib/access";
import { getDatabase } from "@/db/client";
import { certificates, examAttempts, examQuestionBanks, examQuestions, users } from "@/db/schema";
import { scoreExam, type ExamLevel, type ExamMode } from "@/domain/exam";
import { LOCAL_USER_ID } from "@/lib/progress-service";

const levels = new Set<ExamLevel>(["N5", "N4", "N3", "N2", "N1"]);

export async function POST(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;
  try {
    const body = await request.json() as { bankId?: unknown; mode?: unknown; answers?: Record<string, unknown> };
    if (typeof body.bankId !== "number" || !Number.isInteger(body.bankId) || (body.mode !== "mock" && body.mode !== "official") || !body.answers) {
      return NextResponse.json({ error: "考试提交格式不正确。" }, { status: 400 });
    }
    const db = getDatabase();
    const [bank] = await db.select().from(examQuestionBanks).where(eq(examQuestionBanks.id, body.bankId)).limit(1);
    if (!bank || !levels.has(bank.level as ExamLevel)) return NextResponse.json({ error: "未找到题库。" }, { status: 404 });
    const questions = await db.select().from(examQuestions).where(eq(examQuestions.bankId, body.bankId));
    const answers = questions.map((question) => ({
      section: question.section as "vocabulary" | "grammar" | "reading" | "listening",
      correct: body.answers?.[String(question.id)] === question.answerIndex,
    }));
    const result = scoreExam(bank.level as ExamLevel, answers);
    const mode = body.mode as ExamMode;
    await db.insert(users).values({ id: LOCAL_USER_ID }).onConflictDoNothing();
    const [attempt] = await db.insert(examAttempts).values({ userId: LOCAL_USER_ID, bankId: bank.id, level: bank.level, mode, score: result.total, passed: result.passed }).returning({ id: examAttempts.id });
    if (mode === "official" && result.passed) {
      await db.insert(certificates).values({ userId: LOCAL_USER_ID, level: bank.level, attemptId: attempt.id }).onConflictDoNothing();
    }
    return NextResponse.json({ attemptId: attempt.id, ...result });
  } catch {
    return NextResponse.json({ error: "考试提交失败。" }, { status: 500 });
  }
}
