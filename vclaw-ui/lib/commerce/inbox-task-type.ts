export type InboxTaskUiType =
  | "payment_review"
  | "booking_confirm"
  | "shipping_update"
  | "channel_message";

/** Map DB task.type (vd. PAYMENT_REVIEW) sang key UI inbox. */
export function normalizeInboxTaskType(raw: string): InboxTaskUiType {
  const n = raw.toLowerCase();
  if (n.includes("payment")) return "payment_review";
  if (n.includes("booking")) return "booking_confirm";
  if (n.includes("channel")) return "channel_message";
  return "shipping_update";
}
