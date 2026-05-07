# Sự cố OpenClaw MCP catalog: bot bịa sản phẩm ngoài database

## Tóm tắt

Ngày 2026-05-06, bot Zalo trả lời danh sách sản phẩm AirPods/JBL/Tai nghe dù database VClaw chỉ có 11 sản phẩm active là vé/dịch vụ du lịch trong `vclaw-ui/prisma/business.sqlite`.

Đây là lỗi nghiêm trọng vì bot đã trả lời bằng trí nhớ của model thay vì catalog thật của shop.

## Log triệu chứng

Tin khách:

```text
danh sach san pham may dang ban
```

Bot trả lời sai:

```text
[[reply_to_current]] Dạ vâng, em gửi anh danh sách sản phẩm shop đang bán:

**Tai nghe True Wireless:**
- AirPods Pro 2: 4.990k
- AirPods 4: 3.490k
- Samsung Buds2 Pro: 3.490k
- Samsung Buds FE: 2.190k
- Xiaomi Buds 5 Pro: 2.490k

**Loa Bluetooth:**
- JBL Flip 6: 2.890k
- JBL Charge 5: 4.190k
- Sony XB100: 1.690k
```

Database thật tại thời điểm kiểm tra:

```text
active_count = 11
```

Danh sách thật từ `vclaw.product.list`:

```text
Vé VinWonders Nam Hội An - Người Lớn
Vé VinWonders Nha Trang Sau 16:00 - Người Lớn
Vé vào cổng Khu du lịch Núi Bà Đen (Tây Ninh)
Vé VinWonders Phú Quốc - Người Lớn
Vé VinWonders Nha Trang (Gồm cáp treo) - Người Lớn
Combo VinWonders & Safari Phú Quốc - Người Lớn
Combo Cáp Treo + Buffet Bà Nà Hills - Người Lớn
Vé Cáp Treo Fansipan Legend - Người Lớn
Vé Cáp Treo Hòn Thơm (Sun World Phu Quoc) - Người Lớn
Vé Cáp Treo Bà Nà Hills - Người Lớn
Vé Cáp Treo Bà Nà Hills - Trẻ Em
```

Query `điện thoại` qua tool trả:

```json
{
  "count": 0,
  "empty": true
}
```

## Root cause

OpenClaw Zero Token runtime không load được MCP server `vclaw-business` vì live config đang dùng dạng HTTP URL:

```json
{
  "mcp": {
    "servers": {
      "vclaw-business": {
        "url": "http://127.0.0.1:12687/api/vclaw/agent-tools"
      }
    }
  }
}
```

Trong core OpenClaw hiện tại, code `resolveStdioMcpServerLaunchConfig` chỉ nhận server có `command`. Nếu config có `url` nhưng không có `command`, core trả lỗi:

```text
only stdio MCP servers are supported right now
```

Vì vậy endpoint HTTP của VClaw UI vẫn sống, nhưng OpenClaw không biến nó thành tool cho agent. Bot không thấy `vclaw.product.list`, nên model tự bịa sản phẩm.

## Root cause bổ sung sau khi MCP đã load

Sau khi sửa MCP stdio bridge, test Zalo vẫn có một lượt trả sai `Sony XB100`. Log gateway lúc đó cho thấy:

```text
Stream completed. Content: 189, reasoning: 0, toolCalls: 0
```

`AgentToolLog` cũng không có call mới từ lượt chat thật. Nghĩa là tool đã có trong prompt nhưng model web vẫn không gọi tool, rồi tiếp tục bám lịch sử cũ có AirPods/JBL/Sony.

Vì vậy chỉ sửa MCP transport là chưa đủ an toàn cho catalog. Với Zalo inbound, core phải đưa ngữ cảnh VClaw thật vào prompt trước khi gọi model, thay vì phó mặc model tự quyết có gọi `vclaw.product.list` hay không.

Fix bổ sung trong:

```text
core/openclaw-zero-token/extensions/zalouser/src/monitor.ts
```

Luồng mới:

```text
Tin Zalo -> POST /api/vclaw/enrich -> BodyForAgent có [VCLAW_BUSINESS_BRAIN] + [DANH_MỤC_SẢN_PHẨM] -> model
```

Chi tiết:

- Chỉ áp dụng cho tin Zalo không phải slash command.
- Gọi `http://127.0.0.1:12687/api/vclaw/enrich` với `message`, `channel: "zalo"`, `externalId` dạng `user:<id>` hoặc `group:<id>`.
- Enrichment thêm cả block `[SẢN_PHẨM_RẺ_NHẤT]` để câu hỏi "rẻ nhất" trả đúng tên đầy đủ và giá từ database.
- Nếu enrich lỗi hoặc timeout, gateway fallback về body gốc để không làm chết kênh chat.
- Trong môi trường test, enrich mặc định tắt; test bật bằng `VCLAW_ZALOUSER_ENRICH_ENABLED=1`.

