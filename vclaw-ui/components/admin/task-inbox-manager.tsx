"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Inbox,
  AlertCircle,
  MessageSquare,
  Package,
  CreditCard,
  Truck,
  Calendar,
  HelpCircle,
  Info,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared/utils";
import { completeTask, ignoreTask } from "@/lib/commerce/tasks";
import { normalizeInboxTaskType } from "@/lib/commerce/inbox-task-type";

type InboxTaskRow = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  amount?: string | null;
  timeAgo: string | null;
  isUrgent: boolean;
};

type InboxManagerMessages = {
  title?: string;
  emptyInbox?: string;
  approve?: string;
  reject?: string;
};

type DisplayType = "payment" | "booking" | "shipping" | "digital" | "channel";

type StateChange = {
  label: string;
  from?: string;
  to: string;
  toColor: "emerald" | "sky" | "purple" | "amber" | "indigo" | "teal" | "red" | "muted" | "brand";
};

function toDisplayType(raw: string): DisplayType {
  const u = normalizeInboxTaskType(raw);
  if (u === "payment_review") return "payment";
  if (u === "booking_confirm") return "booking";
  if (u === "channel_message") return "channel";
  const n = raw.toLowerCase();
  if (n.includes("digital") || n.includes("email") || n.includes("fulfillment")) return "digital";
  return "shipping";
}

const TYPE_META: Record<DisplayType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  approveAction: string;
  approveChanges: StateChange[];
  approveWarning?: string;
  rejectChanges: StateChange[];
}> = {
  payment: {
    label: "Xác nhận thanh toán",
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-sky-600 bg-sky-500/10 border-sky-500/20",
    approveAction: "Xác nhận đã nhận tiền",
    approveChanges: [
      { label: "Tác vụ",       from: "Đang chờ",        to: "Hoàn thành",              toColor: "emerald" },
      { label: "Thanh toán",   from: "Chờ xác nhận",    to: "Đã xác nhận",             toColor: "sky" },
      { label: "Bước tiếp",    from: "",                 to: "Bot tiếp tục xử lý đơn",  toColor: "brand" },
    ],
    approveWarning: "Cần tự kiểm tra bill chuyển khoản thực tế trước khi xác nhận.",
    rejectChanges: [
      { label: "Tác vụ",       from: "Đang chờ",  to: "Đã bỏ qua",              toColor: "red" },
      { label: "Thanh toán",   from: "",           to: "Vẫn chờ xác nhận",       toColor: "muted" },
      { label: "Bước tiếp",    from: "",           to: "Bot không tự động tiếp", toColor: "muted" },
    ],
  },
  digital: {
    label: "Xuất hàng điện tử",
    icon: <Package className="h-4 w-4" />,
    color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
    approveAction: "Xác nhận đã gửi hàng",
    approveChanges: [
      { label: "Tác vụ",     from: "Đang chờ",    to: "Hoàn thành",                     toColor: "emerald" },
      { label: "Xuất hàng",  from: "Chờ gửi",     to: "Đã gửi cho khách",               toColor: "purple" },
      { label: "Bước tiếp",  from: "",             to: "Đơn chuyển sang Hoàn thành",     toColor: "brand" },
    ],
    approveWarning: "Cần tự tay gửi file / link / tài khoản cho khách qua email hoặc chat trước khi bấm.",
    rejectChanges: [
      { label: "Tác vụ",     from: "Đang chờ",  to: "Đã bỏ qua",          toColor: "red" },
      { label: "Xuất hàng",  from: "",           to: "Vẫn chờ gửi hàng",   toColor: "muted" },
      { label: "Bước tiếp",  from: "",           to: "Bot không tự xử lý", toColor: "muted" },
    ],
  },
  booking: {
    label: "Xác nhận lịch hẹn",
    icon: <Calendar className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    approveAction: "Xác nhận lịch hẹn",
    approveChanges: [
      { label: "Tác vụ",     from: "Đang chờ",      to: "Hoàn thành",              toColor: "emerald" },
      { label: "Lịch hẹn",   from: "Chờ xác nhận",  to: "Đã xác nhận",             toColor: "teal" },
      { label: "Bước tiếp",  from: "",               to: "Bot thông báo cho khách", toColor: "brand" },
    ],
    rejectChanges: [
      { label: "Tác vụ",    from: "Đang chờ",  to: "Đã bỏ qua",          toColor: "red" },
      { label: "Lịch hẹn",  from: "",           to: "Vẫn chờ xác nhận",   toColor: "muted" },
      { label: "Bước tiếp", from: "",           to: "Bot không tự động",   toColor: "muted" },
    ],
  },
  shipping: {
    label: "Cập nhật giao hàng",
    icon: <Truck className="h-4 w-4" />,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    approveAction: "Xác nhận đã xử lý",
    approveChanges: [
      { label: "Tác vụ",       from: "Đang chờ",   to: "Hoàn thành",    toColor: "emerald" },
      { label: "Vận chuyển",   from: "Chờ xử lý",  to: "Đã xử lý",      toColor: "amber" },
    ],
    rejectChanges: [
      { label: "Tác vụ",       from: "Đang chờ",  to: "Đã bỏ qua",       toColor: "red" },
      { label: "Vận chuyển",   from: "",            to: "Không thay đổi",  toColor: "muted" },
    ],
  },
  channel: {
    label: "Tin nhắn từ kênh",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
    approveAction: "Đánh dấu đã xử lý",
    approveChanges: [
      { label: "Tác vụ",    from: "Đang chờ",     to: "Hoàn thành",   toColor: "emerald" },
      { label: "Tin nhắn",  from: "Chưa xử lý",   to: "Đã xử lý",     toColor: "indigo" },
    ],
    rejectChanges: [
      { label: "Tác vụ",   from: "Đang chờ",  to: "Đã bỏ qua",    toColor: "red" },
      { label: "Tin nhắn", from: "",            to: "Đánh dấu bỏ qua", toColor: "muted" },
    ],
  },
};

