"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getJobPositions() {
  return await prisma.jobPosition.findMany({
    include: {
      _count: {
        select: { candidates: true },
      },
    },
    orderBy: { createdAt: "desc" },
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
}) {
  const job = await prisma.jobPosition.create({
    data: {
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      companyUrl: data.companyUrl ?? "https://www.linkedin.com/company/vclaw-ai",
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
    },
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return job;
}

export async function updateJobPosition(id: string, data: {
  title?: string;
  description?: string;
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

export async function getCandidates(jobPositionId?: string, page = 1, pageSize = 20) {
  const where = jobPositionId ? { jobPositionId } : {};
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        jobPosition: { select: { title: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.candidate.count({ where }),
  ])

  return {
    data,
    total,
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

export async function deleteCandidate(id: string) {
  await prisma.candidate.delete({ where: { id } });
  revalidatePath("/[locale]/admin/recruitment", "page");
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
  const candidate = await prisma.candidate.upsert({
    where: { profileUrl: data.profileUrl },
    update: {
      name: data.name,
      headline: data.headline,
      jobPositionId: data.jobPositionId || undefined,
      workspaceId: data.workspaceId || undefined,
      extractedInfo: data.extractedInfo,
      githubUrl: data.githubUrl,
      portfolioUrl: data.portfolioUrl,
      currentCompany: data.currentCompany,
    },
    create: {
      name: data.name,
      headline: data.headline ?? null,
      profileUrl: data.profileUrl,
      jobPositionId: data.jobPositionId,
      workspaceId: data.workspaceId,
      status: "POTENTIAL",
      extractedInfo: data.extractedInfo,
      githubUrl: data.githubUrl,
      portfolioUrl: data.portfolioUrl,
      currentCompany: data.currentCompany,
    },
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return candidate;
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
