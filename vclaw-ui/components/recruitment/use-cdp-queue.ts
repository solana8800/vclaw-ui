"use client";

import { useSyncExternalStore } from "react";
import { cdpQueue, type CdpEnqueueOptions, type CdpEnqueueResult } from "@/lib/recruitment/cdp-queue";

export function useCdpQueue() {
  const entries = useSyncExternalStore(
    cdpQueue.subscribe,
    cdpQueue.getSnapshot,
    cdpQueue.getServerSnapshot,
  );

  return {
    entries,
    enqueue: (opts: CdpEnqueueOptions): CdpEnqueueResult => cdpQueue.enqueue(opts),
    isActive: (type: string) => cdpQueue.isActive(type),
    isOnCooldown: (type: string) => cdpQueue.isOnCooldown(type),
    running: cdpQueue.getRunning(),
    queued: cdpQueue.getQueuedAfterRunning(),
  };
}
