"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/ui-switch";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Clock, RefreshCw, Bell, CreditCard, AlertTriangle, X } from "lucide-react";
import type { AutomationRulesConfig } from "@/lib/actions/shop-settings-actions";
import { saveAutomationRules } from "@/lib/actions/shop-settings-actions";
import { toast } from "sonner";

type RuleKey = keyof AutomationRulesConfig;

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
      "Khi bật: sau khi bạn gửi mã QR cho khách, nếu sau X giờ khách chưa thanh toán, bot sẽ tự động nhắn tin nhắc. Tin nhắn do AI soạn dựa trên ngữ cảnh cuộc trò chuyện.",
    disableExplain:
      "Khi tắt: bot sẽ không tự động nhắc khách thanh toán nữa. Bạn cần theo dõi và nhắc thủ công.",
    icon: <CreditCard className="h-4 w-4" />,
    delayLabel: "Nhắc sau",
    delayUnit: "giờ",
  },
  {
    key: "appointmentReminder",
    label: "Nhắc lịch hẹn",
    description: "Gửi tin nhắc tự động trước giờ hẹn đã đặt.",
    enableExplain:
      "Khi bật: X giờ trước giờ hẹn, bot sẽ tự động nhắn tin nhắc khách. Giúp giảm tỷ lệ khách vắng mặt không báo trước.",
    disableExplain:
      "Khi tắt: bot sẽ không nhắc lịch hẹn. Khách có thể quên và không đến đúng giờ.",
    icon: <Bell className="h-4 w-4" />,
    delayLabel: "Nhắc trước",
    delayUnit: "giờ",
  },
  {
    key: "leadReactivation",
    label: "Tái kích hoạt lead",
    description: "Tự động tiếp cận lại khách không phản hồi sau nhiều ngày.",
    enableExplain:
      "Khi bật: nếu một cuộc trò chuyện im lặng hơn X ngày, bot sẽ tự động gửi tin hỏi thăm hoặc giới thiệu sản phẩm phù hợp. Giúp vớt lại những khách có tiềm năng mua hàng.",
    disableExplain:
      "Khi tắt: bot sẽ không chủ động liên hệ lại khách đã im lặng. Bạn cần tự quyết định khi nào nên tiếp cận.",
    icon: <RefreshCw className="h-4 w-4" />,
    delayLabel: "Im lặng quá",
    delayUnit: "ngày",
  },
];

type PendingChange =
  | { kind: "toggle"; key: RuleKey; newEnabled: boolean }
  | { kind: "delay"; key: RuleKey; newDelay: number };

type Props = {
  initialRules: AutomationRulesConfig;
};

export function AutomationRulesConfig({ initialRules }: Props) {
  const [rules, setRules] = useState<AutomationRulesConfig>(initialRules);
  const [saving, startSave] = useTransition();
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  // Tạm giữ giá trị delay đang nhập (chưa confirm)
  const [draftDelay, setDraftDelay] = useState<Partial<Record<RuleKey, number>>>({});

  function persist(updated: AutomationRulesConfig, changedKey: string) {
    startSave(async () => {
      await saveAutomationRules(updated);
      setSavedKey(changedKey);
      toast.success(`Đã lưu: ${RULE_META.find((m) => m.key === changedKey)?.label}`);
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
    let updated: AutomationRulesConfig;
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
              Quy tắc tự động hóa
            </CardTitle>
            <CardDescription className="mt-1 text-[color:var(--muted)]">
              Bật/tắt và điều chỉnh thời gian. Mỗi thay đổi cần xác nhận trước khi lưu.
            </CardDescription>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--muted)]" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Confirmation panel */}
        {pending && pendingMeta && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {pending.kind === "toggle"
                    ? `${pending.newEnabled ? "Bật" : "Tắt"} "${pendingMeta.label}"?`
                    : `Thay đổi thời gian cho "${pendingMeta.label}"?`}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  {pending.kind === "toggle"
                    ? pending.newEnabled
                      ? pendingMeta.enableExplain
                      : pendingMeta.disableExplain
                    : `Bot sẽ chờ ${pending.newDelay} ${pendingMeta.delayUnit} trước khi ${pendingMeta.label.toLowerCase()}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelChange}
                className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 pl-6">
              <Button size="sm" onClick={confirmChange} disabled={saving} className="h-8 text-xs">
                Xác nhận lưu
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelChange} disabled={saving} className="h-8 text-xs">
                Huỷ
              </Button>
            </div>
          </div>
        )}

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
                          ? "CHỜ XÁC NHẬN"
                          : displayEnabled
                          ? "ĐANG BẬT"
                          : "TẮT"}
                      </Badge>
                      {isSaved && (
                        <span className="flex items-center gap-1 text-[10px] text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Đã lưu
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
                    max={meta.key === "leadReactivation" ? 30 : 72}
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
