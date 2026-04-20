"use client";

import React, { useState, useTransition } from "react";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import type { ShopSettings } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { upsertShopSettings, type ShopSettingsInput } from "@/lib/actions/shop-settings-actions";
import { useRouter } from "next/navigation";

const CHANNELS = ["Zalo OA", "Messenger", "Instagram", "Telegram"] as const;

type Props = {
  initialSettings: ShopSettings | null;
};

export function OnboardingWizard({ initialSettings }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(2);
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
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-red-500/10 via-rose-500/10 to-yellow-500/10 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] md:p-12 border border-[color:var(--line)]">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-red-500/20 blur-3xl mix-blend-multiply dark:mix-blend-soft-light" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl mix-blend-multiply dark:mix-blend-soft-light" />

      <div className="relative z-10 mx-auto max-w-xl rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface-glass)] p-8 shadow-[0_32px_64px_-12px_var(--shadow-color)] backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-[color:var(--muted)]">Bước 2 / 4: Thiết lập cửa hàng</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <React.Fragment key={i}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    step >= i
                      ? "bg-[color:var(--brand)] text-white shadow-sm"
                      : "bg-[color:var(--surface-strong)] text-[color:var(--muted-strong)] shadow-inner"
                  }`}
                >
                  {step > i ? <Check className="h-4 w-4" /> : i}
                </div>
                {i !== 4 && (
                  <div
                    className={`h-1 w-12 rounded-full ${
                      step > i ? "bg-[color:var(--brand)]" : "rgba(var(--foreground), 0.05)"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mb-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
            Cá nhân hóa trải nghiệm
          </h2>
          <p className="mt-2 text-[color:var(--muted)]">
            Lưu tên shop, kênh ưu tiên và liên kết VietQR (URL ảnh QR) vào cơ sở dữ liệu cục bộ.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
              Tên cửa hàng
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Tiệm Bánh Dâu Tây"
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
              value={form.shopName ?? ""}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
              Kết nối kênh tư vấn (ưu tiên)
            </label>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setForm({ ...form, preferredChannel: ch })}
                  className={`flex items-center justify-center rounded-xl border py-3 text-sm font-medium transition ${
                    form.preferredChannel === ch
                      ? "border-[color:var(--brand)] bg-[color:var(--brand-softer)] text-[color:var(--brand-strong)] ring-2 ring-[color:var(--brand-soft)]"
                      : "border-[color:var(--line-strong)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)]"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
              URL ảnh VietQR / QR ngân hàng
            </label>
            <input
              type="url"
              placeholder="https://img.vietqr.io/..."
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none focus:border-[color:var(--brand)]"
              value={form.bankQrUrl ?? ""}
              onChange={(e) => setForm({ ...form, bankQrUrl: e.target.value })}
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-[color:var(--brand-soft)] bg-[color:var(--brand-softer)]/50 p-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[color:var(--brand-strong)]">
                Thông tin Bank (ghi chú)
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="Ngân hàng (vd: Vietcombank)"
                className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-sm outline-none"
                value={form.bankName ?? ""}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Chủ tài khoản"
                className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-sm outline-none"
                value={form.accountHolder ?? ""}
                onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
              />
              <input
                type="text"
                placeholder="Số tài khoản"
                className="col-span-full w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-sm outline-none"
                value={form.accountNumber ?? ""}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" type="button" onClick={() => setStep((s) => Math.max(1, s - 1))}>
            Quay lại
          </Button>
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                Lưu cấu hình <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
