"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getRecruitmentSettings } from "@/lib/actions/recruitment-settings-actions";
import { resolveLinkedInCompanyUrl } from "@/lib/recruitment/company-url";

export async function getJobPositions() {
  return await prisma.jobPosition.findMany({
    include: {
      _count: {
        select: { candidates: true, linkedinPosts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLinkedInPostsForJob(jobPositionId: string, limit = 5) {
  return await prisma.jobLinkedInPost.findMany({
    where: { jobPositionId },
    orderBy: { postedAt: "desc" },
    take: limit,
    select: {
      id: true,
      postUrl: true,
      title: true,
      target: true,
      companyUrl: true,
      hasImage: true,
      postedAt: true,
    },
  });
}

export async function createJobPosition(data: {
  title: string;
  description?: string;
  requirements?: string;
  companyUrl?: string;
  hiringPolicy?: string;
  interviewProcess?: string;
  salaryRange?: string;
  benefits?: string;
  companyInfo?: string;
  publicInstructions?: string;
  projectTeamInfo?: string;
  headcount?: number;
  hiringTimeline?: string;
  urgencyLevel?: string;
  contractType?: string;
  workMode?: string;
}) {
  const settings = await getRecruitmentSettings();
  const job = await prisma.jobPosition.create({
    data: {
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      companyUrl:
        data.companyUrl?.trim() ||
        resolveLinkedInCompanyUrl(settings?.linkedinCompanyUrl, null) ||
        null,
      status: "OPEN",
      hiringPolicy: data.hiringPolicy,
      interviewProcess: data.interviewProcess,
      salaryRange: data.salaryRange,
      benefits: data.benefits,
      companyInfo: data.companyInfo,
      publicInstructions: data.publicInstructions,
      projectTeamInfo: data.projectTeamInfo,
      headcount: data.headcount,
      hiringTimeline: data.hiringTimeline,
      urgencyLevel: data.urgencyLevel ?? "NORMAL",
      contractType: data.contractType,
      workMode: data.workMode,
    },
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return job;
}

export async function updateJobPosition(id: string, data: {
  title?: string;
  description?: string;
  linkedinPostCopy?: string;
  requirements?: string;
  status?: string;
  linkedinJobId?: string;
  linkedinJobUrl?: string;
  companyUrl?: string;
  hiringPolicy?: string;
  interviewProcess?: string;
  salaryRange?: string;
  benefits?: string;
  companyInfo?: string;
  publicInstructions?: string;
  projectTeamInfo?: string;
  headcount?: number;
  hiringTimeline?: string;
  urgencyLevel?: string;
  contractType?: string;
  workMode?: string;
}) {
  const job = await prisma.jobPosition.update({
    where: { id },
    data,
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return job;
}

export async function deleteJobPosition(id: string) {
  await prisma.jobPosition.delete({ where: { id } });
  revalidatePath("/[locale]/admin/recruitment", "page");
}

/** Lấy JD từ link public (HTML) rồi AI điền các trường vị trí. */
export async function importJobPositionFromPublicJdUrl(url: string) {
  const { normalizePublicJdUrl, fetchPublicJdContent } = await import(
    "@/lib/recruitment/jd-public-url-fetch"
  );
  const { importJobPositionDraftFromContent } = await import(
    "@/lib/recruitment/jd-public-url-import"
  );
  const { getWorkspaceLanguage } = await import("@/lib/recruitment/workspace-language");

  const normalized = normalizePublicJdUrl(url);
  if (!normalized.ok) {
    return { success: false as const, error: normalized.error };
  }

  const settings = await getRecruitmentSettings();
  const fetched = await fetchPublicJdContent(normalized.url);
  if (!fetched.ok) {
    return { success: false as const, error: fetched.error };
  }

  const locale = await getWorkspaceLanguage();
  const importRes = await importJobPositionDraftFromContent(
    fetched.result.content,
    normalized.url,
    locale,
  );
  if (!importRes.ok) {
    return {
      success: false as const,
      error: importRes.error,
    };
  }

  const draft = importRes.draft;

  // Tự động tạo và lưu Job Position ngầm vào cơ sở dữ liệu
  const job = await createJobPosition({
    title: draft.title,
    description: draft.description || undefined,
    requirements: draft.requirements || undefined,
    companyUrl: draft.companyUrl?.trim() || undefined,
    hiringPolicy: draft.hiringPolicy || undefined,
    interviewProcess: draft.interviewProcess || undefined,
    salaryRange: draft.salaryRange || undefined,
    benefits: draft.benefits || undefined,
    companyInfo: draft.companyInfo || undefined,
    publicInstructions: draft.hiringPolicy || undefined,
    projectTeamInfo: draft.projectTeamInfo || undefined,
    headcount: draft.headcount || undefined,
    hiringTimeline: draft.hiringTimeline || undefined,
    urgencyLevel: draft.urgencyLevel || undefined,
    contractType: draft.contractType || undefined,
    workMode: draft.workMode || undefined,
  });

  return {
    success: true as const,
    job,
    sourceUrl: normalized.url,
  };
}

/** Tạo job từ file JD (PDF/DOC/DOCX) — parse text → AI bóc tách → createJobPosition. */
export async function importJobPositionFromJdFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "Chưa chọn file JD." };
  }

  const { parseResumeToMarkdown, resumeExtFromFilename, CV_MAX_FILE_BYTES } = await import(
    "@/lib/recruitment/candidate-resume"
  );
  const { importJobPositionDraftFromContent } = await import(
    "@/lib/recruitment/jd-public-url-import"
  );
  const { getWorkspaceLanguage } = await import("@/lib/recruitment/workspace-language");

  if (!resumeExtFromFilename(file.name)) {
    return { success: false as const, error: "Chỉ hỗ trợ PDF, DOC hoặc DOCX." };
  }
  if (file.size > CV_MAX_FILE_BYTES) {
    return { success: false as const, error: "File tối đa 10MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseResumeToMarkdown(buffer, file.name);
  if (!parsed.ok) return { success: false as const, error: parsed.error };

  const locale = await getWorkspaceLanguage();
  const importRes = await importJobPositionDraftFromContent(
    parsed.markdown,
    `file://${file.name}`,
    locale,
  );
  if (!importRes.ok) {
    return { success: false as const, error: importRes.error };
  }

  const draft = importRes.draft;
  const job = await createJobPosition({
    title: draft.title,
    description: draft.description || undefined,
    requirements: draft.requirements || undefined,
    companyUrl: draft.companyUrl?.trim() || undefined,
    hiringPolicy: draft.hiringPolicy || undefined,
    interviewProcess: draft.interviewProcess || undefined,
    salaryRange: draft.salaryRange || undefined,
    benefits: draft.benefits || undefined,
    companyInfo: draft.companyInfo || undefined,
    publicInstructions: draft.hiringPolicy || undefined,
    projectTeamInfo: draft.projectTeamInfo || undefined,
    headcount: draft.headcount || undefined,
    hiringTimeline: draft.hiringTimeline || undefined,
    urgencyLevel: draft.urgencyLevel || undefined,
    contractType: draft.contractType || undefined,
    workMode: draft.workMode || undefined,
  });

  return {
    success: true as const,
    job,
    fileName: file.name,
  };
}

/** Đồng bộ trạng thái từ matchScore (giữ CONTACTED/INTERESTED/HIRED). */
export async function syncCandidateStatusesFromMatchScores(jobPositionId?: string) {
  const where = jobPositionId ? { jobPositionId } : {};
  const rows = await prisma.candidate.findMany({
    where,
    select: { id: true, status: true, matchScore: true, aiAnalysisSummary: true },
  });

  const { resolveCandidateStatusAfterScoring } = await import(
    "@/lib/recruitment/candidate-status"
  );
  const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");

  const { resolveCandidateDisplayMatchScore } = await import(
    "@/lib/recruitment/candidate-jd-evaluation"
  );

  let updated = 0;
  for (const row of rows) {
    const displayScore = resolveCandidateDisplayMatchScore(
      row.matchScore,
      row.aiAnalysisSummary,
    );
    const scoreForStatus = displayScore ?? row.matchScore;
    const next = resolveCandidateStatusAfterScoring(
      row.status,
      scoreForStatus,
      row.aiAnalysisSummary,
    );
    const patch: { status?: string; matchScore?: number } = {};
    if (next !== row.status) patch.status = next;
    if (displayScore != null && displayScore !== row.matchScore) {
      patch.matchScore = displayScore;
    }
    if (Object.keys(patch).length > 0) {
      await prisma.candidate.update({
        where: { id: row.id },
        data: patch,
      });
      updated++;
    }
  }

  if (updated > 0) revalidateCandidatesPage();
  return { updated, total: rows.length };
}

export async function getCandidates(jobPositionId?: string, page = 1, pageSize = 20) {
  const where = jobPositionId ? { jobPositionId } : {};
  const skip = (page - 1) * pageSize;

  // Lấy ID theo thứ tự: tin nhắn LinkedIn mới nhất lên trước
  const jobFilter = jobPositionId
    ? Prisma.sql`WHERE c.jobPositionId = ${jobPositionId}`
    : Prisma.empty;

  const [orderedRows, total, totalAll] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT c.id FROM Candidate c
      LEFT JOIN (
        SELECT conv.candidateId, MAX(msg.createdAt) AS lastMsgAt
        FROM Conversation conv
        LEFT JOIN ConversationMessage msg ON msg.conversationId = conv.id
        WHERE conv.provider = 'LINKEDIN'
        GROUP BY conv.candidateId
      ) lm ON lm.candidateId = c.id
      ${jobFilter}
      ORDER BY lm.lastMsgAt IS NULL ASC, lm.lastMsgAt DESC, c.updatedAt DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `),
    prisma.candidate.count({ where }),
    jobPositionId ? prisma.candidate.count() : Promise.resolve(0),
  ]);

  const ids = orderedRows.map((r) => r.id);

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: ids } },
    include: {
      jobPosition: { select: { id: true, title: true, description: true } },
      conversations: {
        where: { provider: "LINKEDIN" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, direction: true },
          },
        },
      },
    },
  });

  // Giữ đúng thứ tự từ raw SQL
  const order = new Map(ids.map((id, i) => [id, i]));
  const data = [...candidates].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return {
    data,
    total,
    totalAll: jobPositionId ? totalAll : total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createCandidate(data: {
  name: string;
  headline?: string;
  profileUrl?: string;
  email?: string;
  phone?: string;
  jobPositionId?: string;
  extractedInfo?: string;
  chatInfo?: string;
  conversationHistory?: string;
  strengths?: string;
  personalInfo?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  availability?: string;
  currentSalary?: string;
  expectedSalary?: string;
  aiAnalysisSummary?: string;
}) {
  const candidate = await prisma.candidate.create({
    data: {
      name: data.name,
      headline: data.headline,
      profileUrl: data.profileUrl,
      email: data.email,
      phone: data.phone,
      jobPositionId: data.jobPositionId,
      status: "POTENTIAL",
      extractedInfo: data.extractedInfo,
      chatInfo: data.chatInfo,
      conversationHistory: data.conversationHistory,
      strengths: data.strengths,
      personalInfo: data.personalInfo,
      githubUrl: data.githubUrl,
      portfolioUrl: data.portfolioUrl,
      currentCompany: data.currentCompany,
      availability: data.availability,
      currentSalary: data.currentSalary,
      expectedSalary: data.expectedSalary,
      aiAnalysisSummary: data.aiAnalysisSummary,
    },
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return candidate;
}

export async function updateCandidateStatus(id: string, status: string) {
  const candidate = await prisma.candidate.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return candidate;
}

/** Gắn ứng viên với vị trí tuyển dụng (để chấm JD / soạn tin theo job). */
export async function assignCandidateJobPosition(
  candidateId: string,
  jobPositionId: string,
) {
  const jobId = jobPositionId?.trim();
  if (!jobId) {
    return { success: false as const, error: "Chọn vị trí tuyển dụng." };
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    return { success: false as const, error: "Không tìm thấy ứng viên." };
  }

  const job = await prisma.jobPosition.findUnique({
    where: { id: jobId },
    select: { id: true, title: true },
  });
  if (!job) {
    return { success: false as const, error: "Không tìm thấy vị trí tuyển dụng." };
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { jobPositionId: jobId },
  });

  const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");
  revalidateCandidatesPage();
  revalidatePath("/[locale]/admin/recruitment", "page");
  return { success: true as const, jobTitle: job.title };
}

/** Gắn nhiều ứng viên với một vị trí (phạm vi «Mọi vị trí»). */
export async function batchAssignCandidatesToJob(
  candidateIds: string[],
  jobPositionId: string,
): Promise<{
  success: boolean;
  assigned: number;
  failed: number;
  jobTitle?: string;
  errors: string[];
}> {
  const jobId = jobPositionId?.trim();
  if (!jobId) {
    return { success: false, assigned: 0, failed: 0, errors: ["Chọn vị trí tuyển dụng."] };
  }

  const job = await prisma.jobPosition.findUnique({
    where: { id: jobId },
    select: { id: true, title: true },
  });
  if (!job) {
    return { success: false, assigned: 0, failed: 0, errors: ["Không tìm thấy vị trí tuyển dụng."] };
  }

  const ids = [...new Set(candidateIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { success: false, assigned: 0, failed: 0, errors: ["Chọn ít nhất một ứng viên."] };
  }

  let assigned = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const row = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!row) {
      failed++;
      errors.push(`${id}: không tìm thấy`);
      continue;
    }
    try {
      await prisma.candidate.update({
        where: { id },
        data: { jobPositionId: jobId },
      });
      assigned++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${row.name}: ${msg}`);
    }
  }

  if (assigned > 0) {
    const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");
    revalidateCandidatesPage();
    revalidatePath("/[locale]/admin/recruitment", "page");
  }

  return {
    success: assigned > 0,
    assigned,
    failed,
    jobTitle: job.title,
    errors,
  };
}

export async function deleteCandidate(id: string) {
  const { deleteCandidateRecord } = await import("@/lib/recruitment/candidate-delete");
  const result = await deleteCandidateRecord(id);
  if (!result.success) return result;

  const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");
  revalidateCandidatesPage();
  return result;
}

export async function upsertCandidateFromLinkedIn(data: {
  name: string;
  headline?: string;
  profileUrl: string;
  jobPositionId?: string;
  workspaceId?: string;
  extractedInfo?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
}) {
  const { upsertCandidateRecord } = await import("@/lib/recruitment/candidate-persistence");
  const candidate = await upsertCandidateRecord({
    ...data,
    source: "MANUAL",
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return candidate;
}

export async function getCandidateDetail(id: string) {
  return prisma.candidate.findUnique({
    where: { id },
    include: { jobPosition: { select: { id: true, title: true, description: true } } },
  });
}

export type SearchCandidateSaveItem = {
  name: string;
  headline?: string;
  profile_url: string;
  profile_id_url?: string | null;
  location?: string;
  matchScore?: number | null;
  matchSummary?: string | null;
};

/** Bước 1: lưu ngay thông tin cơ bản từ kết quả tìm kiếm (không CDP). */
export async function saveOneSearchCandidateBasic(
  item: SearchCandidateSaveItem,
  jobPositionId?: string,
): Promise<{
  success: boolean;
  name: string;
  profileUrl?: string;
  candidateId?: string;
  error?: string;
}> {
  const name = item.name?.trim() || "Ứng viên";
  if (!item.profile_url?.includes("/in/")) {
    return { success: false, name, error: "Link LinkedIn không hợp lệ." };
  }

  try {
    const { upsertCandidateRecord, revalidateCandidatesPage } = await import(
      "@/lib/recruitment/candidate-persistence"
    );
    const { buildSaveInputFromSearchHit } = await import("@/lib/recruitment/candidate-profile");
    const saved = await upsertCandidateRecord(buildSaveInputFromSearchHit(item, jobPositionId));
    revalidateCandidatesPage();
    return {
      success: true,
      name: saved.name,
      profileUrl: saved.profileUrl ?? undefined,
      candidateId: saved.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    console.error("[saveOneSearchCandidateBasic]", name, err);
    return { success: false, name, error: message };
  }
}

/** Bước 2: scrape profile LinkedIn (CDP) và merge cập nhật — không xóa dữ liệu cũ. */
export async function enrichCandidateLinkedInByProfileUrl(
  profileUrl: string,
): Promise<{ success: boolean; error?: string }> {
  if (!profileUrl.includes("/in/")) {
    return { success: false, error: "Link LinkedIn không hợp lệ." };
  }

  const normalized = profileUrl.split("?")[0];
  const candidate = await prisma.candidate.findFirst({
    where: { OR: [{ profileUrl: normalized }, { linkedinProfileIdUrl: normalized }] },
  });
  if (!candidate) {
    return { success: false, error: "Chưa có ứng viên trong danh sách." };
  }

  const { fetchLinkedInProfileByUrl } = await import("@/lib/recruitment/actions");
  const { upsertCandidateRecord, revalidateCandidatesPage } = await import(
    "@/lib/recruitment/candidate-persistence"
  );
  const { candidateRowToSaveInput, mergeProfileIntoSaveInput } = await import(
    "@/lib/recruitment/candidate-profile"
  );

  const profile = await fetchLinkedInProfileByUrl(normalized);
  if (!profile?.success) {
    return {
      success: false,
      error: profile?.error ?? "Không lấy được profile LinkedIn.",
    };
  }

  const base = candidateRowToSaveInput({
    ...candidate,
    profileUrl: normalized,
  });
  await upsertCandidateRecord(
    mergeProfileIntoSaveInput(base, profile, candidate.extractedInfo),
  );
  revalidateCandidatesPage();
  return { success: true };
}

/** Thêm ứng viên đã biết qua URL profile LinkedIn (không cần tìm kiếm, hỗ trợ chế độ độc lập không gắn Job). */
export async function addCandidateByLinkedInProfileUrl(
  profileUrlInput: string,
  jobPositionId?: string | null,
): Promise<{
  success: boolean;
  name: string;
  profileUrl?: string;
  candidateId?: string;
  updated?: boolean;
  error?: string;
}> {
  const raw = profileUrlInput.trim();
  if (!raw) {
    return { success: false, name: "", error: "Nhập URL profile LinkedIn." };
  }

  const { normalizeLinkedInProfileUrl, guessNameFromLinkedInUrl, isValidLinkedInProfileInput } =
    await import("@/lib/recruitment/candidate-profile-key");

  if (!isValidLinkedInProfileInput(raw)) {
    return {
      success: false,
      name: "",
      error: "URL không hợp lệ. Ví dụ: https://www.linkedin.com/in/ten-slug",
    };
  }

  const normalized = normalizeLinkedInProfileUrl(raw);
  const jobId = jobPositionId?.trim() || undefined;

  // Chỉ kiểm tra sự tồn tại của vị trí tuyển dụng nếu có truyền vào jobId
  if (jobId) {
    const job = await prisma.jobPosition.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) {
      return { success: false, name: "", error: "Không tìm thấy vị trí tuyển dụng." };
    }
  }

  const existing = await prisma.candidate.findUnique({
    where: { profileUrl: normalized },
    select: { id: true, name: true },
  });

  const item: SearchCandidateSaveItem = {
    name: existing?.name?.trim() || guessNameFromLinkedInUrl(normalized),
    profile_url: normalized,
  };

  // Lưu thông tin cơ bản và đồng bộ chi tiết hồ sơ
  const saved = await saveOneSearchCandidate(item, jobId);
  if (!saved.success) {
    return { success: false, name: item.name, error: saved.error };
  }

  const row = await prisma.candidate.findUnique({
    where: { profileUrl: normalized },
    select: { id: true, name: true, profileUrl: true },
  });

  return {
    success: true,
    name: row?.name ?? item.name,
    profileUrl: row?.profileUrl ?? normalized,
    candidateId: row?.id,
    updated: Boolean(existing),
  };
}

async function findCandidateUsingLinkedInProfileUrl(
  profileUrl: string,
  excludedCandidateId?: string,
) {
  const { profileUrlStorageKey } = await import("@/lib/recruitment/candidate-profile-key");
  const incomingKey = profileUrlStorageKey(profileUrl);
  if (!incomingKey) return null;

  const rows = await prisma.candidate.findMany({
    where: {
      ...(excludedCandidateId ? { id: { not: excludedCandidateId } } : {}),
      OR: [
        { profileUrl: { contains: "/in/" } },
        { linkedinProfileIdUrl: { contains: "/in/" } },
      ],
    },
    select: { id: true, name: true, profileUrl: true, linkedinProfileIdUrl: true },
  });

  return (
    rows.find(
      (row) =>
        profileUrlStorageKey(row.profileUrl ?? "") === incomingKey ||
        profileUrlStorageKey(row.linkedinProfileIdUrl ?? "") === incomingKey,
    ) ?? null
  );
}

/** Tạo ứng viên trực tiếp từ CV, không bắt buộc LinkedIn. */
export async function createCandidateFromCvUpload(
  formData: FormData,
  jobPositionId?: string | null,
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "Chưa chọn file CV." };
  }

  const {
    CV_MAX_FILE_BYTES,
    parseResumeToMarkdown,
    resumeExtFromFilename,
    saveCandidateResumeUpload,
    deleteCandidateResumeFile,
  } = await import("@/lib/recruitment/candidate-resume");
  if (!resumeExtFromFilename(file.name)) {
    return { success: false as const, error: "Chỉ hỗ trợ PDF, DOC hoặc DOCX." };
  }
  if (file.size > CV_MAX_FILE_BYTES) {
    return { success: false as const, error: "CV tối đa 10MB." };
  }

  const jobId = jobPositionId?.trim() || null;
  if (jobId) {
    const job = await prisma.jobPosition.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) return { success: false as const, error: "Không tìm thấy vị trí tuyển dụng." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseResumeToMarkdown(buffer, file.name);
  if (!parsed.ok) return { success: false as const, error: parsed.error };

  const { buildCandidateCvImportMetadata } = await import(
    "@/lib/recruitment/candidate-cv-import"
  );
  const { name } = buildCandidateCvImportMetadata(parsed.markdown, file.name);
  const candidate = await prisma.candidate.create({
    data: {
      name,
      jobPositionId: jobId,
      source: "RESUME",
      status: "POTENTIAL",
    },
  });

  const saved = await saveCandidateResumeUpload(candidate.id, file, name, parsed.markdown);
  if (!saved.ok) {
    await prisma.candidate.delete({ where: { id: candidate.id } });
    return { success: false as const, error: saved.error };
  }

  try {
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { cvText: saved.cvText, cvFileUrl: saved.cvFileUrl },
    });
  } catch (error) {
    deleteCandidateResumeFile(saved.cvFileUrl);
    await prisma.candidate.delete({ where: { id: candidate.id } }).catch(() => undefined);
    console.error("[createCandidateFromCvUpload]", error);
    return { success: false as const, error: "Không lưu được ứng viên từ CV." };
  }

  const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");
  revalidateCandidatesPage();
  return {
    success: true as const,
    candidateId: candidate.id,
    name,
  };
}

/** Gắn URL LinkedIn cho candidate CV-only sau khi xác minh profile tồn tại qua CDP. */
export async function attachCandidateLinkedInProfile(
  candidateId: string,
  profileUrlInput: string,
) {
  const id = candidateId?.trim();
  const raw = profileUrlInput.trim();
  if (!id) return { success: false as const, error: "Không tìm thấy ứng viên." };
  if (!raw) return { success: false as const, error: "Nhập URL profile LinkedIn." };

  const {
    buildVerifiedLinkedInProfileIdentity,
    isValidLinkedInProfileInput,
    normalizeLinkedInProfileUrl,
  } = await import(
    "@/lib/recruitment/candidate-profile-key"
  );
  if (!isValidLinkedInProfileInput(raw)) {
    return {
      success: false as const,
      error: "URL không hợp lệ. Ví dụ: https://www.linkedin.com/in/ten-slug",
    };
  }
  const normalized = normalizeLinkedInProfileUrl(raw);
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!candidate) return { success: false as const, error: "Không tìm thấy ứng viên." };

  const inputDuplicate = await findCandidateUsingLinkedInProfileUrl(normalized, id);
  if (inputDuplicate) {
    return {
      success: false as const,
      error: `Profile LinkedIn đã gắn với ứng viên ${inputDuplicate.name}.`,
    };
  }

  const { fetchLinkedInProfileByUrl } = await import("@/lib/recruitment/actions");
  const verifiedProfile = await fetchLinkedInProfileByUrl(normalized);
  if (!verifiedProfile) {
    return {
      success: false as const,
      error: "Không xác minh được profile LinkedIn. Kiểm tra URL và phiên LinkedIn rồi thử lại.",
    };
  }

  const verified = buildVerifiedLinkedInProfileIdentity(normalized, verifiedProfile);
  const identities = [verified.profileUrl, verified.linkedinProfileIdUrl].filter(
    (url): url is string => Boolean(url),
  );
  for (const identity of identities) {
    const duplicate = await findCandidateUsingLinkedInProfileUrl(identity, id);
    if (duplicate) {
      return {
        success: false as const,
        error: `Profile LinkedIn đã gắn với ứng viên ${duplicate.name}.`,
      };
    }
  }

  try {
    await prisma.candidate.update({
      where: { id },
      data: {
        profileUrl: verified.profileUrl,
        linkedinProfileIdUrl: verified.linkedinProfileIdUrl,
      },
    });
  } catch (error) {
    console.error("[attachCandidateLinkedInProfile]", error);
    return { success: false as const, error: "Không gắn được profile LinkedIn." };
  }

  const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");
  revalidateCandidatesPage();
  return { success: true as const, profileUrl: verified.profileUrl };
}

/** Lưu cơ bản + enrich (dùng khi lưu từng người). */
export async function saveOneSearchCandidate(
  item: SearchCandidateSaveItem,
  jobPositionId?: string,
): Promise<{ success: boolean; name: string; error?: string }> {
  const basic = await saveOneSearchCandidateBasic(item, jobPositionId);
  if (!basic.success || !basic.profileUrl) {
    return { success: false, name: basic.name, error: basic.error };
  }

  const enrich = await enrichCandidateLinkedInByProfileUrl(basic.profileUrl);
  if (!enrich.success) {
    console.warn("[saveOneSearchCandidate] enrich:", enrich.error);
    return { success: true, name: basic.name };
  }
  return { success: true, name: basic.name };
}

/** Lưu hàng loạt (tuần tự) — dùng khi cần gọi một lần từ API/script. */
export async function saveSelectedCandidates(
  items: SearchCandidateSaveItem[],
  jobPositionId?: string,
) {
  let saved = 0;
  for (const item of items) {
    const res = await saveOneSearchCandidate(item, jobPositionId);
    if (res.success) saved++;
  }
  return { success: true, saved };
}

/** Chỉ lấy lại profile LinkedIn (CDP) — không gọi AI. */
export async function refreshCandidateLinkedInProfile(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  const { isLinkedInProfileUrl } = await import("@/lib/recruitment/candidate-types");
  const targetUrl = isLinkedInProfileUrl(candidate?.profileUrl)
    ? candidate!.profileUrl!
    : isLinkedInProfileUrl(candidate?.linkedinProfileIdUrl)
      ? candidate!.linkedinProfileIdUrl!
      : null;
  if (!targetUrl) {
    console.error(`[refreshProfile] Ứng viên ${candidateId} không có link LinkedIn — bỏ qua`);
    return { success: false, error: "Ứng viên chưa có link LinkedIn." };
  }

  console.error(`[refreshProfile] "${candidate!.name}" (${candidateId}) — target: ${targetUrl}`);

  const { fetchLinkedInProfileByUrl } = await import("@/lib/recruitment/actions");
  const { upsertCandidateRecord, revalidateCandidatesPage } = await import(
    "@/lib/recruitment/candidate-persistence"
  );
  const { candidateRowToSaveInput, mergeProfileIntoSaveInput } = await import(
    "@/lib/recruitment/candidate-profile"
  );

  const profile = await fetchLinkedInProfileByUrl(targetUrl);
  if (!profile) {
    console.error(`[refreshProfile] Thất bại — gateway không trả về profile`);
    return { success: false, error: "Không lấy được profile LinkedIn." };
  }

  const base = candidateRowToSaveInput(candidate!);
  const merged = mergeProfileIntoSaveInput(base, profile, candidate!.extractedInfo);
  await upsertCandidateRecord(merged);

  // Đảm bảo đúng candidate này nhận được profileUrl (upsertCandidateRecord có thể tìm nhầm candidate khác qua URL)
  if (merged.profileUrl?.includes("/in/")) {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        profileUrl: merged.profileUrl,
        ...(merged.linkedinProfileIdUrl ? { linkedinProfileIdUrl: merged.linkedinProfileIdUrl } : {}),
      },
    }).catch(() => { }); // bỏ qua nếu unique conflict với candidate khác
  }

  revalidateCandidatesPage();
  console.error(`[refreshProfile] OK — profileUrl="${merged.profileUrl}", idUrl="${merged.linkedinProfileIdUrl ?? "N/A"}"`);
  return { success: true };
}

/** Chấm điểm khớp JD bằng AI — giữ profile hiện tại. */
export async function rescoreCandidateWithAi(
  candidateId: string,
  jobPositionIdOverride?: string,
  uiLocale?: string,
) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    return { success: false, error: "Không tìm thấy ứng viên." };
  }

  const { canScoreCandidateWithJd, jdScoringMissingProfileMessage } = await import(
    "@/lib/recruitment/candidate-jd-eligibility"
  );
  if (
    !canScoreCandidateWithJd({
      extractedInfo: candidate.extractedInfo,
      cvText: candidate.cvText,
      cvFileUrl: candidate.cvFileUrl,
      profileUrl: candidate.profileUrl,
    })
  ) {
    return { success: false, error: jdScoringMissingProfileMessage() };
  }

  const jobPositionId =
    candidate.jobPositionId ?? (jobPositionIdOverride?.trim() || undefined);
  if (!jobPositionId) {
    return {
      success: false,
      error: "Chọn vị trí tuyển dụng (filter job) hoặc gắn ứng viên với job trước khi phân tích AI.",
    };
  }

  const job = await prisma.jobPosition.findUnique({ where: { id: jobPositionId } });
  if (!job) {
    return { success: false, error: "Không tìm thấy vị trí tuyển dụng." };
  }

  const { evaluateCandidateAgainstJob, serializeCandidateJdEvaluation } = await import(
    "@/lib/recruitment/candidate-jd-evaluation"
  );
  const { getWorkspaceLanguage } = await import("@/lib/recruitment/workspace-language");
  const { upsertCandidateRecord, revalidateCandidatesPage } = await import(
    "@/lib/recruitment/candidate-persistence"
  );
  const { candidateRowToSaveInput, parseLabelsJson } = await import(
    "@/lib/recruitment/candidate-profile"
  );

  const workspaceLocale = await getWorkspaceLanguage();
  const evaluation = await evaluateCandidateAgainstJob(job, candidate, (uiLocale as any) || workspaceLocale);

  if (!evaluation) {
    return { success: false, error: "Không nhận được đánh giá AI. Thử lại sau." };
  }

  const base = candidateRowToSaveInput(candidate);
  await upsertCandidateRecord({
    ...base,
    profileUrl: candidate.profileUrl ?? "",
    jobPositionId: jobPositionId,
    matchScore: evaluation.overallScore,
    matchSummary: evaluation.conclusion.slice(0, 600),
    aiAnalysisSummary: serializeCandidateJdEvaluation(evaluation),
    labels: candidate.labels ? parseLabelsJson(candidate.labels) : undefined,
  });

  revalidateCandidatesPage();
  return { success: true, evaluation };
}

