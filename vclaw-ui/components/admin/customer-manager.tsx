"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Pencil, Trash2, User, Phone, Tag, Search, Users, MessageSquare, ShoppingCart, X, ArrowUpRight, TrendingUp, Loader2, Mail, MapPin } from "lucide-react";
import type { Customer } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  saveCustomer,
  deleteCustomer,
  getCustomerConversation,
  type CustomerInput,
} from "@/lib/actions/customer-actions";
import { ChannelThreadPanel } from "./channel-thread-panel";
import type { AppLocale } from "@/i18n/routing";
import { toast } from "sonner";
import type { AdminPageContent } from "@/lib/admin/content";

const CHANNELS = ["Zalo", "Messenger", "Telegram", "Khác"];

type CustomerWithStats = Customer & {
  _count?: {
    orders: number;
    bookings: number;
  };
  conversations?: (any & {
    messages: any[];
  })[];
};

type CustomerMessages = NonNullable<AdminPageContent["customerManager"]>;

export function CustomerManager({
  initialCustomers,
  messages,
  locale,
  threadMessages,
}: {
  initialCustomers: CustomerWithStats[];
  messages: CustomerMessages;
  locale: AppLocale;
  threadMessages: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState(initialCustomers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState(messages?.all || "Tất cả");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);

  const [form, setForm] = useState<CustomerInput>({
    name: "",
    phone: "",
    email: "",
    shippingAddress: "",
    channel: "Zalo",
    labels: "",
    gender: "",
    preferredName: "",
  });

  if (!messages) return null;

  const reset = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", email: "", shippingAddress: "", channel: "Zalo", labels: "", gender: "", preferredName: "" });
    setShowForm(false);
  };

  const handleShowChat = (c: CustomerWithStats) => {
    setLoadingConvId(c.id);
    startTransition(async () => {
      try {
        const conversation = await getCustomerConversation(c.id);
        if (conversation) {
          setSelectedConversation(conversation);
        } else {
          toast.error(messages.noConversationError);
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
        toast.error(messages.loadConversationError);
      } finally {
        setLoadingConvId(null);
      }
    });
  };

  const startEdit = (c: CustomerWithStats) => {
    setEditingId(c.id);
    setForm({
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      email: (c as any).email ?? "",
      shippingAddress: (c as any).shippingAddress ?? "",
      channel: c.channel,
      labels: c.labels ?? "",
      gender: c.gender ?? "",
      preferredName: c.preferredName ?? "",
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
            return prev.map((x) => (x.id === res.customer!.id ? { ...res.customer!, _count: x._count } : x));
          }
          return [{ ...res.customer!, _count: { orders: 0, bookings: 0 } }, ...prev];
        });
        reset();
        router.refresh();
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm(messages.confirmDelete)) return;
    startTransition(async () => {
      const res = await deleteCustomer(id);
      if (res.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } else {
        toast.error(res.error || messages.deleteError);
      }
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q) || ((c as any).email ?? "").toLowerCase().includes(q);
      const normalizedChannel = (c.channel || "").toLowerCase();
      const matchChannel = filterChannel === messages.all ||
        (filterChannel === "Zalo" && (normalizedChannel === "zalo" || normalizedChannel === "zalouser")) ||
        normalizedChannel === filterChannel.toLowerCase();
      return matchSearch && matchChannel;
    });
  }, [customers, search, filterChannel, messages.all]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => (c._count?.orders ?? 0) > 0).length;
    const recent = customers.filter(c => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(c.createdAt) > weekAgo;
    }).length;
    return { total, active, recent };
  }, [customers]);

  return (
    <div className="mt-4 space-y-4 relative">
      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[color:var(--brand-soft)]/10 border border-[color:var(--brand-soft)]/20 shadow-sm overflow-hidden backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[color:var(--brand)]/80 uppercase tracking-widest">{messages.statsTitle}</p>
                <h3 className="text-3xl font-black mt-1 text-[color:var(--brand)] drop-shadow-sm">{stats.total}</h3>
                <p className="text-[9px] text-[color:var(--brand)]/60 font-medium leading-tight mt-0.5">{messages.commercialIdentity}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[color:var(--brand)]/20 border border-[color:var(--brand)]/30 flex items-center justify-center text-[color:var(--brand)] shadow-inner">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[10px] text-[color:var(--muted)] mt-4 flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              {messages.syncRealtime}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-500/5 border border-indigo-500/10 shadow-sm overflow-hidden backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest">{messages.activeCustomers}</p>
                <h3 className="text-3xl font-black mt-1 text-indigo-400 drop-shadow-sm">{stats.active}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[10px] text-[color:var(--muted)] mt-4 font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              {messages.hasOrders}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border border-emerald-500/10 shadow-sm overflow-hidden backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">{messages.recentJoined}</p>
                <h3 className="text-3xl font-black mt-1 text-emerald-400 drop-shadow-sm">{stats.recent}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[10px] text-[color:var(--muted)] mt-4 font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {messages.joinedRecent}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-[color:var(--surface)] p-3 rounded-2xl border border-[color:var(--line)] shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted)]" />
            <input
              type="text"
              placeholder={messages.searchPlaceholder}
              className="w-full pl-10 pr-4 h-10 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all placeholder:text-[color:var(--muted)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="hidden lg:flex rounded-xl border border-[color:var(--line)] p-1 bg-[color:var(--surface-soft)]">
            {[messages.all, ...CHANNELS].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setFilterChannel(ch)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  filterChannel === ch
                    ? "bg-white text-[color:var(--brand)] shadow-sm"
                    : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
        <Button
          variant="primary"
          className="rounded-xl px-5 h-10 shadow-md shadow-[color:var(--brand-soft)] font-bold"
          onClick={() => { reset(); setShowForm(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {messages.addCustomer}
        </Button>
      </div>

      {/* Bảng danh sách */}
      <Card className="border-[color:var(--line)] overflow-hidden shadow-md rounded-2xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[1024px]">
          <Table>
            <TableHeader className="bg-[color:var(--surface-soft)] sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-b-[color:var(--line)]">
                <TableHead className="w-[240px] text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.name}</TableHead>
                <TableHead className="hidden lg:table-cell text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.address}</TableHead>
                <TableHead className="hidden md:table-cell text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.latestMessage}</TableHead>
                <TableHead className="text-center text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.totalOrders}</TableHead>
                <TableHead className="text-center hidden sm:table-cell text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.totalBookings}</TableHead>
                <TableHead className="hidden xl:table-cell text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.labels}</TableHead>
                <TableHead className="text-right text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                      <Users className="h-16 w-16 text-[color:var(--muted)]" />
                      <p className="text-sm font-medium">{search ? messages.noMatch : messages.empty}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-[color:var(--brand-soft)]/20 transition-all border-b-[color:var(--line)]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-110 transition-transform shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[color:var(--foreground-strong)] flex items-center gap-1.5">
                            <span className="truncate">{c.name}</span>
                            {c.gender && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[color:var(--surface)] border border-[color:var(--line)] text-[color:var(--muted)] font-black uppercase tracking-tighter shrink-0">
                                {c.gender}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[color:var(--muted)] flex items-center gap-1.5 mt-0.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            {c.phone || messages.noPhone}
                          </div>
                          {(c as any).email && (
                            <div className="text-[10px] text-[color:var(--muted)] flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate max-w-[160px]">{(c as any).email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px]">
                      {(c as any).shippingAddress ? (
                        <div className="flex items-start gap-1.5 text-xs text-[color:var(--foreground)]">
                          <MapPin className="h-3 w-3 text-[color:var(--muted)] shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{(c as any).shippingAddress}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[color:var(--muted)] italic opacity-40">{messages.noAddress}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[250px]">
                      {c.conversations?.[0]?.messages?.[0] ? (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-[color:var(--foreground)] line-clamp-1 italic">
                            "{c.conversations[0].messages[0].body}"
                          </p>
                          <p className="text-[10px] text-[color:var(--muted)] font-medium">
                            {new Date(c.conversations[0].messages[0].createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
                              hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit",
                            })}
                          </p>
                        </div>
                      ) : (
                        <div className="opacity-40 italic">
                          <p className="text-xs text-[color:var(--muted)]">{messages.noConversation}</p>
                          <Badge variant="outline" className="w-fit font-bold text-[9px] bg-[color:var(--surface-soft)] text-[color:var(--muted)] border-[color:var(--line)] px-1.5 py-0 uppercase mt-1">
                            {c.channel.toLowerCase() === "zalouser" ? "Zalo" : c.channel}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-sm">
                        {c._count?.orders ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-sm">
                        {c._count?.bookings ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell max-w-[220px]">
                      <div className="flex flex-wrap gap-1.5">
                        {c.labels ? (
                          c.labels.split(/[,\[\]]+/).filter(Boolean).map((l, i) => (
                            <span key={i} className="text-[9px] px-2 py-1 rounded-lg bg-[color:var(--surface)] border border-[color:var(--line)] text-[color:var(--foreground)] font-bold">
                              {l.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[color:var(--muted)] italic opacity-50">---</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:text-[color:var(--brand)] hover:bg-white rounded-xl" title={messages.quickChat} onClick={() => handleShowChat(c)} disabled={loadingConvId === c.id}>
                          {loadingConvId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-white rounded-xl" onClick={() => startEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-red-500 hover:bg-red-50 rounded-xl" onClick={() => remove(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Thread Panel Modal */}
      {selectedConversation && threadMessages && (
        <ChannelThreadPanel
          locale={locale}
          conversationTitle={selectedConversation.resolvedTitle}
          openclawSessionKey={selectedConversation.openclawSessionKey}
          messages={threadMessages}
          rows={selectedConversation.messages.map((m: any) => ({
            id: m.id,
            direction: m.direction,
            body: m.body,
            createdAt: m.createdAt.toISOString ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
          }))}
          onClose={() => setSelectedConversation(null)}
        />
      )}

      {/* Form Drawer */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-[color:var(--foreground)]/10 backdrop-blur-[2px] z-[100] transition-all"
            onClick={reset}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-[101] border-l border-[color:var(--line)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
            <div className="p-8 border-b border-[color:var(--line)] flex items-center justify-between bg-[color:var(--surface-soft)]">
              <h2 className="text-2xl font-black text-[color:var(--foreground-strong)] tracking-tight">
                {editingId ? messages.edit : messages.addCustomer}
              </h2>
              <Button size="sm" variant="ghost" className="h-12 w-12 rounded-2xl p-0 hover:bg-white" onClick={reset}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">{messages.name}</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--muted)] group-focus-within:text-[color:var(--brand)] transition-colors" />
                    <input
                      className="w-full pl-12 pr-4 h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm"
                      placeholder={messages.form.namePlaceholder}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">{messages.phone}</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--muted)] group-focus-within:text-[color:var(--brand)] transition-colors" />
                      <input
                        className="w-full pl-12 pr-4 h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm"
                        placeholder="09..."
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">{messages.channel}</label>
                    <select
                      className="w-full h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm appearance-none cursor-pointer"
                      value={form.channel}
                      onChange={(e) => setForm({ ...form, channel: e.target.value })}
                    >
                      {CHANNELS.map((ch) => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">{messages.form.email}</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--muted)] group-focus-within:text-[color:var(--brand)] transition-colors" />
                    <input
                      type="email"
                      className="w-full pl-12 pr-4 h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm"
                      placeholder={messages.form.emailPlaceholder}
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">{messages.form.shippingAddress}</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-4 h-5 w-5 text-[color:var(--muted)] group-focus-within:text-[color:var(--brand)] transition-colors" />
                    <textarea
                      rows={2}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm resize-none"
                      placeholder={messages.form.shippingAddressPlaceholder}
                      value={form.shippingAddress || ""}
                      onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">{messages.form.gender}</label>
                    <select
                      className="w-full h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm cursor-pointer"
                      value={form.gender || ""}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    >
                      <option value="">{messages.form.genderUnknown}</option>
                      <option value="nam">{messages.form.genderMale}</option>
                      <option value="nữ">{messages.form.genderFemale}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">{messages.form.salutation}</label>
                    <input
                      className="w-full px-4 h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm"
                      placeholder={messages.form.salutationPlaceholder}
                      value={form.preferredName || ""}
                      onChange={(e) => setForm({ ...form, preferredName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">{messages.labels}</label>
                  <div className="relative group">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--muted)] group-focus-within:text-[color:var(--brand)] transition-colors" />
                    <input
                      className="w-full pl-12 pr-4 h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm"
                      placeholder="vip, tiềm năng, quen..."
                      value={form.labels}
                      onChange={(e) => setForm({ ...form, labels: e.target.value })}
                    />
                  </div>
                  <p className="text-[11px] text-[color:var(--muted)] px-1 font-medium italic">{messages.form.labelsHint}</p>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-[color:var(--line)] bg-[color:var(--surface-soft)] flex gap-4">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-2" onClick={reset}>
                {messages.cancel}
              </Button>
              <Button variant="primary" className="flex-[2] h-14 rounded-2xl font-black shadow-xl shadow-[color:var(--brand-soft)] text-lg" onClick={submit} disabled={isPending}>
                {isPending ? messages.form.saving : messages.save.toUpperCase()}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
