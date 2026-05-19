/**
 * CDP Queue — hàng đợi tuần tự cho các tác vụ Playwright/CDP.
 * Singleton module-level: chia sẻ state giữa các component mà không cần prop drilling.
 *
 * Tính năng:
 *  - Chỉ chạy 1 task CDP tại 1 thời điểm (tránh đụng nhau trên Chrome)
 *  - Dedup: cùng `type` đang queued/running → từ chối enqueue mới
 *  - Timeout per-task (default 120s), prevent treo vô hạn
 *  - useSyncExternalStore-compatible (React 18)
 */

const DEFAULT_TIMEOUT_MS = 120_000;
const CLEANUP_DELAY_MS = 4_000;

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
  timeoutMs?: number;
  onSuccess?: () => void;
  onError?: (errMsg: string) => void;
};

export type CdpEnqueueResult = "queued" | "duplicate";

type Listener = () => void;

class CdpQueueManager {
  private entries: CdpTaskEntry[] = [];
  private fns = new Map<string, () => Promise<unknown>>();
  private cbs = new Map<
    string,
    { onSuccess?: () => void; onError?: (e: string) => void; timeoutMs: number }
  >();
  private listeners = new Set<Listener>();
  private draining = false;
  private counter = 0;

  // ─── useSyncExternalStore API ─────────────────────────────────────────────

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): CdpTaskEntry[] => this.entries;

  getServerSnapshot = (): CdpTaskEntry[] => [];

  // ─── Public API ───────────────────────────────────────────────────────────

  enqueue(opts: CdpEnqueueOptions): CdpEnqueueResult {
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
    this.cbs.set(id, {
      onSuccess: opts.onSuccess,
      onError: opts.onError,
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });

    this.notify();
    void this.drain();
    return "queued";
  }

  isActive(type: string): boolean {
    return this.entries.some(
      (e) => e.type === type && (e.status === "queued" || e.status === "running"),
    );
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
    const { id } = next;
    const fn = this.fns.get(id)!;
    const cb = this.cbs.get(id)!;

    this.patch(id, { status: "running", startedAt: Date.now() });

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error("CDP_TIMEOUT")),
        cb.timeoutMs,
      );
    });

    try {
      await Promise.race([fn(), timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      this.patch(id, { status: "done", endedAt: Date.now() });
      cb.onSuccess?.();
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      const isTimeout =
        err instanceof Error && err.message === "CDP_TIMEOUT";
      const msg = isTimeout
        ? "Tác vụ quá thời gian (timeout), hãy thử lại"
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
      // Giữ lại entry một lúc để UI hiển thị trạng thái, rồi tự clean
      setTimeout(() => {
        this.remove(id);
        void this.drain(); // chạy task tiếp theo nếu có
      }, CLEANUP_DELAY_MS);
    }
  }
}

export const cdpQueue = new CdpQueueManager();
