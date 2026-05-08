"use client";

import React, { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save, ShieldCheck, Bell, Fingerprint, X } from "lucide-react";
import type { ShopSettings } from "@prisma/client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/ui-switch";
import { upsertShopSettings } from "@/lib/actions/shop-settings-actions";
import { toast } from "sonner";
import type { ApprovalConfig } from "@/lib/automation/approval-config";

type Props = {
  initialSettings: ShopSettings | null;
};

type ApprovalKey = keyof ApprovalConfig;

type ApprovalMeta = {
  key: ApprovalKey;
  label: string;
  description: string;
  enableExplain: string;
  disableExplain: string;
};

const DEFAULT_APPROVAL: ApprovalConfig = {
  paymentAutoApprove: false,
  automationEnabled: true,
};

const APPROVAL_META: ApprovalMeta[] = [
  {
    key: "paymentAutoApprove",
    label: "Tự động duyệt thanh toán",
    description: "Cho phép bot/tool tự xác nhận khi công cụ đối soát bill trả kết quả khớp.",
    enableExplain:
      "Khi bật: nếu bill khớp, hệ thống được phép chuyển thanh toán sang VERIFIED và đơn sang PROCESSING/READY_TO_FULFILL.",
    disableExplain:
      "Khi tắt: bill khớp vẫn không tự đổi trạng thái. Bot chỉ báo khách chờ shop kiểm tra, admin phải duyệt thủ công.",
  },
  {
    key: "automationEnabled",
    label: "Kích hoạt Tự động hóa (Automation)",
    description: "Cho phép bot Zalo tự trả lời, tạo đơn, follow-up và chạy heartbeat/marketing.",
    enableExplain:
      "Khi bật: OpenClaw nhận prompt enrich từ VClaw, bot có thể trả lời khách và các job follow-up/marketing được phép gửi tin.",
    disableExplain:
      "Khi tắt: endpoint enrich trả tín hiệu skipAutoReply cho OpenClaw; heartbeat và marketing không gửi tin tự động.",
  },
];

function parseInitialApproval(raw: string | null | undefined): ApprovalConfig {
  if (!raw) return DEFAULT_APPROVAL;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ApprovalKey, unknown>>;
    return {
      paymentAutoApprove: parsed.paymentAutoApprove === true,
      automationEnabled:
        typeof parsed.automationEnabled === "boolean"
          ? parsed.automationEnabled
          : DEFAULT_APPROVAL.automationEnabled,
    };
  } catch {
    return DEFAULT_APPROVAL;
  }
}