export async function updateCandidateHrInfo(
  candidateId: string,
  payload: { notes: string; email: string; phone: string },
) {
  const id = candidateId?.trim();
  if (!id) {
    return { success: false as const, error: "Không tìm thấy ứng viên." };
  }

  const email = payload.email.trim();
  const phone = payload.phone.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false as const, error: "Email không hợp lệ." };
  }

  try {
    await prisma.candidate.update({
      where: { id },
      data: {
        recruiterNotes: payload.notes.trim() || null,
        email: email || null,
        phone: phone || null,
      },
    });
  } catch (e) {
    console.error("[updateCandidateHrInfo]", e);
    return { success: false as const, error: "Không lưu được thông tin HR. Thử lại sau." };
  }
  const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");
  revalidateCandidatesPage();
  revalidatePath("/[locale]/admin/recruitment", "page");
  return { success: true as const };
}

export async function uploadCandidateResume(candidateId: string, formData: FormData) {
  const id = candidateId?.trim();
  if (!id) return { success: false as const, error: "Không tìm thấy ứng viên." };

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { id: true, name: true, cvFileUrl: true },
  });
  if (!candidate) return { success: false as const, error: "Không tìm thấy ứng viên." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "Chưa chọn file CV." };
  }

  const { saveCandidateResumeUpload, deleteCandidateResumeFile } = await import(
    "@/lib/recruitment/candidate-resume"
  );
  const saved = await saveCandidateResumeUpload(id, file, candidate.name);
  if (!saved.ok) return { success: false as const, error: saved.error };

  if (candidate.cvFileUrl && candidate.cvFileUrl !== saved.cvFileUrl) {
    deleteCandidateResumeFile(candidate.cvFileUrl);
  }

  await prisma.candidate.update({
    where: { id },
    data: { cvText: saved.cvText, cvFileUrl: saved.cvFileUrl },
  });

  const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");
  revalidateCandidatesPage();
  revalidatePath("/[locale]/admin/recruitment", "page");
  return {
    success: true as const,
    cvText: saved.cvText,
    cvFileName: saved.cvFileUrl.split("/").pop() ?? null,
  };
}

