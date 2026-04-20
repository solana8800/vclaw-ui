"use server";

import { prisma } from "@/lib/prisma";
import { gatewayClient } from "@/lib/gateway-client";

/**
 * Lấy danh sách các yêu cầu soát xét thanh toán từ bảng Task
 */
export async function getPaymentTasks() {
  return await prisma.task.findMany({
    where: {
      type: "PAYMENT_REVIEW",
      status: "NEW"
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

/**
 * Sinh mã VietQR cho đơn hàng
 * Sử dụng chuẩn VietQR (VietQR.io) hoặc tương đương
 */
export async function generateVietQR(orderId: string, amount: number, content: string) {
  // Cấu hình ngân hàng của shop (Ví dụ: MB Bank)
  const BANK_ID = "MB"; 
  const ACCOUNT_NO = "123456789"; 
  const ACCOUNT_NAME = "CONG TY VCLAW";

  // URL mẫu VietQR: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<NAME>
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
  
  return qrUrl;
}

/**
 * Xác thực ảnh Bill chuyển khoản sử dụng AI Agent của OpenClaw
 */
export async function verifyBillWithAI(paymentId: string, base64Image: string) {
  // Trong thực tế, chúng ta gọi MCP tool của OpenClaw
  // Ở đây chúng ta giả lập bằng cách gọi Gateway API
  try {
    const result = await gatewayClient.post("/api/ai/vision-analysis", {
      image: base64Image,
      prompt: "Phân tích ảnh bill chuyển khoản này. Trích xuất: Số tiền, Nội dung, Tên người gửi, Mã giao dịch."
    });
    
    return result;
  } catch (error) {
    console.error("AI Verification failed:", error);
    // Fallback sang xử lý thủ công
    return {
      success: false,
      message: "Không thể kết nối AI Agent. Vui lòng kiểm duyệt thủ công."
    };
  }
}
