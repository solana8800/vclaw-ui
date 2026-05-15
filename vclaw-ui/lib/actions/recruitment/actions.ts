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

export async function createJobPosition(data: { title: string; description?: string; requirements?: string }) {
  const job = await prisma.jobPosition.create({
    data: {
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      status: "OPEN",
    },
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return job;
}

export async function getCandidates(jobPositionId?: string, page = 1, pageSize = 20) {
  const where = jobPositionId ? { jobPositionId } : {};
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.candidate.count({ where }),
  ]);

  return {
    data,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createCandidate(data: {
  name: string;
  headline?: string;
  profileUrl?: string;
  jobPositionId?: string;
}) {
  const candidate = await prisma.candidate.create({
    data: {
      name: data.name,
      headline: data.headline,
      profileUrl: data.profileUrl,
      jobPositionId: data.jobPositionId,
      status: "POTENTIAL",
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

export async function upsertCandidateFromLinkedIn(data: {
  name: string;
  headline?: string;
  profileUrl: string;
  jobPositionId?: string;
  workspaceId?: string;
}) {
  const candidate = await prisma.candidate.upsert({
    where: { profileUrl: data.profileUrl },
    update: {
      name: data.name,
      headline: data.headline,
      jobPositionId: data.jobPositionId || undefined,
      workspaceId: data.workspaceId || undefined,
    },
    create: {
      name: data.name,
      headline: data.headline,
      profileUrl: data.profileUrl,
      jobPositionId: data.jobPositionId,
      workspaceId: data.workspaceId,
      status: "POTENTIAL",
    },
  });
  revalidatePath("/[locale]/admin/recruitment", "page");
  return candidate;
}
