# ĐẶC TẢ KỸ THUẬT: ĐỒNG BỘ LINKEDIN INBOX QUA CDP & PLAYWRIGHT

Tài liệu mô tả kiến trúc và trạng thái triển khai giải pháp đồng bộ tin nhắn LinkedIn **Local-First** trên VClaw. Hệ thống dùng **Chrome CDP (Chrome DevTools Protocol)** và **Playwright** để chặn bắt API GraphQL nội bộ của LinkedIn, lưu hội thoại và tin nhắn vào SQLite cục bộ, không qua bất kỳ cloud trung gian nào.

---

## 1. KIẾN TRÚC TỔNG THỂ

```
Recruiter (VClaw UI)
  │
  ├─ [Đồng bộ Inbox]  ──► syncLinkedInInboxCDP()
  │                         → Gateway: sync_inbox
  │                         → Chrome: linkedin.com/messaging/
  │                         → Intercept voyagerMessagingGraphQL
  │                         → Lưu bảng Conversation (20 threads)
  │
  └─ [Đồng bộ tin nhắn]  ──► syncLinkedInThreadCDP(candidateId)
                              → Tra cứu Conversation.externalThreadId
                              → Gateway: sync_thread --url {threadId}
                              → Chrome: linkedin.com/messaging/thread/{id}/
                              → Intercept voyagerMessagingGraphQL
                              → Lưu bảng ConversationMessage
```

Toàn bộ xử lý chạy cục bộ (Local-First). Không gửi dữ liệu ra ngoài.

---

## 2. CƠ CHẾ ĐÁNH CHẶN MẠNG (Network Interception)

LinkedIn dùng GraphQL nội bộ, **không phải** Voyager REST API cũ. Endpoint thực tế:

```
https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql
  ?queryId=messengerConversations.0d5e6781bbee71c3e51c8843c6519f48
```

Cơ chế đọc response body dùng **CDP session trực tiếp** (không dùng `page.on('response')` vì không đọc được body khi kết nối qua `connectOverCDP`):

```javascript
const cdpSession = await page.context().newCDPSession(page);
await cdpSession.send("Network.enable");
cdpSession.on("Network.responseReceived", async ({ requestId, response }) => {
  if (!response.url.includes("voyagerMessagingGraphQL/graphql")) return;
  const { body } = await cdpSession.send("Network.getResponseBody", { requestId });
  const json = JSON.parse(body);
  // Xử lý json.data.messengerConversationsBySyncToken.elements
});
```

Cấu trúc response GraphQL thực tế:

```json
{
  "data": {
    "messengerConversationsBySyncToken": {
      "elements": [
        {
          "backendUrn": "urn:li:messagingThread:2-ZmZkZmU3ZjQ...",
          "conversationParticipants": [
            {
              "participantType": {
                "member": {
                  "distance": "SELF",
                  "firstName": { "text": "Tuan" },
                  "lastName": { "text": "Recruiter" },
                  "profileUrl": "https://www.linkedin.com/in/ACoAACS_KzQB..."
                }
              }
            },
            {
              "participantType": {
                "member": {
                  "distance": "DISTANCE_1",
                  "firstName": { "text": "Thao Thach" },
                  "lastName": { "text": "Tran" },
                  "profileUrl": "https://www.linkedin.com/in/ACoAACiOMN4B..."
                }
              }
            }
          ],
          "messages": {
            "elements": [
              {
                "backendUrn": "urn:li:messagingMessage:2-MTc3OTEy...",
                "body": { "text": "Chị Thảo Thạch Trân thân mến,..." },
                "deliveredAt": 1779122147638,
                "actor": {
                  "participantType": {
                    "member": { "distance": "SELF" }
                  }
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## 3. HAI LUỒNG ĐỒNG BỘ

### 3.1 Đồng bộ Inbox (Bootstrap — chạy 1 lần)

**Mục đích:** Tạo mapping `externalThreadId ↔ candidateId` trong bảng `Conversation`. Đây là bước bắt buộc trước khi đồng bộ tin nhắn chi tiết.

**Trigger:** Nút "Đồng bộ Inbox" trên trang quản lý ứng viên.

**Flow:**
1. Navigate tới `linkedin.com/messaging/`
2. Intercept `voyagerMessagingGraphQL/graphql` → thu thập danh sách hội thoại
3. Scroll để tải thêm hội thoại cũ hơn (lazy-load)
4. Upsert bảng `Conversation` cho mỗi thread

**Kết quả:** 20 Conversation records (metadata, chưa có tin nhắn)

**Cần chạy lại khi:** Có hội thoại mới xuất hiện trong inbox LinkedIn.

### 3.2 Đồng bộ tin nhắn (Per-thread — dùng thường xuyên)

**Mục đích:** Tải nội dung chi tiết các tin nhắn trong một hội thoại cụ thể.

**Trigger:** Nút "Đồng bộ tin nhắn" trong dialog hội thoại của từng ứng viên.

**Flow:**
1. Tra cứu `Conversation.externalThreadId` theo `candidateId`
2. Navigate tới `linkedin.com/messaging/thread/{threadId}/`
3. Intercept `voyagerMessagingGraphQL/graphql` → thu thập messages
4. Scroll lên đầu để tải thêm tin nhắn cũ
5. Lưu vào `ConversationMessage` (dedup bằng `backendUrn`)

**Xác định chiều tin nhắn:** `msg.actor.participantType.member.distance === "SELF"` → `OUTBOUND`, còn lại → `INBOUND`

---

## 4. DATABASE SCHEMA

```prisma
model Conversation {
  id               String    @id @default(cuid())
  provider         String    // "LINKEDIN"
  externalThreadId String    // "2-ZmZkZmU3ZjQ..."
  candidateId      String?   // FK → Candidate
  title            String?   // Tên ứng viên
  status           String?   // "ACTIVE"
  messages         ConversationMessage[]
  candidate        Candidate? @relation(...)
}

