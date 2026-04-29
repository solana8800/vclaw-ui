import { getZalouserPeers } from "../lib/zalouser/zalouser-cli-actions";

async function forceSyncPeers() {
  console.log("--- Đang yêu cầu Gateway đồng bộ danh bạ (Peers) Zalo... ---");
  try {
    // getZalouserPeers(forceRefresh = true)
    const result = await getZalouserPeers(true);
    if (result.success) {
      console.log(`Đã đồng bộ xong ${result.peers?.length || 0} liên hệ.`);
    } else {
      console.error("Lỗi đồng bộ:", result.error);
    }
  } catch (e) {
    console.error("Lỗi thực thi:", e);
  }
}

forceSyncPeers();
