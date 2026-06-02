"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics } from "@/lib/firebase";

/**
 * Component phía Client dùng để tự động khởi tạo Firebase Analytics khi người dùng mở ứng dụng.
 * Component này không render ra bất kỳ thành phần HTML nào (trả về null).
 */
export function FirebaseAnalytics() {
  useEffect(() => {
    // Hàm chạy không đồng bộ để tải và khởi tạo SDK Firebase Analytics
    const initializeTracker = async () => {
      try {
        await getFirebaseAnalytics();
      } catch (error) {
        // Chỉ log ra lỗi nếu quá trình khởi tạo gặp sự cố nghiêm trọng
        console.error("[Firebase Analytics] Lỗi tự động khởi chạy:", error);
      }
    };

    initializeTracker();
  }, []);

  return null;
}
