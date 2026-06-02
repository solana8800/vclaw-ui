import { NextResponse } from "next/server";

import { readUiUpdateStatus } from "@/lib/release/ui-update-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(readUiUpdateStatus(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
