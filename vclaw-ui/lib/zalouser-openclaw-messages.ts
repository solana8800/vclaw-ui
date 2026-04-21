/** Chuỗi i18n cho panel Zalo Personal (OpenClaw). */
export type ZalouserPanelMessages = {
  warning: string;
  noToken: string;
  statusTitle: string;
  refreshStatus: string;
  rawJsonHint: string;
  loginTitle: string;
  showQr: string;
  waitQr: string;
  logout: string;
  logoutWithAccount: string;
  currentAccountPrefix: string;
  currentAccountUnknown: string;
  accountLinked: string;
  accountNotLinked: string;
  webLoginHint: string;
  /** Tiêu đề khối khi gateway trả `qrDataUrl`. */
  qrOnWebTitle: string;
  /** Checkbox: hiện ảnh QR trên trang. */
  showQrImageLabel: string;
  /** Khi user tắt checkbox nhưng vẫn còn mã trong bộ nhớ. */
  qrImageHiddenHint: string;
  /** Gợi ý quét bằng app Zalo. */
  scanQrHint: string;
  /** QR từ file PNG do CLI tạo (proxy qua Next.js). */
  cliQrBridgeTitle: string;
  cliQrBridgeIntro: string;
  cliQrReload: string;
  cliQrBridgeEnvHint: string;
  cliFallbackTitle: string;
  cliFallbackBody: string;
  sessionsTitle: string;
  refreshSessions: string;
  selectSessionHint: string;
  subscribeLive: string;
  liveTitle: string;
  clearLive: string;
  directoryTitle: string;
  directoryIntro: string;
  directoryDocLabel: string;
  cliBlockLogin: string;
  cliBlockLogout: string;
  cliBlockStatus: string;
  cliBlockDirectorySelf: string;
  cliBlockDirectoryPeers: string;
  cliBlockDirectoryGroups: string;
  cliBlockMessageSend: string;
  copyLabel: string;
  copiedLabel: string;
  advancedJsonToggle: string;
  sendTitle: string;
  targetLabel: string;
  messageLabel: string;
  sendButton: string;
  sendHint: string;
};
