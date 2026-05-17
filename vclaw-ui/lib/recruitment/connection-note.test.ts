import { describe, expect, it } from "vitest";
import {
  parseConnectionNoteResponse,
  truncateConnectNote,
} from "@/lib/recruitment/connection-note";
import { buildJdConnectNoteFallback } from "@/lib/recruitment/connection-note-fallback";
import { LINXA_SUPPORTS_LINKEDIN_CONNECT } from "@/lib/recruitment/linxa-capabilities";

describe("connection-note", () => {
  it("parse JSON note", () => {
    const raw = '{"note":"Chào bạn, mình đang tuyển PM."}';
    expect(parseConnectionNoteResponse(raw)).toBe("Chào bạn, mình đang tuyển PM.");
  });

  it("truncate over 300 chars", () => {
    const long = "a".repeat(350);
    expect(truncateConnectNote(long).length).toBeLessThanOrEqual(300);
  });

  it("fallback note under limit", () => {
    const note = buildJdConnectNoteFallback({
      candidateName: "Nguyễn Văn A",
      jobTitle: "Senior Engineer",
      matchScore: 72,
      locale: "vi",
    });
    expect(note.length).toBeLessThanOrEqual(300);
    expect(note).toContain("Senior Engineer");
  });
});

describe("linxa-capabilities", () => {
  it("does not support LinkedIn connect", () => {
    expect(LINXA_SUPPORTS_LINKEDIN_CONNECT).toBe(false);
  });
});
