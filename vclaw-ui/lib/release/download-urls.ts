import releaseVersions from "@/release-versions.json";

export const RELEASE_REPOSITORY = "solana8800/vclaw";
export const DOWNLOAD_RELEASE_VERSION = releaseVersions.nativeVersion;
export const DOWNLOAD_RELEASE_TAG = `v${DOWNLOAD_RELEASE_VERSION}`;

const INSTALLER_PLATFORMS = {
  macos: { arch: "arm64", extension: "pkg" },
  windows: { arch: "x64", extension: "exe" },
  ubuntu: { arch: "x64", extension: "deb" },
} as const;

export type DownloadPlatform = keyof typeof INSTALLER_PLATFORMS;

export function releaseDownloadBaseUrl(tag = DOWNLOAD_RELEASE_TAG) {
  return `https://github.com/${RELEASE_REPOSITORY}/releases/download/${tag}`;
}

export function installerAssetName(
  platform: DownloadPlatform,
  version = DOWNLOAD_RELEASE_VERSION,
) {
  const target = INSTALLER_PLATFORMS[platform];
  return `VClawInstaller-${version}-${target.arch}.${target.extension}`;
}

export function installerDownloadUrl(
  platform: DownloadPlatform,
  version = DOWNLOAD_RELEASE_VERSION,
) {
  return `${releaseDownloadBaseUrl()}/${installerAssetName(platform, version)}`;
}

export const INSTALLER_DOWNLOAD_URLS = {
  macos: installerDownloadUrl("macos"),
  windows: installerDownloadUrl("windows"),
  ubuntu: installerDownloadUrl("ubuntu"),
} as const satisfies Record<DownloadPlatform, string>;
