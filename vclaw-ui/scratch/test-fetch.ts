import { fetchPublicJdContent } from "../lib/recruitment/jd-public-url-fetch";
import { importJobPositionDraftFromContent } from "../lib/recruitment/jd-public-url-import";

async function test() {
  const url = "https://vindynamics.net/career/solution-architect-lead-principal";
  console.log("1. Đang tải nội dung JD từ URL:", url);
  const fetched = await fetchPublicJdContent(url);
  if (!fetched.ok) {
    console.error("Lỗi fetch HTML:", fetched.error);
    return;
  }

  console.log("Tải thành công! Độ dài văn bản trích xuất:", fetched.result.content.length);
  console.log("\n--- NỘI DUNG VĂN BẢN TRÍCH XUẤT (300 ký tự đầu) ---");
  console.log(fetched.result.content.slice(0, 500));
  console.log("--------------------------------------------------\n");

  console.log("2. Đang gửi cho AI để bóc tách...");
  const draft = await importJobPositionDraftFromContent(fetched.result.content, url, "vi");
  console.log("AI phản hồi bản nháp:", JSON.stringify(draft, null, 2));
}

test().catch(console.error);
