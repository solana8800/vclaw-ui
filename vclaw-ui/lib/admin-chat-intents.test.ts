import { describe, expect, it } from "vitest";

import { matchAdminChatIntent } from "@/lib/admin-chat-intents";

describe("matchAdminChatIntent", () => {
  it("uu tien dieu huong den zalo user khi co y dang nhap bang qr", () => {
    const intent = matchAdminChatIntent("hay gen qr code de dang nhap zalo");
    expect(intent).toEqual({ kind: "nav", path: "/admin/zalouser" });
  });

  it("khong con dieu huong den route onboarding cu", () => {
    const intent = matchAdminChatIntent("mo onboarding cua hang");
    expect(intent).toEqual({ kind: "nav", path: "/admin/settings" });
  });

  it("khong con dieu huong den route integrations cu", () => {
    const intent = matchAdminChatIntent("mo trang tich hop kenh");
    expect(intent).toEqual({ kind: "nav", path: "/admin/settings" });
  });
});
