"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Store, Save, Building2, QrCode } from "lucide-react";
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
    bankQrUrl: initialData?.bankQrUrl || "",
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
        <CardDescription>Cập nhật thông tin cửa hàng, ngân hàng và tài khoản nhận thanh toán.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[color:var(--line)] pb-2">
              <Building2 className="h-4 w-4 text-[color:var(--muted)]" />
              Thông tin chung
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Tên cửa hàng</label>
                <input
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  placeholder="VClaw Shop"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Kênh ưu tiên</label>
                <select
                  name="preferredChannel"
                  value={formData.preferredChannel}
                  onChange={handleChange}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Zalo">Zalo OA</option>
                  <option value="Facebook">Facebook Messenger</option>
                  <option value="Shopee">Shopee</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[color:var(--line)] pb-2">
              <QrCode className="h-4 w-4 text-[color:var(--muted)]" />
              Thông tin thanh toán (VietQR)
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Tên ngân hàng</label>
                <input
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="VD: MBBank, Vietcombank"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Tên chủ tài khoản</label>
                <input
                  name="accountHolder"
                  value={formData.accountHolder}
                  onChange={handleChange}
                  placeholder="NGUYEN VAN A"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">Số tài khoản</label>
                <input
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="123456789"
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--muted)]">URL Ảnh VietQR (Tùy chọn)</label>
                <input
                  name="bankQrUrl"
                  value={formData.bankQrUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white w-full sm:w-auto"
            disabled={isPending}
          >
            {isPending ? "Đang lưu..." : success ? "Đã lưu thành công!" : <><Save className="mr-2 h-4 w-4" /> Lưu cài đặt</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
