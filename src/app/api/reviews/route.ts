import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import {
  listDueReviews,
  submitReview,
} from "@/lib/progress-service";
import { progressErrorResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;

  try {
    return NextResponse.json(await listDueReviews());
  } catch (error) {
    return progressErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;

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
