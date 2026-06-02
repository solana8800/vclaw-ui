import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { UiUpdatePhase } from "@/lib/release/ui-update-notifications";

export type UiUpdateStatusEvent = {
  id: string;
  phase: UiUpdatePhase;
  uiVersion: string;
  updatedAt: string;
  reason?: string;
};

export type UiUpdateStatus = {
  events: UiUpdateStatusEvent[];
};

const VALID_PHASES = new Set<UiUpdatePhase>([
  "detected",
  "downloading",
  "downloaded",
  "activated",
  "applied",
  "failed",
]);

function defaultUiUpdateDir(): string {
  if (process.env.VCLAW_UI_UPDATE_DIR) {
    return path.resolve(process.env.VCLAW_UI_UPDATE_DIR);
  }
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "VClaw",
      "updates",
      "ui",
    );
  }
  if (process.platform === "win32") {
    const base =
      process.env.LOCALAPPDATA ??
      path.join(os.homedir(), "AppData", "Local");
    return path.join(base, "VClaw", "updates", "ui");
  }
  return path.join(os.homedir(), ".local", "share", "vclaw", "updates", "ui");
}

export function readUiUpdateStatus(): UiUpdateStatus {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(defaultUiUpdateDir(), "status.json"), "utf8"),
    ) as { events?: unknown[] };
    const events = Array.isArray(raw.events)
      ? raw.events.filter((event): event is UiUpdateStatusEvent => {
          if (!event || typeof event !== "object") return false;
          const candidate = event as Partial<UiUpdateStatusEvent>;
          return (
            typeof candidate.id === "string" &&
            typeof candidate.phase === "string" &&
            VALID_PHASES.has(candidate.phase as UiUpdatePhase) &&
            typeof candidate.uiVersion === "string" &&
            typeof candidate.updatedAt === "string"
          );
        })
      : [];
    return { events };
  } catch {
    return { events: [] };
  }
}
