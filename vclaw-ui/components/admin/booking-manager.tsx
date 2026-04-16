"use client";

import { useState } from "react";
import { Plus, Calendar, Clock, User, Bell, ChevronRight, Scissors } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Booking {
  id: string;
  time: string;
  customer: string;
  service: string;
  status: "confirmed" | "pending";
}

export function BookingManager({ messages }: { messages: any }) {
  const [bookings, setBookings] = useState<Booking[]>([
    { id: "b1", time: "09:00", customer: "Mai Pham", service: "Tư vấn", status: "confirmed" },
    { id: "b2", time: "14:00", customer: "Truc Ho", service: "Bàn giao nhận hàng", status: "pending" },
    { id: "b3", time: "17:30", customer: "Khanh Le", service: "Cắt / Gội", status: "confirmed" },
  ]);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [newService, setNewService] = useState("");
  const [conflict, setConflict] = useState(false);

  const handleCreate = () => {
    if (!newTime || !newCustomer) return;
    
    // Check conflict
    const isConflict = bookings.some((b) => b.time === newTime);
    if (isConflict) {
      setConflict(true);
      return;
    }

    setConflict(false);
    setBookings([
      ...bookings,
      {
        id: `b${Date.now()}`,
        time: newTime,
        customer: newCustomer,
        service: newService || "Dịch vụ",
        status: "confirmed" as const,
      },
    ].sort((a, b) => a.time.localeCompare(b.time)));

    setNewTime("");
    setNewCustomer("");
    setNewService("");
  };

  return (
    <div className="grid gap-6 mt-6 lg:grid-cols-[1fr_1.5fr]">
      {/* Create form */}
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
                value={date} 
                onChange={(e) => setDate(e.target.value)}
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
                onChange={(e) => { setNewTime(e.target.value); setConflict(false); }}
                className="bg-transparent text-sm w-full focus:outline-none"
              />
            </div>
            {conflict && (
              <p className="text-xs text-red-500 mt-1">{messages?.conflict || "This time slot is already booked!"}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)]">{messages?.customer || "Customer"}</label>
            <div className="flex items-center gap-2 rounded-xl bg-[color:var(--surface-soft)] p-2 px-3 border border-[color:var(--line)]">
              <User className="h-4 w-4 text-[color:var(--muted)]" />
              <input 
                type="text" 
                placeholder="Nguyễn Văn A" 
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none"
              />
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
            <input type="checkbox" id="reminder" defaultChecked className="rounded text-[color:var(--brand)] focus:ring-[color:var(--brand)]" />
            <label htmlFor="reminder" className="text-xs text-[color:var(--foreground)] font-medium flex items-center gap-1 cursor-pointer">
              <Bell className="h-3 w-3 text-amber-500" />
              {messages?.autoReminder || "Auto-send 2h reminder"}
            </label>
          </div>

          <Button 
            className="w-full mt-2 bg-[image:var(--brand-gradient)]" 
            onClick={handleCreate}
          >
            {messages?.create || "Confirm Booking"}
          </Button>
        </CardContent>
      </Card>

      {/* List view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[color:var(--foreground-strong)]" />
              {messages?.upcoming || "Upcoming Bookings"}
            </span>
            <span className="text-sm font-normal text-[color:var(--muted)]">{date}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 border-l-2 border-[color:var(--line)] space-y-6 pb-2">
            {bookings.map((booking, idx) => (
              <div key={booking.id} className="relative group">
                <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-[color:var(--surface)] bg-[color:var(--line)] group-hover:bg-[color:var(--brand)] group-hover:scale-125 transition-all" />
                
                <div className="bg-[color:var(--surface-soft)] border border-[color:var(--line)] rounded-xl p-4 flex justify-between items-center group-hover:border-[color:var(--brand-soft)] transition-colors">
                  <div className="flex gap-4 items-center">
                    <div className="text-lg font-bold text-[color:var(--brand-strong)] w-14">
                      {booking.time}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[color:var(--foreground-strong)]">{booking.customer}</h4>
                      <p className="text-sm text-[color:var(--muted)] flex items-center gap-1">
                        {booking.service}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex">
                    {booking.status === "confirmed" ? (
                      <span className="bg-green-500/10 text-green-600 text-xs px-2.5 py-1 rounded-full font-medium">Đã chốt</span>
                    ) : (
                      <span className="bg-amber-500/10 text-amber-600 text-xs px-2.5 py-1 rounded-full font-medium">Đang chờ</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
