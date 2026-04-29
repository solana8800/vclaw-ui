import { NextResponse } from "next/server";
import { getBusinessReportStats } from "@/lib/commerce/report-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getBusinessReportStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[REPORT_STATS_API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
