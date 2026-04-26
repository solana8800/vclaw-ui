import { describe, expect, it } from "vitest";

import {
  summarizeGatewayModelCatalog,
  summarizeGatewayModelAuthStatus,
  summarizeGatewayRuntimeModelStatus,
} from "@/lib/openclaw/zero-token-model-detection";

describe("summarizeGatewayModelCatalog", () => {
  it("lọc ra provider web và model mẫu", () => {
    expect(
      summarizeGatewayModelCatalog({
        models: [
          { provider: "deepseek-web", id: "deepseek-chat", name: "DeepSeek Chat" },
          { provider: "anthropic", id: "claude-sonnet", name: "Claude Sonnet" },
          { provider: "qwen-web", id: "qwen-plus", name: "Qwen Plus" },
        ],
      }),
    ).toEqual({
      totalModels: 3,
      zeroTokenProviders: ["deepseek-web", "qwen-web"],
      sampleModels: ["deepseek-web/deepseek-chat", "qwen-web/qwen-plus"],
      hasZeroTokenModels: true,
    });
  });
});

describe("summarizeGatewayModelAuthStatus", () => {
  it("giữ lại auth status của provider web", () => {
    expect(
      summarizeGatewayModelAuthStatus({
        providers: [
          { provider: "deepseek-web", displayName: "DeepSeek Web", status: "ok" },
          { provider: "qwen-web", displayName: "Qwen Web", status: "expired" },
          { provider: "anthropic", displayName: "Anthropic", status: "ok" },
        ],
      }),
    ).toEqual({
      totalProviders: 3,
      hasUsableZeroTokenAuth: true,
      zeroTokenProviders: [
        { provider: "deepseek-web", displayName: "DeepSeek Web", status: "ok" },
        { provider: "qwen-web", displayName: "Qwen Web", status: "expired" },
      ],
    });
  });
});

describe("summarizeGatewayRuntimeModelStatus", () => {
  it("ưu tiên session recent để xác định runtime model web", () => {
    expect(
      summarizeGatewayRuntimeModelStatus({
        sessions: {
          defaults: {
            provider: "anthropic",
            model: "claude-sonnet",
          },
          recent: [{ modelProvider: "deepseek-web", model: "deepseek-chat" }],
        },
      }),
    ).toEqual({
      hasZeroTokenRuntimeModel: true,
      runtimeProvider: "deepseek-web",
      runtimeModel: "deepseek-chat",
      runtimeModelRef: "deepseek-web/deepseek-chat",
      runtimeModelSource: "recent",
    });
  });

  it("ưu tiên default web khi recent session cũ vẫn là ollama", () => {
    expect(
      summarizeGatewayRuntimeModelStatus({
        sessions: {
          defaults: {
            provider: "deepseek-web",
            model: "deepseek-chat",
          },
          recent: [{ modelProvider: "ollama", model: "deepseek-r1:8b" }],
        },
      }),
    ).toEqual({
      hasZeroTokenRuntimeModel: true,
      runtimeProvider: "deepseek-web",
      runtimeModel: "deepseek-chat",
      runtimeModelRef: "deepseek-web/deepseek-chat",
      runtimeModelSource: "defaults",
    });
  });

  it("fallback về defaults nếu không có recent", () => {
    expect(
      summarizeGatewayRuntimeModelStatus({
        sessions: {
          defaults: {
            provider: "openai",
            model: "gpt-5.4",
          },
          recent: [],
        },
      }),
    ).toEqual({
      hasZeroTokenRuntimeModel: false,
      runtimeProvider: "openai",
      runtimeModel: "gpt-5.4",
      runtimeModelRef: "openai/gpt-5.4",
      runtimeModelSource: "defaults",
    });
  });
});
