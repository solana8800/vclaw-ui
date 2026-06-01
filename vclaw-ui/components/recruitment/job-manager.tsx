"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
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
  ImagePlus,
  Sparkles,
  Upload,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/shared";
import {
  createJobPosition,
  deleteJobPosition,
  getLinkedInPostsForJob,
  updateJobPosition,
} from "@/lib/actions/recruitment/actions";
import { postJobToLinkedIn } from "@/lib/recruitment/actions";
import {
  generateLinkedInJobPostCopy,
  uploadLinkedInPostImage,
} from "@/lib/recruitment/linkedin-post-actions";
import { validateLinkedInJobCopy } from "@/lib/recruitment/linkedin-job-copy";
import { resolveLinkedInCompanyUrl } from "@/lib/recruitment/company-url";
import { isJobPostedOnLinkedIn } from "@/lib/recruitment/job-position";
import { toast } from "@/lib/notifications/toast";
import { useRouter } from "next/navigation";
import { AdminHhContent } from "@/lib/admin/content";
import { useRecruitmentBackgroundTasks } from "@/components/recruitment/use-recruitment-background-tasks";
import { RecruitmentBackgroundTasksBanner } from "@/components/recruitment/recruitment-background-tasks-banner";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";

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
  linkedinPostCopy?: string | null;
  salaryRange?: string | null;
  benefits?: string | null;
  companyInfo?: string | null;
  projectTeamInfo?: string | null;
  hiringPolicy?: string | null;
  interviewProcess?: string | null;
  headcount?: number | null;
  hiringTimeline?: string | null;
  urgencyLevel?: string | null;
  companyUrl?: string | null;
  linkedinJobId?: string | null;
  linkedinJobUrl?: string | null;
  linkedinPostedAt?: Date | string | null;
  contractType?: string | null;
  workMode?: string | null;
  _count: { candidates: number; linkedinPosts?: number };
  createdAt: Date | string;
};

type LinkedInPostHistoryItem = Awaited<ReturnType<typeof getLinkedInPostsForJob>>[number];

type JobManagerProps = {
  jobs: JobPosition[];
  messages: AdminHhContent;
  defaultLinkedInCompanyUrl?: string | null;
};

