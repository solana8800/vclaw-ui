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
};

export function ReportsLiveStats({ snapshot, messages }: { snapshot: Snapshot; messages: Messages }) {
  const items = [
    { label: messages.orderDone, value: String(snapshot.orderDone), note: "Hoàn tất" },
    { label: messages.paymentsDone, value: String(snapshot.paymentCompleted), note: "Đã thu tiền" },
    {
      label: messages.revenue,
      value: snapshot.revenue.toLocaleString("vi-VN"),
      note: "VNĐ",
    },
    { label: messages.customers, value: String(snapshot.customerCount), note: "Trong hệ thống" },
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
