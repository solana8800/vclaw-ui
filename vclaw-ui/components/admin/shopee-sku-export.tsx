"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = { 
  id: string;
  name: string; 
  price: number; 
  productCode?: string | null;
  category?: string | null;
  description?: string | null;
  type?: string;
  status?: string;
  imageUrl?: string | null;
  metadata?: string | null;
  createdAt?: string | Date | null;
};

export function ShopeeSkuExport({
  products,
  messages,
}: {
  products: Row[];
  messages: { title: string; description: string; button: string };
}) {
  const csv = useMemo(() => {
    const columns = ["id", "name", "price_vnd", "sku_code", "category", "type", "status", "image_url", "description", "metadata", "created_at"];
    const header = columns.join(",") + "\n";
    
    const body = products
      .map((p) => {
        const values = [
          p.id,
          p.name,
          p.price,
          p.productCode || "",
          p.category || "",
          p.type || "GOODS",
          p.status || "ACTIVE",
          p.imageUrl || "",
          (p.description || "").replace(/\n/g, " "),
          (p.metadata || "").replace(/\n/g, " "),
          p.createdAt ? (new Date(p.createdAt).toISOString()) : "",
        ];
        return values.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",");
      })
      .join("\n");
    return header + body;
  }, [products]);

  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vclaw-skus-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-[color:var(--line)]">
      <CardHeader>
        <CardTitle className="text-lg">{messages.title}</CardTitle>
        <CardDescription>{messages.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" className="rounded-xl" onClick={download}>
          {messages.button}
        </Button>
      </CardContent>
    </Card>
  );
}
