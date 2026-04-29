export function normalizeZalouserThreadTarget(raw: string): {
  kind: "direct" | "group";
  id: string;
} {
  const trimmed = raw.trim().replace(/^(zalouser|zlu):/i, "").trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("group:")) {
    return { kind: "group", id: trimmed.slice("group:".length).trim() };
  }
  if (lower.startsWith("g:")) {
    return { kind: "group", id: trimmed.slice("g:".length).trim() };
  }
  if (lower.startsWith("user:")) {
    return { kind: "direct", id: trimmed.slice("user:".length).trim() };
  }
  if (lower.startsWith("direct:")) {
    return { kind: "direct", id: trimmed.slice("direct:".length).trim() };
  }
  if (lower.startsWith("dm:")) {
    return { kind: "direct", id: trimmed.slice("dm:".length).trim() };
  }
  if (lower.startsWith("u:")) {
    return { kind: "direct", id: trimmed.slice("u:".length).trim() };
  }
  if (/^g-\S+$/i.test(trimmed)) {
    return { kind: "group", id: trimmed };
  }
  return { kind: "direct", id: trimmed };
}

export function buildZalouserSessionKey(externalThreadId: string): string {
  const target = normalizeZalouserThreadTarget(externalThreadId);
  return `agent:main:zalouser:${target.kind}:${target.id}`;
}
