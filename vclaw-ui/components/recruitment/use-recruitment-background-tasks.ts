"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/notifications/toast";
import {
  assignCandidateJobPosition,
  batchRefreshLinkedInProfiles,
  rescoreCandidateWithAi,
  saveOneSearchCandidateBasic,
  importJobPositionFromPublicJdUrl,
} from "@/lib/actions/recruitment/actions";
import { enrichCandidateLinkedInByProfileUrl } from "@/lib/actions/recruitment/actions";
import type { AdminHhContent } from "@/lib/admin/content";
import type { LinkedInSearchHit } from "@/lib/recruitment/candidate-types";

export type RecruitmentBgTaskKind = "bulk_ai" | "bulk_linkedin" | "cdp_enrich" | "linkedin_save" | "import_jd";

export type RecruitmentBgTask = {
  id: string;
  kind: RecruitmentBgTaskKind;
  label: string;
  detail?: string;
  done: number;
  total: number;
  status: "running" | "success" | "error";
};

function newTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useRecruitmentBackgroundTasks(messages: AdminHhContent, locale?: string) {
  const router = useRouter();
  const bg = messages.candidates.backgroundTasks;
  const [tasks, setTasks] = useState<RecruitmentBgTask[]>([]);

  const patchTask = useCallback((id: string, patch: Partial<RecruitmentBgTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const addTask = useCallback((task: RecruitmentBgTask) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const finishTask = useCallback((id: string, status: "success" | "error", delayMs = 5000) => {
    patchTask(id, { status });
    window.setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }, delayMs);
  }, [patchTask]);

  const runBulkAiEvaluate = useCallback(
    async (params: {
      candidateIds: string[];
      namesById: Record<string, string>;
      jobPositionId: string;
      jobTitle: string;
    }) => {
      const { candidateIds, namesById, jobPositionId, jobTitle } = params;
      const total = candidateIds.length;
      if (total === 0) return;

      const taskId = newTaskId();
      const toastId = `bulk-ai-${taskId}`;

      addTask({
        id: taskId,
        kind: "bulk_ai",
        label: bg.bulkAiRunning.replace("{total}", String(total)),
        detail: jobTitle,
        done: 0,
        total,
        status: "running",
      });

      toast.loading(bg.bulkAiToastStart.replace("{total}", String(total)), { id: toastId });

      let evaluated = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < total; i++) {
        const id = candidateIds[i]!;
        const name = namesById[id] ?? bg.defaultCandidateName;
        const step = i + 1;

        patchTask(taskId, {
          done: i,
          label: bg.bulkAiStep.replace("{name}", name).replace("{done}", String(step)).replace("{total}", String(total)),
          detail: jobTitle,
        });
        toast.loading(
          bg.bulkAiToastStep.replace("{name}", name).replace("{done}", String(step)).replace("{total}", String(total)),
          { id: toastId },
        );

        const assign = await assignCandidateJobPosition(id, jobPositionId);
        if (!assign.success) {
          failed++;
          errors.push(`${name}: ${assign.error}`);
          continue;
        }

        const res = await rescoreCandidateWithAi(id, jobPositionId, locale);
        if (res.success) {
          evaluated++;
        } else {
          failed++;
          errors.push(`${name}: ${res.error ?? bg.bulkAiOneFail}`);
        }

        patchTask(taskId, { done: step });
      }

      router.refresh();

      if (evaluated > 0) {
        toast.success(
          bg.bulkAiDone
            .replace("{evaluated}", String(evaluated))
            .replace("{failed}", String(failed)),
          { id: toastId, duration: 6000 },
        );
        finishTask(taskId, "success");
      } else {
        toast.error(errors[0] ?? bg.bulkAiDoneFailed, { id: toastId, duration: 6000 });
        finishTask(taskId, "error");
      }
    },
    [addTask, bg, finishTask, patchTask, router],
  );

  const runBulkLinkedInProfiles = useCallback(
    async (params: { candidateIds: string[]; namesById: Record<string, string> }) => {
      const { candidateIds, namesById } = params;
      const total = candidateIds.length;
      if (total === 0) return;

      const taskId = newTaskId();
      const toastId = `bulk-li-${taskId}`;

      addTask({
        id: taskId,
        kind: "bulk_linkedin",
        label: bg.bulkLinkedInRunning.replace("{total}", String(total)),
        done: 0,
        total,
        status: "running",
      });
      toast.loading(bg.bulkLinkedInToastStart.replace("{total}", String(total)), { id: toastId });

      let refreshed = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < total; i++) {
        const id = candidateIds[i]!;
        const name = namesById[id] ?? bg.defaultCandidateName;
        const step = i + 1;
        patchTask(taskId, {
          done: i,
          label: bg.bulkLinkedInStep
            .replace("{name}", name)
            .replace("{done}", String(step))
            .replace("{total}", String(total)),
        });
        toast.loading(
          bg.bulkLinkedInToastStep
            .replace("{name}", name)
            .replace("{done}", String(step))
            .replace("{total}", String(total)),
          { id: toastId },
        );

        const res = await batchRefreshLinkedInProfiles([id]);
        if (res.refreshed > 0) {
          refreshed++;
        } else {
          failed++;
          errors.push(`${name}: ${res.errors[0] ?? bg.bulkLinkedInOneFail}`);
        }
        patchTask(taskId, { done: step });
      }

      router.refresh();

      if (refreshed > 0) {
        toast.success(
          bg.bulkLinkedInDone
            .replace("{refreshed}", String(refreshed))
            .replace("{failed}", String(failed)),
          { id: toastId, duration: 6000 },
        );
        finishTask(taskId, "success");
      } else {
        toast.error(errors[0] ?? bg.bulkLinkedInDoneFailed, { id: toastId, duration: 6000 });
        finishTask(taskId, "error");
      }
    },
    [addTask, bg, finishTask, patchTask, router],
  );

  const runSaveSearchAndEnrich = useCallback(
    async (
      selected: LinkedInSearchHit[],
      jobPositionId: string | undefined,
      options?: {
        onComplete?: (result: { savedIds: string[]; namesById: Record<string, string> }) => void;
      },
    ) => {
      if (selected.length === 0) return;

      const saveTaskId = newTaskId();
      const saveToastId = `save-search-${saveTaskId}`;
      const totalSave = selected.length;

      addTask({
        id: saveTaskId,
        kind: "linkedin_save",
        label: bg.saveRunning.replace("{total}", String(totalSave)),
        done: 0,
        total: totalSave,
        status: "running",
      });
      toast.loading(bg.saveToastStart.replace("{total}", String(totalSave)), { id: saveToastId });

      const profileUrls: string[] = [];
      const savedIds: string[] = [];
      const namesById: Record<string, string> = {};
      let saved = 0;

      for (let i = 0; i < selected.length; i++) {
        const item = selected[i]!;
        patchTask(saveTaskId, {
          done: i,
          label: bg.saveStep.replace("{name}", item.name).replace("{done}", String(i + 1)).replace("{total}", String(totalSave)),
        });
        const res = await saveOneSearchCandidateBasic(item, jobPositionId);
        if (res.success) {
          saved++;
          if (res.profileUrl) profileUrls.push(res.profileUrl);
          if (res.candidateId) {
            savedIds.push(res.candidateId);
            namesById[res.candidateId] = item.name;
          }
        }
        patchTask(saveTaskId, { done: i + 1 });
      }

      router.refresh();
      toast.success(bg.saveDone.replace("{saved}", String(saved)).replace("{total}", String(totalSave)), {
        id: saveToastId,
        duration: 4000,
      });
      finishTask(saveTaskId, saved > 0 ? "success" : "error", 3000);

      if (profileUrls.length === 0) {
        options?.onComplete?.({ savedIds, namesById });
        return;
      }

      const enrichTaskId = newTaskId();
      const enrichToastId = `cdp-enrich-${enrichTaskId}`;
      const totalEnrich = profileUrls.length;

      addTask({
        id: enrichTaskId,
        kind: "cdp_enrich",
        label: bg.cdpRunning.replace("{total}", String(totalEnrich)),
        done: 0,
        total: totalEnrich,
        status: "running",
      });
      toast.loading(bg.cdpToastStart.replace("{total}", String(totalEnrich)), { id: enrichToastId });

      let enriched = 0;
      for (let i = 0; i < profileUrls.length; i++) {
        patchTask(enrichTaskId, {
          done: i,
          label: bg.cdpStep.replace("{done}", String(i + 1)).replace("{total}", String(totalEnrich)),
        });
        toast.loading(
          bg.cdpToastStep.replace("{done}", String(i + 1)).replace("{total}", String(totalEnrich)),
          { id: enrichToastId },
        );
        const res = await enrichCandidateLinkedInByProfileUrl(profileUrls[i]!);
        if (res.success) enriched++;
        patchTask(enrichTaskId, { done: i + 1 });
      }

      router.refresh();
      toast.success(
        bg.cdpDone.replace("{enriched}", String(enriched)).replace("{total}", String(totalEnrich)),
        { id: enrichToastId, duration: 6000 },
      );
      finishTask(enrichTaskId, enriched > 0 ? "success" : "error");

      if (enriched < saved) {
        toast.info(
          messages.candidates.saveWithPartialEnrich
            .replace("{saved}", String(saved))
            .replace("{enriched}", String(enriched)),
          { duration: 5000 },
        );
      }

      options?.onComplete?.({ savedIds, namesById });
    },
    [addTask, bg, finishTask, messages.candidates.saveWithPartialEnrich, patchTask, router],
  );

  const runImportJdBackground = useCallback(
    async (
      url: string,
      options?: {
        onComplete?: () => void;
      },
    ) => {
      const taskId = newTaskId();
      const toastId = `import-jd-${taskId}`;

      addTask({
        id: taskId,
        kind: "import_jd",
        label: locale === "en" ? "AI is parsing and creating Job Position..." : "AI đang bóc tách & tạo việc tuyển dụng ngầm...",
        detail: url,
        done: 0,
        total: 1,
        status: "running",
      });

      toast.loading(locale === "en" ? "Processing job posting link..." : "Đang xử lý link tuyển dụng công khai...", { id: toastId });

      try {
        const res = await importJobPositionFromPublicJdUrl(url);

        if (res.success) {
          patchTask(taskId, { done: 1 });
          toast.success(
            locale === "en"
              ? "Job created successfully from link!"
              : "Đã tạo việc tuyển dụng thành công từ link!",
            { id: toastId, duration: 6000 },
          );
          finishTask(taskId, "success");
          router.refresh();
          options?.onComplete?.();
        } else {
          toast.error(res.error || (locale === "en" ? "Could not import from URL" : "Không import được từ link"), { id: toastId, duration: 6000 });
          finishTask(taskId, "error");
        }
      } catch (e) {
        console.error(e);
        toast.error(locale === "en" ? "An error occurred while importing" : "Đã xảy ra lỗi khi import", { id: toastId, duration: 6000 });
        finishTask(taskId, "error");
      }
    },
    [addTask, finishTask, patchTask, router, locale],
  );

  return { tasks, runBulkAiEvaluate, runBulkLinkedInProfiles, runSaveSearchAndEnrich, runImportJdBackground };
}
