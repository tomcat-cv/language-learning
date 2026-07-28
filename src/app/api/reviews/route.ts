import { NextResponse } from "next/server";
import {
  listDueReviews,
  submitReview,
} from "@/lib/progress-service";
import { progressErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    return NextResponse.json(await listDueReviews());
  } catch (error) {
    return progressErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      knowledgePointId?: unknown;
      answer?: unknown;
    };
    if (
      typeof body.knowledgePointId !== "string" ||
      body.knowledgePointId.length > 64 ||
      typeof body.answer !== "string" ||
      body.answer.length > 200
    ) {
      return NextResponse.json(
        { error: "复习答案格式不正确。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await submitReview(body.knowledgePointId, body.answer),
    );
  } catch (error) {
    return progressErrorResponse(error);
  }
}
