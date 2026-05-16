"use client";

import React, { useState, useTransition } from "react";
import {
  Briefcase,
  Plus,
  Users,
  Target,
  Clock,
  ExternalLink,
  Search,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Send,
  Building2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/shared";
import { createJobPosition, deleteJobPosition } from "@/lib/actions/recruitment/actions";
import { postJobToLinkedIn } from "@/lib/recruitment/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AdminHhContent } from "@/lib/admin/content";

// LinkedIn icon inline — lucide-react chưa export sẵn
const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

type JobPosition = {
  id: string;
  title: string;
  status: string;
  requirements?: string | null;
  description?: string | null;
  companyUrl?: string | null;
  linkedinJobId?: string | null;
  linkedinJobUrl?: string | null;
  _count: { candidates: number };
  createdAt: Date | string;
};

type JobManagerProps = {
  jobs: JobPosition[];
  messages: AdminHhContent;
};

// Modal đăng bài lên LinkedIn bằng Playwright
function PostJobModal({
  job,
  onClose,
  messages,
}: {
  job: JobPosition;
  onClose: () => void;
  messages: AdminHhContent;
}) {
  const [form, setForm] = useState({
    title: job.title,
    description: job.description ?? "",
    location: "Ho Chi Minh, Vietnam",
    target: "company" as "company" | "personal",
  });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const COMPANY_URL = "https://www.linkedin.com/company/vclaw-ai";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await postJobToLinkedIn({
        title: form.title,
        description: form.description,
        location: form.location,
        companyUrl: form.target === "company" ? COMPANY_URL : undefined,
        jobPositionId: job.id,
      });

      if (result.success) {
        toast.success(result.note ?? messages.jobPositions.linkedin.postSuccess);
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? messages.jobPositions.linkedin.postError);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-2xl border border-[color:var(--line)]">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <LinkedInIcon className="h-5 w-5 text-blue-600" />
            {messages.jobPositions.linkedin.postTitle}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Chọn đăng lên đâu */}
            <div className="space-y-2">
              <Label>{messages.jobPositions.linkedin.postTarget}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, target: "company" }))}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all",
                    form.target === "company"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-[color:var(--line)] hover:border-blue-300",
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  {messages.jobPositions.linkedin.postTargetCompany}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, target: "personal" }))}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all",
                    form.target === "personal"
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-[color:var(--line)] hover:border-purple-300",
                  )}
                >
                  <User className="h-4 w-4" />
                  {messages.jobPositions.linkedin.postTargetPersonal}
                </button>
              </div>
              {form.target === "company" && (
                <p className="text-xs text-[color:var(--muted)]">
                  {messages.jobPositions.linkedin.viewPost}: <a href={COMPANY_URL} target="_blank" className="text-blue-600 hover:underline">{messages.jobPositions.linkedin.companyPageLink}</a>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-title">{messages.jobPositions.form.title} *</Label>
              <Input
                id="post-title"
                value={form.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm(p => ({ ...p, title: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-location">{messages.jobPositions.linkedin.postLocation}</Label>
              <Input
                id="post-location"
                placeholder="Ho Chi Minh, Vietnam"
                value={form.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm(p => ({ ...p, location: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-desc">{messages.jobPositions.form.description}</Label>
              <Textarea
                id="post-desc"
                rows={4}
                placeholder={messages.jobPositions.form.placeholderDesc}
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm(p => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex gap-2">
              <span>⚠️</span>
              <span>{messages.jobPositions.linkedin.postWarning}</span>
            </div>
          </CardContent>

          <CardFooter className="gap-2 border-t border-[color:var(--line)] pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              {messages.jobPositions.form.cancel}
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {pending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{messages.jobPositions.linkedin.posting}</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />{messages.jobPositions.linkedin.postCta}</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function AddJobModal({ onClose, onCreated, messages }: { onClose: () => void; onCreated: () => void; messages: AdminHhContent }) {
  const [form, setForm] = useState({ 
    title: "", 
    description: "", 
    requirements: "",
    salaryRange: "",
    benefits: "",
    interviewProcess: "",
    publicInstructions: "",
    headcount: 1,
    hiringTimeline: "",
    urgencyLevel: "NORMAL"
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    startTransition(async () => {
      await createJobPosition({
        title: form.title,
        description: form.description,
        requirements: form.requirements,
        companyUrl: "https://www.linkedin.com/company/vclaw-ai",
        salaryRange: form.salaryRange,
        benefits: form.benefits,
        interviewProcess: form.interviewProcess,
        publicInstructions: form.publicInstructions,
        headcount: form.headcount,
        hiringTimeline: form.hiringTimeline,
        urgencyLevel: form.urgencyLevel,
      });
      onCreated();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
      <Card className="w-full max-w-2xl shadow-2xl border border-[color:var(--line)]">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[color:var(--brand-strong)]" />
            {messages.jobPositions.form.title}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label htmlFor="job-title">{messages.jobPositions.form.title} *</Label>
              <Input
                id="job-title"
                placeholder={messages.jobPositions.form.placeholderTitle}
                value={form.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="job-headcount">Số lượng cần tuyển</Label>
                <Input
                  id="job-headcount"
                  type="number"
                  min="1"
                  value={form.headcount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((p) => ({ ...p, headcount: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job-urgency">Mức độ cần thiết</Label>
                <select
                  id="job-urgency"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.urgencyLevel}
                  onChange={(e) => setForm((p) => ({ ...p, urgencyLevel: e.target.value }))}
                >
                  <option value="NORMAL">Bình thường</option>
                  <option value="URGENT">Cần gấp (Urgent)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-desc">{messages.jobPositions.form.description}</Label>
              <Textarea
                id="job-desc"
                rows={3}
                placeholder={messages.jobPositions.form.placeholderDesc}
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-req">{messages.jobPositions.form.requirements}</Label>
              <Textarea
                id="job-req"
                rows={2}
                placeholder={messages.jobPositions.form.placeholderReq}
                value={form.requirements}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((p) => ({ ...p, requirements: e.target.value }))
                }
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                {showAdvanced ? "Ẩn bớt thông tin mở rộng" : "Thêm thông tin cho AI (Lương, Chế độ...)"}
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 pt-2 pb-2 border-t border-[color:var(--line)]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="job-salary">Mức lương (Salary Range)</Label>
                    <Input
                      id="job-salary"
                      placeholder="VD: 15-20M, Negotiable..."
                      value={form.salaryRange}
                      onChange={(e) => setForm((p) => ({ ...p, salaryRange: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="job-timeline">Thời gian tuyển dụng</Label>
                    <Input
                      id="job-timeline"
                      placeholder="VD: Tháng 5-6/2026"
                      value={form.hiringTimeline}
                      onChange={(e) => setForm((p) => ({ ...p, hiringTimeline: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-benefits">Chế độ đãi ngộ (Benefits)</Label>
                  <Textarea
                    id="job-benefits"
                    rows={2}
                    placeholder="Bảo hiểm, thưởng lễ tết, du lịch..."
                    value={form.benefits}
                    onChange={(e) => setForm((p) => ({ ...p, benefits: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-process">Quy trình phỏng vấn</Label>
                  <Textarea
                    id="job-process"
                    rows={2}
                    placeholder="VD: 2 vòng phỏng vấn (1 online, 1 offline)"
                    value={form.interviewProcess}
                    onChange={(e) => setForm((p) => ({ ...p, interviewProcess: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-public-instructions">Thông tin Public cho AI</Label>
                  <Textarea
                    id="job-public-instructions"
                    rows={3}
                    placeholder="Chỉ dẫn cho AI khi chat với ứng viên: 'Được phép tiết lộ mức lương tối đa 20M', 'Nhấn mạnh môi trường trẻ trung', v.v."
                    value={form.publicInstructions}
                    onChange={(e) => setForm((p) => ({ ...p, publicInstructions: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-2 border-t border-[color:var(--line)] pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              {messages.jobPositions.form.cancel}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[color:var(--brand-strong)] text-white"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {messages.jobPositions.form.submit}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


export function JobManager({ jobs, messages }: JobManagerProps) {
  const STATUS_MAP: Record<string, { label: string; className: string }> = {
    OPEN:   { label: messages.jobPositions.status.open,    className: "border-blue-200 bg-blue-50 text-blue-700" },
    ACTIVE: { label: messages.jobPositions.status.active,  className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    CLOSED: { label: messages.jobPositions.status.closed,  className: "border-slate-200 bg-slate-50 text-slate-600" },
  };
  const [showModal, setShowModal] = useState(false);
  const [postingJob, setPostingJob] = useState<JobPosition | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(id: string) {
    if (!confirm(messages.jobPositions.actions.deleteConfirm)) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteJobPosition(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {showModal && (
        <AddJobModal
          onClose={() => setShowModal(false)}
          onCreated={() => router.refresh()}
          messages={messages}
        />
      )}
      {postingJob && (
        <PostJobModal
          job={postingJob}
          onClose={() => setPostingJob(null)}
          messages={messages}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--foreground-strong)]">
            {messages.jobPositions.manageTitle}
          </h2>
          <p className="text-[color:var(--muted)] text-sm mt-0.5">
            {jobs.length} {messages.jobPositions.manageDesc}
          </p>
        </div>
        <Button
          id="btn-add-job"
          onClick={() => setShowModal(true)}
          className="bg-[color:var(--brand-strong)] text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          {messages.jobPositions.add}
        </Button>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => {
          const statusInfo = STATUS_MAP[job.status] ?? STATUS_MAP.OPEN;
          return (
            <Card
              key={job.id}
              className="group relative border border-[color:var(--line)] bg-[color:var(--surface)] hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-10 w-10 rounded-xl bg-[color:var(--brand-soft)] flex items-center justify-center text-[color:var(--brand-strong)]">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("capitalize text-[11px]", statusInfo.className)}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold leading-tight group-hover:text-[color:var(--brand-strong)] transition-colors">
                  {job.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 flex-1">
                <p className="text-sm text-[color:var(--muted)] line-clamp-2">
                  {job.description || messages.jobPositions.empty}
                </p>

                <div className="flex items-center gap-4 text-xs text-[color:var(--muted)]">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {job._count.candidates} {messages.jobPositions.stats.candidates}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(job.createdAt).toLocaleDateString(messages.title.includes("Tuyển dụng") ? "vi-VN" : "en-US")}
                  </span>
                </div>

                {/* LinkedIn status */}
                {job.linkedinJobUrl ? (
                  <a
                    href={job.linkedinJobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 rounded-lg px-3 py-2 transition-colors"
                  >
                    <LinkedInIcon className="h-3.5 w-3.5 shrink-0" />
                    {messages.jobPositions.linkedin.viewPost}
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                ) : null}
              </CardContent>

              <CardFooter className="pt-3 border-t border-[color:var(--line)] flex gap-2 flex-wrap">
                <a
                  href={`/admin/recruitment/candidates?job=${job.id}`}
                  className="flex items-center gap-1.5 h-8 text-xs rounded-md px-3 hover:bg-accent transition-colors text-[color:var(--foreground)]"
                >
                  <Search className="h-3.5 w-3.5" />
                  {messages.jobPositions.actions.candidates}
                </a>
                {/* Nút đăng lên LinkedIn */}
                <button
                  onClick={() => setPostingJob(job)}
                  className="flex items-center gap-1.5 h-8 text-xs rounded-md px-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                  title={messages.jobPositions.actions.postLi}
                >
                  <LinkedInIcon className="h-3.5 w-3.5" />
                  {messages.jobPositions.actions.postLi}
                </button>
                {job.companyUrl && (
                  <a
                    href={job.companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                    title="Trang công ty LinkedIn"
                  >
                    <LinkedInIcon className="h-4 w-4 text-blue-600" />
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                  onClick={() => handleDelete(job.id)}
                  disabled={deletingId === job.id}
                >
                  {deletingId === job.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {/* Card placeholder thêm mới */}
        <button
          onClick={() => setShowModal(true)}
          className="min-h-[200px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[color:var(--line)] rounded-2xl bg-[color:var(--surface-soft)] hover:border-[color:var(--brand-strong)] hover:bg-[color:var(--brand-soft)] transition-all group opacity-60 hover:opacity-100"
        >
          <Plus className="h-10 w-10 text-[color:var(--muted)] group-hover:text-[color:var(--brand-strong)] transition-colors" />
          <span className="text-sm font-medium text-[color:var(--muted)] group-hover:text-[color:var(--brand-strong)] transition-colors">
            {messages.jobPositions.add}
          </span>
        </button>
      </div>

      {/* Stats tổng hợp */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        {[
          {
            title: messages.jobPositions.stats.total,
            value: jobs.length,
            icon: <Target className="h-5 w-5" />,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            title: messages.jobPositions.stats.posted,
            value: jobs.filter((j) => j.linkedinJobId).length,
            icon: <LinkedInIcon className="h-5 w-5" />,
            color: "text-blue-700",
            bg: "bg-blue-100",
          },
          {
            title: messages.jobPositions.stats.hiring,
            value: jobs.filter((j) => j.status === "OPEN" || j.status === "ACTIVE").length,
            icon: <RefreshCw className="h-5 w-5" />,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            title: messages.jobPositions.stats.candidates,
            value: jobs.reduce((s, j) => s + j._count.candidates, 0),
            icon: <Users className="h-5 w-5" />,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-none bg-[color:var(--surface)] shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div
                className={cn(
                  "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0",
                  stat.bg,
                  stat.color,
                )}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[color:var(--muted)] uppercase tracking-wider">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-[color:var(--foreground-strong)]">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
