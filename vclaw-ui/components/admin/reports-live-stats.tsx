import { StatsGrid } from "@/components/admin/admin-shell";

type Snapshot = {
  orderCount: number;
  orderDone: number;
  paymentCompleted: number;
  revenue: number;
  customerCount: number;
  productCount: number;
};

type Messages = {
  sectionTitle: string;
  orderCount: string;
  revenue: string;
  customers: string;
  products: string;
  paymentsDone: string;
};

export function ReportsLiveStats({ snapshot, messages }: { snapshot: Snapshot; messages: Messages }) {
  const items = [
    { label: messages.orderCount, value: String(snapshot.orderCount), note: `DONE: ${snapshot.orderDone}` },
    {
      label: messages.revenue,
      value: snapshot.revenue.toLocaleString("vi-VN"),
      note: "VNĐ",
    },
    { label: messages.customers, value: String(snapshot.customerCount), note: "SQLite" },
    { label: messages.products, value: String(snapshot.productCount), note: "ACTIVE" },
    {
      label: messages.paymentsDone,
      value: String(snapshot.paymentCompleted),
      note: "COMPLETED",
    },
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
