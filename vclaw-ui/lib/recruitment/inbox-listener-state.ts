/**
 * Module-level singleton cho trạng thái LinkedIn Inbox Listener.
 * Chia sẻ giữa các component qua useSyncExternalStore — không cần prop drilling.
 */

export type InboxListenerStatus = "idle" | "polling" | "ok" | "error";

export type InboxListenerState = {
  active: boolean;
  lastCheckedAt: number | null;
  status: InboxListenerStatus;
  error?: string;
};

type Listener = () => void;

const INITIAL: InboxListenerState = { active: false, lastCheckedAt: null, status: "idle" };
export const INBOX_LISTENER_SERVER_SNAPSHOT: InboxListenerState = INITIAL;

let _state: InboxListenerState = INITIAL;
const _listeners = new Set<Listener>();

function notify() {
  for (const l of _listeners) l();
}

export function subscribeInboxListener(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function getInboxListenerState(): InboxListenerState {
  return _state;
}

export function setInboxListenerActive(active: boolean): void {
  _state = { ..._state, active, status: "idle", error: undefined };
  notify();
}

export function setInboxListenerPolling(): void {
  _state = { ..._state, status: "polling" };
  notify();
}

export function setInboxListenerOk(lastCheckedAt: number): void {
  _state = { ..._state, lastCheckedAt, status: "ok", error: undefined };
  notify();
}

export function setInboxListenerError(error: string): void {
  _state = { ..._state, status: "error", error };
  notify();
}
