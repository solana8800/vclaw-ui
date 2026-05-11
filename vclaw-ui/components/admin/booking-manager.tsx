"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Calendar, Clock, User, Bell, Scissors, Trash2, AlertCircle } from "lucide-react";
import type { Booking, Customer } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createBooking,
  deleteBooking,
  updateBookingStatus,
} from "@/lib/actions/booking-actions";

type BookingRow = Booking & { customer: Customer };

export function BookingManager({
  messages,
  initialBookings,
  customers,
  dateStr,
}: {
  messages: Record<string, string | undefined>;
  initialBookings: BookingRow[];
  customers: { id: string; name: string }[];
  dateStr: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [bookings, setBookings] = useState(initialBookings);
  const [newTime, setNewTime] = useState("");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [newService, setNewService] = useState("");
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  const setDateQuery = (next: string) => {
    const q = new URLSearchParams(searchParams.toString());
    q.set("date", next);
    router.push(`${pathname}?${q.toString()}`);
  };

  const timesOnDate = useMemo(
    () =>
      bookings.map((b) =>
        `${String(b.startTime.getHours()).padStart(2, "0")}:${String(b.startTime.getMinutes()).padStart(2, "0")}`,
      ),
    [bookings],
  );

  const handleCreate = () => {
    if (!newTime || !customerId || !newService.trim()) return;
    if (timesOnDate.includes(newTime)) {
      setConflict(true);
      return;
    }
    setConflict(false);
    startTransition(async () => {
      await createBooking({
        customerId,
        serviceName: newService.trim(),
        dateStr,
        timeStr: newTime,
        status: "CONFIRMED",
      });
      setNewTime("");
      setNewService("");
      router.refresh();
    });
  };

  const fmtTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="grid gap-8 mt-8 lg:grid-cols-[380px_1fr] items-start">
      {/* Form Card */}
      <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-xl relative overflow-hidden sticky top-24">
        <div className="h-1.5 w-full bg-[image:var(--brand-gradient)]" />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold text-[color:var(--foreground-strong)]">
            <div className="p-2 rounded-lg bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
              <Plus className="h-5 w-5" />
            </div>
            {messages?.newBooking || "New Booking"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest pl-1">{messages?.date || "Date"}</label>
            <div className="flex items-center gap-2.5 rounded-xl bg-[color:var(--surface-soft)] p-3 border border-[color:var(--line)] transition-all focus-within:border-[color:var(--brand-soft)] focus-within:ring-2 focus-within:ring-[color:var(--brand-soft)]/20">
              <Calendar className="h-4 w-4 text-[color:var(--brand)] opacity-70" />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateQuery(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none cursor-pointer font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest pl-1">{messages?.time || "Time"}</label>
            <div className="flex items-center gap-2.5 rounded-xl bg-[color:var(--surface-soft)] p-3 border border-[color:var(--line)] transition-all focus-within:border-[color:var(--brand-soft)] focus-within:ring-2 focus-within:ring-[color:var(--brand-soft)]/20">
              <Clock className="h-4 w-4 text-[color:var(--brand)] opacity-70" />
              <input
                type="time"
                value={newTime}
                onChange={(e) => {
                  setNewTime(e.target.value);
                  setConflict(false);
                }}
                className="bg-transparent text-sm w-full focus:outline-none cursor-pointer font-medium"
              />
            </div>
            {conflict ? (
              <p className="text-[10px] text-red-500 mt-1.5 font-bold flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {messages?.conflict}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest pl-1">{messages?.customer || "Customer"}</label>
            <div className="flex items-center gap-2.5 rounded-xl bg-[color:var(--surface-soft)] p-3 border border-[color:var(--line)] transition-all focus-within:border-[color:var(--brand-soft)] focus-within:ring-2 focus-within:ring-[color:var(--brand-soft)]/20">
              <User className="h-4 w-4 text-[color:var(--brand)] opacity-70" />
              <select
                className="bg-transparent text-sm w-full focus:outline-none cursor-pointer font-medium"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-zinc-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest pl-1">{messages?.service || "Service"}</label>
            <div className="flex items-center gap-2.5 rounded-xl bg-[color:var(--surface-soft)] p-3 border border-[color:var(--line)] transition-all focus-within:border-[color:var(--brand-soft)] focus-within:ring-2 focus-within:ring-[color:var(--brand-soft)]/20">
              <Scissors className="h-4 w-4 text-[color:var(--brand)] opacity-70" />
              <input
                type="text"
                placeholder={messages?.servicePlaceholder || ""}
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[color:var(--brand-soft)]/30 p-3.5 rounded-xl border border-[color:var(--brand-soft)]/50 mt-2 group cursor-pointer" onClick={() => {}}>
            <div className="h-5 w-5 rounded flex items-center justify-center bg-white/80 dark:bg-black/40">
              <input type="checkbox" id="reminder" defaultChecked className="rounded text-[color:var(--brand)]" readOnly />
            </div>
            <label htmlFor="reminder" className="text-[11px] text-[color:var(--foreground-strong)] font-bold flex items-center gap-1.5 cursor-pointer">
              <Bell className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              {messages?.autoReminder || "Auto-send 2h reminder"}
            </label>
          </div>

          <Button
            className="w-full mt-2 h-11 rounded-xl bg-[image:var(--brand-gradient)] text-white font-bold shadow-lg shadow-[color:var(--brand-soft)]/30 hover:opacity-90 active:scale-95 transition-all"
            onClick={handleCreate}
            disabled={isPending || !customers.length}
          >
            {isPending ? messages?.processing || "…" : messages?.create || "—"}
          </Button>
        </CardContent>
      </Card>

      {/* List Card */}
      <Card className="border-[color:var(--line)] bg-transparent shadow-none">
        <CardHeader className="px-0 pt-2 pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black tracking-tight text-[color:var(--foreground-strong)] flex items-center gap-3">
                <Calendar className="h-6 w-6 text-[color:var(--brand)]" />
                {messages?.upcoming || "Upcoming Bookings"}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-[color:var(--muted)] font-medium">
                <Badge variant="default" className="bg-[color:var(--surface-soft)] text-[color:var(--brand)] border-[color:var(--brand-soft)]">
                  {dateStr}
                </Badge>
                <span>·</span>
                <span>
                  {(messages?.bookingsCount || "{n}").replace("{n}", String(bookings.length))}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="relative pl-8 border-l-2 border-[color:var(--line)] space-y-8 pb-4 ml-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Timeline Dot */}
                <div className="absolute -left-[41px] top-1.5 h-5 w-5 rounded-full border-4 border-[color:var(--surface)] bg-[color:var(--line-strong)] group-hover:bg-[color:var(--brand)] group-hover:scale-125 transition-all shadow-sm z-10" />

                <div className="bg-[color:var(--surface-strong)] border border-[color:var(--line)] rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center shadow-sm hover:shadow-md hover:border-[color:var(--brand-soft)] transition-all">
                  <div className="flex gap-5 items-center">
                    <div className="flex flex-col items-center justify-center bg-[color:var(--surface-soft)] rounded-xl p-2 min-w-[70px] border border-[color:var(--line-soft)]">
                      <Clock className="h-3.5 w-3.5 text-[color:var(--muted)] mb-1" />
                      <div className="text-base font-black text-[color:var(--foreground-strong)]">
                        {fmtTime(booking.startTime)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[color:var(--foreground-strong)] leading-tight group-hover:text-[color:var(--brand)] transition-colors">
                        {booking.customer.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-bold border-[color:var(--line-strong)] px-1.5 py-0">
                          {booking.serviceName}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <select
                        className="appearance-none rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface-soft)] pl-3 pr-8 py-2 text-xs font-bold text-[color:var(--foreground-strong)] focus:outline-none focus:border-[color:var(--brand)] cursor-pointer"
                        value={booking.status}
                        disabled={isPending}
                        onChange={(e) => {
                          const v = e.target.value;
                          startTransition(async () => {
                            await updateBookingStatus(booking.id, v);
                            router.refresh();
                          });
                        }}
                      >
                        {["PENDING", "CONFIRMED", "CANCELLED", "DONE"].map((s) => (
                          <option key={s} value={s}>
                            {s === "PENDING"
                              ? messages?.statusPending
                              : s === "CONFIRMED"
                                ? messages?.statusConfirmed
                                : s === "CANCELLED"
                                  ? messages?.statusCancelled
                                  : messages?.statusCompleted}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <Clock className="h-3 w-3" />
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl p-0 text-[color:var(--muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                      disabled={isPending}
                      onClick={() => {
                        if (!confirm(messages?.deleteConfirm || "Delete?")) return;
                        startTransition(async () => {
                          await deleteBooking(booking.id);
                          router.refresh();
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-[color:var(--surface-soft)] rounded-3xl border-2 border-dashed border-[color:var(--line)] mr-4">
                <Calendar className="h-12 w-12 text-[color:var(--muted)] opacity-20 mb-3" />
                <p className="text-sm font-bold text-[color:var(--muted)]">{messages?.emptyDay}</p>
                <Button variant="ghost" size="sm" className="text-[color:var(--brand)] text-xs font-bold underline" onClick={() => setNewTime("09:00")}>
                  {messages?.addBookingCta}
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
