"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { FileText, CheckCircle2, AlertTriangle, Send, Search, Eye, X, Maximize2, Info, ArrowRight, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared";
import { completeTask } from "@/lib/commerce/tasks";
import { PaymentDetailModal } from "./payment-detail-modal";
import { toast } from "sonner";

interface PaymentTask {
  id: string;
  title: string;
  subtitle: string | null;
  amount: string | null;
  timeAgo: string | null;
}

type BillVerificationCopy = {
  listEmptyAllApproved: string;
  toastPaymentNotFound: string;
  viewLargeImage: string;
  billPreviewAlt: string;
  imageFoundCaption: string;
  billImageMissingTitle: string;
  detail: string;
  viewOriginal: string;
  aiAnalyzing: string;
  verifyWithAi: string;
  close: string;
  aiResultTitle: string;
  detectedAmountLabel: string;
  detectedContentLabel: string;
  quickActionsTitle: string;
  matchApproveHint: string;
  approveAndNotify: string;
  selectRequestTitle: string;
  selectRequestSubtitle: string;
  confirmApproveTitle: string;
  confirmApproveSubtitle: string;
  stateChangesHeading: string;
  rowTask: string;
  rowPayment: string;
  rowNextStep: string;
  taskPendingReview: string;
  taskDone: string;
  paymentAwaitingConfirm: string;
  paymentConfirmed: string;
  botContinuesFulfillment: string;
  verifyBeforeApprove: string;
  verifyBeforeApproveAiSuffix: string;
  cancel: string;
  processing: string;
  confirmApprove: string;
};

const VI_BILL_DEFAULTS: BillVerificationCopy = {
  listEmptyAllApproved: "Tất cả thanh toán đã được duyệt.",
  toastPaymentNotFound: "Không tìm thấy dữ liệu thanh toán cho đơn {orderId}.",
  viewLargeImage: "Xem ảnh lớn",
  billPreviewAlt: "Bill preview",
  imageFoundCaption: "Hình ảnh tìm thấy cho đơn #{orderNumber}",
  billImageMissingTitle: "Chưa tìm thấy ảnh Bill",
  detail: "Chi tiết",
  viewOriginal: "Xem ảnh gốc",
  aiAnalyzing: "AI đang phân tích...",
  verifyWithAi: "Kiểm tra bằng AI",
  close: "Đóng",
  aiResultTitle: "Kết quả AI (Khớp {confidence}%)",
  detectedAmountLabel: "Số tiền nhận diện",
  detectedContentLabel: "Nội dung nhận diện",
  quickActionsTitle: "Hành động nhanh",
  matchApproveHint: "Số tiền đã khớp hoàn toàn với đơn hàng {orderRef}. Bạn có thể phê duyệt ngay.",
  approveAndNotify: "Phê duyệt & Gửi thông báo",
  selectRequestTitle: "Chọn một yêu cầu để kiểm tra",
  selectRequestSubtitle: "AI Agent sẵn sàng hỗ trợ bạn đối soát giao dịch ngân hàng.",
  confirmApproveTitle: "Xác nhận phê duyệt thanh toán",
  confirmApproveSubtitle: "Hành động này sẽ đánh dấu bill đã được xác minh",
  stateChangesHeading: "Thay đổi trạng thái",
  rowTask: "Tác vụ",
  rowPayment: "Thanh toán",
  rowNextStep: "Bước tiếp",
  taskPendingReview: "Chờ duyệt",
  taskDone: "Hoàn thành",
  paymentAwaitingConfirm: "Chờ xác nhận",
  paymentConfirmed: "Đã xác nhận",
  botContinuesFulfillment: "Bot tiếp tục xử lý giao hàng / xuất hàng",
  verifyBeforeApprove: "Cần đã tự kiểm tra bill và xác nhận số tiền khớp với đơn hàng trước khi phê duyệt.",
  verifyBeforeApproveAiSuffix: " AI đã xác minh khớp {confidence}%.",
  cancel: "Hủy",
  processing: "Đang xử lý...",
  confirmApprove: "Xác nhận phê duyệt",
};

