"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = { name: string; price: number };

export function ShopeeSkuExport({
  products,
  messages,
}: {
  products: Row[];
  messages: { title: string; description: string; button: string };
}) {
  const csv = useMemo(() => {
    const header = "name,price_vnd\n";
    const body = products
      .map((p) => `"${p.name.replace(/"/g, '""')}",${p.price}`)
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
