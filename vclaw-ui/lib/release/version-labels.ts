import releaseVersions from "@/release-versions.json";
import type { UiUpdateStatusEvent } from "@/lib/release/ui-update-status";

export type ReleaseVersionRow = {
  key: "native" | "ui" | "openclawRuntime";
  label: string;
  version: string;
};

export function formatReleaseVersionLabel(version: string) {
  return `v${version}`;
}

export const BUNDLED_UI_VERSION = releaseVersions.uiVersion;

export function resolveDisplayedUiVersion(
  bundledVersion: string,
  events: UiUpdateStatusEvent[],
) {
  return (
    events
      .slice()
      .reverse()
      .find((event) => event.phase === "applied")?.uiVersion ?? bundledVersion
  );
}

export function getReleaseVersionRows(uiVersion = BUNDLED_UI_VERSION) {
  return [
    {
      key: "native",
      label: "Native",
      version: formatReleaseVersionLabel(releaseVersions.nativeVersion),
    },
    {
      key: "ui",
      label: "UI",
      version: formatReleaseVersionLabel(uiVersion),
    },
    {
      key: "openclawRuntime",
      label: "VClaw runtime",
      version: formatReleaseVersionLabel(releaseVersions.openclawRuntime.version),
    },
  ] as const satisfies readonly ReleaseVersionRow[];
}

export const RELEASE_VERSION_ROWS = getReleaseVersionRows();

export const NATIVE_VERSION_LABEL = RELEASE_VERSION_ROWS[0].version;
export const UI_VERSION_LABEL = RELEASE_VERSION_ROWS[1].version;
export const OPENCLAW_RUNTIME_VERSION_LABEL = RELEASE_VERSION_ROWS[2].version;
