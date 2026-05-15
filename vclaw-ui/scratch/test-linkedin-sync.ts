import { upsertCandidateFromLinkedIn, getJobPositions } from "../lib/actions/recruitment/actions";

async function testSync() {
  console.log("--- Bắt đầu test đồng bộ ứng viên từ LinkedIn ---");
  
  const jobs = await getJobPositions();
  const targetJob = jobs[0];
  
  if (!targetJob) {
    console.log("Không tìm thấy vị trí tuyển dụng nào. Vui lòng tạo trước.");
    return;
  }

  const mockLinkedInResult = {
    name: "Nguyễn Văn A",
    headline: "Senior Fullstack Engineer | React, Node.js",
    profileUrl: "https://www.linkedin.com/in/nguyenvana"
  };

  try {
    const candidate = await upsertCandidateFromLinkedIn({
      ...mockLinkedInResult,
      jobPositionId: targetJob.id,
    });
    console.log("Đã đồng bộ thành công ứng viên:", candidate.name);
    console.log("Trạng thái:", candidate.status);
  } catch (error) {
    console.error("Lỗi khi đồng bộ:", error);
  }
}

testSync();
