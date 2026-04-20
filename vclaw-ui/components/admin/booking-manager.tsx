"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Calendar, Clock, User, Bell, Scissors, Trash2 } from "lucide-react";
import type { Booking, Customer } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <div className="grid gap-6 mt-6 lg:grid-cols-[1fr_1.5fr]">
      <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] h-fit">
        <div className="h-1 w-full bg-[image:var(--brand-gradient)] rounded-t-xl" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[color:var(--brand)]" />
            {messages?.newBooking || "New Customer Booking"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)]">{messages?.date || "Date"}</label>
            <div className="flex items-center gap-2 rounded-xl bg-[color:var(--surface-soft)] p-2 px-3 border border-[color:var(--line)]">
              <Calendar className="h-4 w-4 text-[color:var(--muted)]" />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateQuery(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)]">{messages?.time || "Time"}</label>
            <div className="flex items-center gap-2 rounded-xl bg-[color:var(--surface-soft)] p-2 px-3 border border-[color:var(--line)]">
              <Clock className="h-4 w-4 text-[color:var(--muted)]" />
              <input
                type="time"
                value={newTime}
                onChange={(e) => {
                  setNewTime(e.target.value);
                  setConflict(false);
                }}
                className="bg-transparent text-sm w-full focus:outline-none"
              />
            </div>
            {conflict ? (
              <p className="text-xs text-red-500 mt-1">{messages?.conflict}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)]">{messages?.customer || "Customer"}</label>
            <div className="flex items-center gap-2 rounded-xl bg-[color:var(--surface-soft)] p-2 px-3 border border-[color:var(--line)]">
              <User className="h-4 w-4 text-[color:var(--muted)]" />
              <select
                className="bg-transparent text-sm w-full focus:outline-none"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)]">{messages?.service || "Service"}</label>
            <div className="flex items-center gap-2 rounded-xl bg-[color:var(--surface-soft)] p-2 px-3 border border-[color:var(--line)]">
              <Scissors className="h-4 w-4 text-[color:var(--muted)]" />
              <input
                type="text"
                placeholder="Gói 1, Gói 2..."
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[color:var(--surface-soft)] p-3 rounded-lg border border-[color:var(--line)] mt-2">
            <input type="checkbox" id="reminder" defaultChecked className="rounded text-[color:var(--brand)]" readOnly />
            <label htmlFor="reminder" className="text-xs text-[color:var(--foreground)] font-medium flex items-center gap-1 cursor-pointer">
              <Bell className="h-3 w-3 text-amber-500" />
              {messages?.autoReminder}
            </label>
          </div>

          <Button
            className="w-full mt-2 bg-[image:var(--brand-gradient)]"
            onClick={handleCreate}
            disabled={isPending || !customers.length}
          >
            {messages?.create || "Confirm Booking"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[color:var(--foreground-strong)]" />
              {messages?.upcoming || "Upcoming Bookings"}
            </span>
            <span className="text-sm font-normal text-[color:var(--muted)]">{dateStr}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 border-l-2 border-[color:var(--line)] space-y-6 pb-2">
            {bookings.map((booking) => (
              <div key={booking.id} className="relative group">
                <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-[color:var(--surface)] bg-[color:var(--line)] group-hover:bg-[color:var(--brand)] group-hover:scale-125 transition-all" />

                <div className="bg-[color:var(--surface-soft)] border border-[color:var(--line)] rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                  <div className="flex gap-4 items-center">
                    <div className="text-lg font-bold text-[color:var(--brand-strong)] w-14">
                      {fmtTime(booking.startTime)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[color:var(--foreground-strong)]">
                        {booking.customer.name}
                      </h4>
                      <p className="text-sm text-[color:var(--muted)]">{booking.serviceName}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1 text-xs"
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
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-red-600"
                      disabled={isPending}
                      onClick={() => {
                        if (!confirm("Xóa lịch này?")) return;
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
              <p className="text-sm text-[color:var(--muted)]">Chưa có lịch trong ngày.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
