import { describe, expect, it } from "vitest";

import { defaultSelectedCandidateIds } from "@/components/recruitment/candidate-bulk-assign-job-dialog";

describe("defaultSelectedCandidateIds", () => {
  const candidates = [
    { id: "a", name: "An", jobPositionId: null },
    { id: "b", name: "Bình", jobPositionId: "job-1", jobPosition: { id: "job-1", title: "Dev" } },
    { id: "c", name: "Chi", jobPositionId: "job-2", jobPosition: { id: "job-2", title: "QA" } },
  ];

  it("giữ checkbox từ bảng kể cả ứng viên đã gắn vị trí khác", () => {
    expect(defaultSelectedCandidateIds(candidates, ["b", "c"])).toEqual(["b", "c"]);
  });

  it("lọc id không có trong danh sách dialog", () => {
    expect(defaultSelectedCandidateIds(candidates, ["b", "missing"])).toEqual(["b"]);
  });

  it("không có checkbox thì chọn mặc định ứng viên chưa gắn vị trí", () => {
    expect(defaultSelectedCandidateIds(candidates)).toEqual(["a"]);
  });
});
