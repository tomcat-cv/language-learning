import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { enforcePersonalAccess } from "@/lib/access";

export function proxy(request: NextRequest) {
  return enforcePersonalAccess(request) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
