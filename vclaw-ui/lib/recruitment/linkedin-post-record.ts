import { prisma } from "@/lib/db";

/** Metadata bài đăng LinkedIn — không lưu nội dung bài. */
export type RecordLinkedInPostInput = {
  jobPositionId: string;
  postUrl?: string | null;
  title?: string | null;
  target?: "personal" | "company" | string | null;
  companyUrl?: string | null;
  hasImage?: boolean;
};

/** Ghi lịch sử đăng LinkedIn (metadata) và cập nhật JobPosition. */
export async function recordLinkedInPost(input: RecordLinkedInPostInput) {
  const now = new Date();
  const postUrl = input.postUrl?.trim() || null;
  const companyUrl = input.companyUrl?.trim() || null;

  const post = await prisma.jobLinkedInPost.create({
    data: {
      jobPositionId: input.jobPositionId,
      postUrl,
      title: input.title?.trim() || null,
      target: input.target?.trim() || null,
      companyUrl,
      hasImage: Boolean(input.hasImage),
      postedAt: now,
    },
  });

  await prisma.jobPosition.update({
    where: { id: input.jobPositionId },
    data: {
      linkedinPostedAt: now,
      status: "ACTIVE",
      ...(postUrl ? { linkedinJobUrl: postUrl } : {}),
      ...(companyUrl ? { companyUrl } : {}),
    },
  });

  return post;
}
