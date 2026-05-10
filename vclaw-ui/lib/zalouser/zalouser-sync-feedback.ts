export function formatZalouserSyncFeedback(
  input: {
    historyCount: number;
    inserted: number;
    skipped: number;
  },
  copy: { empty: string; summary: string },
): string {
  if (input.historyCount <= 0) {
    return copy.empty;
  }

  return copy.summary
    .replace("{historyCount}", String(input.historyCount))
    .replace("{inserted}", String(input.inserted))
    .replace("{skipped}", String(input.skipped));
}
