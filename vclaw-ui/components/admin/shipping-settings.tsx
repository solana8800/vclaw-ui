
"use client";

import { useState } from "react";
import { Truck, Save, Group, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/shared";
import { Label } from "../ui/label";
import { upsertShopSettings } from "@/lib/actions/shop-settings-actions";
import { toast } from "sonner";
import { ZaloIdentitySelector } from "./zalo-identity-selector";
import { GHN_URLS } from "@/lib/logistics/ghn-constants";

export function ShippingSettings({ initialSettings }: { initialSettings: any }) {
  const [shipperGroupId, setShipperGroupId] = useState(initialSettings?.shipperGroupId || "");
  const [ghnTokenInput, setGhnTokenInput] = useState(initialSettings?.ghnToken || "");
  const [showGhnToken, setShowGhnToken] = useState(false);
  const [ghnShopId, setGhnShopId] = useState(initialSettings?.ghnShopId || "");
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations("admin.settings.shipping");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertShopSettings({
        shipperGroupId,
        ghnShopId,
        ...(ghnTokenInput.trim() ? { ghnToken: ghnTokenInput.trim() } : {}),
      });
      toast.success(t("saveSuccess"));
    } catch (error) {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="relative z-10 border-[color:var(--line)] shadow-lg bg-[color:var(--surface)] overflow-visible">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-[color:var(--brand)]" />
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </div>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Zalo Shipper Section */}
        <div className="space-y-4 p-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/50">
          <Label className="flex items-center gap-2 text-[color:var(--brand)] font-bold">
            <Group className="h-4 w-4" />
            {t("zaloSection.title")}
          </Label>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("zaloSection.target")}</Label>
            <ZaloIdentitySelector 
              value={shipperGroupId} 
              onChange={setShipperGroupId} 
            />
            <p className="text-xs text-[color:var(--muted)]">
              {t("zaloSection.hint")}
            </p>
          </div>
        </div>

        {/* GHN Integration Section */}
        <div className="space-y-4 p-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/50">
          <Label className="flex items-center gap-2 text-orange-600 font-bold">
            <Truck className="h-4 w-4" />
            {t("ghnSection.title")}
          </Label>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("ghnSection.apiToken")}</Label>
              <div className="relative">
                <Input
                  type={showGhnToken ? "text" : "password"}
                  autoComplete="off"
                  placeholder={t("ghnSection.apiTokenPlaceholder")}
                  value={ghnTokenInput}
                  onChange={(e) => setGhnTokenInput(e.target.value)}
                  className={cn("bg-[color:var(--surface)] pr-11", !showGhnToken && "font-mono")}
                />
                <button
                  type="button"
                  onClick={() => setShowGhnToken((v) => !v)}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground-strong)]"
                  aria-label={showGhnToken ? "Ẩn token" : "Hiện token"}
                >
                  {showGhnToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("ghnSection.shopId")}</Label>
              <Input 
                placeholder={t("ghnSection.shopIdPlaceholder")}
                value={ghnShopId}
                onChange={(e) => setGhnShopId(e.target.value)}
                className="bg-[color:var(--surface)]"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[color:var(--brand-soft)] bg-[color:var(--brand-soft)]/10 space-y-3 shadow-inner">
            <div className="flex items-center gap-2 text-[color:var(--brand)]">
              <div className="p-1 rounded-full bg-[color:var(--brand)]/10">
                <AlertCircle className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold">{t("ghnSection.guideTitle")}</p>
            </div>
            
            <ol className="text-xs text-[color:var(--foreground)] space-y-2 list-decimal ml-5 marker:text-[color:var(--brand)] marker:font-bold">
              <li>
                {t.rich("ghnSection.step1", {
                  link: (chunks) => (
                    <a href={GHN_URLS.PORTAL} target="_blank" className="text-[color:var(--brand)] font-bold border-b border-[color:var(--brand)]/40 hover:border-[color:var(--brand)] transition-all hover:text-[color:var(--brand-strong)] inline-flex items-center gap-1">
                      {chunks} <ExternalLink className="h-3 w-3" />
                    </a>
                  )
                })}
              </li>
              <li>
                {t.rich("ghnSection.step2", {
                  b: (chunks) => <b>{chunks}</b>
                })}
              </li>
              <li>
                {t.rich("ghnSection.step3", {
                  b: (chunks) => <b>{chunks}</b>,
                  manageLink: (chunks) => (
                    <a href={GHN_URLS.SSO_MANAGE_IP} target="_blank" className="text-[color:var(--brand)] font-bold border-b border-[color:var(--brand)]/40 hover:border-[color:var(--brand)] transition-all hover:text-[color:var(--brand-strong)] inline-flex items-center gap-1">
                      {chunks} <ExternalLink className="h-3 w-3" />
                    </a>
                  )
                })}
              </li>
              <li>
                {t.rich("ghnSection.step4", {
                  b: (chunks) => <b>{chunks}</b>
                })}
              </li>
            </ol>

            <div className="pt-2 border-t border-[color:var(--brand-soft)]/30">
              <p className="text-[10px] text-[color:var(--muted)] italic">
                {t.rich("ghnSection.readMore", {
                  link: (chunks) => (
                    <a href={GHN_URLS.DOCS_WEBHOOK} target="_blank" className="text-[color:var(--brand)] font-bold border-b border-[color:var(--brand)]/40 hover:border-[color:var(--brand)] transition-all hover:text-[color:var(--brand-strong)] inline-flex items-center gap-1">
                      {chunks} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-8 bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white h-11 shadow-lg shadow-[color:var(--brand-soft)]"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
