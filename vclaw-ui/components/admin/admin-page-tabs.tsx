"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type AdminTab = {
  id: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function AdminPageTabs({
  tabs,
  defaultTab,
}: {
  tabs: AdminTab[];
  defaultTab: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? defaultTab;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultTab) {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="mb-6 flex-wrap">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.icon}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.children}
        </TabsContent>
      ))}
    </Tabs>
  );
}