Kết quả là dù model không gọi tool, prompt vẫn có catalog thật từ SQLite và lịch sử bịa sản phẩm cũ bị ghi đè.

## Vì sao core chỉ dùng stdio command, chưa dùng HTTP URL

Luồng MCP bundle trong `core/openclaw-zero-token/src/agents/pi-bundle-mcp-tools.ts` spawn tool server bằng `StdioClientTransport`. Nó cần:

```json
{
  "command": "node",
  "args": [".../server.mjs"],
  "env": {}
}
```

Core chưa có nhánh `StreamableHTTPClientTransport` hoặc SSE transport cho config `url`. Do đó `url` trong `mcp.servers` không phải là transport hợp lệ ở runtime này.

VClaw vẫn giữ endpoint HTTP `POST /api/vclaw/agent-tools`, nhưng phải bọc bằng stdio bridge để OpenClaw load được:

```text
OpenClaw agent -> MCP stdio -> vclaw-agent-tools-mcp-stdio.mjs -> HTTP /api/vclaw/agent-tools -> Prisma SQLite
```

## Fix hiện tại

Thêm bridge:

```text
scripts/vclaw-agent-tools-mcp-stdio.mjs
```

Bridge expose các method MCP:

```text
initialize
tools/list
tools/call
ping
```

Config đúng:

```json
{
  "mcp": {
    "servers": {
      "vclaw-business": {
        "command": "node",
        "args": ["<resolved path>/vclaw-agent-tools-mcp-stdio.mjs"],
        "env": {
          "VCLAW_AGENT_TOOLS_URL": "http://127.0.0.1:12687/api/vclaw/agent-tools",
          "VCLAW_AGENT_TOOLS_SECRET": "<secret>"
        }
      }
    }
  }
}
```

## `__VCLAW_AGENT_TOOLS_MCP_STDIO__` là gì

`__VCLAW_AGENT_TOOLS_MCP_STDIO__` không phải biến môi trường. Đây là placeholder trong file default config:

```text
vclaw-ui/resources/openclaw.vclaw.default.json
```

Nó không có giá trị trong `.env` hoặc `.env.local`.

Giá trị thật được resolve lúc seed/repair config:

- Dev launcher: `vclaw-ui/launcher/main.js` thay bằng `<repo>/scripts/vclaw-agent-tools-mcp-stdio.mjs`.
- Production packaged app: `vclaw-ui/launcher/main.js` thay bằng `/Applications/VClaw.app/Contents/Resources/vclaw-agent-tools-mcp-stdio.mjs`.
- Packaged shell script: `scripts/vclaw.sh` thay hoặc repair về `$HERE/vclaw-agent-tools-mcp-stdio.mjs`, trong đó `$HERE` là thư mục `Contents/Resources`.

## Vì sao không để `~` hoặc relative path

Không dùng `~` vì `args` được đưa thẳng vào process spawn. `~` là shell expansion, nhưng `StdioClientTransport` spawn command trực tiếp, không chạy qua shell, nên `~` có thể không được expand.

Không dùng relative path trần vì gateway có thể chạy từ nhiều `cwd` khác nhau:

- repo root khi dev
- `core/openclaw-zero-token`
- `/Applications/VClaw.app/Contents/Resources`
- runtime npm package trong `~/.openclaw/runtime`

Relative path dễ trỏ sai file. Vì vậy config live nên chứa absolute path đã resolve theo môi trường đang chạy.

## Tránh nhầm dev và production

Không commit hardcoded path kiểu:

```text
/Users/vf-tuantd26-l/Documents/projects/vclaw/scripts/vclaw-agent-tools-mcp-stdio.mjs
```

Path này chỉ nên xuất hiện trong live config local sau khi chạy dev. Default config trong repo chỉ dùng placeholder.

Launcher và packaged shell script hiện có bước repair khi start để tránh stale path:

- Nếu đang dev, repair `vclaw-business.args[0]` về repo script.
- Nếu đang chạy app `.pkg`, repair về `Contents/Resources/vclaw-agent-tools-mcp-stdio.mjs`.
- Nếu config còn dạng `url`, repair sang `command`.

## Hai hàm repair vừa thêm để làm gì

### `ensureVclawBusinessMcpConfig` trong `vclaw-ui/launcher/main.js`

Hàm này chạy trong luồng launcher Electron/Next của VClaw. Nó được gọi sau khi xác định `~/.openclaw/openclaw.json`.

Mục đích:

