import { describe, expect, it } from "vitest";

import {
  getGatewayConnectionState,
  getGatewayStatusTransition,
} from "@/lib/openclaw/gateway-status-notifications";

describe("gateway status notifications", () => {
  it("treats a healthy card as success", () => {
    expect(
      getGatewayConnectionState({
        diagnosis: "ok",
        authConfigured: true,
      }),
    ).toBe("success");
  });

  it("treats missing auth or a non-ok diagnosis as error", () => {
    expect(
      getGatewayConnectionState({
        diagnosis: "unreachable",
        authConfigured: true,
      }),
    ).toBe("error");

    expect(
      getGatewayConnectionState({
        diagnosis: "ok",
        authConfigured: false,
      }),
    ).toBe("error");
  });

  it("flags a degraded transition when the gateway drops from success to error", () => {
    expect(getGatewayStatusTransition("success", "error")).toBe("degraded");
  });

  it("flags a recovered transition when the gateway recovers from error to success", () => {
    expect(getGatewayStatusTransition("error", "success")).toBe("recovered");
  });

  it("stays silent when the state does not change or when no previous state exists", () => {
    expect(getGatewayStatusTransition("success", "success")).toBeNull();
    expect(getGatewayStatusTransition(null, "success")).toBeNull();
  });
});
