import { NextResponse } from "next/server";
import { executeHeartbeat } from "@/lib/automation/marketing";
import { getApprovalConfig } from "@/lib/automation/approval-config";

export async function POST(req: Request) {
  try {
    // You can add authorization checks here if needed (e.g., cron job secret)

    const approval = await getApprovalConfig();
    if (!approval.automationEnabled) {
      return NextResponse.json(
        { success: false, error: "automation_disabled", message: "Automation đang tắt trong Cổng duyệt." },
        { status: 423 },
      );
    }

    const results = await executeHeartbeat();

    return NextResponse.json({
      success: true,
      message: "Heartbeat executed successfully",
      data: results
    });
  } catch (error) {
    console.error("[Heartbeat] Error executing heartbeat:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
