/**
 * Khả năng API Linxa MCP (đã xác minh trong recruitment-bridge + thử thực tế gửi tin).
 * Linxa: đọc inbox, messages, next-actions, comment nội bộ — KHÔNG gửi lời mời kết nối LinkedIn.
 */
export const LINXA_MCP_ACTIONS = [
  "check_auth",
  "list_conversations",
  "get_messages",
  "next_actions",
  "add_comment",
  "mark_as_read",
] as const;

export const LINXA_SUPPORTS_LINKEDIN_CONNECT = false;

/** Thử endpoint giả định — trả false nếu 404 (không chặn UX). */
export async function probeLinxaConnectSupport(token: string): Promise<boolean> {
  if (!token.trim()) return false;
  try {
    const res = await fetch("https://app.uselinxa.com/api/mcp/connection-request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ profileUrl: "https://www.linkedin.com/in/probe" }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
