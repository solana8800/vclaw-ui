import { describe, it } from "vitest";
process.env.OPENCLAW_GATEWAY_URL = "http://127.0.0.1:3001";
process.env.OPENCLAW_GATEWAY_TOKEN = "62b791625fa441be036acd3c206b7e14e2bb13c803355823";

import { fetchPublicJdContent } from "../lib/recruitment/jd-public-url-fetch";
import { importJobPositionDraftFromContent } from "../lib/recruitment/jd-public-url-import";

describe("Debug fetch VinDynamics", () => {
  it("tải và AI bóc tách JD", async () => {
    const url = "https://vindynamics.net/career/solution-architect-lead-principal";
    console.log("1. Đang tải nội dung JD từ URL:", url);
    const fetched = await fetchPublicJdContent(url);
    if (!fetched.ok) {
      console.error("Lỗi fetch HTML:", fetched.error);
      return;
    }

    console.log("Tải thành công! Độ dài văn bản trích xuất:", fetched.result.content.length);
    console.log("\n--- NỘI DUNG VĂN BẢN TRÍCH XUẤT (500 ký tự đầu) ---");
    console.log(fetched.result.content.slice(0, 500));
    console.log("--------------------------------------------------\n");

    console.log("2. Đang gửi cho AI để bóc tách...");
    const importRes = await importJobPositionDraftFromContent(fetched.result.content, url, "vi");
    if (!importRes.ok) {
      console.error("AI bóc tách thất bại:", importRes.error);
    } else {
      console.log("AI bóc tách thành công! Bản nháp:", JSON.stringify(importRes.draft, null, 2));
    }
  }, 60000); // Tăng timeout lên 60 giây vì AI cần thời gian xử lý
});