export async function removeCandidateResume(candidateId: string) {
  const id = candidateId?.trim();
  if (!id) return { success: false as const, error: "Không tìm thấy ứng viên." };

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { cvFileUrl: true },
  });
  if (!candidate) return { success: false as const, error: "Không tìm thấy ứng viên." };

  const { deleteCandidateResumeFile } = await import("@/lib/recruitment/candidate-resume");
  deleteCandidateResumeFile(candidate.cvFileUrl);

  await prisma.candidate.update({
    where: { id },
    data: { cvText: null, cvFileUrl: null },
  });

  const { revalidateCandidatesPage } = await import("@/lib/recruitment/candidate-persistence");
  revalidateCandidatesPage();
  revalidatePath("/[locale]/admin/recruitment", "page");
  return { success: true as const };
}

/** Đánh giá AI (JD) lần lượt cho nhiều ứng viên — gắn job nếu thiếu. */
export async function batchEvaluateCandidatesWithAi(
  candidateIds: string[],
  jobPositionId: string,
): Promise<{
  success: boolean;
  evaluated: number;
  failed: number;
  errors: string[];
}> {
  const jobId = jobPositionId?.trim();
  if (!jobId) {
    return { success: false, evaluated: 0, failed: 0, errors: ["Chọn vị trí tuyển dụng."] };
  }
  const ids = [...new Set(candidateIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { success: false, evaluated: 0, failed: 0, errors: ["Không có ứng viên nào."] };
  }

  let evaluated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const row = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, name: true, jobPositionId: true },
    });
    if (!row) {
      failed++;
      errors.push(`${id}: không tìm thấy`);
      continue;
    }
    if (!row.jobPositionId) {
      const assign = await assignCandidateJobPosition(id, jobId);
      if (!assign.success) {
        failed++;
        errors.push(`${row.name}: ${assign.error}`);
        continue;
      }
    }
    const res = await rescoreCandidateWithAi(id, jobId);
    if (res.success) {
      evaluated++;
    } else {
      failed++;
      errors.push(`${row.name}: ${res.error ?? "lỗi AI"}`);
    }
  }

  return {
    success: evaluated > 0,
    evaluated,
    failed,
    errors: errors.slice(0, 8),
  };
}

