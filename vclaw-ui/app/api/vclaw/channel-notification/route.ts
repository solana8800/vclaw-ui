import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sseEmitter } from "@/lib/admin/sse-emitter";

// Parse Vietnamese bank number format: "8,662,494 VND" → 8662494
function parseVndAmount(str: string): number {
  return parseInt(str.replace(/[,\.\s]/g, ""), 10) || 0;
}

// Parse label/value block: finds the value on the line(s) after a label line.
// Handles both Vietnamese and English label variants.
function extractAfterLabel(text: string, labels: string[]): string | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].toLowerCase();
    if (labels.some((lbl) => line === lbl.toLowerCase() || line.startsWith(lbl.toLowerCase() + ":"))) {
      // Value is on next non-empty line
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j]) return lines[j];
      }
    }
  }
  return undefined;
}

function parseBalanceNotification(raw: string): {
  amount?: number;
  balance?: number;
  description?: string;
} {
  const result: { amount?: number; balance?: number; description?: string } = {};

  // --- Amount ---
  // Format 1 (Techcombank label-value): first non-empty line is "+/-  89,000 VND"
  const firstLine = raw.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  const firstLineMatch = firstLine.match(/^([+-])\s*([\d,\.]+)\s*(?:VND|vnd|đ|₫)/i);
  if (firstLineMatch) {
    const sign = firstLineMatch[1] === "+" ? 1 : -1;
    result.amount = sign * parseVndAmount(firstLineMatch[2]);
  } else {
    // Format 2: inline "CỘNG/TRỪ +/-N VND" or "credited/debited N VND"
    const creditMatch = raw.match(/(?:CỘNG|credited?|cộng)\s*\+?([\d,\.]+)\s*(?:VND|vnd|đ|₫)/i);
    const debitMatch = raw.match(/(?:TRỪ|debited?|trừ)\s*([\d,\.]+)\s*(?:VND|vnd|đ|₫)/i);
    const signedMatch = raw.match(/([+-])\s*([\d,\.]+)\s*(?:VND|vnd|đ|₫)/);
    if (creditMatch) {
      result.amount = parseVndAmount(creditMatch[1]);
    } else if (debitMatch) {
      result.amount = -parseVndAmount(debitMatch[1]);
    } else if (signedMatch) {
      const sign = signedMatch[1] === "+" ? 1 : -1;
      result.amount = sign * parseVndAmount(signedMatch[2]);
    }
  }

  // --- Balance ---
  // Format 1: label on its own line followed by "8,662,494 VND"
  const balanceLine = extractAfterLabel(raw, ["Số dư", "So du", "Balance", "Available balance", "Số dư khả dụng"]);
  if (balanceLine) {
    const m = balanceLine.match(/([\d,\.]+)\s*(?:VND|vnd|đ|₫)?/i);
    if (m) result.balance = parseVndAmount(m[1]);
  } else {
    // Inline fallback
    const inlineMatch = raw.match(/(?:Số dư|So du|Balance)[:\s]+([\d,\.]+)/i);
    if (inlineMatch) result.balance = parseVndAmount(inlineMatch[1]);
  }

  // --- Description ---
  const descLine = extractAfterLabel(raw, ["Nội dung", "Noi dung", "Content", "Description", "ND", "Ghi chú"]);
  if (descLine) {
    result.description = descLine;
  } else {
    const inlineDesc = raw.match(/(?:ND|Nội dung|Ghi chú|Content|Noi dung)[:\s]+(.+?)(?:\n|$)/i);
    if (inlineDesc) result.description = inlineDesc[1].trim();
  }

  return result;
}

// Extract order number: 4 uppercase letters + 4-digit date (MMDD) + 5-digit seq = 13 chars total
// e.g. "VESU051300001". "FBTA7" won't match (has digit in letter part).
function extractOrderNumber(text: string): string | undefined {
  const m = text?.match(/\b([A-Z]{4}\d{9})\b/);
  return m?.[1];
}

