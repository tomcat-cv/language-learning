import { asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { examQuestionBanks, examQuestions, type CurriculumLevel } from "@/db/schema";
import type { GeneratedExamQuestion } from "@/lib/ai/providers";

export async function saveAiQuestionBank(
  level: CurriculumLevel,
  questions: GeneratedExamQuestion[],
  model: string,
) {
  const db = getDatabase();
  return db.transaction(async (transaction) => {
    const [bank] = await transaction.insert(examQuestionBanks).values({
      sourceType: "ai",
      level,
      title: `${level} AI 模拟题 · ${new Date().toLocaleDateString("zh-CN")}`,
      metadata: { model, reviewed: false, questionCount: questions.length },
    }).returning({ id: examQuestionBanks.id });
    await transaction.insert(examQuestions).values(questions.map((question) => ({
      bankId: bank.id,
      section: question.section,
      prompt: question.prompt,
      options: question.options,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    })));
    return bank.id;
  });
}

export async function listQuestionBanks() {
  const db = getDatabase();
  return db.select({
    id: examQuestionBanks.id,
    sourceType: examQuestionBanks.sourceType,
    level: examQuestionBanks.level,
    title: examQuestionBanks.title,
    sourceUrl: examQuestionBanks.sourceUrl,
    createdAt: examQuestionBanks.createdAt,
  }).from(examQuestionBanks).orderBy(desc(examQuestionBanks.createdAt), asc(examQuestionBanks.level));
}

export async function getQuestionBank(id: number) {
  const db = getDatabase();
  const [bank] = await db.select().from(examQuestionBanks).where(eq(examQuestionBanks.id, id)).limit(1);
  if (!bank) return null;
  const questions = await db.select().from(examQuestions).where(eq(examQuestions.bankId, id)).orderBy(asc(examQuestions.id));
  return { bank, questions };
}
