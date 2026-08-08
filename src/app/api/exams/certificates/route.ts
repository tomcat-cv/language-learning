import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { enforcePersonalAccess } from "@/lib/access";
import { getDatabase } from "@/db/client";
import { certificates, examAttempts } from "@/db/schema";
import { LOCAL_USER_ID } from "@/lib/progress-service";

export async function GET(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;
  try {
    const db = getDatabase();
    const rows = await db.select({ level: certificates.level, awardedAt: certificates.awardedAt, score: examAttempts.score }).from(certificates).innerJoin(examAttempts, eq(certificates.attemptId, examAttempts.id)).where(and(eq(certificates.userId, LOCAL_USER_ID))).orderBy(desc(certificates.awardedAt));
    return NextResponse.json({ certificates: rows });
  } catch {
    return NextResponse.json({ error: "证书暂时不可用。" }, { status: 503 });
  }
}
