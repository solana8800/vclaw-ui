import React from "react";
import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en/admin.json";
import type { AdminHhContent } from "@/lib/admin/content";
import { CandidateCvUploadDialog } from "@/components/recruitment/candidate-cv-upload-dialog";
import { useRecruitmentBackgroundTasks } from "@/components/recruitment/use-recruitment-background-tasks";

const mocks = vi.hoisted(() => ({
  createCandidateFromCvUpload: vi.fn(),
  refresh: vi.fn(),
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/lib/notifications/toast", () => ({
  toast: {
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/lib/actions/recruitment/actions", () => ({
  createCandidateFromCvUpload: mocks.createCandidateFromCvUpload,
  assignCandidateJobPosition: vi.fn(),
  batchRefreshLinkedInProfiles: vi.fn(),
  enrichCandidateLinkedInByProfileUrl: vi.fn(),
  importJobPositionFromJdFile: vi.fn(),
  importJobPositionFromPublicJdUrl: vi.fn(),
  rescoreCandidateWithAi: vi.fn(),
  saveOneSearchCandidateBasic: vi.fn(),
}));

const messages = enMessages.recruitment as unknown as AdminHhContent;

describe("CV upload background task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks CV parsing in the background and refreshes after success", async () => {
    let resolveUpload!: (value: { success: true; candidateId: string; name: string }) => void;
    mocks.createCandidateFromCvUpload.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    const { result } = renderHook(() => useRecruitmentBackgroundTasks(messages, "en"));
    const file = new File(["resume"], "candidate.pdf", { type: "application/pdf" });

    act(() => {
      void result.current.runCreateCandidateFromCvBackground(file, "job-id");
    });

    expect(result.current.tasks).toEqual([
      expect.objectContaining({
        kind: "cv_upload",
        detail: "candidate.pdf",
        done: 0,
        total: 1,
        status: "running",
      }),
    ]);

    await act(async () => {
      resolveUpload({ success: true, candidateId: "candidate-id", name: "Candidate Name" });
      await Promise.resolve();
    });

    expect(result.current.tasks[0]).toEqual(
      expect.objectContaining({ done: 1, status: "success" }),
    );
    expect(mocks.refresh).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Created Candidate Name from CV.",
      expect.objectContaining({ id: expect.any(String) }),
    );
  });

  it("closes the modal immediately after handing the file to the background runner", () => {
    const onClose = vi.fn();
    const onStartBackground = vi.fn();
    const { container } = render(
      <CandidateCvUploadDialog
        open
        onClose={onClose}
        messages={messages}
        onStartBackground={onStartBackground}
      />,
    );
    const input = container.querySelector('input[type="file"]');
    const file = new File(["resume"], "candidate.pdf", { type: "application/pdf" });

    fireEvent.change(input!, { target: { files: [file] } });

    expect(onStartBackground).toHaveBeenCalledWith(file);
    expect(onClose).toHaveBeenCalled();
    expect(mocks.createCandidateFromCvUpload).not.toHaveBeenCalled();
  });

  it("shows an error task and does not refresh when CV parsing fails", async () => {
    mocks.createCandidateFromCvUpload.mockResolvedValue({
      success: false,
      error: "Could not parse CV.",
    });

    const { result } = renderHook(() => useRecruitmentBackgroundTasks(messages, "en"));
    const file = new File(["resume"], "candidate.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.runCreateCandidateFromCvBackground(file);
    });

    expect(result.current.tasks[0]).toEqual(
      expect.objectContaining({ done: 0, status: "error" }),
    );
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Could not parse CV.",
      expect.objectContaining({ id: expect.any(String) }),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
