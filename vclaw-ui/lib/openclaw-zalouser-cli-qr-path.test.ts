import { describe, expect, it } from "vitest";
import {
  isAllowedOpenclawZalouserQrBasename,
  resolveOpenclawZalouserCliQrFile,
  resolveZalouserCliQrFilePathForServer,
  ZALOUSER_CLI_QR_DEFAULT_UNIX,
} from "@/lib/openclaw-zalouser-cli-qr-path";

describe("isAllowedOpenclawZalouserQrBasename", () => {
  it("accepts default and account-specific names", () => {
    expect(isAllowedOpenclawZalouserQrBasename("openclaw-zalouser-qr-default.png")).toBe(true);
    expect(isAllowedOpenclawZalouserQrBasename("openclaw-zalouser-qr-work.png")).toBe(true);
  });
  it("rejects other files", () => {
    expect(isAllowedOpenclawZalouserQrBasename("evil.png")).toBe(false);
    expect(isAllowedOpenclawZalouserQrBasename("openclaw-zalouser-qr-default.jpg")).toBe(false);
  });
});

describe("resolveOpenclawZalouserCliQrFile", () => {
  it("requires absolute path and valid basename", () => {
    expect(resolveOpenclawZalouserCliQrFile("relative/openclaw-zalouser-qr-default.png")).toBeNull();
    expect(resolveOpenclawZalouserCliQrFile("/tmp/openclaw/evil.png")).toBeNull();
    expect(resolveOpenclawZalouserCliQrFile("/tmp/openclaw/openclaw-zalouser-qr-default.png")).toBe(
      "/tmp/openclaw/openclaw-zalouser-qr-default.png",
    );
  });
});

describe("resolveZalouserCliQrFilePathForServer", () => {
  it("uses default unix path when OPENCLAW_ZALOUSER_QR_FILE unset", () => {
    if (process.platform === "win32") return;
    const prev = process.env.OPENCLAW_ZALOUSER_QR_FILE;
    delete process.env.OPENCLAW_ZALOUSER_QR_FILE;
    expect(resolveZalouserCliQrFilePathForServer()).toBe(ZALOUSER_CLI_QR_DEFAULT_UNIX);
    if (prev !== undefined) process.env.OPENCLAW_ZALOUSER_QR_FILE = prev;
  });
});
