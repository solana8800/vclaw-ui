import { describe, expect, it } from "vitest";
import { normalizeDirectoryPeersListPayload } from "@/lib/openclaw/gateway-ws-rpc-server";

describe("normalizeDirectoryPeersListPayload", () => {
  it("chuẩn hoá mảng peer kiểu CLI / gateway zalouser", () => {
    const raw = [
      {
        kind: "user",
        id: "3449465574915916286",
        name: "My Hoa",
        avatarUrl: "https://example.com/a.jpg",
        raw: {
          userId: "3449465574915916286",
          displayName: "My Hoa",
          avatar: "https://example.com/a.jpg",
        },
      },
      {
        kind: "group",
        id: "g-1",
        name: "Skip",
      },
    ];
    const out = normalizeDirectoryPeersListPayload(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      peerId: "user:3449465574915916286",
      name: "My Hoa",
      avatarUrl: "https://example.com/a.jpg",
    });
  });

  it("đọc id từ raw.userId khi thiếu id cấp trên", () => {
    const out = normalizeDirectoryPeersListPayload([
      { kind: "user", name: "X", raw: { userId: "99", displayName: "X", avatar: "" } },
    ]);
    expect(out[0]?.peerId).toBe("user:99");
  });

  it("hỗ trợ bọc { peers: [...] }", () => {
    const out = normalizeDirectoryPeersListPayload({
      peers: [{ kind: "user", id: "user:7", name: "Seven" }],
    });
    expect(out[0]?.peerId).toBe("user:7");
    expect(out[0]?.name).toBe("Seven");
  });
});
