import { describe, expect, it } from "vitest";
import { pickZalouserAccountFromChannelsStatus } from "@/lib/zalouser/zalouser-status-account";

describe("pickZalouserAccountFromChannelsStatus", () => {
  it("returns null for non-object", () => {
    expect(pickZalouserAccountFromChannelsStatus(null)).toBeNull();
    expect(pickZalouserAccountFromChannelsStatus(1)).toBeNull();
  });

  it("picks default account and display name", () => {
    const status = {
      channelAccounts: {
        zalouser: [
          { accountId: "work", name: "Work", linked: false },
          { accountId: "default", name: "Zalo User", linked: true, running: true },
        ],
      },
      channelDefaultAccountId: { zalouser: "default" },
    };
    const r = pickZalouserAccountFromChannelsStatus(status);
    expect(r).toEqual({
      accountId: "default",
      displayName: "Zalo User",
      linked: true,
      running: true,
    });
  });

  it("falls back to accountId when name missing", () => {
    const status = {
      channelAccounts: {
        zalouser: [{ accountId: "default", linked: false }],
      },
      channelDefaultAccountId: { zalouser: "default" },
    };
    expect(pickZalouserAccountFromChannelsStatus(status)).toEqual({
      accountId: "default",
      displayName: "default",
      linked: false,
      running: false,
    });
  });
});
