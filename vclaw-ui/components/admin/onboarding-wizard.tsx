"use client";

import React, { useState } from "react";
import { Check, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OnboardingWizard() {
  const [step, setStep] = useState(2);

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-red-500/10 via-rose-500/10 to-yellow-500/10 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] md:p-12 border border-[color:var(--line)]">
      {/* Decorative blurred blobs */}
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
            Hoàn tất các bước nhanh sau để AI trợ lý sẵn sàng phục vụ cửa hàng của bạn.
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
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--foreground-strong)]">
              Kết nối kênh tư vấn
            </label>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <button className="flex items-center justify-center rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] py-3 text-sm font-medium text-[color:var(--foreground-strong)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)]">
                Messenger
              </button>
              <button className="flex items-center justify-center rounded-xl border border-[color:var(--brand)] bg-[color:var(--brand-softer)] py-3 text-sm font-medium text-[color:var(--brand-strong)] shadow-sm transition ring-2 ring-[color:var(--brand-soft)]">
                Zalo OA
              </button>
              <button className="flex items-center justify-center rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] py-3 text-sm font-medium text-[color:var(--foreground-strong)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)]">
                Instagram
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-[color:var(--brand-soft)] bg-[color:var(--brand-softer)]/50 p-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[color:var(--brand-strong)]">
                Thông tin Bank (VietQR)
              </label>
              <span className="rounded-full bg-[color:var(--brand-soft)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-strong)]">
                AI Sẵn sàng
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="Ngân hàng (vd: Vietcombank)"
                className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
              />
              <input
                type="text"
                placeholder="Chủ tài khoản"
                className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
              />
              <input
                type="text"
                placeholder="Số tài khoản"
                className="col-span-full w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none transition focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-softer)] placeholder:text-[color:var(--muted)]"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost">Quay lại</Button>
          <Button>
            Tiếp tục <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
