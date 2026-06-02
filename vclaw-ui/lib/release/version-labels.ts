import releaseVersions from "@/release-versions.json";

export type ReleaseVersionRow = {
  key: "native" | "ui" | "openclawRuntime";
  label: string;
  version: string;
};

export function formatReleaseVersionLabel(version: string) {
  return `v${version}`;
}

export const RELEASE_VERSION_ROWS = [
  {
    key: "native",
    label: "Native",
    version: formatReleaseVersionLabel(releaseVersions.nativeVersion),
  },
  {
    key: "ui",
    label: "UI",
    version: formatReleaseVersionLabel(releaseVersions.uiVersion),
  },
  {
    key: "openclawRuntime",
    label: "OpenClaw runtime",
    version: formatReleaseVersionLabel(releaseVersions.openclawRuntime.version),
  },
] as const satisfies readonly ReleaseVersionRow[];

export const NATIVE_VERSION_LABEL = RELEASE_VERSION_ROWS[0].version;
export const UI_VERSION_LABEL = RELEASE_VERSION_ROWS[1].version;
export const OPENCLAW_RUNTIME_VERSION_LABEL = RELEASE_VERSION_ROWS[2].version;