model ConversationMessage {
  id                String    @id @default(cuid())
  conversationId    String    // FK → Conversation
  direction         String    // "INBOUND" | "OUTBOUND"
  body              String    // Nội dung tin nhắn
  externalMessageId String?   // backendUrn từ LinkedIn
  createdAt         DateTime  // deliveredAt từ LinkedIn
}
```

---

## 5. GIAO DIỆN HIỆN TẠI

### Dialog "Hộp thoại LinkedIn" (`candidate-linxa-chat-dialog.tsx`)

| Nút | Chức năng |
|---|---|
| **Đồng bộ tin nhắn** | `syncLinkedInThreadCDP(candidateId)` — navigate tới thread, intercept messages, lưu `ConversationMessage` |
| **Làm mới** | `fetchCandidateLinxaChatMessages(candidateId)` — đọc từ `ConversationMessage` table và render |
| **Soạn bằng AI** | `generateAIChatReply(candidateId)` — AI đọc CV + JD + lịch sử chat, soạn reply |
| **Gửi tin nhắn** | `sendLinkedInMessageCDP(profileUrl, message)` — gửi trực tiếp qua CDP |

### Thứ tự ưu tiên khi hiển thị tin nhắn (`fetchCandidateLinxaChatMessages`)

1. `ConversationMessage` table (CDP-synced) — nguồn chính
2. `candidate.conversationHistory` (JSON cũ, import từ Linxa trước đây)
3. `candidate.chatInfo` (preview ngắn một đoạn)

> Linxa Cloud API đã được loại bỏ hoàn toàn. Hệ thống hoạt động 100% local.

---

## 6. LUỒNG GATEWAY

```
VClaw UI
  → callGatewayTool("head-hunter", "sync_inbox" | "sync_thread", args)
  → OpenClaw Gateway Bridge (recruitment-bridge/index.ts)
  → spawnSync: node linkedin-manager.mjs sync_inbox | sync_thread --url {threadId}
  → Playwright CDP intercept
  → Trả JSON về Gateway
  → Gateway trả về VClaw UI Server Action
  → Parse + lưu DB
```

---

## 7. GIỚI HẠN AN TOÀN

- Không đồng bộ liên tục — chỉ chạy khi người dùng bấm nút
- Mỗi lần sync_thread chỉ navigate 1 URL, không loop qua nhiều thread
- Mô phỏng thao tác thông thường (navigate + scroll), không spam API
- Tất cả dữ liệu lưu local, không gửi ra ngoài

---

## 8. TRẠNG THÁI TRIỂN KHAI

| Tính năng | Trạng thái |
|---|---|
| CDP Network Interception (GraphQL) | ✅ Hoàn thành |
| Đồng bộ Inbox (tạo Conversation records) | ✅ Hoàn thành |
| Đồng bộ tin nhắn per-thread | ✅ Hoàn thành |
| Hiển thị chat bubble INBOUND/OUTBOUND | ✅ Hoàn thành |
| AI soạn reply (CV + JD + history) | ✅ Hoàn thành |
| Gửi tin nhắn qua CDP | ✅ Hoàn thành |
| Auto-sync khi mở dialog | 🔲 Chưa làm |
| Realtime listen (giữ browser mở) | 🔲 Chưa làm |
