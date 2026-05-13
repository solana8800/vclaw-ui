import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  stateDir: "",
  loginQrError: undefined as unknown,
}));

vi.mock("openclaw/plugin-sdk/state-paths", () => ({
  resolveStateDir: vi.fn(() => state.stateDir),
}));

vi.mock("../runtime-api.js", () => ({
  loadOutboundMediaFromUrl: vi.fn(),
}));

vi.mock("zca-js", () => ({
  Zalo: class MockZalo {
    login = vi.fn();
    loginQR = vi.fn(async () => {
      throw state.loginQrError;
    });
  },
}));

const originalFetch = globalThis.fetch;

function createNetworkError(): Error {
  const error = new TypeError("fetch failed");
  (error as Error & { cause?: unknown }).cause = {
    code: "ENOTFOUND",
    hostname: "id.zalo.me",
    syscall: "getaddrinfo",
  };
  return error;
}

describe("startZaloQrLogin diagnostics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.stateDir = mkdtempSync(path.join(os.tmpdir(), "zalouser-qr-login-"));
    state.loginQrError = createNetworkError();
    globalThis.fetch = vi.fn(async () => {
      throw createNetworkError();
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns the Zalo QR endpoint and network cause when QR login fetch fails", async () => {
    const { startZaloQrLogin } = await import("./zalo-js.js");

    const result = await startZaloQrLogin({ timeoutMs: 3_000 });

    expect(result.message).toContain("Failed to start QR login");
    expect(result.message).toContain("id.zalo.me");
    expect(result.message).toContain("ENOTFOUND");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://id.zalo.me/account"),
      expect.objectContaining({ method: "GET" }),
    );
  });
});
