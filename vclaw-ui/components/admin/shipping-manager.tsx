"use client";

import { useState } from "react";
import { 
  MapPin, 
  Truck, 
  Navigation, 
  CheckCircle2, 
  Loader2, 
  Search,
  ArrowRight
} from "lucide-react";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  normalizeAddress, 
  getShippingEstimates, 
  type AddressInfo, 
  type ShippingEstimate 
} from "@/lib/shipping";

export function ShippingManager({ messages }: { messages: any }) {
  const [addressInput, setAddressInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [normalizedAddress, setNormalizedAddress] = useState<AddressInfo | null>(null);
  const [estimates, setEstimates] = useState<ShippingEstimate[]>([]);

  const handleProcess = async () => {
    if (!addressInput.trim()) return;

    setIsProcessing(true);
    try {
      const normalized = await normalizeAddress(addressInput);
      setNormalizedAddress(normalized);
      
      const shippingEstimates = await getShippingEstimates(normalized);
      setEstimates(shippingEstimates);
    } catch (error) {
      console.error("Lỗi xử lý địa chỉ:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Input Section */}
      <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-[color:var(--brand)]" />
            {messages.title}
          </CardTitle>
          <CardDescription>
            {messages.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative group">
            <textarea
              className="w-full min-h-[120px] rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--foreground-strong)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] focus:border-[color:var(--brand)] transition-all resize-none"
              placeholder={messages.inputPlaceholder}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
            />
            <div className="absolute bottom-4 right-4 text-[color:var(--muted)] opacity-50 group-hover:opacity-100 transition-opacity">
               <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          
          <Button 
            className="w-full h-12 rounded-2xl bg-[image:var(--brand-gradient)] font-semibold shadow-md active:scale-95 transition-transform"
            onClick={handleProcess}
            disabled={isProcessing || !addressInput.trim()}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {normalizedAddress ? messages.estimating : messages.normalizing}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                {messages.actionButton}
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {!normalizedAddress && !isProcessing && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-[color:var(--muted)]">
          <div className="mb-4 rounded-full bg-[color:var(--surface-soft)] p-6">
            <MapPin className="h-8 w-8 opacity-20" />
          </div>
          <p>{messages.emptyResult}</p>
        </div>
      )}

      {/* Results Section */}
      {(normalizedAddress || isProcessing) && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Normalization result */}
          <Card className="h-fit">
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {messages.resultTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Địa chỉ chuẩn hóa</div>
                <div className="rounded-xl bg-[color:var(--surface-soft)] p-3 text-sm font-medium border border-[color:var(--line)]">
                  {isProcessing ? <div className="h-5 w-3/4 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.normalized}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Tỉnh / Thành</div>
                  <div className="rounded-xl bg-[color:var(--surface-soft)] p-3 text-sm border border-[color:var(--line)] min-h-[40px]">
                    {isProcessing ? <div className="h-4 w-1/2 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.province}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Quận / Huyện</div>
                  <div className="rounded-xl bg-[color:var(--surface-soft)] p-3 text-sm border border-[color:var(--line)] min-h-[40px]">
                     {isProcessing ? <div className="h-4 w-1/2 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.district}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Phường / Xã</div>
                  <div className="rounded-xl bg-[color:var(--surface-soft)] p-3 text-sm border border-[color:var(--line)] min-h-[40px]">
                     {isProcessing ? <div className="h-4 w-1/2 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.ward}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Số nhà / Đường</div>
                  <div className="rounded-xl bg-[color:var(--surface-soft)] p-3 text-sm border border-[color:var(--line)] min-h-[40px]">
                     {isProcessing ? <div className="h-4 w-1/2 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.street}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estimates list */}
          <Card>
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5 text-[color:var(--brand)]" />
                {messages.estimatesTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 p-0">
              <div className="divide-y divide-[color:var(--line)]">
                {isProcessing && Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-5 flex items-center justify-between">
                    <div className="space-y-2 w-full">
                      <div className="h-4 w-1/3 animate-pulse bg-[color:var(--line)] rounded" />
                      <div className="h-3 w-1/4 animate-pulse bg-[color:var(--line)] rounded" />
                    </div>
                    <div className="h-6 w-20 animate-pulse bg-[color:var(--line)] rounded-full" />
                  </div>
                ))}
                
                {!isProcessing && estimates.map((est) => (
                  <div key={est.provider} className="p-5 flex items-center justify-between hover:bg-[color:var(--surface-soft)] transition-colors group cursor-pointer">
                    <div className="space-y-1">
                      <div className="font-bold text-[color:var(--foreground-strong)] group-hover:text-[color:var(--brand)] transition-colors">
                        {est.provider}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
                        <span className="flex items-center gap-1.5 border-r border-[color:var(--line)] pr-3">
                          <Badge variant="outline" className="text-[10px] font-medium h-5 px-1.5 uppercase opacity-80">
                            {est.service}
                          </Badge>
                        </span>
                        <span>Dự kiến: <b className="text-[color:var(--foreground)]">{est.estimatedDelivery}</b></span>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-lg font-bold text-[color:var(--brand-strong)]">
                        {est.fee.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