- Đọc config OpenClaw hiện tại.
- Tìm `mcp.servers["vclaw-business"]`.
- Giữ lại secret cũ từ `env.VCLAW_AGENT_TOOLS_SECRET` hoặc fallback từ config cũ `auth.token`.
- Nếu server đang dùng `url`, thiếu `command`, trỏ sai bridge, hoặc path bridge còn stale thì ghi lại server theo dạng stdio hợp lệ.
- Resolve path bridge theo môi trường:
  - Dev: `<repo>/scripts/vclaw-agent-tools-mcp-stdio.mjs`
  - Production app: `Contents/Resources/vclaw-agent-tools-mcp-stdio.mjs`

Nói ngắn: hàm này tự chữa config live khi app VClaw khởi động, để OpenClaw luôn thấy tool `vclaw.product.list` đúng môi trường đang chạy.

Nếu không có hàm này, config `~/.openclaw/openclaw.json` đã tồn tại từ trước sẽ không đi qua bước seed placeholder nữa. Khi đó máy có thể giữ mãi path dev hoặc config `url` cũ, làm bot mất catalog tool sau khi chạy `.pkg`.

### `repair_vclaw_business_mcp_config` trong `scripts/vclaw.sh`

Hàm này làm cùng nhiệm vụ nhưng cho luồng shell packaged runtime.

`scripts/vclaw.sh` chạy trong ngữ cảnh `/Applications/VClaw.app/Contents/Resources` khi dùng bản cài `.pkg` hoặc helper script packaged. Vì vậy nó không thể tin vào path dev trong repo.

Mục đích:

- Đọc `$OPENCLAW_CONFIG_PATH` sau khi seed hoặc trước khi start gateway.
- Nhận bridge path thật từ `$HERE/vclaw-agent-tools-mcp-stdio.mjs`.
- Nếu config còn `url`, thiếu `command`, hoặc `args[0]` không khớp `$HERE/...`, ghi lại `vclaw-business` sang stdio.
- Giữ lại `VCLAW_AGENT_TOOLS_SECRET` từ config cũ để không làm lệch auth giữa OpenClaw và VClaw UI.

Nói ngắn: hàm này bảo vệ luồng `.pkg`/shell khỏi việc dùng nhầm absolute path của máy dev:

```text
/Users/vf-tuantd26-l/Documents/projects/vclaw/scripts/vclaw-agent-tools-mcp-stdio.mjs
```

Khi chạy app đã cài, path đúng phải là:

```text
/Applications/VClaw.app/Contents/Resources/vclaw-agent-tools-mcp-stdio.mjs
```

### Vì sao cần cả hai hàm

VClaw có hai entrypoint khởi động OpenClaw:

- `vclaw-ui/launcher/main.js`: luồng app/Electron/Next chính.
- `scripts/vclaw.sh`: luồng packaged helper shell.

Hai entrypoint có `__dirname` / `$HERE` khác nhau. Nếu chỉ sửa một nơi, entrypoint còn lại vẫn có thể start gateway với config cũ hoặc path sai. Vì vậy cả hai đều có repair logic cùng mục tiêu nhưng dùng cách resolve path phù hợp với runtime của nó.

## Verification

Các kiểm tra đã chạy:

```text
pnpm exec vitest run scripts/vclaw-zero-script.test.ts --environment node
```

Kết quả:

```text
1 test file passed
20 tests passed
```

MCP stdio smoke:

```json
{
  "toolCount": 8,
  "hasProductList": true,
  "productCount": 11
}
```

Query không có trong catalog:

```json
{
  "query": "điện thoại",
  "count": 0,
  "empty": true
}
```

Zalo smoke sau fix enrich:

Tin test:

```text
mua sản phẩm rẻ nhất xem là sản phẩm gì
```

Prompt user event đã chứa catalog thật:

```text
[DANH_MỤC_SẢN_PHẨM]
...
- Vé vào cổng Khu du lịch Núi Bà Đen (Tây Ninh): 10,000đ
```

Bot trả lời đúng:

```text
[[reply_to_current]] Dạ vé Núi Bà Đen 10k ạ. Anh mua mấy vé ạ?
```

Cheapest product trong database tại thời điểm test:

```text
Vé vào cổng Khu du lịch Núi Bà Đen (Tây Ninh) - 10,000đ
```

## Quy tắc vận hành sau này

- Bot hỏi sản phẩm/giá/shop bán gì phải gọi `vclaw.product.list` trước.
- Với Zalo inbound, kiểm tra prompt đã có `[VCLAW_BUSINESS_BRAIN]` và `[DANH_MỤC_SẢN_PHẨM]` từ `/api/vclaw/enrich`.
- Nếu `vclaw.product.list` không có sản phẩm phù hợp, bot không được bịa sản phẩm.
- Khi debug lỗi bot bịa catalog, kiểm tra `tools/list` có `vclaw.product.list` trước khi sửa prompt.
- Nếu log có `only stdio MCP servers are supported right now`, config vẫn sai transport.
