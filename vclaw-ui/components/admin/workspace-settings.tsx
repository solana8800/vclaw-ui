"use client";

import React, { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save, ShieldCheck, Fingerprint, X } from "lucide-react";
import type { ShopSettings } from "@prisma/client";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/ui-switch";
import { upsertShopSettings } from "@/lib/actions/shop-settings-actions";
import { toast } from "sonner";
import type { ApprovalConfig } from "@/lib/automation/approval-config";
import type { AdminMessages, AdminPageContent } from "@/lib/admin/content";

type Props = {
  initialSettings: ShopSettings | null;
  messages: AdminPageContent["workspace"];
  common: AdminMessages["common"];
};

type ApprovalKey = keyof ApprovalConfig;

const DEFAULT_APPROVAL: ApprovalConfig = {
  paymentAutoApprove: false,
  automationEnabled: true,
};

function parseInitialApproval(raw: string | null | undefined): ApprovalConfig {
  if (!raw) return DEFAULT_APPROVAL;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ApprovalKey, unknown>>;
    return {
      paymentAutoApprove: parsed.paymentAutoApprove === true,
      automationEnabled:
        typeof parsed.automationEnabled === "boolean"
          ? parsed.automationEnabled
          : DEFAULT_APPROVAL.automationEnabled,
    };
  } catch {
    return DEFAULT_APPROVAL;
  }
}

export function WorkspaceSettings({ initialSettings, messages, common }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isApprovalPending, startApprovalTransition] = useTransition();

  const m = messages;
  if (!m) return null;

  // Parse JSON configs from DB
  const initialApproval = parseInitialApproval((initialSettings as any)?.approvalConfigJson);

  const [language, setLanguage] = useState((initialSettings as any)?.language || "vi");
  const [approval, setApproval] = useState(initialApproval);
  const [pendingApproval, setPendingApproval] = useState<{ key: ApprovalKey; nextValue: boolean } | null>(null);
  const [savedApprovalKey, setSavedApprovalKey] = useState<ApprovalKey | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const promise = upsertShopSettings({
        language,
        approvalConfigJson: JSON.stringify(approval),
      });

      toast.promise(promise, {
        loading: m.savingNotice,
        success: () => {
          router.refresh();
          return m.saveSuccess;
        },
        error: m.saveError,
      });

      await promise;
    });
  };

  function requestApprovalChange(key: ApprovalKey, nextValue: boolean) {
    if (isApprovalPending || isPending) return;
    setPendingApproval({ key, nextValue });
  }

  function confirmApprovalChange() {
    if (!pendingApproval) return;
    const updated = { ...approval, [pendingApproval.key]: pendingApproval.nextValue };
    const changedKey = pendingApproval.key;
    setApproval(updated);
    setPendingApproval(null);

    startApprovalTransition(async () => {
      const promise = upsertShopSettings({
        approvalConfigJson: JSON.stringify(updated),
      });
      toast.promise(promise, {
        loading: m!.applyingGate,
        success: () => {
          router.refresh();
          setSavedApprovalKey(changedKey);
          setTimeout(() => setSavedApprovalKey(null), 2000);
          return m!.gateApplied;
        },
        error: m!.gateApplyError,
      });
      try {
        await promise;
      } catch {
        setApproval(approval);
      }
    });
  }

  const pendingMeta = pendingApproval
    ? m.gates[pendingApproval.key]
    : null;

  return (
    <div className="grid gap-6">
      {/* 1. Định danh Workspace */}
      <section className="rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[color:var(--foreground-strong)]">{m.identityTitle}</h2>
            <p className="text-sm text-[color:var(--muted)]">{m.identityDescription}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm font-medium text-[color:var(--foreground-strong)]">{m.defaultLanguage}</label>
            <select
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-4 py-2.5 text-sm text-[color:var(--foreground-strong)] outline-none"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="vi">{m.langVi}</option>
              <option value="en">{m.langEn}</option>
            </select>
          </div>
        </div>
      </section>

      <ConfirmationModal
        isOpen={!!pendingApproval}
        onClose={() => setPendingApproval(null)}
        onConfirm={confirmApprovalChange}
        isLoading={isApprovalPending}
        messages={common.modal}
        title={`${pendingApproval?.nextValue ? common.statuses.NEW?.split(" ")?.[1] || "Bật" : common.statuses.CANCELLED?.split(" ")?.[1] || "Tắt"} ${pendingMeta?.label}?`}
        description={pendingApproval?.nextValue ? (pendingMeta?.enableExplain || "") : (pendingMeta?.disableExplain || "")}
        oldValue={pendingApproval ? (approval[pendingApproval.key] ? m.statusOn : m.statusOff) : undefined}
        newValue={pendingApproval ? (pendingApproval.nextValue ? m.statusOn : m.statusOff) : undefined}
        confirmText={common.modal.confirm}
        cancelText={common.modal.cancel}
        variant="warning"
      />

      {/* 2. Cổng duyệt */}
      <section className="rounded-3xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[color:var(--foreground-strong)]">{m.approvalTitle}</h2>
            <p className="text-sm text-[color:var(--muted)]">{m.approvalDescription}</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(m.gates).map(([key, gate]) => {
            const approvalKey = key as ApprovalKey;
            const checked = approval[approvalKey];
            const isSaved = savedApprovalKey === key;
            return (
              <div key={key} className="flex items-center justify-between gap-4 rounded-2xl bg-[color:var(--surface-strong)] p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">{gate.label}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        checked
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--muted)]"
                      }`}
                    >
                      {checked ? m.statusOn : m.statusOff}
                    </span>
                    {isSaved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        {m.saved}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{gate.description}</p>
                </div>
                <Switch
                  checked={checked}
                  onCheckedChange={(val: boolean) => requestApprovalChange(approvalKey, val)}
                  disabled={isApprovalPending || isPending || !!pendingApproval}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Nút lưu chung cho Workspace Settings */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {m.updateCta}
        </Button>
      </div>
    </div>
  );
}