const EN_BILL_DEFAULTS: BillVerificationCopy = {
  listEmptyAllApproved: "All payments have been approved.",
  toastPaymentNotFound: "No payment record for order {orderId}.",
  viewLargeImage: "View large",
  billPreviewAlt: "Bill preview",
  imageFoundCaption: "Image on file for order #{orderNumber}",
  billImageMissingTitle: "No bill image found",
  detail: "Details",
  viewOriginal: "View original",
  aiAnalyzing: "AI is analyzing…",
  verifyWithAi: "Verify with AI",
  close: "Close",
  aiResultTitle: "AI result ({confidence}% match)",
  detectedAmountLabel: "Detected amount",
  detectedContentLabel: "Detected content",
  quickActionsTitle: "Quick actions",
  matchApproveHint: "The amount fully matches order {orderRef}. You can approve now.",
  approveAndNotify: "Approve & Notify",
  selectRequestTitle: "Select a request to verify",
  selectRequestSubtitle: "AI Agent is ready to assist you with bank transaction verification.",
  confirmApproveTitle: "Confirm payment approval",
  confirmApproveSubtitle: "This will mark the bill as verified",
  stateChangesHeading: "Status changes",
  rowTask: "Task",
  rowPayment: "Payment",
  rowNextStep: "Next step",
  taskPendingReview: "Pending review",
  taskDone: "Completed",
  paymentAwaitingConfirm: "Awaiting confirm",
  paymentConfirmed: "Confirmed",
  botContinuesFulfillment: "Bot continues with fulfillment",
  verifyBeforeApprove: "You must have checked the bill yourself before approving.",
  verifyBeforeApproveAiSuffix: " AI verified {confidence}% match.",
  cancel: "Cancel",
  processing: "Processing…",
  confirmApprove: "Confirm approval",
};