const STATE_COLOR: Record<StateChange["toColor"], string> = {
  emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  sky:     "bg-sky-500/10 text-sky-700 border-sky-500/20",
  purple:  "bg-purple-500/10 text-purple-700 border-purple-500/20",
  amber:   "bg-amber-500/10 text-amber-700 border-amber-500/20",
  indigo:  "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  teal:    "bg-teal-500/10 text-teal-700 border-teal-500/20",
  red:     "bg-red-500/10 text-red-700 border-red-500/20",
  muted:   "bg-[color:var(--surface-soft)] text-[color:var(--muted)] border-[color:var(--line)]",
  brand:   "bg-[color:var(--brand-softer)] text-[color:var(--brand-strong)] border-[color:var(--brand-soft)]",
};

type PendingConfirm = {
  task: InboxTaskRow;
  action: "approve" | "reject";
};

export function TaskInboxManager({
  messages,
  initialTasks,
}: {
  messages: InboxManagerMessages;
  initialTasks: InboxTaskRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const isEmpty = initialTasks.length === 0;

  const executeAction = (task: InboxTaskRow, action: "approve" | "reject") => {
    startTransition(async () => {
      try {
        if (action === "approve") {
          await completeTask(task.id);
        } else {
          await ignoreTask(task.id);
        }
        setPendingConfirm(null);
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <>
      <Card className={cn(
        "border-[color:var(--brand-soft)] shadow-lg overflow-hidden relative transition-all duration-300",
        isEmpty ? "bg-[color:var(--surface)] border-dashed opacity-80 hover:opacity-100" : "bg-[color:var(--surface-strong)] mt-2"
      )}>
        <div className={cn(
          "absolute top-0 left-0 w-1 h-full",
          isEmpty ? "bg-[color:var(--line)]" : "bg-[color:var(--brand)]"
        )} />

        {!isEmpty && (
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="h-5 w-5 text-[color:var(--brand)]" />
              {messages.title ?? "Hàng đợi Phê duyệt"}
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="ml-auto text-[color:var(--muted)] hover:text-[color:var(--brand)] transition-colors"
                title="Giải thích chức năng"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
        )}

        <CardContent className={cn(isEmpty ? "py-3 px-4" : "pt-0")}>
          {showGuide && !isEmpty && (
            <div className="mx-0 mb-4 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-sky-700">
                <Info className="h-4 w-4" />
                Hàng đợi Phê duyệt tác vụ là gì?
              </div>
              <p className="text-xs text-[color:var(--foreground)] leading-relaxed">
                Khi bot AI xử lý đơn hàng, một số bước cần admin xác nhận thủ công trước khi tiếp tục — ví dụ: gửi hàng số, xác nhận bill thanh toán, duyệt lịch hẹn.
                Bot tạo <strong>tác vụ</strong> để thông báo cho bạn. Sau khi bạn thực hiện hành động thực tế (gửi file, kiểm tra bill...), bấm <strong>Xác nhận</strong> để đánh dấu hoàn thành.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(Object.entries(TYPE_META) as [DisplayType, typeof TYPE_META[DisplayType]][]).map(([key, meta]) => (
                  <div key={key} className="flex items-start gap-2 text-[10px]">
                    <span className={cn("p-1 rounded-md border", meta.color)}>{meta.icon}</span>
                    <div>
                      <div className="font-bold">{meta.label}</div>
                      <div className="text-[color:var(--muted)]">{meta.approveAction}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEmpty ? (
            <div className="flex items-center justify-between text-[color:var(--muted)]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[color:var(--surface-soft)] flex items-center justify-center">
                  <Check className="h-4 w-4 text-emerald-500/70" />
                </div>
                <p className="text-xs font-medium italic">{messages.emptyInbox ?? "Tuyệt vời! Không có tác vụ nào đang chờ duyệt."}</p>
              </div>
              <Badge variant="outline" className="text-[9px] opacity-50 uppercase tracking-tighter">Sẵn sàng</Badge>
            </div>
          ) : (
            <div className="space-y-3 pt-2 pb-1 max-h-[340px] overflow-y-auto pr-1">
              {initialTasks.map((task) => {
                const displayType = toDisplayType(task.type);
                const meta = TYPE_META[displayType];
                return (
                  <div
                    key={task.id}
                    className="group relative rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 transition-all hover:border-[color:var(--brand-soft)] hover:shadow-md animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold", meta.color)}>
                            {meta.icon}
                            {meta.label}
                          </span>
                          {task.isUrgent && (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {task.timeAgo && (
                            <span className="text-[10px] text-[color:var(--muted)]">{task.timeAgo}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm text-[color:var(--foreground-strong)] leading-snug">
                          {task.title}
                        </h4>
                        <p className="text-xs text-[color:var(--foreground)] opacity-80 leading-relaxed">
                          {task.subtitle}
                        </p>
                        {task.amount && (
                          <div className="text-sm font-bold text-[color:var(--brand)]">
                            {task.amount}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          disabled={isPending}
                          onClick={() => setPendingConfirm({ task, action: "reject" })}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          {messages.reject ?? "Từ chối"}
                        </Button>
                        <Button
                          size="sm"
                          className="h-9 bg-[image:var(--brand-gradient)] text-white shadow-sm hover:opacity-90"
                          disabled={isPending}
                          onClick={() => setPendingConfirm({ task, action: "approve" })}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {messages.approve ?? "Xác nhận"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      {pendingConfirm && (() => {
        const { task, action } = pendingConfirm;
        const displayType = toDisplayType(task.type);
        const meta = TYPE_META[displayType];
        const isApprove = action === "approve";
        const changes = isApprove ? meta.approveChanges : meta.rejectChanges;

        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setPendingConfirm(null)}
          >
            <div
              className="bg-[color:var(--surface)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[color:var(--line)] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={cn(
                "px-6 pt-6 pb-4 flex items-start gap-3",
              )}>
                <div className={cn("p-2.5 rounded-xl border shrink-0", meta.color)}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[color:var(--foreground-strong)]">
                    {isApprove ? meta.approveAction : "Từ chối tác vụ"}
                  </h3>
                  <p className="text-xs text-[color:var(--muted)] mt-0.5">{meta.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => !isPending && setPendingConfirm(null)}
                  className="shrink-0 text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 space-y-4 pb-5">
                {/* Task info */}
                <div className="rounded-xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] p-4 space-y-1">
                  <p className="text-sm font-semibold text-[color:var(--foreground-strong)] leading-snug">{task.title}</p>
                  {task.subtitle && <p className="text-xs text-[color:var(--muted)]">{task.subtitle}</p>}
                  {task.amount && <p className="text-sm font-bold text-[color:var(--brand)] pt-1">{task.amount}</p>}
                  {task.timeAgo && (
                    <p className="text-[10px] text-[color:var(--muted)] opacity-70 pt-0.5">{task.timeAgo}</p>
                  )}
                </div>

                {/* State changes */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                    Thay đổi trạng thái
                  </p>
                  <div className="rounded-xl border border-[color:var(--line)] overflow-hidden divide-y divide-[color:var(--line)]">
                    {changes.map((change, i) => (
                      <div key={i} className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                        <span className="text-[11px] font-semibold text-[color:var(--muted)] w-20 shrink-0">
                          {change.label}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {change.from ? (
                            <>
                              <span className="text-[11px] px-2 py-0.5 rounded-md border bg-[color:var(--surface)] text-[color:var(--muted)] border-[color:var(--line)]">
                                {change.from}
                              </span>
                              <ArrowRight className="h-3 w-3 text-[color:var(--muted)] shrink-0" />
                            </>
                          ) : null}
                          <span className={cn(
                            "text-[11px] px-2 py-0.5 rounded-md border font-bold",
                            STATE_COLOR[change.toColor]
                          )}>
                            {change.to}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warning for approve */}
                {isApprove && meta.approveWarning && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">{meta.approveWarning}</p>
                  </div>
                )}

                {/* Warning for reject — no undo */}
                {!isApprove && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-500/5 border border-red-500/20 px-4 py-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 leading-relaxed">
                      Tác vụ sẽ biến mất khỏi hàng đợi. Bot sẽ không tự động xử lý tiếp bước này.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-end gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl px-5 h-10"
                  onClick={() => setPendingConfirm(null)}
                  disabled={isPending}
                >
                  Hủy
                </Button>
                <Button
                  className={cn(
                    "rounded-xl px-5 h-10 font-bold gap-2",
                    isApprove
                      ? "bg-[image:var(--brand-gradient)] text-white"
                      : "bg-red-500 hover:bg-red-600 text-white border-none"
                  )}
                  onClick={() => executeAction(task, action)}
                  disabled={isPending}
                >
                  {isPending ? (
                    "Đang xử lý..."
                  ) : isApprove ? (
                    <><Check className="h-4 w-4" />{meta.approveAction}</>
                  ) : (
                    <><X className="h-4 w-4" />Từ chối tác vụ</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
