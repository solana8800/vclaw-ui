"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AdminSseListener() {
  const router = useRouter();

  useEffect(() => {
    // Chỉ kết nối khi đang trên trình duyệt
    if (typeof window === "undefined") return;

    const eventSource = new EventSource("/api/admin/sse");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Gọi toast tuỳ theo loại notification
        if (data.type === "bank_transaction") {
          toast.success(data.title, {
            description: `${data.description}\n${data.raw}`,
            duration: 10000,
            action: {
              label: "Xem",
              onClick: () => router.push("/admin/orders?tab=payments"),
            },
          });
        } else if (data.type === "channel_message") {
          toast.info(data.title, {
            description: `${data.description}\n${data.raw}`,
            duration: 6000,
          });
        }
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    };

    eventSource.onerror = () => {
      // EventSource tự động reconnect. Bỏ log lỗi để tránh rác console khi hot-reload.
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  return null;
}