/** Lấy profile LinkedIn (CDP) hàng loạt — chỉ ứng viên có link /in/. */
export async function batchRefreshLinkedInProfiles(candidateIds: string[]): Promise<{
  success: boolean;
  refreshed: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const ids = [...new Set(candidateIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { success: false, refreshed: 0, failed: 0, skipped: 0, errors: ["Không có ứng viên nào."] };
  }

  console.error(`[batchRefresh] Bắt đầu — ${ids.length} ứng viên`);
  const { isLinkedInProfileUrl } = await import("@/lib/recruitment/candidate-types");

  let refreshed = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const row = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, name: true, profileUrl: true, linkedinProfileIdUrl: true },
    });
    if (!row) {
      failed++;
      errors.push(`${id}: không tìm thấy`);
      console.error(`[batchRefresh] [${i + 1}/${ids.length}] ${id} — không tìm thấy`);
      continue;
    }
    if (!isLinkedInProfileUrl(row.profileUrl) && !isLinkedInProfileUrl(row.linkedinProfileIdUrl)) {
      skipped++;
      console.error(`[batchRefresh] [${i + 1}/${ids.length}] "${row.name}" — bỏ qua (không có LinkedIn URL)`);
      continue;
    }
    console.error(`[batchRefresh] [${i + 1}/${ids.length}] "${row.name}" — đang lấy profile...`);
    const res = await refreshCandidateLinkedInProfile(id);
    if (res.success) {
      refreshed++;
    } else {
      failed++;
      errors.push(`${row.name}: ${res.error ?? "lỗi CDP"}`);
    }
  }

  console.error(`[batchRefresh] Kết quả: ${refreshed} OK, ${failed} lỗi, ${skipped} bỏ qua`);
  if (errors.length > 0) {
    console.error(`[batchRefresh] Lỗi:`, errors.slice(0, 8).join(" | "));
  }
  return {
    success: refreshed > 0,
    refreshed,
    failed,
    skipped,
    errors: errors.slice(0, 8),
  };
}

/** Làm mới profile + AI (tương đương gọi cả hai nút). */
export async function enrichCandidateFromLinkedIn(candidateId: string) {
  const profileRes = await refreshCandidateLinkedInProfile(candidateId);
  if (!profileRes.success) return profileRes;

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (candidate?.jobPositionId) {
    const aiRes = await rescoreCandidateWithAi(candidateId);
    if (!aiRes.success) return aiRes;
  }

  return { success: true };
}

// Thống kê tổng hợp cho trang overview
export async function getRecruitmentStats() {
  const [totalJobs, totalCandidates, newCandidates, contacted] = await Promise.all([
    prisma.jobPosition.count({ where: { status: { in: ["OPEN", "ACTIVE"] } } }),
    prisma.candidate.count(),
    prisma.candidate.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.candidate.count({ where: { status: "CONTACTED" } }),
  ]);

  return { totalJobs, totalCandidates, newCandidates, contactedToday: contacted };
}
