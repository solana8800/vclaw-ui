/** Giá trị `ChannelConnection.provider` — giữ đồng bộ với OAuth / ingest. */
export const CHANNEL_META_FB = "META_FB" as const;
export const CHANNEL_SHOPEE_OPEN = "SHOPEE_OPEN" as const;

export type ChannelConnectionProvider =
  | typeof CHANNEL_META_FB
  | typeof CHANNEL_SHOPEE_OPEN;
