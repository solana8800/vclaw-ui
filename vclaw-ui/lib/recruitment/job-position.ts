/** Vị trí đã có bài đăng LinkedIn (feed marketing, job post cũ, hoặc lịch sử đăng). */
export function isJobPostedOnLinkedIn(job: {
  linkedinJobId?: string | null;
  linkedinJobUrl?: string | null;
  linkedinPostedAt?: Date | string | null;
  _count?: { linkedinPosts?: number };
}): boolean {
  return Boolean(
    job.linkedinJobUrl?.trim() ||
      job.linkedinJobId?.trim() ||
      job.linkedinPostedAt ||
      (job._count?.linkedinPosts ?? 0) > 0,
  );
}
