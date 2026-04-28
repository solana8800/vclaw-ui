
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Users, User, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { getAvailableZaloIdentities, type ZaloIdentity } from "@/lib/actions/zalo-identity-actions";
import { cn } from "@/lib/shared/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ZaloIdentitySelector({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [identities, setIdentities] = useState<ZaloIdentity[]>([]);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchIdentities = async () => {
      setLoading(true);
      const data = await getAvailableZaloIdentities();
      setIdentities(data);
      setLoading(false);
    };

    // Fetch if open OR if we have an initial value but haven't loaded yet
    if ((open || (value && identities.length === 0)) && !loading) {
      fetchIdentities();
    }
  }, [open, value, identities.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIdentity = identities.find(i => i.id === value);
  const filteredIdentities = identities.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between bg-[color:var(--surface-soft)] border-[color:var(--line)] text-left font-normal hover:bg-[color:var(--surface-strong)] transition-all"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedIdentity ? (
            <>
              {selectedIdentity.type === "group" ? (
                <Users className="h-4 w-4 text-[color:var(--brand)]" />
              ) : (
                <User className="h-4 w-4 text-[color:var(--brand)]" />
              )}
              <span className="truncate">{selectedIdentity.name}</span>
              <span className="text-[0.65rem] opacity-50 font-mono">({selectedIdentity.id})</span>
            </>
          ) : value ? (
            <div className="flex items-center gap-2 overflow-hidden opacity-70">
              <span className="truncate font-mono text-xs">{value}</span>
            </div>
          ) : (
            <span className="text-[color:var(--muted)]">Chọn Shipper hoặc Nhóm Zalo...</span>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-[100] mt-2 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md bg-opacity-95">
          <div className="flex items-center border-b border-[color:var(--line)] px-3 pb-1 pt-1">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Tìm kiếm tên hoặc ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="max-h-[360px] overflow-y-auto p-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-[color:var(--muted)]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải danh sách...
              </div>
            ) : (
              <>
                {/* Clear option */}
                <button
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-[color:var(--surface-soft)] text-[color:var(--muted)]",
                    !value && "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"
                  )}
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-soft)] opacity-50">
                    <Check className={cn("h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                  </div>
                  <span className="font-medium italic">-- Để trống (Không nhận tin) --</span>
                </button>

                {filteredIdentities.length === 0 && search && (
                  <div className="py-6 text-center text-sm text-[color:var(--muted)]">
                    Không tìm thấy kết quả nào cho "{search}"
                  </div>
                )}

                {filteredIdentities.map((identity) => (
                  <button
                    key={identity.id}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors hover:bg-[color:var(--brand-soft)] hover:text-[color:var(--brand-strong)]",
                      value === identity.id && "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"
                    )}
                    onClick={() => {
                      onChange(identity.id);
                      setOpen(false);
                    }}
                  >
                    <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-soft)]">
                      {identity.type === "group" ? (
                        <Users className="h-4 w-4 text-[color:var(--brand)]" />
                      ) : (
                        <User className="h-4 w-4 text-[color:var(--brand)]" />
                      )}
                    </div>
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="font-medium truncate w-full">{identity.name}</span>
                      <span className="text-[0.65rem] opacity-50 font-mono truncate w-full">{identity.id}</span>
                    </div>
                    {value === identity.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
