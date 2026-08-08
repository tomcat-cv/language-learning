import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import { generateExamQuestions, type GeneratedExamQuestion, type ProviderConfig } from "@/lib/ai/providers";
import { saveAiQuestionBank } from "@/lib/exam-service";

const levels = new Set<GeneratedExamQuestion["level"]>(["N5", "N4", "N3", "N2", "N1"]);

export async function POST(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;
  try {
    const body = await request.json() as { config?: ProviderConfig; level?: string; count?: number; sections?: string; persist?: boolean };
    if (!body.config?.apiKey || !body.config.model || !body.level || !levels.has(body.level as GeneratedExamQuestion["level"])) {
      return NextResponse.json({ error: "缺少有效的模型配置或考试等级。" }, { status: 400 });
    }
    const count = body.count ?? 5;
    if (!Number.isInteger(count) || count < 1 || count > 30) {
      return NextResponse.json({ error: "题目数量必须在 1 到 30 之间。" }, { status: 400 });
    }
    const questions = await generateExamQuestions(body.config, body.level as GeneratedExamQuestion["level"], count, body.sections ?? "词汇、文法、阅读");
    const bankId = body.persist ? await saveAiQuestionBank(body.level as GeneratedExamQuestion["level"], questions, body.config.model) : undefined;
    return NextResponse.json({ questions, source: "ai-generated", reviewed: false, bankId });
  } catch {
    return NextResponse.json({ error: "AI 题目生成失败，请检查模型配置或稍后重试。" }, { status: 502 });
  }
}
