import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Cấu hình Firebase Analytics do phía dự án cung cấp
const firebaseConfig = {
  apiKey: "AIzaSyByP-i8diqf_aMfh1KGrilb6AOelpf6JP0",
  authDomain: "langeval.firebaseapp.com",
  projectId: "langeval",
  storageBucket: "langeval.firebasestorage.app",
  messagingSenderId: "362432348892",
  appId: "1:362432348892:web:15df74fa0d91c5f1e76a19",
  measurementId: "G-42BCV0MDKR"
};

// Khởi tạo Firebase App. Nếu app đã được tạo trước đó thì dùng lại, tránh khởi tạo lại nhiều lần gây lỗi.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export { app };

// Biến lưu trữ instance của Analytics sau khi khởi tạo thành công
let analyticsInstance: Analytics | undefined;

/**
 * Hàm khởi tạo và lấy Firebase Analytics một cách an toàn.
 * Hàm này kiểm tra kỹ xem có đang chạy trên môi trường browser (client) không và trình duyệt có hỗ trợ không
 * nhằm tránh lỗi Server Side Rendering (SSR) khi build Next.js.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | undefined> {
  if (typeof window === "undefined") {
    // Nếu chạy trên server thì không khởi tạo
    return undefined;
  }

  if (analyticsInstance) {
    return analyticsInstance;
  }

  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
      console.log("[Firebase] Đã kích hoạt Firebase Analytics thành công cho ứng dụng.");
    } else {
      console.warn("[Firebase] Trình duyệt hoặc môi trường hiện tại không hỗ trợ Firebase Analytics (ví dụ: bị chặn cookie/localStorage hoặc chạy offline).");
    }
  } catch (error) {
    console.error("[Firebase] Gặp lỗi khi khởi tạo Analytics:", error);
  }

  return analyticsInstance;
}
