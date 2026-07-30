import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import { listProgress } from "@/lib/progress-service";
import { progressErrorResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;

  try {
    return NextResponse.json({ states: await listProgress() });
  } catch (error) {
    return progressErrorResponse(error);
  }
}
