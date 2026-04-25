import { describe, expect, it } from "vitest";

import { buildZalouserChatHeader } from "@/lib/zalouser/zalouser-chat-header";

describe("buildZalouserChatHeader", () => {
  it("ưu tiên avatar thật của peer khi có", () => {
    expect(
      buildZalouserChatHeader({
        selectedKey: "zalouser-peer-user:1",
        sendTo: "user:1",
        peers: [{ id: "user:1", name: "Mai Anh", avatarUrl: "https://img.example/avatar.jpg" }],
        groups: [],
      }),
    ).toMatchObject({
      title: "Mai Anh",
      avatarUrl: "https://img.example/avatar.jpg",
      fallbackLabel: "MA",
      kind: "peer",
    });
  });

  it("tạo fallback cho group khi không có avatar", () => {
    expect(
      buildZalouserChatHeader({
        selectedKey: "zalouser-group-group:42",
        sendTo: "group:42",
        peers: [],
        groups: [{ id: "group:42", name: "Nhóm bán hàng", memberCount: 12 }],
      }),
    ).toMatchObject({
      title: "Nhóm bán hàng",
      avatarUrl: null,
      fallbackLabel: "NB",
      kind: "group",
    });
  });

  it("fallback theo mã người nhận khi chưa có dữ liệu tên", () => {
    expect(
      buildZalouserChatHeader({
        selectedKey: "zalouser-peer-user:99",
        sendTo: "user:99",
        peers: [],
        groups: [],
      }),
    ).toMatchObject({
      title: "user:99",
      avatarUrl: null,
      fallbackLabel: "U9",
      kind: "unknown",
    });
  });
});
