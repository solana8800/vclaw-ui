import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadType } from "./zca-constants.js";
import type { Message } from "./zca-client.js";

const state = vi.hoisted(() => ({
  stateDir: "",
  api: undefined as undefined | MockApi,
}));

class MockListener {
  handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  requestOldMessages = vi.fn();
  start = vi.fn();
  stop = vi.fn();

  on(event: string, callback: (...args: unknown[]) => void): void {
    const callbacks = this.handlers.get(event) ?? new Set();
    callbacks.add(callback);
    this.handlers.set(event, callbacks);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.handlers.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    for (const callback of this.handlers.get(event) ?? []) {
      callback(...args);
    }
  }
}

type MockApi = {
  listener: MockListener;
  getOwnId: () => string;
  getAllFriends: () => Promise<Array<{ userId: string; displayName: string }>>;
  getAllGroups: () => Promise<{ gridVerMap: Record<string, string> }>;
  getGroupInfo: (groupId: string | string[]) => Promise<{
    gridInfoMap: Record<string, { groupId: string; name: string }>;
  }>;
  getContext: () => { imei: string; userAgent: string; language?: string };
  getCookie: () => { toJSON: () => { cookies: unknown[] } };
};

vi.mock("openclaw/plugin-sdk/state-paths", () => ({
  resolveStateDir: vi.fn(() => state.stateDir),
}));

vi.mock("../runtime-api.js", () => ({
  loadOutboundMediaFromUrl: vi.fn(),
}));

vi.mock("zca-js", () => ({
  Zalo: class MockZalo {
    login = vi.fn(async () => {
      state.api = {
        listener: new MockListener(),
        getOwnId: () => "999",
        getAllFriends: async () => [{ userId: "111", displayName: "Alice" }],
        getAllGroups: async () => ({ gridVerMap: { "222": "1" } }),
        getGroupInfo: async () => ({ gridInfoMap: { "222": { groupId: "222", name: "Ops" } } }),
        getContext: () => ({ imei: "imei", userAgent: "ua" }),
        getCookie: () => ({ toJSON: () => ({ cookies: [] }) }),
      };
      return state.api;
    });
  },
}));

function writeCredentials(): void {
  const dir = path.join(state.stateDir, "credentials", "zalouser");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "credentials.json"),
    JSON.stringify({
      imei: "imei",
      cookie: [],
      userAgent: "ua",
      createdAt: new Date().toISOString(),
    }),
  );
}

function createMessage(msgId: string, content: string): Message {
  return {
    type: ThreadType.User,
    threadId: "111",
    isSelf: false,
    data: {
      uidFrom: "111",
      idTo: "999",
      content,
      msgId,
      cliMsgId: `cli-${msgId}`,
      msgType: "webchat",
      ts: Date.now(),
    },
  };
}

function createGroupMessage(msgId: string, content: string): Message {
  return {
    type: ThreadType.Group,
    threadId: "222",
    isSelf: false,
    data: {
      uidFrom: "333",
      idTo: "222",
      content,
      msgId,
      cliMsgId: `cli-${msgId}`,
      msgType: "webchat",
      ts: Date.now(),
    },
  };
}

describe("startZaloListener old_messages fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.OPENCLAW_ZALOUSER_REPLAY_OLD_MESSAGES_BASELINE;
    state.stateDir = mkdtempSync(path.join(os.tmpdir(), "zalouser-old-messages-"));
    state.api = undefined;
    writeCredentials();
  });

  afterEach(() => {
    state.api?.listener.handlers.clear();
  });

  it("replays the first old_messages batch by default and dedupes later synced messages", async () => {
    const { startZaloListener } = await import("./zalo-js.js");
    const onMessage = vi.fn();
    const controller = new AbortController();

    await startZaloListener({
      accountId: "default",
      abortSignal: controller.signal,
      onMessage,
      onError: vi.fn(),
    });

    state.api?.listener.emit("old_messages", [createMessage("m1", "old")], ThreadType.User);
    expect(onMessage).toHaveBeenCalledTimes(1);

    state.api?.listener.emit("old_messages", [createMessage("m2", "new")], ThreadType.User);
    state.api?.listener.emit("old_messages", [createMessage("m2", "new again")], ThreadType.User);

    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage.mock.calls[1]?.[0]).toMatchObject({
      threadId: "111",
      senderId: "111",
      content: "new",
      msgId: "m2",
    });

    controller.abort();
  });

  it("can disable baseline replay with OPENCLAW_ZALOUSER_REPLAY_OLD_MESSAGES_BASELINE=0", async () => {
    process.env.OPENCLAW_ZALOUSER_REPLAY_OLD_MESSAGES_BASELINE = "0";
    const { startZaloListener } = await import("./zalo-js.js");
    const onMessage = vi.fn();
    const controller = new AbortController();

    await startZaloListener({
      accountId: "default",
      abortSignal: controller.signal,
      onMessage,
      onError: vi.fn(),
    });

    state.api?.listener.emit("old_messages", [createMessage("m1", "old")], ThreadType.User);

    expect(onMessage).not.toHaveBeenCalled();

    controller.abort();
  });

  it("also replays the first group old_messages batch", async () => {
    const { startZaloListener } = await import("./zalo-js.js");
    const onMessage = vi.fn();
    const controller = new AbortController();

    await startZaloListener({
      accountId: "default",
      abortSignal: controller.signal,
      onMessage,
      onError: vi.fn(),
    });

    state.api?.listener.emit("old_messages", [createGroupMessage("g1", "group old")], ThreadType.Group);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0]?.[0]).toMatchObject({
      threadId: "222",
      senderId: "333",
      content: "group old",
      isGroup: true,
    });

    controller.abort();
  });
});
