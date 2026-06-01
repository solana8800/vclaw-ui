import { describe, expect, it } from "vitest";
import {
  buildCandidateDetailPdfDocument,
  buildCandidateDetailPdfFileName,
} from "@/lib/recruitment/candidate-detail-pdf-document";
import { countChatMessageDirections } from "@/lib/recruitment/candidate-detail-pdf-layout";

const copy = {
  title: "Chi tiết ứng viên",
  matchScore: "Độ khớp JD",
  jdMatchUnevaluated: "Chưa chấm",
  job: "Vị trí",
  updated: "Cập nhật",
  overviewTitle: "Tổng quan",
  profileSectionTitle: "Hồ sơ LinkedIn",
  noProfileData: "Chưa có dữ liệu",
  searchMatchSummary: "Tóm tắt tìm kiếm",
  about: "Giới thiệu",
  experiences: "Kinh nghiệm",
  education: "Học vấn",
  skills: "Kỹ năng",
  projects: "Dự án",
  languages: "Ngôn ngữ",
  recommendations: "Đề xuất",
  recruiterNotesTitle: "Ghi chú HR",
  contactEmailLabel: "Email",
  contactPhoneLabel: "SĐT",
  resumeTitle: "CV",
  resumeAttachedNote: "Có file CV đính kèm",
  aiEvaluationTitle: "Đánh giá JD",
  aiCriteria: "Tiêu chí",
  aiBonusCriterion: "bổ sung",
  aiStrengths: "Điểm mạnh",
  aiConcerns: "Lưu ý",
  aiConclusion: "Kết luận",
  chatTitle: "Tin nhắn LinkedIn",
  chatFromCandidate: "Ứng viên",
  chatFromMe: "Tôi",
  chatUnknownSender: "Không rõ",
  chatEmpty: "Trống",
  chatStats: "{total} tin · ứng viên {inbound} · recruiter {outbound}",
  labelsTitle: "Nhãn",
  pdfGeneratedAt: "Xuất lúc",
  connectionLabel: "Kết nối",
  sourceLabel: "Nguồn",
};

describe("buildCandidateDetailPdfFileName", () => {
  it("uses overview, name, job and vclaw without id", () => {
    expect(
      buildCandidateDetailPdfFileName("Nguyễn Văn An", "Backend Developer"),
    ).toBe("overview-nguyen-van-an-backend-developer-vclaw.pdf");
  });

  it("omits job segment when empty", () => {
    expect(buildCandidateDetailPdfFileName("Trần B", null)).toBe(
      "overview-tran-b-vclaw.pdf",
    );
  });
});

describe("countChatMessageDirections", () => {
  it("counts inbound and outbound", () => {
    expect(
      countChatMessageDirections([
        { id: "1", text: "a", sentAt: null, direction: "inbound" },
        { id: "2", text: "b", sentAt: null, direction: "outbound" },
      ]),
    ).toEqual({ total: 2, inbound: 1, outbound: 1, unknown: 0 });
  });
});

describe("buildCandidateDetailPdfDocument", () => {
  it("includes structured sections, JD evaluation and chat thread", () => {
    const doc = buildCandidateDetailPdfDocument({
      candidate: {
        id: "cand-xyz98765",
        name: "Trần B",
        headline: "Engineer",
        recruiterNotes: "PV tốt",
        email: "a@b.com",
        matchSummary: "Khớp stack",
        updatedAt: "2026-05-16T10:00:00.000Z",
        jobPosition: { id: "j1", title: "Backend Dev" },
        linkedinChatId: "chat-1",
      },
      profileInfo: {
        about: "About me",
        experiences: ["Co A — Dev"],
      },
      aiEvaluation: {
        version: 1,
        overallScore: 80,
        criteria: [{ key: "skills_fit", label: "Kỹ năng", score: 85, note: "OK" }],
        strengths: ["Node.js"],
        concerns: [],
        conclusion: "Nên phỏng vấn",
      },
      displayMatchScore: 80,
      hasJdEvaluation: true,
      labels: ["hot"],
      connectionLabel: "Đã kết nối",
      sourceLabel: "LinkedIn",
      locale: "vi",
      copy,
      hasChatContext: true,
      chatMessages: [
        {
          id: "m1",
          text: "Xin chào",
          sentAt: "2026-05-15T08:00:00.000Z",
          direction: "inbound",
        },
        {
          id: "m2",
          text: "Chào bạn",
          sentAt: "2026-05-15T09:00:00.000Z",
          direction: "outbound",
        },
      ],
    });

    const flat = JSON.stringify(doc);
    expect(flat).toContain("Trần B");
    expect(flat).toContain("TỔNG QUAN");
    expect(flat).toContain("Nên phỏng vấn");
    expect(flat).toContain("Xin chào");
    expect(flat).toContain("Chào bạn");
    expect(flat).toContain("2 tin");
    expect(flat).toContain("fillColor");
  });

  it("shows chat section when context exists even without messages", () => {
    const doc = buildCandidateDetailPdfDocument({
      candidate: {
        id: "c1",
        name: "A",
        updatedAt: new Date().toISOString(),
        source: "LINKEDIN_INBOX",
      },
      profileInfo: {},
      aiEvaluation: null,
      displayMatchScore: null,
      hasJdEvaluation: false,
      labels: [],
      connectionLabel: null,
      sourceLabel: "LinkedIn Inbox",
      locale: "vi",
      copy,
      hasChatContext: true,
      chatMessages: [],
    });
    expect(JSON.stringify(doc)).toContain("TIN NHẮN LINKEDIN");
    expect(JSON.stringify(doc)).toContain("Trống");
  });
});
