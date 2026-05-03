import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const shellPath = join(process.cwd(), "components", "app", "locale-shell.tsx");
const shellSource = readFileSync(shellPath, "utf8");

describe("LocaleShell MVP admin surface", () => {
  it("does not mount the floating admin chat assistant by default", () => {
    expect(shellSource).not.toContain("AdminChatAssistant");
    expect(shellSource).not.toContain("@/components/admin/admin-chat-assistant");
  });
});
