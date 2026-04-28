"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/ui-switch";
import { CheckCircle2, Loader2, Clock, RefreshCw, Bell, CreditCard } from "lucide-react";
import type { AutomationRulesConfig } from "@/lib/actions/shop-settings-actions";
import { saveAutomationRules } from "@/lib/actions/shop-settings-actions";
import { toast } from "sonner";

type RuleKey = keyof AutomationRulesConfig;

type RuleMeta = {
  key: RuleKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  delayLabel: string;
};

const RULE_META: RuleMeta[] = [
  {
    key: "paymentFollowup",
    label: "Follow-up thanh toán",
    description: "Tự động nhắc khách gửi bill sau khi QR được tạo mà chưa thanh toán.",
    icon: <CreditCard className="h-4 w-4" />,
    delayLabel: "Nhắc sau (giờ):",
  },
  {
    key: "appointmentReminder",
    label: "Nhắc lịch hẹn",
    description: "Gửi tin nhắc tự động trước giờ hẹn đã đặt.",
    icon: <Bell className="h-4 w-4" />,
    delayLabel: "Nhắc trước (giờ):",
  },
  {
    key: "leadReactivation",
    label: "Tái kích hoạt lead",
    description: "Tự động tiếp cận lại khách không phản hồi sau nhiều ngày.",
    icon: <RefreshCw className="h-4 w-4" />,
    delayLabel: "Im lặng (ngày):",
  },
];

type Props = {
  initialRules: AutomationRulesConfig;
};

export function AutomationRulesConfig({ initialRules }: Props) {
  const [rules, setRules] = useState<AutomationRulesConfig>(initialRules);
  const [saving, startSave] = useTransition();
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Lưu toàn bộ rules sau mỗi thay đổi
  function persist(updated: AutomationRulesConfig, changedKey: string) {
    startSave(async () => {
      await saveAutomationRules(updated);
      setSavedKey(changedKey);
      toast.success(`Đã lưu thay đổi cho ${RULE_META.find(m => m.key === changedKey)?.label}`);
      // Ẩn dấu check sau 2 giây
      setTimeout(() => setSavedKey(null), 2000);
    });
  }

  function toggle(key: RuleKey) {
    const updated = {
      ...rules,
      [key]: { ...rules[key], enabled: !rules[key].enabled },
    };
    setRules(updated);
    persist(updated, key);
  }

  function setDelay(key: RuleKey, value: number) {
    if (isNaN(value) || value < 1) return;
    const updated = {
      ...rules,
      [key]: { ...rules[key], delayValue: value },
    };
    setRules(updated);
    persist(updated, key);
  }

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
              Bật/tắt và điều chỉnh thời gian — cấu hình lưu ngay vào cơ sở dữ liệu
            </CardDescription>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--muted)]" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {RULE_META.map((meta) => {
          const rule = rules[meta.key];
          const isSaved = savedKey === meta.key;

          return (
            <div
              key={meta.key}
              className={`rounded-xl border p-4 transition-all duration-200 ${
                rule.enabled
                  ? "border-[color:var(--brand-soft)] bg-[color:var(--surface-soft)]"
                  : "border-[color:var(--line)] bg-transparent opacity-70"
              }`}
            >
              {/* Header của từng rule */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span className={`mt-0.5 ${rule.enabled ? "text-[color:var(--brand)]" : "text-[color:var(--muted)]"}`}>
                    {meta.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{meta.label}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          rule.enabled
                            ? "border-[color:var(--brand)] text-[color:var(--brand)]"
                            : "text-[color:var(--muted)]"
                        }`}
                      >
                        {rule.enabled ? "ĐANG BẬT" : "TẮT"}
                      </Badge>
                      {/* Dấu đã lưu */}
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

                {/* Toggle bật/tắt */}
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => toggle(meta.key)}
                  disabled={saving}
                  className="shrink-0"
                />
              </div>

              {/* Config delay — chỉ hiện khi bật */}
              {rule.enabled && (
                <div className="mt-3 flex items-center gap-2 pl-6">
                  <label className="text-xs text-[color:var(--muted)] whitespace-nowrap">
                    {meta.delayLabel}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={meta.key === "leadReactivation" ? 30 : 72}
                    value={rule.delayValue}
                    onChange={(e) => setDelay(meta.key, parseInt(e.target.value))}
                    onBlur={(e) => persist(rules, meta.key)}
                    disabled={saving}
                    className="w-16 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1 text-sm text-center"
                  />
                  <span className="text-xs text-[color:var(--muted)]">
                    {meta.key === "leadReactivation" ? "ngày" : "giờ"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
