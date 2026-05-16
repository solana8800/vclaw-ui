import { describe, expect, it } from "vitest";
import { isJobPostedOnLinkedIn } from "@/lib/recruitment/job-position";

describe("isJobPostedOnLinkedIn", () => {
  it("đếm khi có linkedinJobUrl (bài feed)", () => {
    expect(isJobPostedOnLinkedIn({ linkedinJobUrl: "https://www.linkedin.com/feed/update/1" })).toBe(
      true,
    );
  });

  it("đếm khi có linkedinJobId (job post cũ)", () => {
    expect(isJobPostedOnLinkedIn({ linkedinJobId: "123" })).toBe(true);
  });

  it("đếm khi có linkedinPostedAt", () => {
    expect(isJobPostedOnLinkedIn({ linkedinPostedAt: new Date("2026-05-16") })).toBe(true);
  });

  it("đếm khi có bản ghi lịch sử", () => {
    expect(isJobPostedOnLinkedIn({ _count: { linkedinPosts: 1 } })).toBe(true);
  });

  it("không đếm khi chưa đăng", () => {
    expect(isJobPostedOnLinkedIn({})).toBe(false);
  });
});
