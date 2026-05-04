"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Save, ShoppingBag } from "lucide-react";
import type { ShopSettings } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { upsertShopSettings, type ShopSettingsInput } from "@/lib/actions/shop-settings-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  initialSettings: ShopSettings | null;
};

export function BankSettings({ initialSettings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ShopSettingsInput>({
    shopName: initialSettings?.shopName ?? "",
    preferredChannel: initialSettings?.preferredChannel ?? "Zalo",
    bankName: initialSettings?.bankName ?? "",
    accountHolder: initialSettings?.accountHolder ?? "",
    accountNumber: initialSettings?.accountNumber ?? "",
    phone: (initialSettings as any)?.phone ?? "",
    address: (initialSettings as any)?.address ?? "",
    email: (initialSettings as any)?.email ?? "",
    website: (initialSettings as any)?.website ?? "",
    shopLogoUrl: (initialSettings as any)?.shopLogoUrl ?? "",
  });

  const save = () => {
    startTransition(async () => {
      const promise = upsertShopSettings(form);
      
      toast.promise(promise, {
        loading: "Đang lưu cấu hình...",
        success: () => {
          router.refresh();
          return "Đã lưu cấu hình cửa hàng thành công!";
        },
        error: "Có lỗi xảy ra khi lưu cấu hình.",
      });

      await promise;
    });
  };

  return (
    <div className="mb-8 rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)] flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[color:var(--brand)]" />
            Cấu hình Bán hàng & Thương hiệu
          </h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Thiết lập kênh bán hàng chính, thông tin liên hệ và tài khoản nhận thanh toán VietQR.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Nhóm 1: Nhận diện thương hiệu */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[color:var(--brand)]">
            1. Nhận diện thương hiệu
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Tên cửa hàng</label>
              <input
                type="text"
                placeholder="Ví dụ: Tiệm Bánh Dâu Tây"
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.shopName ?? ""}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Logo cửa hàng (URL)</label>
              <input
                type="url"
                placeholder="https://..."
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.shopLogoUrl ?? ""}
                onChange={(e) => setForm({ ...form, shopLogoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Website / Landing Page</label>
              <input
                type="url"
                placeholder="https://vclaw.space"
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.website ?? ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Nhóm 2: Thông tin liên hệ */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[color:var(--brand)]">
            2. Thông tin liên hệ
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Số điện thoại Hotline</label>
              <input
                type="tel"
                placeholder="09xx..."
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Email hỗ trợ</label>
              <input
                type="email"
                placeholder="contact@shop.com"
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2 lg:col-span-3">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Địa chỉ cửa hàng (văn phòng)</label>
              <input
                type="text"
                placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện..."
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Nhóm 3: Thanh toán & Vận hành */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[color:var(--brand)]">
            3. Thanh toán & Kênh bán hàng
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Ngân hàng</label>
              <select
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.bankName ?? ""}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              >
                <option value="">Chọn ngân hàng...</option>
                <option value="TCB">TCB (Techcombank)</option>
                <option value="VCB">VCB (Vietcombank)</option>
                <option value="VPB">VPB (VPBank)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Số tài khoản</label>
              <input
                type="text"
                placeholder="Số thẻ/STK"
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.accountNumber ?? ""}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Chủ tài khoản</label>
              <input
                type="text"
                placeholder="VIET VAN A"
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.accountHolder ?? ""}
                onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--muted)]">Kênh bán hàng chính</label>
              <select
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)]"
                value={form.preferredChannel ?? "Zalo"}
                onChange={(e) => setForm({ ...form, preferredChannel: e.target.value })}
              >
                <option value="Zalo">Zalo</option>
                <option value="Facebook">Messenger</option>
                <option value="Shopee">Shopee</option>
              </select>
            </div>
          </div>
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
