"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Camera, Phone, CreditCard, Globe, Loader2, Save } from "lucide-react";
import type { ShopSettings } from "@prisma/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { upsertShopSettings } from "@/lib/actions/shop-settings-actions";
import type { AdminPageContent } from "@/lib/admin/content";

export function BankSettings({
  initialSettings,
  messages,
}: {
  initialSettings: ShopSettings | null;
  messages: AdminPageContent["bank"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!messages) return null;

  const [form, setForm] = useState({
    shopName: initialSettings?.shopName || "",
    shopLogoUrl: (initialSettings as any)?.shopLogoUrl || "",
    website: (initialSettings as any)?.website || "",
    phone: (initialSettings as any)?.phone || "",
    email: (initialSettings as any)?.email || "",
    address: (initialSettings as any)?.address || "",
    bankName: initialSettings?.bankName || "",
    accountNumber: initialSettings?.accountNumber || "",
    accountHolder: initialSettings?.accountHolder || "",
    preferredChannel: initialSettings?.preferredChannel || "Zalo",
  });

  const save = () => {
    startTransition(async () => {
      try {
        await upsertShopSettings(form);
        toast.success(messages.saveSuccess);
        router.refresh();
      } catch (error) {
        console.error("Error saving bank settings:", error);
        toast.error(messages.saveError);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[color:var(--line)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[color:var(--brand-soft)]/20 flex items-center justify-center text-[color:var(--brand)]">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[color:var(--foreground-strong)]">
              {messages.title}
            </h2>
            <p className="text-xs text-[color:var(--muted)] font-medium">
              {messages.description}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          className="rounded-xl px-6 h-11 shadow-lg shadow-[color:var(--brand-soft)] font-bold text-sm"
          onClick={save}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {messages.saving}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {messages.save}
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nhận diện thương hiệu */}
        <Card className="rounded-2xl border-[color:var(--line)] shadow-sm overflow-hidden">
          <CardHeader className="bg-[color:var(--surface-soft)] border-b border-[color:var(--line)] py-4">
            <CardTitle className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest flex items-center gap-2">
              <Camera className="h-3 w-3" />
              {messages.brandSection}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                {messages.shopName}
              </label>
              <Input
                placeholder={messages.shopNamePlaceholder}
                className="h-11 rounded-xl border-[color:var(--line)] bg-[color:var(--surface)] font-medium focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                {messages.shopLogoUrl}
              </label>
              <div className="flex gap-3">
                <Input
                  placeholder="https://..."
                  className="h-11 rounded-xl border-[color:var(--line)] bg-[color:var(--surface)] font-medium focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all"
                  value={form.shopLogoUrl}
                  onChange={(e) => setForm({ ...form, shopLogoUrl: e.target.value })}
                />
                {form.shopLogoUrl && (
                  <div className="h-11 w-11 rounded-xl border border-[color:var(--line)] bg-white p-1 overflow-hidden shrink-0">
                    <img src={form.shopLogoUrl} alt="Logo Preview" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                {messages.website}
              </label>
              <div className="relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted)] group-focus-within:text-[color:var(--brand)] transition-colors" />
                <Input
                  placeholder="https://vclaw.space"
                  className="h-11 pl-10 rounded-xl border-[color:var(--line)] bg-[color:var(--surface)] font-medium focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thông tin liên hệ */}
        <Card className="rounded-2xl border-[color:var(--line)] shadow-sm overflow-hidden">
          <CardHeader className="bg-[color:var(--surface-soft)] border-b border-[color:var(--line)] py-4">
            <CardTitle className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest flex items-center gap-2">
              <Phone className="h-3 w-3" />
              {messages.contactSection}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                  {messages.hotline}
                </label>
                <Input
                  placeholder={messages.phonePlaceholder || "09..."}
                  className="h-11 rounded-xl border-[color:var(--line)] bg-[color:var(--surface)] font-medium focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                  {messages.email}
                </label>
                <Input
                  placeholder={messages.emailPlaceholder || "shop@email.com"}
                  className="h-11 rounded-xl border-[color:var(--line)] bg-[color:var(--surface)] font-medium focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                {messages.address}
              </label>
              <textarea
                rows={3}
                placeholder={messages.addressPlaceholder}
                className="w-full p-3 text-sm rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] font-medium focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all resize-none"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Thanh toán & Kênh bán hàng */}
        <Card className="rounded-2xl border-[color:var(--line)] shadow-sm overflow-hidden lg:col-span-2">
          <CardHeader className="bg-[color:var(--surface-soft)] border-b border-[color:var(--line)] py-4">
            <CardTitle className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="h-3 w-3" />
              {messages.paymentSection}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                  {messages.bank}
                </label>
                <select
                  className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all cursor-pointer appearance-none"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                >
                  <option value="">{messages.bankPlaceholder}</option>
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="MBBank">MBBank</option>
                  <option value="TPBank">TPBank</option>
                  <option value="ACB">ACB</option>
                  <option value="VPBank">VPBank</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                  {messages.accountNumber}
                </label>
                <Input
                  placeholder={messages.accountNumberPlaceholder}
                  className="h-11 rounded-xl border-[color:var(--line)] bg-[color:var(--surface)] font-medium focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                  {messages.accountHolder}
                </label>
                <Input
                  placeholder={messages.accountHolderPlaceholder}
                  className="h-11 rounded-xl border-[color:var(--line)] bg-[color:var(--surface)] font-medium focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all uppercase"
                  value={form.accountHolder}
                  onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[color:var(--foreground)] ml-1">
                  {messages.preferredChannel}
                </label>
                <select
                  className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all cursor-pointer appearance-none"
                  value={form.preferredChannel}
                  onChange={(e) => setForm({ ...form, preferredChannel: e.target.value })}
                >
                  <option value="Zalo">Zalo</option>
                  <option value="Messenger">Messenger</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Shopee">Shopee</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isPending && (
        <div className="fixed bottom-8 right-8 bg-white border border-[color:var(--line)] p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 z-50">
          <div className="h-8 w-8 rounded-full border-2 border-[color:var(--brand-soft)] border-t-[color:var(--brand)] animate-spin" />
          <p className="text-sm font-bold text-[color:var(--foreground-strong)]">
            {messages.loading}
          </p>
        </div>
      )}
    </div>
  );
}
