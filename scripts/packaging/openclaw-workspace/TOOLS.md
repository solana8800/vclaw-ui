# Công cụ VClaw (bắt buộc nắm vững)

Gateway OpenClaw của VClaw được cấu hình **MCP HTTP** trỏ vào máy chủ Next.js (VClaw UI). Tên server trong JSON thường là `vclaw-business`.

## 1. MCP — nghiệp vụ bán hàng (ưu tiên tuyệt đối)

- **Endpoint** (mặc định app để bàn): `http://127.0.0.1:12687/api/vclaw/agent-tools`
- **Auth**: `Authorization: Bearer <VCLAW_AGENT_TOOLS_SECRET>` — giá trị phải **trùng** với biến môi trường `VCLAW_AGENT_TOOLS_SECRET` trong `.env` / `.env.local` của VClaw UI và với `mcp.servers.vclaw-business.auth.token` trong `~/.openclaw/openclaw.json` (hoặc file cấu hình gateway đang dùng).

### Bạn phải dùng tool khi:

| Tình huống | Tool (ví dụ) |
|------------|----------------|
| Lưu / cập nhật khách, giới tính, tên xưng hô | `vclaw.customer.upsert` |
| Khách đồng ý mua — tạo đơn | `vclaw.order.create` |
| Cần QR VietQR (copy đúng URL từ kết quả tool) | `vclaw.payment.generate_qr` hoặc field `qrUrl` từ `vclaw.order.create` |
| Lấy guideline bán hàng / persona shop | `vclaw.commerce.get_sales_guidelines` |
| Kiểm tra khả năng local (URL API) | `vclaw.system.get_local_capabilities` |

**Cấm** nói “em đã tạo đơn rồi” nếu chưa gọi tool thành công. **Cấm** bịa link thanh toán — chỉ dùng URL từ tool (thường dạng `https://img.vietqr.io/image/...` theo guideline trong `vclaw.commerce.get_sales_guidelines`).

## 2. Enrich ngữ cảnh (server VClaw)

- **POST** `http://127.0.0.1:12687/api/vclaw/enrich`  
  Body JSON tối thiểu: `{ "message": "<nội dung tin khách>", "pathname": "/", "channel": "zalo", "externalId": "<id hội thoại nếu có>" }`  
  Phản hồi có `prompt` — đó là ngữ cảnh kinh doanh đã gộp DB/heuristic.

Nếu luồng gateway/session của bạn **được nối** để mỗi tin khách đều đi qua bước enrich trước khi vào model: hãy coi nội dung trong prompt đó là **nguồn sự thật** về đơn tồn, khách, QR vừa sinh, v.v. Nếu chưa nối hook HTTP enrich, vẫn phải dựa vào **MCP** để chốt đơn và QR.

## 3. Gợi ý debug

- VClaw UI không chạy → MCP enrich đều lỗi; báo chủ shop bật app/port 12687.
- 401 agent-tools → lệch secret; chỉnh cho khớp cả hai phía.
