"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertTriangle, Send, Search, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { completeTask } from "@/lib/commerce/tasks";

interface PaymentTask {
  id: string;
  title: string;
  subtitle: string | null;
  amount: string | null;
  timeAgo: string | null;
}

export function BillVerificationManager({ 
  tasks,
  messages 
}: { 
  tasks: PaymentTask[];
  messages: {
    uploadLabel: string;
    orDragDrop: string;
    extracting: string;
    match: string;
    mismatch: string;
    needsVerification: string;
    requestApproval: string;
    expectedAmount: string;
    detectedAmount: string;
    listTitle?: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id || null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    match: boolean;
    detectedAmount: string;
    detectedContent: string;
    confidence: number;
  } | null>(null);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const handleVerify = () => {
    setIsVerifying(true);
    // Giả lập gọi OpenClaw AI Vision tool qua MCP
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationResult({
        success: true,
        match: true,
        detectedAmount: selectedTask?.amount || "0 đ",
        detectedContent: "Thanh toan don hang #DH1234",
        confidence: 0.98
      });
    }, 2000);
  };

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        await completeTask(id);
        setVerificationResult(null);
        setSelectedTaskId(null);
        router.refresh();
      } catch (error) {
        console.error("Lỗi khi phê duyệt thanh toán:", error);
      }
    });
  };

  return (
    <div className="grid gap-6 mt-6 lg:grid-cols-3">
      {/* Cột trái: Danh sách Task cần duyệt */}
      <Card className="lg:col-span-1 border-[color:var(--line)]">
        <CardHeader className="pb-3 border-b border-[color:var(--line)]">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            {messages?.listTitle || "Danh sách chờ duyệt"}
            <Badge variant="outline" className="bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto max-h-[600px]">
          <ul className="divide-y divide-[color:var(--line)]">
            {tasks.length === 0 ? (
              <li className="p-8 text-center text-[color:var(--muted)] text-sm">
                Tất cả thanh toán đã được duyệt.
              </li>
            ) : (
              tasks.map((task) => (
                <li 
                  key={task.id} 
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    selectedTaskId === task.id ? "bg-[color:var(--surface-soft)] border-l-4 border-[color:var(--brand)]" : "hover:bg-[color:var(--surface-soft)]"
                  )}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold text-[color:var(--foreground-strong)] truncate max-w-[150px]">
                      {task.title}
                    </h4>
                    <span className="text-[10px] text-[color:var(--muted)]">{task.timeAgo}</span>
                  </div>
                  <p className="text-[11px] text-[color:var(--muted)] truncate">{task.subtitle}</p>
                  <div className="mt-2 text-xs font-bold text-[color:var(--foreground-strong)]">
                    {task.amount}
                  </div>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Cột phải: Chi tiết và AI Verification (2 cột) */}
      <div className="lg:col-span-2 space-y-6">
        {selectedTask ? (
          <>
            <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-[color:var(--brand-soft)] rounded-xl py-12 px-4 text-center">
                  <div className="rounded-full bg-[color:var(--brand-soft)] p-4 mb-4">
                    <Eye className="h-6 w-6 text-[color:var(--brand)]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[color:var(--foreground-strong)] mb-1">
                    Xem ảnh Bill chuyển khoản
                  </h4>
                  <p className="text-xs text-[color:var(--muted)] mb-4">
                    Tác vụ: {selectedTask.title}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-[color:var(--brand)] text-[color:var(--brand)] hover:bg-[color:var(--brand-soft)]"
                      onClick={() => {}}
                    >
                      Xem ảnh gốc
                    </Button>
                    <Button
                      className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white"
                      onClick={handleVerify}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <>
                          <FileText className="h-4 w-4 mr-2 animate-bounce" />
                          AI đang phân tích...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Kiểm tra bằng AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {verificationResult && (
              <div className="grid gap-6 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card>
                  <CardHeader className="pb-3 border-b border-[color:var(--line)]">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Kết quả AI (Khớp {Math.round(verificationResult.confidence * 100)}%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[color:var(--muted)] mb-1">
                        Số tiền nhận diện
                      </div>
                      <div className="rounded-lg bg-green-500/10 p-2 text-sm font-bold text-green-600 border border-green-200">
                        {verificationResult.detectedAmount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[color:var(--muted)] mb-1">
                        Nội dung nhận diện
                      </div>
                      <div className="rounded-lg bg-[color:var(--surface-soft)] p-2 text-[11px] font-medium border border-[color:var(--line)] italic">
                        &quot;{verificationResult.detectedContent}&quot;
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-200">
                  <CardHeader className="pb-3 border-b border-[color:var(--line)]">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Hành động nhanh
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 flex flex-col justify-between h-[calc(100%-50px)]">
                    <div className="space-y-4">
                      <p className="text-[11px] text-[color:var(--muted)]">
                        Số tiền đã khớp hoàn toàn với đơn hàng #{selectedTask.subtitle?.split(": ")[1]}. Bạn có thể phê duyệt ngay.
                      </p>
                    </div>
                    <Button 
                      className="w-full mt-4 bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white shadow-md"
                      onClick={() => handleApprove(selectedTask.id)}
                      disabled={isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isPending ? "Đang xử lý..." : "Phê duyệt & Gửi thông báo"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-50 border-2 border-dashed border-[color:var(--line)] rounded-2xl">
            <CheckCircle2 className="h-12 w-12 text-[color:var(--muted)] mb-4" />
            <h3 className="text-lg font-medium">Chọn một yêu cầu để kiểm tra</h3>
            <p className="text-sm">AI Agent sẵn sàng hỗ trợ bạn đối soát giao dịch ngân hàng.</p>
          </div>
        )}
      </div>
    </div>
  );
}
