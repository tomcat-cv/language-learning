import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError } from "@/db/client";

export function progressErrorResponse(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "DATABASE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  if (error instanceof Error && error.message === "UNKNOWN_KNOWLEDGE_POINT") {
    return NextResponse.json({ error: "未知的学习内容。" }, { status: 404 });
  }

  if (error instanceof Error && error.message === "REVIEW_NOT_DUE") {
    return NextResponse.json(
      { error: "这项内容当前不在到期复习队列中。" },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { error: "学习进度服务暂时不可用，请稍后重试。" },
    { status: 500 },
  );
}
