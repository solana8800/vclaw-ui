"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Component hiển thị lỗi Runtime cho khu vực Admin.
 * Giúp người dùng biết đã có lỗi xảy ra thay vì chỉ thấy lỗi 500 mặc định.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log lỗi để debug (trong môi trường console trình duyệt)
    console.error("VClaw Admin Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[500px] w-full items-center justify-center p-6">
      <Card className="max-w-md border-red-200 bg-white shadow-2xl dark:border-red-900/30 dark:bg-zinc-950">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 shadow-inner">
            <AlertCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Hệ thống tạm gián đoạn
          </CardTitle>
          <CardDescription className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
            Đã có lỗi xảy ra trong quá trình xử lý dữ liệu trên máy chủ. 
            Vui lòng thử lại hoặc quay về trang chủ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100 text-xs font-mono text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="font-semibold uppercase tracking-wider mb-1 text-[10px]">Error Digest:</div>
            {error.digest || "no_digest_available"}
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row justify-center">
            <Button
              onClick={reset}
              className="bg-red-600 hover:bg-red-700 text-white border-transparent shadow-red-200 dark:shadow-none"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Thử lại ngay
            </Button>
            <Button
              href="/admin"
              variant="outline"
            >
              <Home className="mr-2 h-4 w-4" />
              Quản trị chính
            </Button>
          </div>
          
          <p className="text-center text-[11px] text-zinc-400">
            Nếu lỗi vẫn tiếp diễn, vui lòng kiểm tra kết nối Database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