// Modal đăng bài lên LinkedIn bằng Playwright
function PostJobModal({
  job,
  onClose,
  messages,
  defaultLinkedInCompanyUrl,
}: {
  job: JobPosition;
  onClose: () => void;
  messages: AdminHhContent;
  defaultLinkedInCompanyUrl?: string | null;
}) {
  const [form, setForm] = useState({
    title: job.title,
    postCopy: job.linkedinPostCopy ?? "",
    companyUrl: resolveLinkedInCompanyUrl(defaultLinkedInCompanyUrl, job.companyUrl),
    target: "personal" as "company" | "personal",
  });
  const [enriching, setEnriching] = useState(false);
  const [savingJd, setSavingJd] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pending, startTransition] = useTransition();
  const [postHistory, setPostHistory] = useState<LinkedInPostHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const router = useRouter();

  const li = messages.jobPositions.linkedin;

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    void getLinkedInPostsForJob(job.id).then((rows) => {
      if (!cancelled) {
        setPostHistory(rows);
        setLoadingHistory(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  const runAiEnrich = useCallback(
    async () => {
      setEnriching(true);
      const copyResult = await generateLinkedInJobPostCopy(job.id);
      if (copyResult.ok && copyResult.description) {
        setForm((p) => ({ ...p, postCopy: copyResult.description! }));
      } else {
        toast.error(copyResult.error ?? li.aiEnrichFailed);
      }
      setEnriching(false);
    },
    [job.id, li.aiEnrichFailed],
  );

  const handleSavePostCopy = useCallback(async () => {
    const text = form.postCopy.trim();
    if (!text) return;
    setSavingJd(true);
    try {
      await updateJobPosition(job.id, { linkedinPostCopy: text });
      toast.success(li.aiEnrichSaved);
      router.refresh();
    } catch {
      toast.error(li.aiEnrichFailed);
    } finally {
      setSavingJd(false);
    }
  }, [form.postCopy, job.id, li.aiEnrichFailed, li.aiEnrichSaved, router]);

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setUploadingImage(true);
    setImagePreview(URL.createObjectURL(file));
    setImagePath(null);

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadLinkedInPostImage(job.id, formData);
    setUploadingImage(false);

    if (result.ok && result.imagePath) {
      setImagePath(result.imagePath);
    } else {
      setImagePreview(null);
      setImagePath(null);
      toast.error(result.error ?? li.optionalImageUploadFailed);
    }
    e.target.value = "";
  }

  function clearImage() {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImagePath(null);
  }

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Không tự động gen nội dung AI ngay khi mở modal nữa, 
  // chỉ gen khi người dùng nhấn nút "Làm mới/Gen AI".
  // useEffect(() => {
  //   void runAiEnrich();
  // }, [job.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const copyCheck = validateLinkedInJobCopy(form.postCopy);
    if (!copyCheck.ok) {
      toast.error(li.copyInvalid);
      return;
    }
    const companyUrlForPost =
      form.target === "company"
        ? resolveLinkedInCompanyUrl(defaultLinkedInCompanyUrl, form.companyUrl)
        : "";
    if (form.target === "company" && !companyUrlForPost.includes("linkedin.com/company/")) {
      toast.error(li.companyUrlRequired);
      return;
    }
    startTransition(async () => {
      const result = await postJobToLinkedIn({
        title: form.title,
        description: form.postCopy,
        target: form.target,
        companyUrl: form.target === "company" ? companyUrlForPost : undefined,
        imagePath: imagePath ?? undefined,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="linkedin-post-title"
    >
      <Card className="flex w-full max-w-2xl max-h-[min(92vh,900px)] flex-col overflow-hidden shadow-2xl border border-[color:var(--line)]">
        <CardHeader className="shrink-0 flex flex-row items-start justify-between gap-4 border-b border-[color:var(--line)] px-6 pt-6 pb-4">
          <div className="min-w-0 space-y-1">
            <CardTitle
              id="linkedin-post-title"
              className="text-xl font-semibold flex items-center gap-2 tracking-tight"
            >
              <LinkedInIcon className="h-5 w-5 shrink-0 text-[#0A66C2]" aria-hidden />
              {messages.jobPositions.linkedin.postTitle}
            </CardTitle>
            <p className="text-sm text-[color:var(--muted)] leading-relaxed">{li.postSubtitle}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            aria-label={messages.jobPositions.form.cancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
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
                <div className="space-y-1.5">
                  <Label htmlFor="post-company-url">{li.companyPageUrl}</Label>
                  <Input
                    id="post-company-url"
                    type="url"
                    placeholder={li.companyPagePlaceholder}
                    value={form.companyUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm((p) => ({ ...p, companyUrl: e.target.value }))
                    }
                    required
                  />
                  <p className="text-xs text-[color:var(--muted)]">{li.companyPageHint}</p>
                </div>
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="post-desc">{messages.jobPositions.linkedin.postCopyLabel}</Label>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={enriching || savingJd || pending || !form.postCopy.trim()}
                    onClick={() => void handleSavePostCopy()}
                  >
                    {savingJd ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    {li.aiSaveToJd}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={enriching || savingJd || pending}
                    onClick={() => void runAiEnrich()}
                  >
                    {enriching ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {li.aiRegenerate}
                  </Button>
                </div>
              </div>
              {enriching ? (
                <p className="text-xs text-[color:var(--muted)] flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {li.aiEnriching}
                </p>
              ) : (
                <p className="text-xs text-[color:var(--muted)]">{li.aiEnrichHint}</p>
              )}
              <Textarea
                id="post-desc"
                rows={6}
                placeholder={messages.jobPositions.form.placeholderDesc}
                value={form.postCopy}
                disabled={enriching}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm(p => ({ ...p, postCopy: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{li.optionalImageLabel}</Label>
              {!imagePreview ? (
                <label
                  htmlFor="post-image"
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-8 text-center transition-colors",
                    (pending || uploadingImage) && "pointer-events-none opacity-60",
                    !pending && !uploadingImage && "hover:border-[#0A66C2]/40 hover:bg-blue-50/30",
                  )}
                >
                  <ImagePlus className="h-8 w-8 text-[color:var(--muted)]" aria-hidden />
                  <span className="text-sm font-medium">{li.optionalImageChoose}</span>
                  <span className="text-xs text-[color:var(--muted)]">{li.optionalImageHint}</span>
                  <input
                    id="post-image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={pending || uploadingImage}
                    onChange={(e) => void handleImageFileChange(e)}
                  />
                </label>
              ) : (
                <div className="space-y-2 rounded-xl border border-[color:var(--line)] overflow-hidden bg-[color:var(--surface)]">
                  <img
                    src={imagePreview}
                    alt=""
                    className="w-full object-cover max-h-52"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[color:var(--line)]">
                    <p className={cn("text-xs", imagePath ? "text-emerald-700" : "text-amber-700")}>
                      {uploadingImage ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {li.optionalImageUploading}
                        </span>
                      ) : imagePath ? (
                        li.optionalImageReady
                      ) : (
                        li.optionalImageUploadFailed
                      )}
                    </p>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearImage}>
                      {li.optionalImageRemove}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-[color:var(--line)] pt-4">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{li.postHistory}</p>
              {loadingHistory ? (
                <p className="text-xs text-[color:var(--muted)] flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {li.aiEnriching}
                </p>
              ) : postHistory.length === 0 ? (
                <p className="text-xs text-[color:var(--muted)]">{li.postHistoryEmpty}</p>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {postHistory.map((post) => {
                    const locale = messages.title.includes("Tuyển dụng") ? "vi-VN" : "en-US";
                    const targetLabel =
                      post.target === "company" ? li.postTargetCompany : li.postTargetPersonal;
                    return (
                      <li
                        key={post.id}
                        className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[color:var(--foreground-strong)]">
                            {new Date(post.postedAt).toLocaleString(locale)}
                          </span>
                          <span className="text-[color:var(--muted)]">{targetLabel}</span>
                        </div>
                        {post.postUrl ? (
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            {li.viewPost}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="mt-1 text-[color:var(--muted)]">{li.postedNoLink}</p>
                        )}
                        {post.target === "company" && post.companyUrl ? (
                          <a
                            href={post.companyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block truncate text-[color:var(--muted)] hover:text-blue-600 hover:underline"
                          >
                            {messages.jobPositions.actions.companyPage}
                          </a>
                        ) : null}
                        {post.hasImage ? (
                          <p className="mt-1 text-[color:var(--muted)]">{li.optionalImageLabel}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>

          <CardFooter className="shrink-0 gap-3 border-t border-[color:var(--line)] bg-[color:var(--background)] px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              {messages.jobPositions.form.cancel}
            </Button>
            <Button
              type="submit"
              disabled={pending || enriching || uploadingImage || Boolean(imagePreview && !imagePath)}
              className="flex-1 bg-[#0A66C2] hover:bg-[#004182] text-white"
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

function JobFormModal({
  job,
  onClose,
  onSuccess,
  messages,
  defaultLinkedInCompanyUrl,
  onImportJdBackground,
  onImportJdFromFileBackground,
}: {
  job?: JobPosition;
  onClose: () => void;
  onSuccess: () => void;
  messages: AdminHhContent;
  defaultLinkedInCompanyUrl?: string | null;
  onImportJdBackground?: (url: string, options?: { onComplete?: () => void }) => Promise<void>;
  onImportJdFromFileBackground?: (file: File, options?: { onComplete?: () => void }) => Promise<void>;
}) {
  const isEdit = Boolean(job);
  const [form, setForm] = useState({ 
    title: job?.title ?? "", 
    description: job?.description ?? "", 
    requirements: job?.requirements ?? "",
    companyUrl: resolveLinkedInCompanyUrl(defaultLinkedInCompanyUrl, job?.companyUrl),
    salaryRange: job?.salaryRange ?? "",
    benefits: job?.benefits ?? "",
    interviewProcess: job?.interviewProcess ?? "",
    publicInstructions: job?.hiringPolicy ?? "", // Dùng hiringPolicy map vào instructions nếu cần
    headcount: job?.headcount ?? 1,
    hiringTimeline: job?.hiringTimeline ?? "",
    urgencyLevel: job?.urgencyLevel ?? "NORMAL",
    status: job?.status ?? "OPEN",
    companyInfo: job?.companyInfo ?? "",
    projectTeamInfo: job?.projectTeamInfo ?? "",
    contractType: job?.contractType ?? "FULL_TIME",
    workMode: job?.workMode ?? "ONSITE",
  });
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const [pending, startTransition] = useTransition();
  const [jdImportUrl, setJdImportUrl] = useState("");
  const [jdFileDragOver, setJdFileDragOver] = useState(false);
  const jdFileInputRef = React.useRef<HTMLInputElement>(null);

  const f = messages.jobPositions.form;

  /** Trigger import qua background task — đóng modal ngay; banner + toast tự cập nhật tiến độ. */
  function handleImportJd() {
    const url = jdImportUrl.trim();
    if (!url) {
      toast.error(f.jdImportUrlPlaceholder || "Nhập link JD công khai.");
      return;
    }
    if (!onImportJdBackground) return;
    void onImportJdBackground(url, {
      onComplete: () => {
        onSuccess();
      },
    });
    onClose();
  }

  function handleImportJdFile(file: File | null) {
    if (!file) return;
    if (!onImportJdFromFileBackground) return;
    void onImportJdFromFileBackground(file, {
      onComplete: () => {
        onSuccess();
      },
    });
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    startTransition(async () => {
      if (isEdit && job) {
        await updateJobPosition(job.id, {
          title: form.title,
          description: form.description,
          requirements: form.requirements,
          companyUrl: form.companyUrl?.trim() || undefined,
          salaryRange: form.salaryRange,
          benefits: form.benefits,
          interviewProcess: form.interviewProcess,
          hiringPolicy: form.publicInstructions,
          headcount: form.headcount,
          hiringTimeline: form.hiringTimeline,
          urgencyLevel: form.urgencyLevel,
          status: form.status,
          companyInfo: form.companyInfo,
          projectTeamInfo: form.projectTeamInfo,
          contractType: form.contractType,
          workMode: form.workMode,
        });
        toast.success(f.toastUpdateSuccess || "Cập nhật công việc thành công");
      } else {
        await createJobPosition({
          title: form.title,
          description: form.description,
          requirements: form.requirements,
          companyUrl: form.companyUrl?.trim() || undefined,
          salaryRange: form.salaryRange,
          benefits: form.benefits,
          interviewProcess: form.interviewProcess,
          hiringPolicy: form.publicInstructions,
          publicInstructions: form.publicInstructions,
          headcount: form.headcount,
          hiringTimeline: form.hiringTimeline,
          urgencyLevel: form.urgencyLevel,
          contractType: form.contractType,
          workMode: form.workMode,
          companyInfo: form.companyInfo,
          projectTeamInfo: form.projectTeamInfo,
        });
        toast.success(f.toastCreateSuccess || "Đã tạo công việc mới");
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto pt-20 pb-20">
      <Card className="w-full max-w-2xl shadow-2xl border border-[color:var(--line)]">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[color:var(--brand-strong)]" />
            {isEdit ? (f.editTitle || "Chỉnh sửa công việc") : f.title}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
            {!isEdit && (onImportJdBackground || onImportJdFromFileBackground) ? (
              <div className="rounded-2xl border border-[color:var(--brand)]/30 bg-gradient-to-br from-[color:var(--brand-soft)]/50 to-transparent p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[color:var(--brand-soft)] flex items-center justify-center text-[color:var(--brand-strong)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="min-w-0 self-center text-sm font-semibold text-[color:var(--foreground-strong)]">
                    {f.jdImportHeading}
                  </p>
                </div>

                {onImportJdBackground ? (
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      className="h-9 flex-1 min-w-0 text-xs bg-[color:var(--surface)] border-[color:var(--line)]"
                      placeholder={f.jdImportUrlPlaceholder}
                      value={jdImportUrl}
                      onChange={(e) => setJdImportUrl(e.target.value)}
                      disabled={pending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleImportJd();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 shrink-0 text-xs gap-1.5 bg-[color:var(--brand-strong)] text-white"
                      disabled={pending || !jdImportUrl.trim()}
                      onClick={handleImportJd}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {f.jdImportCta}
                    </Button>
                  </div>
                ) : null}

                {onImportJdBackground && onImportJdFromFileBackground ? (
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-[color:var(--line)]" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--muted)]">
                      {f.jdImportOr}
                    </span>
                    <span className="h-px flex-1 bg-[color:var(--line)]" />
                  </div>
                ) : null}

                {onImportJdFromFileBackground ? (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={f.jdImportFileCta}
                    onClick={() => jdFileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        jdFileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!jdFileDragOver) setJdFileDragOver(true);
                    }}
                    onDragLeave={() => setJdFileDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setJdFileDragOver(false);
                      const file = e.dataTransfer.files?.[0] ?? null;
                      handleImportJdFile(file);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors px-4 py-7 text-center",
                      jdFileDragOver
                        ? "border-[color:var(--brand-strong)] bg-[color:var(--brand-soft)]/50 text-[color:var(--brand-strong)]"
                        : "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground-muted)] hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-soft)]/20 hover:text-[color:var(--brand-strong)]",
                    )}
                  >
                    <Upload className="h-7 w-7 shrink-0" aria-hidden />
                    <span className="text-sm font-medium text-[color:var(--foreground-strong)]">
                      {f.jdImportFileTitle}
                    </span>
                    <span className="text-xs text-[color:var(--muted)]">{f.jdImportFileHint}</span>
                    <input
                      ref={jdFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      disabled={pending}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        handleImportJdFile(file);
                        if (jdFileInputRef.current) jdFileInputRef.current.value = "";
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="job-title">{f.fieldTitle} *</Label>
              <Input
                id="job-title"
                placeholder={f.placeholderTitle}
                value={form.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                required
              />
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="job-status">{f.fieldStatus || "Trạng thái vị trí"}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["OPEN", "ACTIVE", "CLOSED"].map((s) => {
                    const statusLabel =
                      s === "OPEN" ? messages.jobPositions.status.open :
                      s === "ACTIVE" ? messages.jobPositions.status.active :
                      messages.jobPositions.status.closed;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, status: s }))}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                          form.status === s
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : "bg-white border-[color:var(--line)] text-[color:var(--muted)] hover:border-blue-400"
                        )}
                      >
                        {statusLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="job-headcount">{f.headcount || "Số lượng cần tuyển"}</Label>
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
                <Label htmlFor="job-urgency">{f.urgency || "Mức độ cần thiết"}</Label>
                <select
                  id="job-urgency"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.urgencyLevel}
                  onChange={(e) => setForm((p) => ({ ...p, urgencyLevel: e.target.value }))}
                >
                  <option value="NORMAL">{f.urgencyOptions?.NORMAL || "Bình thường"}</option>
                  <option value="URGENT">{f.urgencyOptions?.URGENT || "Cần gấp (Urgent)"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="job-contract">{f.contract || "Loại hợp đồng"}</Label>
                <select
                  id="job-contract"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={form.contractType}
                  onChange={(e) => setForm((p) => ({ ...p, contractType: e.target.value }))}
                >
                  <option value="FULL_TIME">{f.contractOptions?.FULL_TIME || "Toàn thời gian"}</option>
                  <option value="PART_TIME">{f.contractOptions?.PART_TIME || "Bán thời gian"}</option>
                  <option value="CONTRACT">{f.contractOptions?.CONTRACT || "Hợp đồng"}</option>
                  <option value="INTERN">{f.contractOptions?.INTERN || "Thực tập"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job-work-mode">{f.workMode || "Hình thức"}</Label>
                <select
                  id="job-work-mode"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={form.workMode}
                  onChange={(e) => setForm((p) => ({ ...p, workMode: e.target.value }))}
                >
                  <option value="ONSITE">{f.workModeOptions?.ONSITE || "Tại văn phòng"}</option>
                  <option value="HYBRID">{f.workModeOptions?.HYBRID || "Linh hoạt (Hybrid)"}</option>
                  <option value="REMOTE">{f.workModeOptions?.REMOTE || "Từ xa (Remote)"}</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-desc">{f.description}</Label>
              <Textarea
                id="job-desc"
                rows={3}
                placeholder={f.placeholderDesc}
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-req">{f.requirements}</Label>
              <Textarea
                id="job-req"
                rows={2}
                placeholder={f.placeholderReq}
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
                {showAdvanced ? (f.hideAdvanced || "Ẩn bớt thông tin mở rộng") : (f.showAdvanced || "Thêm thông tin cho AI (Lương, Chế độ...)")}
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 pt-2 pb-2 border-t border-[color:var(--line)]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="job-salary">{f.salaryRange || "Mức lương (Salary Range)"}</Label>
                    <Input
                      id="job-salary"
                      placeholder={f.salaryPlaceholder || "VD: 15-20M, Negotiable..."}
                      value={form.salaryRange}
                      onChange={(e) => setForm((p) => ({ ...p, salaryRange: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="job-timeline">{f.hiringTimeline || "Thời gian tuyển dụng"}</Label>
                    <Input
                      id="job-timeline"
                      placeholder={f.timelinePlaceholder || "VD: Tháng 5-6/2026"}
                      value={form.hiringTimeline}
                      onChange={(e) => setForm((p) => ({ ...p, hiringTimeline: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-benefits">{f.benefits || "Chế độ đãi ngộ (Benefits)"}</Label>
                  <Textarea
                    id="job-benefits"
                    rows={2}
                    placeholder={f.benefitsPlaceholder || "Bảo hiểm, thưởng lễ tết, du lịch..."}
                    value={form.benefits}
                    onChange={(e) => setForm((p) => ({ ...p, benefits: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="job-company-info">{f.companyInfo || "Thông tin công ty"}</Label>
                    <Textarea
                      id="job-company-info"
                      rows={2}
                      placeholder={f.companyInfoPlaceholder || "Quy mô, văn hóa công ty..."}
                      value={form.companyInfo}
                      onChange={(e) => setForm((p) => ({ ...p, companyInfo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="job-team-info">{f.teamInfo || "Thông tin Team/Dự án"}</Label>
                    <Textarea
                      id="job-team-info"
                      rows={2}
                      placeholder={f.teamInfoPlaceholder || "Công nghệ sử dụng, cấu trúc team..."}
                      value={form.projectTeamInfo}
                      onChange={(e) => setForm((p) => ({ ...p, projectTeamInfo: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-process">{f.interviewProcess || "Quy trình phỏng vấn"}</Label>
                  <Textarea
                    id="job-process"
                    rows={2}
                    placeholder={f.processPlaceholder || "VD: 2 vòng phỏng vấn (1 online, 1 offline)"}
                    value={form.interviewProcess}
                    onChange={(e) => setForm((p) => ({ ...p, interviewProcess: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-public-instructions">{f.publicInstructions || "Thông tin Public cho AI"}</Label>
                  <Textarea
                    id="job-public-instructions"
                    rows={3}
                    placeholder={f.instructionsPlaceholder || "Chỉ dẫn cho AI khi chat với ứng viên: 'Được phép tiết lộ mức lương tối đa 20M', 'Nhấn mạnh môi trường trẻ trung', v.v."}
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
              ) : isEdit ? (
                <RefreshCw className="h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {isEdit ? (f.savePosition || "Lưu vị trí") : messages.jobPositions.form.submit}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


export function JobManager({ jobs, messages, defaultLinkedInCompanyUrl }: JobManagerProps) {
  const STATUS_MAP: Record<string, { label: string; className: string }> = {
    OPEN:   { label: messages.jobPositions.status.open,    className: "border-blue-200 bg-blue-50 text-blue-700" },
    ACTIVE: { label: messages.jobPositions.status.active,  className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    CLOSED: { label: messages.jobPositions.status.closed,  className: "border-slate-200 bg-slate-50 text-slate-600" },
  };
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosition | null>(null);
  const [postingJob, setPostingJob] = useState<JobPosition | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteJob, setConfirmDeleteJob] = useState<JobPosition | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { tasks: backgroundTasks, runImportJdBackground, runImportJdFromFileBackground } = useRecruitmentBackgroundTasks(messages);

  function confirmDelete() {
    if (!confirmDeleteJob) return;
    const id = confirmDeleteJob.id;
    setDeletingId(id);
    setConfirmDeleteJob(null);
    startTransition(async () => {
      await deleteJobPosition(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <RecruitmentBackgroundTasksBanner tasks={backgroundTasks} />
      {showModal && (
        <JobFormModal
          onClose={() => setShowModal(false)}
          onSuccess={() => router.refresh()}
          messages={messages}
          defaultLinkedInCompanyUrl={defaultLinkedInCompanyUrl}
          onImportJdBackground={runImportJdBackground}
          onImportJdFromFileBackground={runImportJdFromFileBackground}
        />
      )}
      {editingJob && (
        <JobFormModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSuccess={() => router.refresh()}
          messages={messages}
          defaultLinkedInCompanyUrl={defaultLinkedInCompanyUrl}
        />
      )}
      {postingJob && (
        <PostJobModal
          job={postingJob}
          onClose={() => setPostingJob(null)}
          messages={messages}
          defaultLinkedInCompanyUrl={defaultLinkedInCompanyUrl}
        />
      )}

      <ConfirmationModal
        isOpen={Boolean(confirmDeleteJob)}
        onClose={() => setConfirmDeleteJob(null)}
        onConfirm={confirmDelete}
        title={messages.jobPositions.actions.deleteTitle}
        description={messages.jobPositions.actions.deleteConfirm}
        oldValue={confirmDeleteJob?.title}
        confirmText={messages.jobPositions.actions.deleteCta}
        cancelText={messages.jobPositions.actions.deleteCancel}
        variant="danger"
        isLoading={Boolean(deletingId)}
      />

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
          const postedOnLinkedIn = isJobPostedOnLinkedIn(job);
          const locale = messages.title.includes("Tuyển dụng") ? "vi-VN" : "en-US";
          return (
            <Card
              key={job.id}
              className="group relative border border-[color:var(--line)] bg-[color:var(--surface)] hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="h-10 w-10 rounded-xl bg-[color:var(--brand-soft)] flex items-center justify-center text-[color:var(--brand-strong)]">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn("capitalize text-[11px]", statusInfo.className)}
                    >
                      {statusInfo.label}
                    </Badge>
                    {postedOnLinkedIn ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] border-blue-200 bg-blue-50 text-blue-700 gap-1"
                      >
                        <LinkedInIcon className="h-3 w-3" />
                        {messages.jobPositions.status.postedBadge}
                      </Badge>
                    ) : null}
                  </div>
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
                ) : postedOnLinkedIn ? (
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] bg-[color:var(--surface-soft)] rounded-lg px-3 py-2">
                    <LinkedInIcon className="h-3.5 w-3.5 shrink-0 text-[#0A66C2]" />
                    <span>
                      {messages.jobPositions.linkedin.postedNoLink}
                      {job.linkedinPostedAt
                        ? ` · ${new Date(job.linkedinPostedAt).toLocaleDateString(locale)}`
                        : ""}
                    </span>
                  </div>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-3 hover:bg-accent transition-colors text-[color:var(--foreground)]"
                  onClick={() => setEditingJob(job)}
                >
                  Sửa
                </Button>
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
                  onClick={() => setConfirmDeleteJob(job)}
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
            value: jobs.filter((j) => isJobPostedOnLinkedIn(j)).length,
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
