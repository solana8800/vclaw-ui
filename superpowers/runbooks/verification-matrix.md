# Verification Matrix

## Docs-only change

Run:

```bash
find superpowers -maxdepth 3 -type f | sort
rg "TODO|TBD|output: 'export'|vclaw-ui/out|lib/gateway-client" superpowers docs vclaw-ui/docs README.md KNOWLEDGE_INDEX.md -g '!superpowers/runbooks/verification-matrix.md'
```

Expected:

- File mới xuất hiện đúng vị trí.
- Không có thuật ngữ stale trong file mới, trừ khi đang mô tả lịch sử hoặc cảnh báo stale.

## TypeScript / server action / helper change trong `vclaw-ui`

Run:

```bash
cd vclaw-ui
pnpm tsc --noEmit --ignoreDeprecations 6.0
```

Expected: exit code 0.

## Unit test theo module

Run targeted Vitest theo file đã sửa:

```bash
cd vclaw-ui
pnpm vitest run <path-to-test>
```

Expected: test file liên quan pass.

## Admin UI component change

Run:

```bash
cd vclaw-ui
pnpm eslint <changed-component-file> <changed-lib-file>
pnpm tsc --noEmit --ignoreDeprecations 6.0
```

Expected:

- Targeted ESLint không có error.
- Warning được ghi lại nếu là warning có sẵn hoặc không chặn runtime.

## Full lint

Run:

```bash
cd vclaw-ui
pnpm lint
```

Expected hiện tại:

- Repo đang có nhiều lỗi lint tồn tại sẵn.
- Không dùng full lint làm blocker cho task nhỏ nếu targeted lint và type-check pass.
- Khi task là lint cleanup, full lint phải giảm số lỗi hoặc pass theo mục tiêu plan.

## Packaging

Run:

```bash
bash scripts/package-vclaw.sh
```

Expected:

- Tạo `vclaw-ui/dist/VClawInstaller-<version>-<arch>.pkg`.
- `VClaw.app` chứa Next standalone app, launcher Electron, `openclaw-bundled.tgz`, `zalouser-bundled.tgz`, và `openclaw.default.json`.

## Live Gateway/Zalo

Manual checks:

1. Gateway chạy và token đúng.
2. `/admin/zalouser` kết nối được Gateway WS.
3. QR login thành công.
4. `directory.groups.list` trả nhóm hoặc fallback CLI trả nhóm.
5. Gửi tin từ UI tới nhóm Zalo thành công.
6. Tin nhận từ Zalo xuất hiện trong `chat.history` hoặc event session phù hợp.
7. `Conversation` và `ConversationMessage` có bản ghi mới trong SQLite.
