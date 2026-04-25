type GroupSummary = {
  id: string;
  name: string;
  memberCount?: number | null;
};

type PeerSummary = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

function normalizeGroupTarget(value: string): string {
  return value.replace(/^group:/i, "").trim();
}

function avatarFallbackLabel(title: string): string {
  const compact = title.trim();
  if (!compact) return "ZL";
  const parts = compact.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  const cleaned = compact
    .replace(/^group:/i, "")
    .replace(/^user:/i, "")
    .replace(/[^A-Za-z0-9À-ỹ]/g, "");
  if (/^user:/i.test(compact) && cleaned) {
    return `U${cleaned[0] ?? ""}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase() || "ZL";
}

export function buildZalouserChatHeader(input: {
  selectedKey: string;
  sendTo: string;
  groups: GroupSummary[];
  peers: PeerSummary[];
}) {
  const selectedGroup =
    input.groups.find((g) => `zalouser-group-${g.id}` === input.selectedKey) ??
    input.groups.find((g) => normalizeGroupTarget(g.id) === normalizeGroupTarget(input.sendTo));
  const selectedPeer =
    input.peers.find((p) => `zalouser-peer-${p.id}` === input.selectedKey) ??
    input.peers.find((p) => p.id === input.sendTo);

  const title =
    selectedGroup?.name ||
    selectedPeer?.name ||
    (input.sendTo.startsWith("group:") ? `Nhóm ${normalizeGroupTarget(input.sendTo)}` : input.sendTo);

  return {
    title,
    avatarUrl: selectedPeer?.avatarUrl?.trim() ? selectedPeer.avatarUrl.trim() : null,
    fallbackLabel: avatarFallbackLabel(title),
    kind:
      selectedGroup ? "group" : selectedPeer ? "peer" : "unknown",
  } as const;
}
