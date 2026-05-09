"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/ui-switch";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Clock, RefreshCw, Bell, CreditCard, AlertTriangle, X } from "lucide-react";
import type { AutomationRulesConfig as AutomationRulesConfigType } from "@/lib/actions/shop-settings-actions";
import { saveAutomationRules } from "@/lib/actions/shop-settings-actions";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";
import type { AdminMessages, AdminPageContent } from "@/lib/admin/content";

type RuleKey = keyof AutomationRulesConfigType;

type RuleMeta = {
  key: RuleKey;
  label: string;
  description: string;
  enableExplain: string;
  disableExplain: string;
  icon: React.ReactNode;
  delayLabel: string;
  delayUnit: string;
};

const RULE_META: RuleMeta[] = [
  {
    key: "paymentFollowup",
    label: "Follow-up thanh toán",
    description: "Tự động nhắc khách gửi bill sau khi QR được tạo mà chưa thanh toán.",
    enableExplain:
      "Khi bật: sau khi bạn gửi mã QR cho khách, nếu sau X phút khách chưa thanh toán, bot sẽ tự động nhắn tin nhắc. Tin nhắn do AI soạn dựa trên ngữ cảnh cuộc trò chuyện.",
    disableExplain:
      "Khi tắt: bot sẽ không tự động nhắc khách thanh toán nữa. Bạn cần theo dõi và nhắc thủ công.",
    icon: <CreditCard className="h-4 w-4" />,
    delayLabel: "Nhắc sau",
    delayUnit: "phút",
  },
  {
    key: "appointmentReminder",
    label: "Nhắc lịch hẹn",
    description: "Gửi tin nhắc tự động trước giờ hẹn đã đặt.",
    enableExplain:
      "Khi bật: X phút trước giờ hẹn, bot sẽ tự động nhắn tin nhắc khách. Giúp giảm tỷ lệ khách vắng mặt không báo trước.",
    disableExplain:
      "Khi tắt: bot sẽ không nhắc lịch hẹn. Khách có thể quên và không đến đúng giờ.",
    icon: <Bell className="h-4 w-4" />,
    delayLabel: "Nhắc trước",
    delayUnit: "phút",
  },
  {
    key: "leadReactivation",
    label: "Tái kích hoạt lead",
    description: "Tự động tiếp cận lại khách không phản hồi sau một thời gian dài.",
    enableExplain:
      "Khi bật: nếu một cuộc trò chuyện im lặng hơn X giờ, bot sẽ tự động gửi tin hỏi thăm hoặc giới thiệu sản phẩm phù hợp. Giúp vớt lại những khách có tiềm năng mua hàng.",
    disableExplain:
      "Khi tắt: bot sẽ không chủ động liên hệ lại khách đã im lặng. Bạn cần tự quyết định khi nào nên tiếp cận.",
    icon: <RefreshCw className="h-4 w-4" />,
    delayLabel: "Im lặng quá",
    delayUnit: "giờ",
  },
];

type PendingChange =
  | { kind: "toggle"; key: RuleKey; newEnabled: boolean }
  | { kind: "delay"; key: RuleKey; newDelay: number };

type Props = {
  initialRules: AutomationRulesConfigType;
  messages: NonNullable<AdminPageContent["automationRules"]>;
  common: AdminMessages["common"];
};

