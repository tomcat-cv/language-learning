import { NextResponse } from "next/server";
import { listProgress } from "@/lib/progress-service";
import { progressErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    return NextResponse.json({ states: await listProgress() });
  } catch (error) {
    return progressErrorResponse(error);
  }
}
