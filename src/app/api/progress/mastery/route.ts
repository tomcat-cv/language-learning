import { NextResponse } from "next/server";
import { declareMastery } from "@/lib/progress-service";
import { progressErrorResponse } from "@/lib/api-response";

export async function POST(request: Request) {
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

    const state = await declareMastery(body.knowledgePointId);
    return NextResponse.json({ state });
  } catch (error) {
    return progressErrorResponse(error);
  }
}
