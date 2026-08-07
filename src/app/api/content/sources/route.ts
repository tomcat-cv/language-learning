import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import { listContentSourceSummaries } from "@/lib/content-service";

export async function GET(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;

  try {
    return NextResponse.json({ sources: await listContentSourceSummaries() });
  } catch {
    return NextResponse.json(
      { error: "暂时无法读取内容来源状态。" },
      { status: 503 },
    );
  }
}
