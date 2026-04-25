/** Chuỗi i18n cho màn Zalo cá nhân — chỉ ngôn ngữ người bán, không nhét runbook kỹ thuật. */
export type ZalouserPanelMessages = {
  noToken: string;
  stripConnected: string;
  stripDisconnected: string;
  stripZaloLinked: string;
  stripZaloNotLinked: string;
  refreshStatus: string;
  loginTitle: string;
  loginIntro: string;
  startLogin: string;
  startLoginBusy: string;
  loginErrorGeneric: string;
  /** Sau khi POST spawn CLI thành công. */
  loginCommandSent: string;
  qrReload: string;
  showQrLabel: string;
  hideQrNote: string;
  scanQrShort: string;
  /** File PNG trên máy chạy web — thời điểm sửa file (mtime). */
  qrFileUpdated: string;
  qrFileMissing: string;
  qrFromGatewayShort: string;
  logout: string;
  logoutWithAccount: string;
  accountPrefix: string;
  accountUnknown: string;
  accountLinked: string;
  accountNotLinked: string;
  sessionsTitle: string;
  refreshSessions: string;
  selectSessionHint: string;
  listEmpty: string;
  threadEmpty: string;
  previewPrefix: string;
  bubbleThem: string;
  bubbleYou: string;
  bubbleNote: string;
  sendTitle: string;
  sendToLabel: string;
  messageLabel: string;
  sendButton: string;
  sendOkNotice: string;
  sendHint: string;
  /** Danh sách bạn bè (directory.peers.list). */
  peersListTitle: string;
  peersRefresh: string;
  peersEmpty: string;
  /** Gợi ý khi chưa chọn nhóm hoặc bạn. */
  selectChatHint: string;
};
