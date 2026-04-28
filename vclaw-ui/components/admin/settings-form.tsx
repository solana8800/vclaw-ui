"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Store, Save, Building2, QrCode, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertShopSettings, ShopSettingsInput } from "@/lib/actions/shop-settings-actions";

export function SettingsForm({ initialData }: { initialData: ShopSettingsInput | null }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    shopName: initialData?.shopName || "",
    preferredChannel: initialData?.preferredChannel || "Zalo",
    bankName: initialData?.bankName || "",
    accountHolder: initialData?.accountHolder || "",
    accountNumber: initialData?.accountNumber || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    address: initialData?.address || "",
    website: initialData?.website || "",
    shopLogoUrl: initialData?.shopLogoUrl || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await upsertShopSettings(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return (
    <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-[color:var(--brand)]" />
          Cấu hình Cửa hàng
        </CardTitle>
        <CardDescription>Cập nhật thông tin nhận diện thương hiệu, liên hệ và thanh toán.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nhóm 1: Nhận diện thương hiệu */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[color:var(--line)] pb-2 uppercase tracking-wider text-[color:var(--brand)]">
              <Building2 className="h-4 w-4" />
              1. Nhận diện thương hiệu
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Tên cửa hàng</label>
                <input
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  placeholder="Vé SunWorld - VinWonders"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Logo cửa hàng (URL)</label>
                <input
                  name="shopLogoUrl"
                  value={formData.shopLogoUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Website / Landing Page</label>
                <input
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://vclaw.space"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Nhóm 2: Thông tin liên hệ */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[color:var(--line)] pb-2 uppercase tracking-wider text-[color:var(--brand)]">
              <Building2 className="h-4 w-4" />
              2. Thông tin liên hệ
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Số điện thoại Hotline</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0817xxxxxx"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Email hỗ trợ</label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="support@shop.com"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Địa chỉ cửa hàng</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Vịnh Marina, Đà Nẵng"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Nhóm 3: Thanh toán & Kênh bán hàng */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[color:var(--line)] pb-2 uppercase tracking-wider text-[color:var(--brand)]">
              <QrCode className="h-4 w-4" />
              3. Thanh toán & Kênh bán hàng
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Tên Ngân hàng (Hỗ trợ báo động Zalo)</label>
                <select
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                >
                  <option value="">Chọn ngân hàng...</option>
                  <option value="TCB">TCB (Techcombank)</option>
                  <option value="VCB">VCB (Vietcombank)</option>
                  <option value="VPB">VPB (VPBank)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Kênh bán hàng chính</label>
                <select
                  name="preferredChannel"
                  value={formData.preferredChannel}
                  onChange={handleChange}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                >
                  <option value="Zalo">Zalo</option>
                  <option value="Facebook">Messenger</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Số tài khoản</label>
                <input
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="123456789"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Tên chủ tài khoản</label>
                <input
                  name="accountHolder"
                  value={formData.accountHolder}
                  onChange={handleChange}
                  placeholder="TRAN DANH TUAN"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm focus:ring-2 focus:ring-[color:var(--brand)] outline-none"
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white w-full sm:w-auto font-bold"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : success ? (
              "Đã lưu thành công!"
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Lưu cài đặt
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
