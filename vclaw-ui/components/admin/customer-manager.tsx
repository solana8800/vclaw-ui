"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, User, Phone, Tag } from "lucide-react";
import type { Customer } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  saveCustomer,
  deleteCustomer,
  type CustomerInput,
} from "@/lib/actions/customer-actions";

const CHANNELS = ["Zalo", "Messenger", "Telegram", "Khác"];

type Messages = {
  addCustomer: string;
  name: string;
  phone: string;
  channel: string;
  labels: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  empty: string;
};

export function CustomerManager({
  initialCustomers,
  messages,
}: {
  initialCustomers: Customer[];
  messages: Messages;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState(initialCustomers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomerInput>({
    name: "",
    phone: "",
    channel: "Zalo",
    labels: "",
  });

  const reset = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", channel: "Zalo", labels: "" });
    setShowForm(false);
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      channel: c.channel,
      labels: c.labels ?? "",
    });
    setShowForm(true);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const res = await saveCustomer({ ...form, id: editingId ?? undefined });
      if (res.success && res.customer) {
        setCustomers((prev) => {
          const exists = prev.some((x) => x.id === res.customer!.id);
          if (exists) {
            return prev.map((x) => (x.id === res.customer!.id ? res.customer! : x));
          }
          return [res.customer!, ...prev];
        });
        reset();
        router.refresh();
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("Xóa khách hàng này?")) return;
    startTransition(async () => {
      const res = await deleteCustomer(id);
      if (res.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Không xóa được");
      }
    });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Card className="border-[color:var(--brand-soft)] h-fit">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">
            {editingId ? messages.edit : messages.addCustomer}
          </CardTitle>
          {!showForm ? (
            <Button size="sm" variant="primary" onClick={() => { reset(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              {messages.addCustomer}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={reset}>
              {messages.cancel}
            </Button>
          )}
        </CardHeader>
        {showForm ? (
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[color:var(--muted)]">{messages.name}</label>
              <div className="flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2">
                <User className="h-4 w-4 text-[color:var(--muted)]" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[color:var(--muted)]">{messages.phone}</label>
              <div className="flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2">
                <Phone className="h-4 w-4 text-[color:var(--muted)]" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[color:var(--muted)]">{messages.channel}</label>
              <select
                className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm outline-none"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[color:var(--muted)]">{messages.labels}</label>
              <div className="flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2">
                <Tag className="h-4 w-4 text-[color:var(--muted)]" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder='["vip"] hoặc vip, hot'
                  value={form.labels}
                  onChange={(e) => setForm({ ...form, labels: e.target.value })}
                />
              </div>
            </div>
            <Button className="w-full rounded-xl" onClick={submit} disabled={isPending}>
              {messages.save}
            </Button>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {customers.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">{messages.empty}</p>
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {customers.map((c) => (
                <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-[color:var(--foreground-strong)]">{c.name}</div>
                    <div className="text-xs text-[color:var(--muted)] mt-0.5">
                      {[c.phone, c.channel].filter(Boolean).join(" · ")}
                    </div>
                    {c.labels ? (
                      <div className="mt-1 text-[11px] text-[color:var(--muted)] line-clamp-2">{c.labels}</div>
                    ) : null}
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {c.channel}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => startEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-red-600"
                      onClick={() => remove(c.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
