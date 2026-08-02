import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import { progressErrorResponse } from "@/lib/api-response";
import { submitInitialLearning } from "@/lib/progress-service";

export async function POST(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      planItemId?: unknown;
      answer?: unknown;
    };
    if (
      typeof body.planItemId !== "number" ||
      !Number.isInteger(body.planItemId) ||
      body.planItemId <= 0 ||
      typeof body.answer !== "string" ||
      body.answer.length > 200
    ) {
      return NextResponse.json(
        { error: "学习答案格式不正确。" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await submitInitialLearning(body.planItemId, body.answer),
    );
  } catch (error) {
    return progressErrorResponse(error);
  }
}
