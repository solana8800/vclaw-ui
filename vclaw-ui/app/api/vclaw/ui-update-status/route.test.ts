import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

describe("GET /api/vclaw/ui-update-status", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trả lifecycle events từ launcher updater", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vclaw-ui-update-api-"));
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(
      join(tempDir, "status.json"),
      `${JSON.stringify({
        events: [
          {
            id: "ui-update-1",
            phase: "detected",
            uiVersion: "0.2.1",
            updatedAt: "2026-06-03T00:00:00.000Z",
          },
        ],
      })}\n`,
    );
    vi.stubEnv("VCLAW_UI_UPDATE_DIR", tempDir);

    const { GET } = await import("@/app/api/vclaw/ui-update-status/route");
    const response = await GET();

    expect(await response.json()).toEqual({
      events: [
        {
          id: "ui-update-1",
          phase: "detected",
          uiVersion: "0.2.1",
          updatedAt: "2026-06-03T00:00:00.000Z",
        },
      ],
    });
  });
});