export function AutomationRulesConfig({ initialRules, messages, common }: Props) {
  const [rules, setRules] = useState<AutomationRulesConfigType>(initialRules);
  const [saving, startSave] = useTransition();
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  // Tạm giữ giá trị delay đang nhập (chưa confirm)
  const [draftDelay, setDraftDelay] = useState<Partial<Record<RuleKey, number>>>({});

  const m = messages;

  // Xây dựng meta động từ messages
  const RULE_META: RuleMeta[] = [
    {
      key: "paymentFollowup",
      ...m.rules.paymentFollowup,
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      key: "appointmentReminder",
      ...m.rules.appointmentReminder,
      icon: <Bell className="h-4 w-4" />,
    },
    {
      key: "leadReactivation",
      ...m.rules.leadReactivation,
      icon: <RefreshCw className="h-4 w-4" />,
    },
  ];

  function persist(updated: AutomationRulesConfigType, changedKey: string) {
    startSave(async () => {
      await saveAutomationRules(updated);
      setSavedKey(changedKey);
      const meta = RULE_META.find((m) => m.key === changedKey);
      toast.success(`${m.toastSaved}: ${meta?.label || changedKey}`);
      setTimeout(() => setSavedKey(null), 2000);
    });
  }

  function requestToggle(key: RuleKey) {
    const newEnabled = !rules[key].enabled;
    setPending({ kind: "toggle", key, newEnabled });
  }

  function requestDelayChange(key: RuleKey, value: number) {
    if (isNaN(value) || value < 1) return;
    setDraftDelay((d) => ({ ...d, [key]: value }));
    setPending({ kind: "delay", key, newDelay: value });
  }

  function confirmChange() {
    if (!pending) return;
    let updated: AutomationRulesConfigType;
    if (pending.kind === "toggle") {
      updated = { ...rules, [pending.key]: { ...rules[pending.key], enabled: pending.newEnabled } };
    } else {
      updated = { ...rules, [pending.key]: { ...rules[pending.key], delayValue: pending.newDelay } };
      setDraftDelay((d) => { const n = { ...d }; delete n[pending.key]; return n; });
    }
    setRules(updated);
    persist(updated, pending.key);
    setPending(null);
  }

  function cancelChange() {
    if (pending?.kind === "delay") {
      setDraftDelay((d) => { const n = { ...d }; delete n[pending.key]; return n; });
    }
    setPending(null);
  }

  const pendingMeta = pending ? RULE_META.find((m) => m.key === pending.key) : null;

  return (
    <Card className="border-[color:var(--line)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-[color:var(--brand)]" />
              {m.title}
            </CardTitle>
            <CardDescription className="mt-1 text-[color:var(--muted)]">
              {m.description}
            </CardDescription>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--muted)]" />}
        </div>
      </CardHeader>

      <ConfirmationModal
        isOpen={!!pending}
        onClose={cancelChange}
        onConfirm={confirmChange}
        isLoading={saving}
        messages={common.modal}
        title={pending?.kind === "toggle"
          ? `${pending.newEnabled ? common.statuses.NEW?.split(" ")?.[1] || "Bật" : common.statuses.CANCELLED?.split(" ")?.[1] || "Tắt"} "${pendingMeta?.label}"?`
          : `${common.modal.change} "${pendingMeta?.label}"?`}
        description={pending?.kind === "toggle"
          ? (pending.newEnabled ? pendingMeta?.enableExplain : pendingMeta?.disableExplain) || ""
          : m.modalDelayDescription.replace("{delay}", String(pending?.newDelay)).replace("{unit}", pendingMeta?.delayUnit || "").replace("{label}", pendingMeta?.label.toLowerCase() || "")}
        oldValue={pending?.kind === "toggle" 
          ? (rules[pending.key]?.enabled ? m.statusOn : m.statusOff)
          : `${rules[pending?.key as RuleKey]?.delayValue} ${pendingMeta?.delayUnit}`}
        newValue={pending?.kind === "toggle"
          ? (pending.newEnabled ? m.statusOn : m.statusOff)
          : `${pending?.newDelay} ${pendingMeta?.delayUnit}`}
        confirmText={common.modal.confirm}
        cancelText={common.modal.cancel}
        variant="warning"
      />

      <CardContent className="space-y-3">

        {RULE_META.map((meta) => {
          const rule = rules[meta.key];
          const isSaved = savedKey === meta.key;
          const isPendingThis = pending?.key === meta.key;
          // Preview toggle state nếu đang chờ confirm
          const displayEnabled =
            isPendingThis && pending?.kind === "toggle" ? pending.newEnabled : rule.enabled;

          return (
            <div
              key={meta.key}
              className={`rounded-xl border p-4 transition-all duration-200 ${
                isPendingThis
                  ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10"
                  : displayEnabled
                  ? "border-[color:var(--brand-soft)] bg-[color:var(--surface-soft)]"
                  : "border-[color:var(--line)] bg-transparent opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={`mt-0.5 ${
                      displayEnabled ? "text-[color:var(--brand)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{meta.label}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          displayEnabled
                            ? isPendingThis
                              ? "border-amber-400 text-amber-700"
                              : "border-[color:var(--brand)] text-[color:var(--brand)]"
                            : "text-[color:var(--muted)]"
                        }`}
                      >
                        {isPendingThis && pending?.kind === "toggle"
                          ? m.pendingConfirm
                          : displayEnabled
                          ? m.statusOn
                          : m.statusOff}
                      </Badge>
                      {isSaved && (
                        <span className="flex items-center gap-1 text-[10px] text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {m.saved}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[color:var(--muted)] mt-0.5">{meta.description}</p>
                  </div>
                </div>

                <Switch
                  checked={displayEnabled}
                  onCheckedChange={() => requestToggle(meta.key)}
                  disabled={saving || (!!pending && !isPendingThis)}
                  className="shrink-0"
                />
              </div>

              {/* Config delay — chỉ hiện khi rule đang bật (hoặc đang preview bật) */}
              {displayEnabled && (
                <div className="mt-3 flex items-center gap-2 pl-6">
                  <label className="text-xs text-[color:var(--muted)] whitespace-nowrap">
                    {meta.delayLabel}:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={meta.key === "leadReactivation" ? 168 : 120}
                    value={draftDelay[meta.key] ?? rule.delayValue}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setDraftDelay((d) => ({ ...d, [meta.key]: v }));
                    }}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 1 && v !== rule.delayValue) {
                        requestDelayChange(meta.key, v);
                      } else {
                        setDraftDelay((d) => { const n = { ...d }; delete n[meta.key]; return n; });
                      }
                    }}
                    disabled={saving || (!!pending && !isPendingThis)}
                    className="w-16 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1 text-sm text-center"
                  />
                  <span className="text-xs text-[color:var(--muted)]">{meta.delayUnit}</span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
