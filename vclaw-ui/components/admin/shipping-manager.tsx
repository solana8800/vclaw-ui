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
  ArrowRight,
  Copy,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Normalized address — compact horizontal strip */}
          <Card>
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {messages.resultTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {/* Địa chỉ chuẩn hóa full + copy */}
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg bg-[color:var(--surface-soft)] px-3 py-2 text-sm font-medium border border-[color:var(--line)]">
                  {isProcessing
                    ? <div className="h-5 w-3/4 animate-pulse bg-[color:var(--line)] rounded" />
                    : normalizedAddress?.normalized}
                </div>
                {normalizedAddress && !isProcessing && (
                  <button
                    type="button"
                    onClick={() => handleCopy(normalizedAddress.normalized)}
                    className="flex items-center gap-1 shrink-0 text-[11px] font-bold px-3 py-2 rounded-lg border border-[color:var(--line)] hover:bg-[color:var(--surface-soft)] transition-colors text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                  >
                    {copied ? (
                      <><Check className="h-3 w-3 text-emerald-500" /> Đã copy</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </button>
                )}
              </div>

              {/* 4 fields ngang */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Tỉnh / Thành", key: "province" },
                  { label: "Quận / Huyện", key: "district" },
                  { label: "Phường / Xã", key: "ward" },
                  { label: "Số nhà / Đường", key: "street" },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)]">{label}</div>
                    <div className="rounded-lg bg-[color:var(--surface-soft)] px-2.5 py-2 text-xs font-medium border border-[color:var(--line)] min-h-[2rem]">
                      {isProcessing
                        ? <div className="h-3.5 w-3/4 animate-pulse bg-[color:var(--line)] rounded" />
                        : (normalizedAddress as any)?.[key]}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Estimates — full width */}
          <Card>
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-[color:var(--brand)]" />
                {messages.estimatesTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isProcessing ? (
                <div className="px-5 py-4 space-y-3">
                  {Array.from({ length: 1 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-1/4 animate-pulse bg-[color:var(--line)] rounded" />
                      <div className="h-3 w-full animate-pulse bg-[color:var(--line)] rounded" />
                      <div className="h-12 w-full animate-pulse bg-[color:var(--line)] rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--line)]">
                  {estimates.map((est) => {
                    const isLive = !!est.breakdown;
                    const etaDate = est.estimatedDelivery
                      ? (() => {
                          try {
                            // GHN có thể trả ISO string hoặc Unix timestamp (số)
                            const raw = est.estimatedDelivery;
                            const d = /^\d+$/.test(raw)
                              ? new Date(Number(raw) * 1000)
                              : new Date(raw);
                            if (!isNaN(d.getTime()) && d.getFullYear() > 2020) {
                              return d.toLocaleDateString("vi-VN", {
                                weekday: "long",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              });
                            }
                          } catch {}
                          return est.estimatedDelivery;
                        })()
                      : null;

                    return (
                      <div key={est.provider} className="px-5 py-5 space-y-4">
                        {/* Row 1: provider + giá */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-base text-[color:var(--foreground-strong)] flex items-center gap-2">
                              <Truck className="h-4 w-4 text-orange-500 shrink-0" />
                              {est.provider}
                              {!isLive && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold border-amber-500/30 text-amber-700 bg-amber-500/10">
                                  Tham khảo
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-[color:var(--muted)] ml-6">{est.service}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-2xl font-black text-[color:var(--brand-strong)]">
                              {est.fee.toLocaleString("vi-VN")}đ
                            </div>
                          </div>
                        </div>

                        {/* Row 2: route + ETA — stacked, no truncate */}
                        <div className="space-y-2">
                          {est.route && (
                            <div className="rounded-lg bg-[color:var(--surface-soft)] border border-[color:var(--line)] px-3 py-2.5 space-y-1.5">
                              <div className="flex items-start gap-2 text-xs">
                                <MapPin className="h-3 w-3 text-[color:var(--brand)] shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)] block mb-0.5">Gửi từ</span>
                                  <span className="font-semibold text-[color:var(--foreground-strong)] leading-snug">{est.route.from}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-xs">
                                <MapPin className="h-3 w-3 text-orange-500 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)] block mb-0.5">Giao đến</span>
                                  <span className="font-semibold text-[color:var(--foreground-strong)] leading-snug">{est.route.to}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {etaDate && (
                            <div className="flex items-center gap-2 text-xs rounded-lg bg-[color:var(--surface-soft)] border border-[color:var(--line)] px-3 py-2">
                              <Clock className="h-3.5 w-3.5 text-[color:var(--muted)] shrink-0" />
                              <span className="text-[color:var(--muted)]">Dự kiến giao:</span>
                              <b className="text-[color:var(--foreground-strong)]">{etaDate}</b>
                            </div>
                          )}
                        </div>

                        {/* Row 3: fee breakdown — full width grid */}
                        {est.breakdown && (
                          <div className="rounded-xl border border-[color:var(--line)] overflow-hidden">
                            <div className="px-4 py-2 bg-[color:var(--surface-soft)] border-b border-[color:var(--line)]">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">Chi tiết phí GHN</span>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--line)]">
                              <FeeCell label="Phí dịch vụ" value={est.breakdown.serviceFee} />
                              <FeeCell label="Phí bảo hiểm" value={est.breakdown.insuranceFee} />
                              <FeeCell label="Phí thu hộ (COD)" value={est.breakdown.codFee} />
                              <FeeCell
                                label="Phụ phí vùng xa"
                                value={est.breakdown.remoteAreaFee}
                                highlight={est.breakdown.remoteAreaFee > 0}
                              />
                            </div>
                            <div className="flex justify-between items-center px-4 py-3 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)]">
                              <span className="text-sm font-bold text-[color:var(--foreground-strong)]">Tổng phí GHN</span>
                              <span className="text-lg font-black text-[color:var(--brand-strong)]">
                                {est.fee.toLocaleString("vi-VN")}đ
                              </span>
                            </div>
                          </div>
                        )}

                        {!isLive && (
                          <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Giá tham khảo — cần cấu hình GHN Token trong Cài đặt để lấy phí chính xác
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function FeeCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`px-4 py-3 space-y-0.5 ${highlight ? "bg-amber-500/5" : ""}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider ${highlight ? "text-amber-600" : "text-[color:var(--muted)]"}`}>
        {label}
      </div>
      <div className={`text-sm font-black ${highlight && value > 0 ? "text-amber-700" : "text-[color:var(--foreground-strong)]"}`}>
        {value > 0 ? `${value.toLocaleString("vi-VN")}đ` : <span className="text-[color:var(--muted)] font-normal text-xs">—</span>}
      </div>
    </div>
  );
}
