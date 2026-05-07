import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const scriptPath = join(process.cwd(), "..", "scripts", "vclaw.sh");
const script = readFileSync(scriptPath, "utf8");
const agentToolsBridgePath = join(process.cwd(), "..", "scripts", "vclaw-agent-tools-mcp-stdio.mjs");
const agentToolsBridge = readFileSync(agentToolsBridgePath, "utf8");
const packageScriptPath = join(process.cwd(), "..", "scripts", "package-vclaw.sh");
const packageScript = readFileSync(packageScriptPath, "utf8");
const launcherScriptPath = join(process.cwd(), "launcher", "main.js");
const launcherScript = readFileSync(launcherScriptPath, "utf8");
const defaultConfigPath = join(process.cwd(), "resources", "openclaw.vclaw.default.json");
const defaultConfig = readFileSync(defaultConfigPath, "utf8");
const gatewayActionsPath = join(process.cwd(), "app", "actions", "gateway.ts");
const gatewayActions = readFileSync(gatewayActionsPath, "utf8");
const postinstallScriptPath = join(process.cwd(), "..", "scripts", "pkg-scripts", "postinstall");
const postinstallScript = readFileSync(postinstallScriptPath, "utf8");
const preinstallScriptPath = join(process.cwd(), "..", "scripts", "pkg-scripts", "preinstall");
const preinstallScript = readFileSync(preinstallScriptPath, "utf8");
const uninstallScriptPath = join(process.cwd(), "..", "scripts", "uninstall-vclaw.sh");
const uninstallScript = readFileSync(uninstallScriptPath, "utf8");

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

describe("VClaw business MCP bridge", () => {
  it("ships a stdio bridge that exposes current catalog tools", () => {
    expect(agentToolsBridge).toContain("tools/list");
    expect(agentToolsBridge).toContain("tools/call");
    expect(agentToolsBridge).toContain("vclaw.product.list");
    expect(agentToolsBridge).toContain("JSON.stringify(message)");
    expect(agentToolsBridge).toContain("outputMode");
  });

  it("uses stdio MCP config instead of unsupported raw HTTP MCP", () => {
    expect(defaultConfig).toContain('"vclaw-business"');
    expect(defaultConfig).toContain('"command": "node"');
    expect(defaultConfig).toContain("__VCLAW_AGENT_TOOLS_MCP_STDIO__");
    expect(defaultConfig).toContain("VCLAW_AGENT_TOOLS_SECRET");
    expect(defaultConfig).not.toContain('"url": "http://127.0.0.1:12687/api/vclaw/agent-tools"');
  });

  it("copies the bridge into packaged resources and resolves the config placeholder", () => {
    expect(packageScript).toContain("vclaw-agent-tools-mcp-stdio.mjs");
    expect(script).toContain("__VCLAW_AGENT_TOOLS_MCP_STDIO__");
    expect(script).toContain("repair_vclaw_business_mcp_config");
    expect(launcherScript).toContain("__VCLAW_AGENT_TOOLS_MCP_STDIO__");
    expect(launcherScript).toContain("ensureVclawBusinessMcpConfig(configPath)");
    expect(launcherScript).toContain("Repaired vclaw-business MCP bridge path");
    expect(launcherScript).toContain("VCLAW_AGENT_TOOLS_SECRET");
  });
});

describe("package-vclaw dependency install", () => {
  it("does not require a missing UI pnpm lockfile when node_modules is already present", () => {
    expect(packageScript).toContain("install_ui_dependencies");
    expect(packageScript).toContain("Không thấy pnpm-lock.yaml");
    expect(packageScript).toContain("pnpm install --no-frozen-lockfile");
  });

  it("does not package the source macos bundle inside Resources/app", () => {
    expect(packageScript).toContain('rm -rf "$CONTENTS/Resources/app/macos"');
  });

  it("marks the app bundle as non-relocatable in the component plist", () => {
    expect(packageScript).toContain("/usr/libexec/PlistBuddy");
    expect(packageScript).toContain("Set :0:BundleIsRelocatable false");
  });
});

