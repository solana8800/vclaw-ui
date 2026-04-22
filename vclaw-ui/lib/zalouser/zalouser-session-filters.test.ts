import { describe, expect, it } from "vitest";
import { filterSessionsForZalouserUi } from "@/lib/zalouser/zalouser-session-filters";

describe("filterSessionsForZalouserUi", () => {
  it("keeps keys containing zalouser", () => {
    const rows = [
      { key: "agent:main:zalouser:u-123", title: "Chat" },
      { key: "agent:main:main", title: "Other" },
    ];
    expect(filterSessionsForZalouserUi(rows)).toEqual([rows[0]]);
  });
  it("drops rows without key", () => {
    expect(filterSessionsForZalouserUi([{ title: "x" }])).toEqual([]);
  });
});