function isBalanceNotification(raw: string): boolean {
  return /(?:số dư|so du|Balance|CỘNG|TRỪ|credited|debited|biến động|bien dong|tài khoản|Account number)[^\w]*(VND|đ|₫|\d)/i.test(raw);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channel, threadId, senderName, rawBody, msgType, msgId } = body as {
      channel?: string;
      threadId?: string;
      senderName?: string;
      rawBody?: string;
      msgType?: string | null;
      msgId?: string | null;
    };

    if (!threadId || !rawBody) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Dedup bằng msgId nếu có
    if (msgId) {
      const existing = await prisma.channelNotification.findFirst({ where: { msgId } });
      if (existing) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    let parsed: { amount?: number; balance?: number; description?: string } = {};
    if (isBalanceNotification(rawBody)) {
      parsed = parseBalanceNotification(rawBody);
    }

    const isBankTx = Object.keys(parsed).length > 0;

    // --- BẢO MẬT: KIỂM TRA ZALO OA ID CỦA NGÂN HÀNG ---
    let isFakeBankTx = false;
    if (isBankTx) {
      const shopSettings = await prisma.shopSettings.findFirst();
      const { SUPPORTED_BANKS } = await import("@/lib/constants");

      // Ưu tiên bankThreadId từ DB (nếu có remote config), nếu không thì lấy theo bankName
      const bankInfo = shopSettings?.bankName ? SUPPORTED_BANKS[shopSettings.bankName] : null;
      const trustedBankThreadId = (shopSettings as any)?.bankThreadId || bankInfo?.oaId;
      
      if (trustedBankThreadId && threadId !== trustedBankThreadId) {
        // Cảnh báo fake ngân hàng: tin nhắn trông giống biến động số dư nhưng không đến từ OA đã cấu hình
        console.warn(`[vclaw:security] CẢNH BÁO: Tin nhắn giả mạo ngân hàng từ threadId=${threadId}, sender=${senderName}. Bỏ qua khớp lệnh.`);
        isFakeBankTx = true;
        // Xóa thông tin biến động tài khoản để coi như tin nhắn bình thường
        parsed = {};
      }
    }

    const orderNumber = parsed.description ? extractOrderNumber(parsed.description) ?? extractOrderNumber(rawBody) : extractOrderNumber(rawBody);

    const notification = await prisma.channelNotification.create({
      data: {
        channel: channel || "zalo",
        threadId,
        senderName: senderName || "",
        rawMessage: rawBody,
        msgId: msgId || null,
        msgType: msgType || null,
        amount: parsed.amount ?? null,
        balance: parsed.balance ?? null,
        description: parsed.description || null,
        orderNumber: orderNumber || null,
      },
      select: { id: true },
    });

    const isTrustedBankTx = Object.keys(parsed).length > 0;
    
    if (isTrustedBankTx) {
      console.info("\n==================================================");
      console.info("💰 GIAO DỊCH NGÂN HÀNG MỚI (CHANNEL NOTIFICATION) 💰");
      console.info(`- ID Tin: ${notification.id}`);
      console.info(`- Kênh: ${channel || "zalo"}`);
      console.info(`- Người gửi: ${senderName || "Không rõ"}`);
      if (parsed.amount) {
        const amtStr = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(parsed.amount);
        console.info(`- Số tiền: ${parsed.amount > 0 ? "+" + amtStr : amtStr}`);
      }
      if (parsed.balance) {
        console.info(`- Số dư: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(parsed.balance)}`);
      }
      console.info(`- Nội dung: ${parsed.description || "Không có nội dung"}`);
      console.info(`- Khớp mã đơn: ${orderNumber || "Không khớp mã nào"}`);
      console.info("==================================================\n");

      // --- KHỚP LỆNH TỰ ĐỘNG ---
      if (orderNumber && parsed.amount && parsed.amount > 0) {
        try {
          const order = await prisma.order.findUnique({
            where: { orderNumber },
            include: { customer: true }
          });

          if (order && order.status === "PENDING") {
            if (parsed.amount >= order.amount) {
              const shopSettings = await prisma.shopSettings.findFirst();
              const approvalConfig = shopSettings?.approvalConfigJson 
                ? JSON.parse(shopSettings.approvalConfigJson) 
                : { paymentAutoApprove: true };

              if (approvalConfig.paymentAutoApprove) {
                await prisma.$transaction([
                  prisma.order.update({
                    where: { id: order.id },
                    data: { status: "PROCESSING" }
                  }),
                  prisma.payment.create({
                    data: {
                      orderId: order.id,
                      amount: parsed.amount,
                      status: "VERIFIED",
                      method: "BANK_TRANSFER"
                    }
                  })
                ]);
                
                console.info(`[vclaw:match] ✅ Đã khớp lệnh tự động cho đơn #${orderNumber}.`);
                
                sseEmitter.emit("notification", {
                  type: "order_paid",
                  title: "Khớp lệnh thành công",
                  description: `Đơn #${orderNumber} (${order.customer.name}) đã được thanh toán tự động.`,
                  raw: orderNumber,
                });
              }
            } else {
              console.warn(`[vclaw:match] ⚠️ Đơn #${orderNumber} khớp nhưng số tiền thiếu: ${parsed.amount} < ${order.amount}`);
            }
          }
        } catch (matchErr) {
          console.error("[vclaw:match] Lỗi khi khớp lệnh:", matchErr);
        }
      }

      sseEmitter.emit("notification", {
        type: "bank_transaction",
        title: "Giao dịch ngân hàng",
        description: parsed.amount 
          ? `Biến động: ${parsed.amount > 0 ? "+" : ""}${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(parsed.amount)}` 
          : "Có biến động số dư mới",
        raw: parsed.description || "",
      });
    } else {
      console.info(
        `[vclaw:channel-notification] Đã lưu tin nhắn thường từ kênh ${channel || "zalo"}. Người gửi: ${senderName || "Không rõ"}. ID: ${notification.id}`
      );

      sseEmitter.emit("notification", {
        type: "channel_message",
        title: "Tin nhắn OA",
        description: `Từ ${senderName || "Zalo OA"}`,
        raw: rawBody.length > 50 ? rawBody.substring(0, 50) + "..." : rawBody,
      });
    }

    return NextResponse.json({ ok: true, id: notification.id });
  } catch (error) {
    console.error("[vclaw:channel-notification] error:", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
