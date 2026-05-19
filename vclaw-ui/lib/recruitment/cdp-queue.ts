/**
 * CDP Queue — hàng đợi tuần tự cho các tác vụ Playwright/CDP.
 * Singleton module-level: chia sẻ state giữa các component mà không cần prop drilling.
 *
 * Tính năng:
 *  - Chỉ chạy 1 task CDP tại 1 thời điểm
 *  - Dedup: cùng `type` đang queued/running → từ chối
 *  - Timeout cứng 60s — sau timeout tự xóa, KHÔNG cho retry trong COOLDOWN_MS
 *  - useSyncExternalStore-compatible (React 18)
 */

const TIMEOUT_MS = 60_000;
const COOLDOWN_MS = 60_000; // sau timeout, block re-enqueue cùng type trong 60s
const CLEANUP_DELAY_MS = 1_500; // xóa entry nhanh sau khi done/timeout/error

export type CdpTaskStatus = "queued" | "running" | "done" | "error" | "timeout";

export type CdpTaskEntry = {
  id: string;
  /** Key dedup — ví dụ: "sync_inbox", "sync_thread:abc", "get_profile:abc" */
  type: string;
  label: string;
  status: CdpTaskStatus;
  error?: string;
  addedAt: number;
  startedAt?: number;
  endedAt?: number;
};

export type CdpEnqueueOptions = {
  type: string;
  label: string;
  fn: () => Promise<unknown>;
  onSuccess?: () => void;
  onError?: (errMsg: string) => void;
};

export type CdpEnqueueResult = "queued" | "duplicate" | "cooldown";

type Listener = () => void;

const EMPTY_ENTRIES: CdpTaskEntry[] = [];

class CdpQueueManager {
  private entries: CdpTaskEntry[] = [];
  private fns = new Map<string, () => Promise<unknown>>();
  private cbs = new Map<
    string,
    { onSuccess?: () => void; onError?: (e: string) => void }
  >();
  /** type → timestamp khi hết cooldown */
  private cooldowns = new Map<string, number>();
  private listeners = new Set<Listener>();
  private draining = false;
  private counter = 0;

  // ─── useSyncExternalStore API ─────────────────────────────────────────────

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): CdpTaskEntry[] => this.entries;

  getServerSnapshot = (): CdpTaskEntry[] => EMPTY_ENTRIES;

  // ─── Public API ───────────────────────────────────────────────────────────

  enqueue(opts: CdpEnqueueOptions): CdpEnqueueResult {
    // Cooldown check: vừa timeout, chưa được thử lại
    const cooldownUntil = this.cooldowns.get(opts.type);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return "cooldown";
    }

    // Dedup: cùng type đang queued/running
    const existing = this.entries.find(
      (e) =>
        e.type === opts.type &&
        (e.status === "queued" || e.status === "running"),
    );
    if (existing) return "duplicate";

    const id = `cdp-${++this.counter}-${Date.now()}`;
    const entry: CdpTaskEntry = {
      id,
      type: opts.type,
      label: opts.label,
      status: "queued",
      addedAt: Date.now(),
    };

    this.entries = [...this.entries, entry];
    this.fns.set(id, opts.fn);
    this.cbs.set(id, { onSuccess: opts.onSuccess, onError: opts.onError });

    this.notify();
    void this.drain();
    return "queued";
  }

  isActive(type: string): boolean {
    return this.entries.some(
      (e) => e.type === type && (e.status === "queued" || e.status === "running"),
    );
  }

  isOnCooldown(type: string): boolean {
    const until = this.cooldowns.get(type);
    return Boolean(until && Date.now() < until);
  }

  getRunning(): CdpTaskEntry | undefined {
    return this.entries.find((e) => e.status === "running");
  }

  getQueuedAfterRunning(): CdpTaskEntry[] {
    return this.entries.filter((e) => e.status === "queued");
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private notify() {
    for (const l of this.listeners) l();
  }

  private patch(id: string, patch: Partial<CdpTaskEntry>) {
    this.entries = this.entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
    this.notify();
  }

  private remove(id: string) {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.fns.delete(id);
    this.cbs.delete(id);
    this.notify();
  }

  private async drain() {
    if (this.draining) return;
    const next = this.entries.find((e) => e.status === "queued");
    if (!next) return;

    this.draining = true;
    const { id, type } = next;
    const fn = this.fns.get(id)!;
    const cb = this.cbs.get(id)!;

    this.patch(id, { status: "running", startedAt: Date.now() });

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error("CDP_TIMEOUT")),
        TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([fn(), timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      this.patch(id, { status: "done", endedAt: Date.now() });
      cb.onSuccess?.();
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      const isTimeout = err instanceof Error && err.message === "CDP_TIMEOUT";

      if (isTimeout) {
        // Đặt cooldown — block re-enqueue cùng type trong COOLDOWN_MS
        this.cooldowns.set(type, Date.now() + COOLDOWN_MS);
        setTimeout(() => this.cooldowns.delete(type), COOLDOWN_MS);
      }

      const msg = isTimeout
        ? "Quá thời gian (60s). Vui lòng thử lại sau."
        : err instanceof Error
          ? err.message
          : String(err);

      this.patch(id, {
        status: isTimeout ? "timeout" : "error",
        endedAt: Date.now(),
        error: msg,
      });
      cb.onError?.(msg);
    } finally {
      this.draining = false;
      setTimeout(() => {
        this.remove(id);
        void this.drain();
      }, CLEANUP_DELAY_MS);
    }
  }
}

export const cdpQueue = new CdpQueueManager();