describe("VClaw.app owns OpenClaw lifecycle", () => {
  it("starts Electron/CDP before ensuring webauth and gateway on app startup", () => {
    expect(launcherScript).toContain("await openElectronWindow(url)");
    expect(launcherScript).toContain("await ensureOpenClawGateway(gatewayEnv)");
    expect(launcherScript).toContain("'onboard', 'webauth'");
    expect(launcherScript).toContain("'gateway', 'run'");
  });

  it("requires usable webauth before starting the gateway", () => {
    expect(launcherScript).toContain("hasUsableAuthProfileForProvider(gatewayEnv, provider)");
    expect(launcherScript).toContain("const onboardReady = await runOpenClawOnboard(command, gatewayEnv)");
    expect(launcherScript).toContain("if (!onboardReady) {");
    expect(launcherScript).toContain("gateway was not started because webauth is not ready");
  });

  it("stops the gateway when the app shuts down", () => {
    expect(launcherScript).toContain("stopOpenClawGateway()");
    expect(launcherScript).toContain(".vclaw-zero-gateway.pid");
  });

  it("does not run webauth or start the gateway from pkg postinstall", () => {
    expect(postinstallScript).not.toContain("onboard webauth");
    expect(postinstallScript).not.toContain("gateway run");
    expect(postinstallScript).not.toContain("open -a VClaw");
    expect(postinstallScript).not.toContain("trình duyệt vừa mở");
  });

  it("repairs plugin manifests during pkg postinstall without owning gateway lifecycle", () => {
    expect(postinstallScript).toContain("repair_runtime_plugin_manifests()");
    expect(postinstallScript).toContain('repair_runtime_plugin_manifests "$USER_HOME/.openclaw"');
    expect(postinstallScript).toContain("dist/extensions");
  });
});

describe("OpenClaw gateway actions", () => {
  it("uses the primary DeepSeek webauth provider by default", () => {
    expect(gatewayActions).toContain("onboardWebauth(modelId = 'deepseek-web')");
  });

  it("does not start the gateway from UI actions until webauth is ready", () => {
    expect(gatewayActions).toContain("async function ensureGatewayWebauthReady()");
    expect(gatewayActions).toContain("const onboard = await ensureGatewayWebauthReady()");
    expect(gatewayActions).toContain("if (!onboard.ok) return onboard");
    expect(gatewayActions).toContain("WebAuth ${provider} chưa sẵn sàng");
  });
});

describe("pkg preinstall preserves customer data during upgrades", () => {
  it("does not remove user OpenClaw state or run gateway uninstall", () => {
    expect(preinstallScript).not.toContain('rm -rf "$USER_HOME/.openclaw"');
    expect(preinstallScript).not.toContain("gateway uninstall");
    expect(preinstallScript).not.toContain("Hard Reset");
  });

  it("only removes regenerable runtime artifacts before installing a new app", () => {
    expect(preinstallScript).toContain('rm -rf "$USER_HOME/.openclaw/runtime"');
    expect(preinstallScript).toContain('rm -rf "$USER_HOME/.openclaw/bundled-packages"');
    expect(preinstallScript).toContain('rm -f "$USER_HOME/.openclaw/.vclaw-zero-gateway.pid"');
  });
});

describe("uninstall owns explicit data removal", () => {
  it("lets users cancel the graphical uninstall before privilege escalation", () => {
    expect(postinstallScript).toContain('buttons {\\"Hủy\\", \\"Giữ lại\\", \\"Xóa sạch\\"}');
    expect(postinstallScript).toContain('default button \\"Hủy\\"');
    expect(postinstallScript).toContain('cancel button \\"Hủy\\"');
    expect(postinstallScript).toContain(') || exit 0');
  });

  it("can remove all user data only through the clean uninstall path", () => {
    expect(uninstallScript).toContain('FORCE_CLEAN="no"');
    expect(uninstallScript).toContain('--clean');
    expect(uninstallScript).toContain('rm -rf "$USER_HOME/.openclaw"');
  });

  it("stops gateways from the current and legacy pid files", () => {
    expect(uninstallScript).toContain('PID_FILES=(');
    expect(uninstallScript).toContain('"$USER_HOME/.openclaw/.vclaw-zero-gateway.pid"');
    expect(uninstallScript).toContain('"$USER_HOME/.openclaw/workspace/.vclaw-zero-gateway.pid"');
  });
});
