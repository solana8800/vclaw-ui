import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function repair() {
  console.log("--- Bắt đầu rà soát và sửa tên khách hàng Zalo (Cá nhân & Nhóm) ---");
  
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { startsWith: "Hội thoại Zalo:" } },
        { name: { contains: "group:" } },
        { name: "Zalo User" }
      ]
    }
  });

  console.log(`Tìm thấy ${customers.length} khách hàng cần kiểm tra.`);

  let fixedCount = 0;

  for (const customer of customers) {
    // Trích xuất ID từ tên "Hội thoại Zalo: [ID]" hoặc "Zalo: group:[ID]"
    const idMatch = customer.name.match(/(?:Hội thoại Zalo|Zalo): (.+)/);
    let externalThreadId = idMatch ? idMatch[1].trim() : customer.phone;
    
    if (!externalThreadId) continue;

    let finalRealName: string | null = null;

    // 1. Kiểm tra nếu là Nhóm (Lưu ý: groupId trong DB có thể có hoặc không có prefix group:)
    if (externalThreadId.includes("group:")) {
      const gid = externalThreadId.trim();
      const rawGid = externalThreadId.replace("group:", "").trim();
      
      const group = await prisma.integrationGroup.findFirst({ 
        where: { 
          groupId: { in: [gid, rawGid] } 
        } 
      });
      if (group && group.name) {
        finalRealName = group.name;
      }
    } 
    
    // 2. Nếu không phải nhóm hoặc không tìm thấy nhóm, kiểm tra Cá nhân
    if (!finalRealName) {
      const cleanPeerId = externalThreadId.replace("user:", "").trim();
      const peerIds = [cleanPeerId, `user:${cleanPeerId}`];
      
      const peer = await prisma.integrationPeer.findFirst({
        where: {
          provider: "zalouser",
          peerId: { in: peerIds }
        }
      });
      if (peer && peer.name) {
        finalRealName = peer.name;
      }
    }

    // 3. Thực hiện cập nhật nếu tìm thấy tên thật hợp lệ
    if (finalRealName && finalRealName !== customer.name && !finalRealName.includes(externalThreadId)) {
      console.log(`[Fix] Cập nhật: ${customer.name} -> ${finalRealName}`);
      
      // Cập nhật bảng Customer
      await prisma.customer.update({
        where: { id: customer.id },
        data: { name: finalRealName }
      });

      // Cập nhật tiêu đề tất cả hội thoại liên quan
      await prisma.conversation.updateMany({
        where: { customerId: customer.id, provider: "zalouser" },
        data: { title: `Hội thoại Zalo: ${finalRealName}` }
      });

      fixedCount++;
    }
  }

  console.log(`--- Đã sửa xong ${fixedCount} khách hàng. ---`);
}

repair()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
