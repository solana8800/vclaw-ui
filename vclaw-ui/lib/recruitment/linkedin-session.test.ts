import { describe, expect, it } from "vitest";
import {
  parseLinkedInSessionFile,
  sessionDisplayLabel,
  summarizeLinkedInSession,
} from "./linkedin-session";

describe("linkedin-session", () => {
  it("summarize extracts dotcom_user from cookie", () => {
    const raw = JSON.stringify({
      cookie: "li_at=abc123; dotcom_user=solana8800; logged_in=yes",
      userAgent: "Mozilla/5.0",
    });
    const summary = summarizeLinkedInSession(parseLinkedInSessionFile(raw));
    expect(summary.hasLiAt).toBe(true);
    expect(summary.username).toBe("solana8800");
    expect(sessionDisplayLabel(summary)).toBe("@solana8800");
    expect(summary.profileUrl).toBe("https://www.linkedin.com/in/solana8800");
  });

  it("prefers profile metadata when present", () => {
    const summary = summarizeLinkedInSession({
      cookie: "li_at=x",
      profile: { name: "Nguyen Van A", username: "solana8800" },
    });
    expect(summary.displayName).toBe("Nguyen Van A");
    expect(sessionDisplayLabel(summary)).toBe("Nguyen Van A");
  });
});
