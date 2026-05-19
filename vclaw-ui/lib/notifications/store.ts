export type NotificationType = "success" | "error" | "info" | "warning" | "default";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  message: string;
  description?: string;
  timestamp: number;
  seen: boolean;
};

const STORAGE_KEY = "vclaw:notifications";
const MAX_ITEMS = 99;
export const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

// Cached snapshot — same reference until a write happens
let cachedSnapshot: NotificationItem[] = EMPTY_NOTIFICATIONS;

function load(): NotificationItem[] {
  if (typeof window === "undefined") return EMPTY_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotificationItem[]) : EMPTY_NOTIFICATIONS;
  } catch {
    return EMPTY_NOTIFICATIONS;
  }
}

function save(items: NotificationItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  cachedSnapshot = items;
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function addNotification(
  item: Omit<NotificationItem, "id" | "timestamp" | "seen">
) {
  const items = load();
  const newItem: NotificationItem = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    timestamp: Date.now(),
    seen: false,
    ...item,
  };
  const updated = [newItem, ...items].slice(0, MAX_ITEMS);
  save(updated);
  notifyListeners();
}

// Used as getSnapshot in useSyncExternalStore — must return stable reference
export function getNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return EMPTY_NOTIFICATIONS;
  // Initialize cache on first client read
  if (cachedSnapshot === EMPTY_NOTIFICATIONS) {
    const persisted = load();
    cachedSnapshot = persisted.length === 0 ? EMPTY_NOTIFICATIONS : persisted;
  }
  return cachedSnapshot;
}

export function getUnseenCount(): number {
  return getNotifications().filter((n) => !n.seen).length;
}

export function markAllSeen() {
  const items = getNotifications().map((n) => ({ ...n, seen: true }));
  save(items);
  notifyListeners();
}

export function clearAll() {
  save(EMPTY_NOTIFICATIONS);
  notifyListeners();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
