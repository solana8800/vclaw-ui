// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  deleteMany: vi.fn(),
  deleteCandidate: vi.fn(),
  transaction: vi.fn(),
  deleteCandidateResumeFile: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    candidate: {
      findUnique: mocks.findUnique,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/recruitment/candidate-resume", () => ({
  deleteCandidateResumeFile: mocks.deleteCandidateResumeFile,
}));

describe("deleteCandidateRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (run) => run({
      conversation: { deleteMany: mocks.deleteMany },
      candidate: { delete: mocks.deleteCandidate },
    }));
  });

  it("khong xoa khi candidate khong ton tai", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const { deleteCandidateRecord } = await import("./candidate-delete");
    const result = await deleteCandidateRecord("missing-id");

    expect(result).toEqual({
      success: false,
      error: "Không tìm thấy ứng viên.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.deleteCandidateResumeFile).not.toHaveBeenCalled();
  });

  it("xoa conversations, candidate va file CV theo dung thu tu", async () => {
    mocks.findUnique.mockResolvedValue({ cvFileUrl: "/tmp/candidate.pdf" });

    const { deleteCandidateRecord } = await import("./candidate-delete");
    const result = await deleteCandidateRecord(" candidate-id ");

    expect(result).toEqual({ success: true });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { candidateId: "candidate-id" },
    });
    expect(mocks.deleteCandidate).toHaveBeenCalledWith({
      where: { id: "candidate-id" },
    });
    expect(mocks.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteCandidate.mock.invocationCallOrder[0],
    );
    expect(mocks.deleteCandidateResumeFile).toHaveBeenCalledWith("/tmp/candidate.pdf");
    expect(mocks.transaction.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteCandidateResumeFile.mock.invocationCallOrder[0],
    );
  });

  it("giu lai file CV khi transaction xoa that bai", async () => {
    mocks.findUnique.mockResolvedValue({ cvFileUrl: "/tmp/candidate.pdf" });
    mocks.transaction.mockRejectedValue(new Error("database error"));

    const { deleteCandidateRecord } = await import("./candidate-delete");
    const result = await deleteCandidateRecord("candidate-id");

    expect(result).toEqual({
      success: false,
      error: "Không xóa được ứng viên.",
    });
    expect(mocks.deleteCandidateResumeFile).not.toHaveBeenCalled();
  });
});
