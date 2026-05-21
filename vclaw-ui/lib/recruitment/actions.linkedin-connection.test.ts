// @vitest-environment node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {},
}));

vi.mock("@/lib/actions/recruitment-settings-actions", () => ({
  getRecruitmentSettings: vi.fn(async () => null),
}));

describe("checkLinkedInConnection", () => {
  let tmpHome: string;

  beforeEach(() => {
    vi.resetModules();
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "vclaw-linkedin-session-"));
    vi.stubEnv("HOME", tmpHome);
    vi.stubEnv("OPENCLAW_GATEWAY_URL", "http://gateway.test");
    vi.stubEnv("LINKEDIN_CDP_URL", "http://cdp.test");

    const workspaceDir = path.join(tmpHome, ".openclaw", "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, "linkedin-session.json"),
      JSON.stringify({
        cookie: "li_at=existing-session; dotcom_user=me",
        userAgent: "Vitest",
        profile: { name: "Existing User", url: "https://www.linkedin.com/in/me" },
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("khong scrape profile qua CDP khi chi kiem tra trang thai settings", async () => {
    const invokedActions: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "http://cdp.test/json/version") {
          return Response.json({ webSocketDebuggerUrl: "ws://cdp.test/devtools/browser/1" });
        }
        if (url === "http://gateway.test/tools/invoke") {
          const body = JSON.parse(String(init?.body ?? "{}")) as { action?: string };
          invokedActions.push(body.action ?? "");
          return Response.json({ ok: true, result: { data: { success: true, data: "{}" } } });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const { checkLinkedInConnection } = await import("./actions");
    const result = await checkLinkedInConnection();

    expect(result.loggedIn).toBe(true);
    expect(result.profile?.name).toBe("Existing User");
    expect(invokedActions).toEqual(["get_session"]);
  });
});
