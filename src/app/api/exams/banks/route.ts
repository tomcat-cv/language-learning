import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";
import { getQuestionBank, listQuestionBanks } from "@/lib/exam-service";

export async function GET(request: Request) {
  const denied = enforcePersonalAccess(request);
  if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const bank = await getQuestionBank(Number(id));
      return NextResponse.json({ bank });
    }
    return NextResponse.json({ banks: await listQuestionBanks() });
  } catch {
    return NextResponse.json({ error: "题库暂时不可用。" }, { status: 503 });
  }
}