export function BillVerificationManager({ 
  tasks,
  payments,
  messages 
}: { 
  tasks: PaymentTask[];
  payments?: any[];
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
    billVerification?: Partial<BillVerificationCopy>;
  };
}) {
  const router = useRouter();
  const locale = useLocale();
  const baseDefaults = locale === "vi" ? VI_BILL_DEFAULTS : EN_BILL_DEFAULTS;
  const b = { ...baseDefaults, ...messages.billVerification };
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
  const [showFullImage, setShowFullImage] = useState(false);
  const [selectedPaymentForModal, setSelectedPaymentForModal] = useState<any | null>(null);
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Tìm payment tương ứng dựa trên mã ĐH trong subtitle (ví dụ: "Mã ĐH: #ORD-PAID-002")
  const linkedPayment = useMemo(() => {
    if (!selectedTask?.subtitle || !payments) return null;
    const match = selectedTask.subtitle.match(/#([A-Z0-9-]+)/i);
    if (!match) return null;
    const orderNumber = match[1].trim().toUpperCase();
    return payments.find(p => p.order.orderNumber.trim().toUpperCase() === orderNumber);
  }, [selectedTask, payments]);

  const handleVerify = () => {
    if (!selectedTask) return;
    setIsVerifying(true);
    startTransition(async () => {
      try {
        const { verifyPaymentBill } = await import("@/lib/actions/payment-actions");
        const result = await verifyPaymentBill(selectedTask.id, selectedTask.amount);
        setVerificationResult(result);
      } catch (error) {
        console.error("Lỗi khi kiểm tra hóa đơn:", error);
      } finally {
        setIsVerifying(false);
      }
    });
  };

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        await completeTask(id);
        setVerificationResult(null);
        setSelectedTaskId(null);
        setPendingApproveId(null);
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
            {messages?.listTitle || "Bill cần kiểm tra"}
            <Badge variant="outline" className="bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto max-h-[600px]">
          <ul className="divide-y divide-[color:var(--line)]">
            {tasks.length === 0 ? (
              <li className="p-8 text-center text-[color:var(--muted)] text-sm">
                {b.listEmptyAllApproved}
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
                  <div className="flex flex-col items-start gap-0.5">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("DEBUG: Subtitle clicked", task.subtitle);
                        const match = task.subtitle?.match(/#([A-Z0-9-]+)/i);
                        if (match) {
                          const orderId = match[1].trim().toUpperCase();
                          console.log("DEBUG: Extracted Order ID", orderId);
                          const p = payments?.find(pay => pay.order.orderNumber.trim().toUpperCase() === orderId);
                          if (p) {
                            setSelectedPaymentForModal(p);
                          } else {
                            console.warn("DEBUG: Payment not found for", orderId);
                            toast.error(b.toastPaymentNotFound.replace("{orderId}", orderId));
                          }
                        } else {
                          console.warn("DEBUG: No match in subtitle", task.subtitle);
                        }
                      }}
                      className="text-[11px] font-mono font-bold text-[color:var(--brand-strong)] hover:underline flex items-center gap-1"
                    >
                      {task.subtitle}
                      <Eye className="h-2.5 w-2.5" />
                    </button>
                  </div>
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
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-[color:var(--brand-soft)] rounded-xl py-6 px-4 text-center bg-[color:var(--surface)]">
                  {linkedPayment?.evidenceImage ? (
                    <div className="w-full space-y-4">
                      <div className="relative group max-w-[300px] mx-auto rounded-lg overflow-hidden border border-[color:var(--line)] shadow-sm">
                        <img 
                          src={linkedPayment.evidenceImage} 
                          className="w-full h-48 object-contain bg-white transition-transform group-hover:scale-105" 
                          alt={b.billPreviewAlt}
                        />
                        <button 
                          onClick={() => setShowFullImage(true)}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white gap-2 text-xs font-bold"
                        >
                          <Maximize2 className="h-4 w-4" />
                          {b.viewLargeImage}
                        </button>
                      </div>
                      <div className="text-[10px] text-[color:var(--muted)] uppercase font-bold tracking-tighter">
                        {b.imageFoundCaption.replace("{orderNumber}", linkedPayment.order.orderNumber)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-full bg-[color:var(--brand-soft)] p-4 mb-4">
                        <Eye className="h-6 w-6 text-[color:var(--brand)]" />
                      </div>
                      <h4 className="text-sm font-semibold text-[color:var(--foreground-strong)] mb-1">
                        {b.billImageMissingTitle}
                      </h4>
                      <p className="text-xs text-[color:var(--muted)] mb-4 italic">
                        {selectedTask.subtitle}
                      </p>
                    </>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    {linkedPayment?.evidenceImage && (
                      <>
                        <Button
                          variant="outline"
                          className="border-[color:var(--line)] text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)]"
                          onClick={() => setSelectedPaymentForModal(linkedPayment)}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          {b.detail}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-[color:var(--brand)] text-[color:var(--brand)] hover:bg-[color:var(--brand-soft)]"
                          onClick={() => setShowFullImage(true)}
                        >
                          <Maximize2 className="h-4 w-4 mr-2" />
                          {b.viewOriginal}
                        </Button>
                      </>
                    )}
                    <Button
                      className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white"
                      onClick={handleVerify}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <>
                          <FileText className="h-4 w-4 mr-2 animate-bounce" />
                          {b.aiAnalyzing}
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          {b.verifyWithAi}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modal xem ảnh lớn */}
            {showFullImage && linkedPayment?.evidenceImage && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-300">
                <div className="relative max-w-4xl w-full h-[90vh] flex flex-col">
                  <button 
                    onClick={() => setShowFullImage(false)}
                    className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 flex items-center gap-2 font-bold"
                  >
                    <X className="h-6 w-6" /> {b.close}
                  </button>
                  <div className="flex-1 bg-white rounded-2xl overflow-hidden flex items-center justify-center p-4">
                    <img 
                      src={linkedPayment.evidenceImage} 
                      className="max-w-full max-h-full object-contain shadow-2xl"
                      alt="Full bill"
                    />
                  </div>
                </div>
              </div>
            )}

            {verificationResult && (
              <div className="grid gap-6 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card>
                  <CardHeader className="pb-3 border-b border-[color:var(--line)]">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {b.aiResultTitle.replace(
                        "{confidence}",
                        String(Math.round(verificationResult.confidence * 100)),
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[color:var(--muted)] mb-1">
                        {b.detectedAmountLabel}
                      </div>
                      <div className="rounded-lg bg-green-500/10 p-2 text-sm font-bold text-green-600 border border-green-200">
                        {verificationResult.detectedAmount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[color:var(--muted)] mb-1">
                        {b.detectedContentLabel}
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
                      {b.quickActionsTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 flex flex-col justify-between h-[calc(100%-50px)]">
                    <div className="space-y-4">
                      <p className="text-[11px] text-[color:var(--muted)]">
                        {b.matchApproveHint.replace(
                          "{orderRef}",
                          selectedTask.subtitle?.split(": ")[1]?.trim() || selectedTask.subtitle || "…",
                        )}
                      </p>
                    </div>
                    <Button
                      className="w-full mt-4 bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white shadow-md"
                      onClick={() => setPendingApproveId(selectedTask.id)}
                      disabled={isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {b.approveAndNotify}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-50 border-2 border-dashed border-[color:var(--line)] rounded-2xl">
            <CheckCircle2 className="h-12 w-12 text-[color:var(--muted)] mb-4" />
            <h3 className="text-lg font-medium">{b.selectRequestTitle}</h3>
            <p className="text-sm">{b.selectRequestSubtitle}</p>
          </div>
        )}
      </div>

      <PaymentDetailModal
        payment={selectedPaymentForModal}
        onClose={() => setSelectedPaymentForModal(null)}
      />

      {/* Confirm Approve Dialog */}
      {pendingApproveId && (() => {
        const task = tasks.find(t => t.id === pendingApproveId);
        if (!task) return null;
        const payment = payments?.find(p => {
          const match = task.subtitle?.match(/#([A-Z0-9-]+)/i);
          return match && p.order.orderNumber.trim().toUpperCase() === match[1].trim().toUpperCase();
        });

        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setPendingApproveId(null)}
          >
            <div
              className="bg-[color:var(--surface)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[color:var(--line)] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-4 flex items-start gap-3">
                <div className="p-2.5 rounded-xl border text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[color:var(--foreground-strong)]">{b.confirmApproveTitle}</h3>
                  <p className="text-xs text-[color:var(--muted)] mt-0.5">{b.confirmApproveSubtitle}</p>
                </div>
                <button type="button" onClick={() => setPendingApproveId(null)} className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 space-y-4 pb-5">
                {/* Thông tin task */}
                <div className="rounded-xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] px-4 py-3 space-y-1">
                  <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">{task.title}</p>
                  {task.subtitle && <p className="text-xs text-[color:var(--muted)] font-mono">{task.subtitle}</p>}
                  {task.amount && <p className="text-base font-black text-[color:var(--brand-strong)] pt-1">{task.amount}</p>}
                </div>

                {/* Thay đổi trạng thái */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">{b.stateChangesHeading}</p>
                  <div className="rounded-xl border border-[color:var(--line)] overflow-hidden divide-y divide-[color:var(--line)]">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                      <span className="text-[11px] font-semibold text-[color:var(--muted)] w-20 shrink-0">{b.rowTask}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold">{b.taskPendingReview}</span>
                        <ArrowRight className="h-3 w-3 text-[color:var(--muted)]" />
                        <span className="text-[11px] px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold">{b.taskDone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                      <span className="text-[11px] font-semibold text-[color:var(--muted)] w-20 shrink-0">{b.rowPayment}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-md border bg-[color:var(--surface)] text-[color:var(--muted)] border-[color:var(--line)]">{b.paymentAwaitingConfirm}</span>
                        <ArrowRight className="h-3 w-3 text-[color:var(--muted)]" />
                        <span className="text-[11px] px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold">{b.paymentConfirmed}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                      <span className="text-[11px] font-semibold text-[color:var(--muted)] w-20 shrink-0">{b.rowNextStep}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md border bg-[color:var(--brand-softer)] text-[color:var(--brand-strong)] border-[color:var(--brand-soft)] font-bold">
                        {b.botContinuesFulfillment}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cảnh báo */}
                <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {b.verifyBeforeApprove}
                    {verificationResult
                      ? b.verifyBeforeApproveAiSuffix.replace(
                          "{confidence}",
                          String(Math.round(verificationResult.confidence * 100)),
                        )
                      : ""}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-end gap-3">
                <button
                  type="button"
                  className="px-5 h-10 rounded-xl border border-[color:var(--line)] text-sm font-medium hover:bg-[color:var(--surface-strong)] transition-colors"
                  onClick={() => setPendingApproveId(null)}
                  disabled={isPending}
                >
                  {b.cancel}
                </button>
                <button
                  type="button"
                  className="px-5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-60"
                  onClick={() => handleApprove(pendingApproveId)}
                  disabled={isPending}
                >
                  <Send className="h-4 w-4" />
                  {isPending ? b.processing : b.confirmApprove}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