export function WorkspaceSettings({ initialSettings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isApprovalPending, startApprovalTransition] = useTransition();

  // Parse JSON configs from DB
  const initialApproval = parseInitialApproval((initialSettings as any)?.approvalConfigJson);

  const initialNotification = (initialSettings as any)?.notificationConfigJson
    ? JSON.parse((initialSettings as any).notificationConfigJson)
    : { reminderInterval: 30, followUpCadence: "NORMAL" };

  const [language, setLanguage] = useState((initialSettings as any)?.language || "vi");
  const [approval, setApproval] = useState(initialApproval);
  const [notification, setNotification] = useState(initialNotification);
  const [pendingApproval, setPendingApproval] = useState<{ key: ApprovalKey; nextValue: boolean } | null>(null);
  const [savedApprovalKey, setSavedApprovalKey] = useState<ApprovalKey | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const promise = upsertShopSettings({
        language,
        approvalConfigJson: JSON.stringify(approval),
        notificationConfigJson: JSON.stringify(notification),
      });

      toast.promise(promise, {
        loading: "Đang lưu cấu hình Workspace...",
        success: () => {
          router.refresh();
          return "Cập nhật cấu hình Workspace thành công!";
        },
        error: "Có lỗi xảy ra khi lưu cấu hình workspace.",
      });

      await promise;
    });
  };

  function requestApprovalChange(key: ApprovalKey, nextValue: boolean) {
    if (isApprovalPending || isPending) return;
    setPendingApproval({ key, nextValue });
  }

  function confirmApprovalChange() {
    if (!pendingApproval) return;
    const updated = { ...approval, [pendingApproval.key]: pendingApproval.nextValue };
    const changedKey = pendingApproval.key;
    setApproval(updated);
    setPendingApproval(null);

    startApprovalTransition(async () => {
      const promise = upsertShopSettings({
        approvalConfigJson: JSON.stringify(updated),
      });
      toast.promise(promise, {
        loading: "Đang áp dụng cổng duyệt...",
        success: () => {
          router.refresh();
          setSavedApprovalKey(changedKey);
          setTimeout(() => setSavedApprovalKey(null), 2000);
          return "Đã áp dụng cổng duyệt.";
        },
        error: "Không lưu được cổng duyệt.",
      });
      try {
        await promise;
      } catch {
        setApproval(approval);
      }
    });
  }

  const pendingMeta = pendingApproval
    ? APPROVAL_META.find((item) => item.key === pendingApproval.key)
    : null;

  return (
    <div className="grid gap-6">
      {/* 1. Định danh Workspace */}
      <section className="rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[color:var(--foreground-strong)]">Định danh workspace</h2>
            <p className="text-sm text-[color:var(--muted)]">Nhãn thương hiệu và ngôn ngữ mặc định</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--foreground-strong)]">Ngôn ngữ mặc định</label>
            <select
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="vi">Tiếng Việt (Mặc định)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. Cổng duyệt */}
      <section className="rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[color:var(--foreground-strong)]">Cổng duyệt (Approval Gate)</h2>
            <p className="text-sm text-[color:var(--muted)]">Kiểm soát các hành động tự động hóa nhạy cảm</p>
          </div>
        </div>

        <div className="space-y-4">
          {pendingApproval && pendingMeta ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {pendingApproval.nextValue ? "Bật" : "Tắt"} {pendingMeta.label}?
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    {pendingApproval.nextValue ? pendingMeta.enableExplain : pendingMeta.disableExplain}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingApproval(null)}
                  className="text-amber-600 transition hover:text-amber-800"
                  disabled={isApprovalPending}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex gap-2 pl-7">
                <Button size="sm" onClick={confirmApprovalChange} disabled={isApprovalPending}>
                  {isApprovalPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Xác nhận áp dụng
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingApproval(null)}
                  disabled={isApprovalPending}
                >
                  Hủy
                </Button>
              </div>
            </div>
          ) : null}

          {APPROVAL_META.map((item) => {
            const checked = approval[item.key];
            const isSaved = savedApprovalKey === item.key;
            return (
              <div key={item.key} className="flex items-center justify-between gap-4 rounded-2xl bg-[color:var(--surface-strong)] p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">{item.label}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        checked
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--muted)]"
                      }`}
                    >
                      {checked ? "ĐANG BẬT" : "ĐANG TẮT"}
                    </span>
                    {isSaved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Đã lưu
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{item.description}</p>
                </div>
                <Switch
                  checked={checked}
                  onCheckedChange={(val: boolean) => requestApprovalChange(item.key, val)}
                  disabled={isApprovalPending || isPending || !!pendingApproval}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Mặc định thông báo */}
      <section className="rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[color:var(--foreground-strong)]">Mặc định thông báo</h2>
            <p className="text-sm text-[color:var(--muted)]">Nhịp nhắc việc và tần suất follow-up</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--foreground-strong)]">Nhịp nhắc việc (phút)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none"
              value={notification.reminderInterval}
              onChange={(e) => setNotification({ ...notification, reminderInterval: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--foreground-strong)]">Tần suất Follow-up</label>
            <select
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none"
              value={notification.followUpCadence}
              onChange={(e) => setNotification({ ...notification, followUpCadence: e.target.value })}
            >
              <option value="FREQUENT">Thường xuyên (Nhiều lần/ngày)</option>
              <option value="NORMAL">Vừa phải (1-2 lần/ngày)</option>
              <option value="LOW">Ít (Sau 3 ngày)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Nút lưu chung cho Workspace Settings - Đã bỏ sticky theo yêu cầu */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Cập nhật Cài đặt Workspace
        </Button>
      </div>
    </div>
  );
}
