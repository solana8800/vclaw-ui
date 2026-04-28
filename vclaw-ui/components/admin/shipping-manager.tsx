"use client";

import { useState } from "react";
import { toast } from "sonner";
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
} from "@/lib/logistics/shipping";

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
      if (normalized) {
        const shippingEstimates = await getShippingEstimates(normalized);
        setEstimates(shippingEstimates);
      } else {
        setEstimates([]);
        toast.error(
          typeof messages.standardizeFailed === "string"
            ? messages.standardizeFailed
            : "Không chuẩn hóa được địa chỉ.",
        );
      }
    } catch (error) {
      console.error("Lỗi xử lý địa chỉ:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid gap-4">
      {/* Input Section */}
      <Card className="overflow-hidden border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg">
        <CardHeader className="space-y-1 border-l-[3px] border-l-[color:var(--brand)] pb-2 pl-4 sm:pl-5">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Navigation className="h-5 w-5 shrink-0 text-[color:var(--brand)]" />
            {messages.title ?? messages.resultTitle}
          </CardTitle>
          <CardDescription className="text-sm leading-snug">
            {messages.description ?? ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-4 pt-0">
          <div className="relative group">
            <textarea
              rows={5}
              className="w-full min-h-[8rem] max-h-64 resize-y rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2.5 text-sm text-[color:var(--foreground-strong)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] focus:border-[color:var(--brand)] transition-all"
              placeholder={messages.inputPlaceholder}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
            />
            <div className="pointer-events-none absolute bottom-2.5 right-3 text-[color:var(--muted)] opacity-40 group-hover:opacity-70 transition-opacity">
               <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          
          <Button 
            className="h-11 w-full rounded-xl bg-[image:var(--brand-gradient)] text-sm font-semibold shadow-md active:scale-[0.99] transition-transform sm:h-10"
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

          {!normalizedAddress && !isProcessing ? (
            <p className="flex items-start gap-2 rounded-lg border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)]/60 px-3 py-2 text-xs leading-relaxed text-[color:var(--muted)]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span>{messages.emptyResult}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Results Section */}
      {(normalizedAddress || isProcessing) && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Normalization result */}
          <Card className="h-fit">
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {messages.resultTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Địa chỉ chuẩn hóa</div>
                  <div className="rounded-lg bg-[color:var(--surface-soft)] p-2.5 text-sm font-medium border border-[color:var(--line)]">
                  {isProcessing ? <div className="h-5 w-3/4 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.normalized}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Tỉnh / Thành</div>
                  <div className="rounded-lg bg-[color:var(--surface-soft)] p-2.5 text-sm border border-[color:var(--line)] min-h-[2.25rem]">
                    {isProcessing ? <div className="h-4 w-1/2 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.province}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Quận / Huyện</div>
                  <div className="rounded-lg bg-[color:var(--surface-soft)] p-2.5 text-sm border border-[color:var(--line)] min-h-[2.25rem]">
                     {isProcessing ? <div className="h-4 w-1/2 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.district}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Phường / Xã</div>
                  <div className="rounded-lg bg-[color:var(--surface-soft)] p-2.5 text-sm border border-[color:var(--line)] min-h-[2.25rem]">
                     {isProcessing ? <div className="h-4 w-1/2 animate-pulse bg-[color:var(--line)] rounded" /> : normalizedAddress?.ward}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Số nhà / Đường</div>
                  <div className="rounded-lg bg-[color:var(--surface-soft)] p-2.5 text-sm border border-[color:var(--line)] min-h-[2.25rem]">
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
            <CardContent className="p-0 pt-4">
              <div className="divide-y divide-[color:var(--line)]">
                {isProcessing && Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="space-y-2 w-full">
                      <div className="h-4 w-1/3 animate-pulse bg-[color:var(--line)] rounded" />
                      <div className="h-3 w-1/4 animate-pulse bg-[color:var(--line)] rounded" />
                    </div>
                    <div className="h-6 w-20 animate-pulse bg-[color:var(--line)] rounded-full" />
                  </div>
                ))}
                
                {!isProcessing && estimates.map((est) => (
                  <div key={est.provider} className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors group hover:bg-[color:var(--surface-soft)]">
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
