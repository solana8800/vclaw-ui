import { getZalouserGroups } from "../lib/zalouser/zalouser-cli-actions";

async function forceSync() {
  console.log("--- Đang yêu cầu Gateway đồng bộ danh sách Nhóm Zalo... ---");
  try {
    const result = await getZalouserGroups(true);
    if (result.success) {
      console.log(`Đã đồng bộ xong ${result.groups?.length || 0} nhóm.`);
    } else {
      console.error("Lỗi đồng bộ:", result.error);
    }
  } catch (e) {
    console.error("Lỗi thực thi:", e);
  }
}

forceSync();
