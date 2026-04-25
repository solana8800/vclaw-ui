"use client";

import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared";

interface VietQRWidgetProps {
  orderNumber: string;
  amount: number;
  qrUrl: string;
  accountName: string;
  accountNo: string;
  bankName: string;
}

export function VietQRWidget({
  orderNumber,
  amount,
  qrUrl,
  accountName,
  accountNo,
  bankName,
}: VietQRWidgetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${accountNo} ${bankName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-[color:var(--line)] shadow-sm bg-[color:var(--surface)]">
      <CardHeader className="pb-3 border-b border-[color:var(--line)]">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          Thanh toán Đơn hàng #{orderNumber}
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
            VietQR chuẩn
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex flex-col items-center">
        {/* QR Code Container */}
        <div className="relative p-4 bg-white rounded-2xl border-2 border-[color:var(--brand-soft)] shadow-inner mb-6">
          <div className="relative w-48 h-48">
            <Image 
              src={qrUrl} 
              alt="VietQR" 
              fill
              className="object-contain"
              unoptimized={qrUrl.startsWith("http")}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white/80 rounded-2xl cursor-pointer">
            <Download className="h-8 w-8 text-[color:var(--brand)]" />
          </div>
        </div>

        {/* Bank Info */}
        <div className="w-full space-y-3">
          <div className="flex justify-between items-center p-3 rounded-xl bg-[color:var(--surface-soft)] border border-[color:var(--line)]">
            <div>
              <p className="text-[10px] text-[color:var(--muted)] font-semibold uppercase tracking-wider">Ngân hàng</p>
              <p className="text-sm font-bold text-[color:var(--foreground-strong)]">{bankName}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleCopy}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-[color:var(--surface-soft)] border border-[color:var(--line)]">
            <div>
              <p className="text-[10px] text-[color:var(--muted)] font-semibold uppercase tracking-wider">Số tài khoản</p>
              <p className="text-sm font-bold text-[color:var(--foreground-strong)]">{accountNo}</p>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-[color:var(--surface-soft)] border border-[color:var(--line)]">
            <div>
              <p className="text-[10px] text-[color:var(--muted)] font-semibold uppercase tracking-wider">Số tiền</p>
              <p className="text-lg font-black text-[color:var(--brand)]">{amount.toLocaleString()} đ</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-[10px] text-center text-[color:var(--muted)] px-4 italic">
          Quét mã bằng ứng dụng Ngân hàng để thanh toán nhanh. AI sẽ tự động kiểm tra giao dịch sau khi hoàn tất.
        </p>
      </CardContent>
    </Card>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-bold border",
      variant === "outline" ? "border-[color:var(--line)]" : "",
      className
    )}>
      {children}
    </span>
  );
}
