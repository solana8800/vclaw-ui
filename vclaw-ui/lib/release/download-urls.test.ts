import { describe, expect, it } from "vitest";

import {
  DOWNLOAD_RELEASE_VERSION,
  INSTALLER_DOWNLOAD_URLS,
  RELEASE_REPOSITORY,
  installerAssetName,
  releaseDownloadBaseUrl,
} from "@/lib/release/download-urls";

describe("release download URLs", () => {
  it("uses the VClaw artifact repository and latest release tag for landing downloads", () => {
    expect(RELEASE_REPOSITORY).toBe("solana8800/vclaw");
    expect(releaseDownloadBaseUrl()).toBe(
      "https://github.com/solana8800/vclaw/releases/latest/download",
    );
    expect(INSTALLER_DOWNLOAD_URLS.macos).toBe(
      `https://github.com/solana8800/vclaw/releases/latest/download/VClawInstaller-${DOWNLOAD_RELEASE_VERSION}-arm64.pkg`,
    );
  });

  it("builds installer asset names from the release version for every desktop platform", () => {
    expect(installerAssetName("macos", "0.2.3")).toBe(
      "VClawInstaller-0.2.3-arm64.pkg",
    );
    expect(installerAssetName("windows", "0.2.3")).toBe(
      "VClawInstaller-0.2.3-x64.exe",
    );
    expect(installerAssetName("ubuntu", "0.2.3")).toBe(
      "VClawInstaller-0.2.3-x64.deb",
    );
  });

  it("can still build a fixed-tag release asset URL when needed", () => {
    expect(releaseDownloadBaseUrl("v0.1.0")).toBe(
      "https://github.com/solana8800/vclaw/releases/download/v0.1.0",
    );
  });
});
