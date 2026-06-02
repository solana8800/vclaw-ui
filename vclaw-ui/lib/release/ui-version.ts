import releaseVersions from "@/release-versions.json";

import { formatReleaseVersionLabel } from "@/lib/release/version-labels";

export function formatUiVersionLabel(version: string) {
  return formatReleaseVersionLabel(version);
}

export const UI_VERSION_LABEL = formatReleaseVersionLabel(releaseVersions.uiVersion);
