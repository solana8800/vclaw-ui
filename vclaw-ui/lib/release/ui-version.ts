import releaseVersions from "@/release-versions.json";

export function formatUiVersionLabel(version: string) {
  return `v${version}`;
}

export const UI_VERSION_LABEL = formatUiVersionLabel(releaseVersions.uiVersion);
