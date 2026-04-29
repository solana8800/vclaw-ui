"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, User, Phone, Tag, Search, Users, MessageSquare, ShoppingCart, X, ArrowUpRight, TrendingUp } from "lucide-react";
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
  type CustomerInput,
} from "@/lib/actions/customer-actions";

const CHANNELS = ["Zalo", "Messenger", "Telegram", "Khác"];

type CustomerWithStats = Customer & {
  _count?: {
    orders: number;
    bookings: number;
  };
};

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
  totalOrders: string;
  totalBookings: string;
  activity: string;
  quickChat: string;
  createOrder: string;
  createBooking: string;
  statsTitle: string;
  recentJoined: string;
  activeCustomers: string;
  commercialIdentity: string;
};

export function CustomerManager({
  initialCustomers,
  messages,
}: {
  initialCustomers: CustomerWithStats[];
  messages: Messages;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState(initialCustomers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("Tất cả");
  const [form, setForm] = useState<CustomerInput>({
    name: "",
    phone: "",
    channel: "Zalo",
    labels: "",
    gender: "",
    preferredName: "",
  });

  const reset = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", channel: "Zalo", labels: "", gender: "", preferredName: "" });
    setShowForm(false);
  };

  const startEdit = (c: CustomerWithStats) => {
    setEditingId(c.id);
    setForm({
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
      
      const normalizedChannel = (c.channel || "").toLowerCase();
      const matchChannel = filterChannel === "Tất cả" || 
        (filterChannel === "Zalo" && (normalizedChannel === "zalo" || normalizedChannel === "zalouser")) ||
        normalizedChannel === filterChannel.toLowerCase();

      return matchSearch && matchChannel;
    });
  }, [customers, search, filterChannel]);

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
    <div className="mt-6 space-y-6 relative min-h-[600px]">
      {/* Thẻ thống kê (Stats bar) */}
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
               Hệ thống đồng bộ thời gian thực
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
               Đã từng phát sinh đơn hàng
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
               Ghi nhận trong 7 ngày qua
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Thanh công cụ (Toolbar) */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[color:var(--surface)] p-3 rounded-2xl border border-[color:var(--line)] shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted)]" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full pl-10 pr-4 h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] transition-all placeholder:text-[color:var(--muted)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="hidden lg:flex rounded-xl border border-[color:var(--line)] p-1 bg-[color:var(--surface-soft)]">
            {["Tất cả", ...CHANNELS].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setFilterChannel(ch)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
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
          className="rounded-xl px-6 h-11 shadow-lg shadow-[color:var(--brand-soft)] font-bold"
          onClick={() => { reset(); setShowForm(true); }}
        >
          <Plus className="h-5 w-5 mr-2" />
          {messages.addCustomer}
        </Button>
      </div>

      {/* Bảng danh sách (Data Table) */}
      <Card className="border-[color:var(--line)] overflow-hidden shadow-md rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[color:var(--surface-soft)]">
              <TableRow className="hover:bg-transparent border-b-[color:var(--line)]">
                <TableHead className="w-[300px] text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.name}</TableHead>
                <TableHead className="hidden md:table-cell text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.channel}</TableHead>
                <TableHead className="text-center text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.totalOrders}</TableHead>
                <TableHead className="text-center text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.totalBookings}</TableHead>
                <TableHead className="hidden lg:table-cell text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">{messages.labels}</TableHead>
                <TableHead className="text-right text-[color:var(--muted)] font-bold uppercase text-[10px] tracking-widest">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                      <Users className="h-16 w-16 text-[color:var(--muted)]" />
                      <p className="text-sm font-medium">{search ? "Không có kết quả trùng khớp" : messages.empty}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-[color:var(--brand-soft)]/20 transition-all border-b-[color:var(--line)]">
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[color:var(--foreground-strong)] flex items-center gap-2">
                            {c.name}
                            {c.gender && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[color:var(--surface)] border border-[color:var(--line)] text-[color:var(--muted)] font-black uppercase tracking-tighter">
                                {c.gender}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[color:var(--muted)] flex items-center gap-1.5 mt-0.5">
                            <Phone className="h-3 w-3" />
                            {c.phone || "Chưa có SĐT"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="font-bold text-[10px] bg-[color:var(--surface-soft)] text-[color:var(--foreground-strong)] border-[color:var(--line-strong)] px-2 py-0.5 uppercase shadow-sm">
                        {c.channel.toLowerCase() === "zalouser" ? "Zalo" : c.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-sm">
                        {c._count?.orders ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-sm">
                        {c._count?.bookings ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[220px]">
                      <div className="flex flex-wrap gap-1.5">
                        {c.labels ? (
                          c.labels.split(/[,\[\]]+/).filter(Boolean).map((l, i) => (
                            <span key={i} className="text-[9px] px-2 py-1 rounded-lg bg-[color:var(--surface)] border border-[color:var(--line)] text-[color:var(--foreground)] font-bold shadow-xs">
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
                         <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:text-[color:var(--brand)] hover:bg-white rounded-xl" title={messages.quickChat}>
                           <MessageSquare className="h-4.5 w-4.5" />
                         </Button>
                         <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-white rounded-xl" onClick={() => startEdit(c)}>
                           <Pencil className="h-4.5 w-4.5" />
                         </Button>
                         <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-red-500 hover:bg-red-50 rounded-xl" onClick={() => remove(c.id)}>
                           <Trash2 className="h-4.5 w-4.5" />
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

      {/* Form Drawer (Overlay) */}
      {showForm && (
        <>
          <div 
            className="fixed inset-0 bg-[color:var(--foreground)]/10 backdrop-blur-[2px] z-[100] transition-all"
            onClick={reset}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-[101] border-l border-[color:var(--line)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
            <div className="p-8 border-b border-[color:var(--line)] flex items-center justify-between bg-[color:var(--surface-soft)]">
              <div>
                <h2 className="text-2xl font-black text-[color:var(--foreground-strong)] tracking-tight">
                  {editingId ? messages.edit : messages.addCustomer}
                </h2>
                <p className="text-sm text-[color:var(--muted)] mt-1 font-medium">Hồ sơ khách hàng định danh thương mại.</p>
              </div>
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
                        placeholder="Ví dụ: Anh Tuấn"
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

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">Giới tính</label>
                      <select
                        className="w-full h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm cursor-pointer"
                        value={form.gender || ""}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      >
                        <option value="">Chưa xác định</option>
                        <option value="nam">Nam</option>
                        <option value="nữ">Nữ</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[color:var(--muted)] uppercase tracking-widest ml-1">Xưng hô</label>
                      <input
                        className="w-full px-4 h-14 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--surface-soft)] text-base font-medium focus:outline-none focus:border-[color:var(--brand)] focus:bg-white transition-all shadow-sm"
                        placeholder="anh Hùng, chị Lan..."
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
                    <p className="text-[11px] text-[color:var(--muted)] px-1 font-medium italic">Gợi ý: Phân tách các nhãn bằng dấu phẩy để dễ tìm kiếm.</p>
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-[color:var(--line)] bg-[color:var(--surface-soft)] flex gap-4">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-2" onClick={reset}>
                {messages.cancel}
              </Button>
              <Button variant="primary" className="flex-[2] h-14 rounded-2xl font-black shadow-xl shadow-[color:var(--brand-soft)] text-lg" onClick={submit} disabled={isPending}>
                {isPending ? "ĐANG LƯU..." : messages.save.toUpperCase()}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
