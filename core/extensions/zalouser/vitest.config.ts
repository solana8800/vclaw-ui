import { defineConfig } from "vitest/config";

/** Chạy độc lập trong gói extension (không có cây `openclaw` đầy đủ). Các file dưới phụ thuộc `../../../test/helpers` của monorepo OpenClaw. */
const monorepoOnlyTests = [
  "src/setup-surface.test.ts",
  "src/channel.sendpayload.test.ts",
  "src/channel.setup.test.ts",
  "src/status-issues.test.ts",
  "src/outbound-payload.contract.test.ts",
];

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: monorepoOnlyTests,
  },
});
