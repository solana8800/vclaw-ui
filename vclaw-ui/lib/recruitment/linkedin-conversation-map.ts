import type { SaveCandidateInput } from "@/lib/recruitment/candidate-types";

export type LinkedInConversationRaw = Record<string, unknown>;

function pickString(obj: LinkedInConversationRaw, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeProfileUrl(url: string): string | undefined {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed.includes("/in/") && !trimmed.includes("/profile/")) return undefined;
  if (trimmed.startsWith("http")) return trimmed.split("?")[0];
  return `https://www.linkedin.com${trimmed.split("?")[0]}`;
}

/** LinkedIn member id dạng ACoAA... — resolve thành URL /in/ đầy đủ. */
function profileUrlFromLinkedInMemberId(memberId: string): string | undefined {
  const id = memberId.trim().replace(/^\/+/, "");
  if (!id) return undefined;
  if (id.includes("/in/") || id.includes("/profile/")) {
    return normalizeProfileUrl(id.startsWith("http") ? id : `https://www.linkedin.com${id}`);
  }
  // Vanity slug hoặc member URN id
  if (/^ACo[A-Za-z0-9_-]+$/i.test(id)) {
    return `https://www.linkedin.com/in/${id}`;
  }
  if (/^[a-z0-9-]+$/i.test(id) && id.length > 2) {
    return `https://www.linkedin.com/in/${id}`;
  }
  return undefined;
}

function profileUrlFromId(profileId: string): string {
  const slug = profileId.replace(/^\/+/, "");
  if (slug.includes("/in/")) return normalizeProfileUrl(slug) ?? slug;
  return `https://www.linkedin.com/in/${slug}`;
}

function parseLabels(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      return [raw];
    }
  }
  return undefined;
}

/** Trích preview / lịch sử tin nhắn từ payload conversation nếu có. */
function extractChatFields(raw: LinkedInConversationRaw): {
  chatInfo?: string;
  conversationHistory?: string;
} {
  const messageKeys = ["messages", "messageHistory", "message_history", "thread"];
  for (const key of messageKeys) {
    const v = raw[key];
    if (Array.isArray(v) && v.length > 0) {
      try {
        return { conversationHistory: JSON.stringify(v.slice(0, 80)) };
      } catch {
        break;
      }
    }
  }
  const preview = pickString(raw, [
    "lastMessage",
    "last_message",
    "lastMessageText",
    "preview",
    "snippet",
    "latestMessage",
  ]);
  return preview ? { chatInfo: preview } : {};
}

function normalizeSentiment(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const u = raw.toUpperCase();
  if (u === "POSITIVE" || u === "NEGATIVE" || u === "NEUTRAL") return u;
  return undefined;
}

function profileUrlFromNested(raw: LinkedInConversationRaw): string | undefined {
  for (const key of ["participant", "profile", "contact", "linkedinProfile"]) {
    const nested = raw[key];
    if (!nested || typeof nested !== "object") continue;
    const n = nested as LinkedInConversationRaw;
    const direct = normalizeProfileUrl(
      pickString(n, ["profileUrl", "profile_url", "linkedinUrl", "linkedin_url"]) ?? "",
    );
    if (direct) return direct;
    const id = pickString(n, ["profileId", "profile_id", "publicIdentifier", "vanityName"]);
    if (id) return profileUrlFromId(id);
  }
  return undefined;
}

function participantDisplayName(raw: LinkedInConversationRaw): string {
  const direct = pickString(raw, ["name", "displayName", "fullName", "participantName"]);
  if (direct) return direct;
  const first = pickString(raw, ["participantFirstName", "firstName"]);
  const last = pickString(raw, ["participantLastName", "lastName"]);
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined || "Ứng viên LinkedIn";
}

/** Map dữ liệu thô một hội thoại LinkedIn → input lưu Candidate vào DB. */
export function mapLinkedInConversationToCandidate(
  raw: LinkedInConversationRaw,
  jobPositionId?: string,
): SaveCandidateInput | null {
  const profileUrl =
    normalizeProfileUrl(
      pickString(raw, [
        "participantUrl",
        "participant_url",
        "profileUrl",
        "profile_url",
        "linkedinUrl",
        "linkedin_url",
        "linkedInProfileUrl",
        "linkedinProfileUrl",
      ]) ?? "",
    ) ??
    profileUrlFromNested(raw) ??
    (() => {
      const memberId = pickString(raw, [
        "participantLinkedinId",
        "participant_linkedin_id",
        "linkedinMemberId",
        "profileId",
        "profile_id",
        "linkedinProfileId",
        "publicIdentifier",
        "vanityName",
      ]);
      return memberId ? profileUrlFromLinkedInMemberId(memberId) : undefined;
    })();

  const name = participantDisplayName(raw);
  const headline = pickString(raw, [
    "participantTitle",
    "participant_title",
    "headline",
    "title",
    "subtitle",
  ]);
  const linkedinChatId = pickString(raw, ["chatId", "chat_id", "conversationId"]);

  // Cho phép lưu chỉ với chatId (không có URL LinkedIn) — profileUrl giả lập để upsert unique.
  const resolvedProfileUrl =
    profileUrl ??
    (linkedinChatId ? `linkedin://chat/${encodeURIComponent(linkedinChatId)}` : undefined);
  if (!resolvedProfileUrl) return null;

  const sentiment = normalizeSentiment(
    pickString(raw, ["sentiment"]) ?? raw.sentiment,
  );
  const labels = parseLabels(raw.labels ?? raw.tags);
  const chatFields = extractChatFields(raw);

  return {
    name,
    headline,
    profileUrl: resolvedProfileUrl,
    jobPositionId,
    source: "LINKEDIN_INBOX",
    linkedinChatId,
    sentiment,
    labels,
    ...chatFields,
  };
}

/** Trích danh sách hội thoại từ response nhiều shape khác nhau. */
export function extractLinkedInConversations(payload: unknown): LinkedInConversationRaw[] {
  if (Array.isArray(payload)) return payload as LinkedInConversationRaw[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const key of ["data", "conversations", "items", "results", "result"]) {
      const v = o[key];
      if (Array.isArray(v)) return v as LinkedInConversationRaw[];
      if (v && typeof v === "object") {
        const nested = extractLinkedInConversations(v);
        if (nested.length > 0) return nested;
      }
    }
  }
  return [];
}
