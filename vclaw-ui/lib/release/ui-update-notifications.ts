export type UiUpdatePhase =
  | "detected"
  | "downloading"
  | "downloaded"
  | "activated"
  | "applied"
  | "failed";

type UiUpdateNotification = {
  type: "info" | "success" | "error";
  messageKey: "detected" | "downloaded" | "applied" | "failed";
};

export function getUiUpdateNotification(
  phase: UiUpdatePhase,
): UiUpdateNotification | null {
  switch (phase) {
    case "detected":
      return { type: "info", messageKey: "detected" };
    case "downloaded":
      return { type: "success", messageKey: "downloaded" };
    case "applied":
      return { type: "success", messageKey: "applied" };
    case "failed":
      return { type: "error", messageKey: "failed" };
    default:
      return null;
  }
}
