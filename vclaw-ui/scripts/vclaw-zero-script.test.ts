import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const scriptPath = join(process.cwd(), "..", "scripts", "vclaw-zero.sh");
const script = readFileSync(scriptPath, "utf8");
const packageScriptPath = join(process.cwd(), "..", "scripts", "package-vclaw.sh");
const packageScript = readFileSync(packageScriptPath, "utf8");

describe("vclaw-zero packaged launcher", () => {
  it("self-installs the bundled OpenClaw runtime when the global command is missing", () => {
    expect(script).toContain("openclaw-bundled.tgz");
    expect(script).toContain('npm install "$bundled_tgz"');
    expect(script).toContain("ensure_packaged_openclaw");
  });

  it("uses the resolved packaged runtime command for onboard and gateway", () => {
    expect(script).toContain('OPENCLAW_CMD="$resolved"');
    expect(script).toContain('"$OPENCLAW_CMD" onboard webauth');
    expect(script).toContain('nohup "$OPENCLAW_CMD" gateway run --port "$PORT" --force');
  });
});

describe("package-vclaw dependency install", () => {
  it("does not require a missing UI pnpm lockfile when node_modules is already present", () => {
    expect(packageScript).toContain("install_ui_dependencies");
    expect(packageScript).toContain("Không thấy pnpm-lock.yaml");
    expect(packageScript).toContain("pnpm install --no-frozen-lockfile");
  });
});
