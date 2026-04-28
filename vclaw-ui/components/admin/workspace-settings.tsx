"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Save, ShieldCheck, Bell, Fingerprint } from "lucide-react";
import type { ShopSettings } from "@prisma/client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { upsertShopSettings } from "@/lib/actions/shop-settings-actions";

type Props = {
  initialSettings: ShopSettings | null;
};

export function WorkspaceSettings({ initialSettings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Parse JSON configs from DB
  const initialApproval = (initialSettings as any)?.approvalConfigJson 
    ? JSON.parse((initialSettings as any).approvalConfigJson) 
    : { paymentAutoApprove: false, automationEnabled: true, remoteAccessEnabled: false };

  const initialNotification = (initialSettings as any)?.notificationConfigJson
    ? JSON.parse((initialSettings as any).notificationConfigJson)
    : { reminderInterval: 30, followUpCadence: "NORMAL" };

  const [language, setLanguage] = useState((initialSettings as any)?.language || "vi");
  const [approval, setApproval] = useState(initialApproval);
  const [notification, setNotification] = useState(initialNotification);

  const handleSave = () => {
    startTransition(async () => {
      await upsertShopSettings({
        language,
        approvalConfigJson: JSON.stringify(approval),
        notificationConfigJson: JSON.stringify(notification),
      });
      router.refresh();
    });
  };

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
          <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-strong)] p-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">Tự động duyệt thanh toán</p>
              <p className="text-xs text-[color:var(--muted)]">Hệ thống tự xác nhận khi khớp mã chuyển khoản</p>
            </div>
            <Switch 
              checked={approval.paymentAutoApprove}
              onCheckedChange={(val: boolean) => setApproval({ ...approval, paymentAutoApprove: val })}
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-strong)] p-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">Kích hoạt Tự động hóa (Automation)</p>
              <p className="text-xs text-[color:var(--muted)]">Cho phép AI trả lời và xử lý đơn hàng tự động</p>
            </div>
            <Switch 
              checked={approval.automationEnabled}
              onCheckedChange={(val: boolean) => setApproval({ ...approval, automationEnabled: val })}
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-strong)] p-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">Truy cập từ xa (Remote Access)</p>
              <p className="text-xs text-[color:var(--muted)]">Cho phép hỗ trợ kỹ thuật truy cập workspace khi cần</p>
            </div>
            <Switch 
              checked={approval.remoteAccessEnabled}
              onCheckedChange={(val: boolean) => setApproval({ ...approval, remoteAccessEnabled: val })}
            />
          </div>
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
