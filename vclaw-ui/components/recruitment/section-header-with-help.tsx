"use client";

import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type HelpTooltipIconProps = {
  help: string;
  helpAriaLabel: string;
};

export function HelpTooltipIcon({ help, helpAriaLabel }: HelpTooltipIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={helpAriaLabel}
        >
          <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-left leading-relaxed px-3 py-2">
        {help}
      </TooltipContent>
    </Tooltip>
  );
}

export function RecruitmentSectionTooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>;
}
