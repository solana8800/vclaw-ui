import { StatsGrid } from "@/components/admin/admin-shell";

type Snapshot = {
  orderCount: number;
  orderDone: number;
  pendingOrders: number;
  paymentCompleted: number;
  revenue: number;
  customerCount: number;
  productCount: number;
  jobCount: number;
};

type Messages = {
  sectionTitle: string;
  orderCount: string;
  revenue: string;
  customers: string;
  products: string;
  paymentsDone: string;
  orderDone: string;
  notes?: {
    orderDone: string;
    paymentsDone: string;
    revenue: string;
    customers: string;
  };
};

export function ReportsLiveStats({
  snapshot,
  messages,
  numberLocale = "vi-VN",
}: {
  snapshot: Snapshot;
  messages: Messages;
  numberLocale?: string;
}) {
  const n = messages.notes;
  const items = [
    { label: messages.orderDone, value: String(snapshot.orderDone), note: n?.orderDone ?? "Hoàn tất" },
    { label: messages.paymentsDone, value: String(snapshot.paymentCompleted), note: n?.paymentsDone ?? "Đã thu tiền" },
    {
      label: messages.revenue,
      value: snapshot.revenue.toLocaleString(numberLocale),
      note: n?.revenue ?? "VNĐ",
    },
    { label: messages.customers, value: String(snapshot.customerCount), note: n?.customers ?? "Trong hệ thống" },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground-strong)]">
        {messages.sectionTitle}
      </h2>
      <StatsGrid items={items} />
    </section>
  );
}
