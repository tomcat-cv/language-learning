import { NextResponse } from "next/server";
import { progressErrorResponse } from "@/lib/api-response";
import { enforcePersonalAccess } from "@/lib/access";
import { completeLearning } from "@/lib/progress-service";

export async function POST(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { knowledgePointId?: unknown };
    if (
      typeof body.knowledgePointId !== "string" ||
      body.knowledgePointId.length > 64
    ) {
      return NextResponse.json(
        { error: "缺少有效的知识点标识。" },
        { status: 400 },
      );
    }

    const state = await completeLearning(body.knowledgePointId);
    return NextResponse.json({ state });
  } catch (error) {
    return progressErrorResponse(error);
  }
}
