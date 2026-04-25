/** Giá trị `ChannelConnection.provider` — giữ đồng bộ với OAuth / ingest. */
export const CHANNEL_ZALO_OA = "ZALO_OA" as const;
export const CHANNEL_META_FB = "META_FB" as const;
export const CHANNEL_SHOPEE_OPEN = "SHOPEE_OPEN" as const;
export const CHANNEL_GHTK = "GHTK" as const;

export type ChannelConnectionProvider =
  | typeof CHANNEL_ZALO_OA
  | typeof CHANNEL_META_FB
  | typeof CHANNEL_SHOPEE_OPEN
  | typeof CHANNEL_GHTK;
