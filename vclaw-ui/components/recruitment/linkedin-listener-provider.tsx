"use client";

import { useLinkedInInboxListener } from "@/components/recruitment/use-linkedin-inbox-listener";

/**
 * Mount ở admin layout để giữ LinkedIn Inbox Listener sống xuyên suốt
 * các trang admin — polling không bị gián đoạn khi navigate.
 */
export function LinkedInListenerProvider({ children }: { children: React.ReactNode }) {
  useLinkedInInboxListener();
  return <>{children}</>;
}
