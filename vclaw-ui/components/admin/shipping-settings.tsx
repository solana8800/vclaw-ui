
"use client";

import { useState } from "react";
import { Truck, Save, Group } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "../ui/label";
import { upsertShopSettings } from "@/lib/actions/shop-settings-actions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ZaloIdentitySelector } from "./zalo-identity-selector";

export function ShippingSettings({ initialSettings }: { initialSettings: any }) {
  const [shipperGroupId, setShipperGroupId] = useState(initialSettings?.shipperGroupId || "");
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations("admin.settings"); // We'll add keys here

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertShopSettings({ shipperGroupId });
      toast.success("Đã lưu cấu hình giao vận!");
    } catch (error) {
      toast.error("Lỗi khi lưu cấu hình.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="relative z-10 border-[color:var(--line)] shadow-lg bg-[color:var(--surface)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-[color:var(--brand)]" />
          <CardTitle className="text-lg">Cấu hình Giao vận</CardTitle>
        </div>
        <CardDescription>
          Thiết lập các thông số kết nối đơn vị vận chuyển và nhóm điều phối.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <Label className="flex items-center gap-2">
            <Group className="h-4 w-4" />
            Đối tượng nhận tin điều phối (Zalo)
          </Label>
          <ZaloIdentitySelector 
            value={shipperGroupId} 
            onChange={setShipperGroupId} 
          />
          <p className="text-xs text-[color:var(--muted)]">
            Tìm và chọn nhóm Zalo hoặc tài khoản Shipper từ danh sách của chủ shop để nhận thông báo điều phối tự động.
          </p>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </CardContent>
    </Card>
  );
}
