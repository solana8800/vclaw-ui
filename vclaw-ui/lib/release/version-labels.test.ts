import { describe, expect, it } from "vitest";

import releaseVersions from "@/release-versions.json";
import {
  OPENCLAW_RUNTIME_VERSION_LABEL,
  RELEASE_VERSION_ROWS,
  UI_VERSION_LABEL,
  NATIVE_VERSION_LABEL,
  formatReleaseVersionLabel,
  resolveDisplayedUiVersion,
} from "@/lib/release/version-labels";

describe("version labels", () => {
  it("formats the release version rows in the expected order", () => {
    expect(RELEASE_VERSION_ROWS).toEqual([
      {
        key: "native",
        label: "Native",
        version: `v${releaseVersions.nativeVersion}`,
      },
      {
        key: "ui",
        label: "UI",
        version: `v${releaseVersions.uiVersion}`,
      },
      {
        key: "openclawRuntime",
        label: "VClaw runtime",
        version: `v${releaseVersions.openclawRuntime.version}`,
      },
    ]);
  });

  it("keeps the exported labels aligned with the JSON manifest", () => {
    expect(NATIVE_VERSION_LABEL).toBe(`v${releaseVersions.nativeVersion}`);
    expect(UI_VERSION_LABEL).toBe(`v${releaseVersions.uiVersion}`);
    expect(OPENCLAW_RUNTIME_VERSION_LABEL).toBe(`v${releaseVersions.openclawRuntime.version}`);
  });

  it("formats a single version string with the v prefix", () => {
    expect(formatReleaseVersionLabel("1.2.3")).toBe("v1.2.3");
  });

  it("ưu tiên UI version đã apply thành công từ launcher", () => {
    expect(
      resolveDisplayedUiVersion("0.1.0", [
        {
          id: "ui-update-1",
          phase: "downloaded",
          uiVersion: "0.1.1",
          updatedAt: "2026-06-03T00:00:00.000Z",
        },
        {
          id: "ui-update-2",
          phase: "applied",
          uiVersion: "0.1.1",
          updatedAt: "2026-06-03T00:00:01.000Z",
        },
      ]),
    ).toBe("0.1.1");
  });

  it("không hiển thị UI version mới nếu launcher chưa apply thành công", () => {
    expect(
      resolveDisplayedUiVersion("0.1.0", [
        {
          id: "ui-update-1",
          phase: "downloaded",
          uiVersion: "0.1.1",
          updatedAt: "2026-06-03T00:00:00.000Z",
        },
      ]),
    ).toBe("0.1.0");
  });
});
