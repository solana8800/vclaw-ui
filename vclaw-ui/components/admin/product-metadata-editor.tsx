"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductMetadataEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [items, setItems] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(value || "{}");
      const mapped = Object.entries(parsed).map(([k, v]) => ({
        key: k,
        value: String(v),
      }));
      if (mapped.length > 0) {
        setItems(mapped);
      } else if (items.length === 0) {
        setItems([{ key: "", value: "" }]);
      }
    } catch (e) {
      // Fallback to empty if invalid JSON
      if (items.length === 0) setItems([{ key: "", value: "" }]);
    }
  }, []);

  const updateParent = (newItems: { key: string; value: string }[]) => {
    const obj: Record<string, string> = {};
    newItems.forEach((it) => {
      if (it.key.trim()) obj[it.key.trim()] = it.value;
    });
    onChange(JSON.stringify(obj));
  };

  const handleChange = (index: number, field: "key" | "value", val: string) => {
    const newItems = [...items];
    newItems[index][field] = val;
    setItems(newItems);
    updateParent(newItems);
  };

  const addItem = () => {
    const newItems = [...items, { key: "", value: "" }];
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length ? newItems : [{ key: "", value: "" }]);
    updateParent(newItems);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />
          Thông số kỹ thuật / Metadata
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] text-[color:var(--brand)] hover:text-[color:var(--brand-strong)]"
          onClick={addItem}
        >
          <Plus className="h-3 w-3 mr-1" />
          Thêm thông số
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <input
              type="text"
              placeholder="Tên (vd: Size)"
              className="flex-1 h-9 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]"
              value={item.key}
              onChange={(e) => handleChange(idx, "key", e.target.value)}
            />
            <input
              type="text"
              placeholder="Giá trị (vd: XL)"
              className="flex-1 h-9 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]"
              value={item.value}
              onChange={(e) => handleChange(idx, "value", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => removeItem(idx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      
      <p className="text-[10px] text-[color:var(--muted)] italic">
        * Metadata giúp Bot AI tư vấn chính xác hơn về thuộc tính sản phẩm.
      </p>
    </div>
  );
}
