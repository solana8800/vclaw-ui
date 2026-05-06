"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/shared";

const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
        "text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
        "data-[state=active]:bg-[image:var(--brand-gradient)] data-[state=active]:text-[color:var(--brand-contrast)] data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("focus-visible:outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
