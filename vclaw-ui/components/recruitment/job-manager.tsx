"use client";

import React from "react";
import { 
  Briefcase, 
  Plus, 
  Users, 
  Target, 
  CheckCircle2,
  Clock,
  ExternalLink,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared";
import type { AdminMessages } from "@/lib/admin/content";

const LinkedInIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

type JobPosition = {
  id: string;
  title: string;
  status: string;
  requirements?: string;
  description?: string;
  _count: { candidates: number };
  createdAt: string;
};

type JobManagerProps = {
  jobs: JobPosition[];
  messages: AdminMessages["recruitment"];
};

export function JobManager({ jobs, messages }: JobManagerProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--foreground-strong)]">{messages.jobPositions.title}</h2>
          <p className="text-[color:var(--muted)]">{messages.description}</p>
        </div>
        <Button className="bg-[color:var(--brand-strong)] text-white gap-2">
          <Plus className="h-4 w-4" />
          {messages.jobPositions.add}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <Card key={job.id} className="group border border-[color:var(--line)] bg-[color:var(--surface)] hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="h-10 w-10 rounded-xl bg-[color:var(--brand-soft)] flex items-center justify-center text-[color:var(--brand-strong)]">
                  <Briefcase className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={cn(
                  "capitalize",
                  job.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-slate-50"
                )}>
                  {job.status.toLowerCase()}
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold group-hover:text-[color:var(--brand-strong)] transition-colors">
                {job.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[color:var(--muted)] line-clamp-2">
                {job.description || "Chưa có mô tả chi tiết cho vị trí này."}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                  <Users className="h-3.5 w-3.5" />
                  <span>{job._count.candidates} ứng viên</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(job.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t border-[color:var(--line)] flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 text-xs gap-2">
                <Search className="h-3.5 w-3.5" />
                Tìm ứng viên
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}

        {jobs.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-[color:var(--line)] rounded-2xl bg-[color:var(--surface-soft)] opacity-60">
            <Briefcase className="h-12 w-12 text-[color:var(--muted)] mb-4" />
            <p className="text-[color:var(--muted)] font-medium">{messages.jobPositions.empty}</p>
            <Button variant="ghost" className="text-[color:var(--brand-strong)] mt-2">
              Bắt đầu tạo vị trí đầu tiên
            </Button>
          </div>
        )}
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-12">
        <StatsCard title="Tổng vị trí" value={jobs.length} icon={<Target />} color="text-blue-600" bg="bg-blue-50" />
        <StatsCard title="Ứng viên tiềm năng" value={24} icon={<Users />} color="text-purple-600" bg="bg-purple-50" />
        <StatsCard title="Đang phỏng vấn" value={8} icon={<Clock />} color="text-amber-600" bg="bg-amber-50" />
        <StatsCard title="Đã tuyển" value={3} icon={<CheckCircle2 />} color="text-emerald-600" bg="bg-emerald-50" />
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, color, bg }: { title: string, value: number, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <Card className="border-none bg-[color:var(--surface)] shadow-sm">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", bg, color)}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "h-6 w-6" }) : null}
        </div>
        <div>
          <p className="text-xs font-medium text-[color:var(--muted)] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[color:var(--foreground-strong)]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
