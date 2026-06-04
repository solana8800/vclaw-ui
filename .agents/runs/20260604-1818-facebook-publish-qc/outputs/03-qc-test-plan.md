# Facebook Auto-Publisher - QC Test Plan

## Traceability
| AC | Test ID | Automation | Notes |
| --- | --- | --- | --- |
| AC 1 | `facebook-publish-route.test.ts` | Yes | Bảo vệ contract của API với validation và 404 khi account không tồn tại. |
| AC 2 | `facebook-publish-route.test.ts` | Yes | Kiểm tra payload tạo job giữ nguyên nội dung Unicode và target Page/Group/Profile. |
| AC 3 | `facebook-publish-route.test.ts` | Yes | Kiểm tra queue tạo job cho nhiều target, gồm Group và Profile. |
| AC 4 | `facebook-publish-page.test.tsx` | Yes | Khóa việc tab `fb_publisher` với label `Facebook Auto-Publisher` xuất hiện trên UI. |

## API Contract
- Method: `GET`, `POST`
- Route: `/api/automation/facebook-publish`
- Request: `POST { accountId, content, images?, targets[] }`
- Response: `GET { success, jobs }`, `POST { success, message, jobs }`
- Status codes: `200`, `400`, `404`, `500`
- Design source/Figma node: N/A

## Test Cases
| Test ID | Scenario | Input | Expected | Type |
| --- | --- | --- | --- | --- |
| TC-GET-01 | Lấy lịch sử đăng bài | `GET` | Trả `success: true`, include account an toàn chỉ với `displayName` và `avatarUrl`. | Automated |
| TC-POST-01 | Thiếu `accountId` | `POST` thiếu `accountId` | Trả `400` và message tiếng Việt phù hợp. | Automated |
| TC-POST-02 | Nội dung rỗng | `POST` với `content` chỉ chứa khoảng trắng | Trả `400`. | Automated |
| TC-POST-03 | Chưa chọn đích đăng bài | `POST` với `targets: []` | Trả `400`. | Automated |
| TC-POST-04 | Tài khoản không tồn tại | `POST` với `accountId` không có trong DB | Trả `404`. | Automated |
| TC-POST-05 | Unicode + injection payload | `POST` với tiếng Việt có dấu, emoji và payload nguy hiểm | Tạo job giữ nguyên nội dung thô, không phá vỡ contract. | Automated |
| UI-FB-01 | Tab Facebook publish hiển thị | Render trang admin `zalouser` | Có tab id `fb_publisher` và label `Facebook Auto-Publisher`. | Automated |

## Generated/Updated Files
- `vclaw-ui/app/api/automation/facebook-publish/route.test.ts`
- `vclaw-ui/app/[locale]/admin/zalouser/page.test.tsx`

## Verification
- Command: `pnpm vitest run app/api/automation/facebook-publish/route.test.ts`
- Result: PASS
- Command: `pnpm vitest run 'app/[locale]/admin/zalouser/page.test.tsx'`
- Result: PASS
- Command: `pnpm test`
- Result: FAIL do các test nền sẵn có ngoài phạm vi `facebook-publish`:
  - `scratch/vclaw-zero-script.test.ts`: thiếu `resources/openclaw.vclaw.default.json`
  - `components/recruitment/candidate-bulk-assign-job-dialog.test.ts`, `lib/recruitment/workspace-language.test.ts`, `lib/recruitment/candidate-search-query.test.ts`: lỗi bundling `node:sqlite`
  - `lib/recruitment/candidate-detail-pdf-branding.test.ts`: assertion cũ thất bại
  - `lib/ai/prompts/sales-prompts.test.ts`: thiếu `scripts/packaging/openclaw-workspace/AGENTS.md`
