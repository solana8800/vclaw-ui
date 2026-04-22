"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import type { ShopSettings } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { upsertShopSettings, type ShopSettingsInput } from "@/lib/actions/shop-settings-actions";
import { useRouter } from "next/navigation";

type Props = {
  initialSettings: ShopSettings | null;
};

export function BankSettings({ initialSettings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ShopSettingsInput>({
    shopName: initialSettings?.shopName ?? "",
    bankQrUrl: initialSettings?.bankQrUrl ?? "",
    preferredChannel: initialSettings?.preferredChannel ?? "Zalo OA",
    bankName: initialSettings?.bankName ?? "",
    accountHolder: initialSettings?.accountHolder ?? "",
    accountNumber: initialSettings?.accountNumber ?? "",
  });

  const save = () => {
    startTransition(async () => {
      await upsertShopSettings(form);
      router.refresh();
    });
  };

  return (
    <div className="mb-8 rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
            Cấu hình tài khoản nhận tiền
          </h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Lưu thông tin ngân hàng và mã VietQR để hệ thống tự động sinh QR chuyển khoản cho khách hàng.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3">
          <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
            Tên cửa hàng
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Tiệm Bánh Dâu Tây"
            className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
            value={form.shopName ?? ""}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
            Ngân hàng
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Vietcombank"
            className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
            value={form.bankName ?? ""}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
            Chủ tài khoản
          </label>
          <input
            type="text"
            placeholder="Tên chủ thẻ"
            className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
            value={form.accountHolder ?? ""}
            onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
            Số tài khoản
          </label>
          <input
            type="text"
            placeholder="Ví dụ: 0123456789"
            className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
            value={form.accountNumber ?? ""}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          />
        </div>

        <div className="space-y-3 lg:col-span-2">
          <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
            URL ảnh VietQR / QR ngân hàng (tùy chọn)
          </label>
          <input
            type="url"
            placeholder="https://img.vietqr.io/..."
            className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
            value={form.bankQrUrl ?? ""}
            onChange={(e) => setForm({ ...form, bankQrUrl: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Lưu cấu hình
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
