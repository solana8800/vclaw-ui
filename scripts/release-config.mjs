export const RELEASE_REPO = 'solana8800/vclaw';

export function releaseDownloadBaseUrl(tag) {
  return `https://github.com/${RELEASE_REPO}/releases/download/${tag}`;
}
