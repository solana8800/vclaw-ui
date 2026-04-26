import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  OpenclawZeroTokenStatusCard,
  type GatewayHealthCardState,
} from "@/components/admin/openclaw-zero-token-status";

describe("OpenclawZeroTokenStatusCard", () => {
  it("hiển thị mode zero-token và chẩn đoán unauthorized", () => {
    const state: GatewayHealthCardState = {
      ok: false,
      status: 401,
      baseUrl: "http://127.0.0.1:3001",
      wsUrl: "ws://127.0.0.1:3001/ws",
      authConfigured: true,
      mode: "zero-token",
      diagnosis: "unauthorized",
      readiness: {
        hasZeroTokenModels: true,
        hasUsableZeroTokenAuth: false,
        hasZeroTokenRuntimeModel: true,
        zeroTokenProviders: ["deepseek-web"],
        sampleModels: ["deepseek-web/deepseek-chat"],
        runtimeModelRef: "deepseek-web/deepseek-chat",
        runtimeModelSource: "recent",
        authProviders: [{ provider: "deepseek-web", displayName: "DeepSeek Web", status: "expired" }],
      },
    };

    render(
      <OpenclawZeroTokenStatusCard
        state={state}
        isLoading={false}
        labels={{
          title: "Zero Token readiness",
          description: "Theo dõi gateway OpenClaw/Zero Token đang được admin dùng.",
          refresh: "Làm mới",
          checking: "Đang kiểm tra",
          modeLabel: "Chế độ",
          restLabel: "REST",
          wsLabel: "WebSocket",
          authLabel: "Token",
          diagnosisLabel: "Chẩn đoán",
          catalogLabel: "Catalog web",
          runtimeModelLabel: "Runtime model",
          authProvidersLabel: "Auth provider web",
          readinessLabels: {
            catalog: "Catalog web",
            auth: "Auth web",
            runtime: "Runtime web",
            ok: "OK",
            notReady: "Chưa đạt",
            unknown: "Không rõ",
          },
          actionTitle: "Bước tiếp theo",
          actionButton: "Mở runbook Zero Token",
          actionDescriptions: {
            missing_token: "Bổ sung token gateway trong env rồi làm mới health.",
            unauthorized: "Đối chiếu lại gateway token giữa VClaw và tiến trình gateway rồi thử lại.",
            unreachable: "Kiểm tra tiến trình gateway, cổng REST/WS và biến OPENCLAW_GATEWAY_URL.",
            missing_catalog: "Nạp cấu hình model web hoặc sample config Zero Token rồi làm mới health.",
            auth_unusable: "Chạy webauth hoặc đăng nhập lại provider web rồi làm mới health.",
            runtime_not_web: "Đổi model mặc định hoặc session hiện tại sang provider *-web/* rồi kiểm tra lại.",
            runtime_unknown: "Mở session status hoặc cấu hình mặc định của gateway để xác nhận runtime model.",
          },
          modeValues: {
            "zero-token": "Zero Token",
            upstream: "OpenClaw thường",
            unknown: "Chưa rõ",
          },
          authValues: {
            configured: "Đã cấu hình",
            missing: "Chưa cấu hình",
          },
          diagnosisValues: {
            ok: "Sẵn sàng",
            unauthorized: "Sai token / bị từ chối",
            unreachable: "Không kết nối được",
            http_error: "Lỗi HTTP",
          },
          empty: "Chưa có dữ liệu health.",
        }}
        onRefresh={vi.fn()}
        actionHref="/vi/docs/18-VClaw-Zero-Token-Onboarding"
      />,
    );

    expect(screen.getByText("Zero Token")).toBeInTheDocument();
    expect(screen.getByText("Sai token / bị từ chối")).toBeInTheDocument();
    expect(screen.getByText("Đã cấu hình")).toBeInTheDocument();
    expect(screen.getByText("deepseek-web/deepseek-chat")).toBeInTheDocument();
    expect(screen.getByText("DeepSeek Web")).toBeInTheDocument();
    expect(screen.getByText("Catalog web: OK")).toBeInTheDocument();
    expect(screen.getByText("Auth web: Chưa đạt")).toBeInTheDocument();
    expect(screen.getByText("Runtime web: OK")).toBeInTheDocument();
    expect(screen.getAllByText("deepseek-web/deepseek-chat")[0]).toBeInTheDocument();
    expect(screen.getByText("Mở runbook Zero Token")).toBeInTheDocument();
    expect(screen.getByText("Đối chiếu lại gateway token giữa VClaw và tiến trình gateway rồi thử lại.")).toBeInTheDocument();
  });

  it("hiển thị trạng thái trống khi chưa có health", () => {
    render(
      <OpenclawZeroTokenStatusCard
        state={null}
        isLoading={false}
        labels={{
          title: "Zero Token readiness",
          description: "Theo dõi gateway OpenClaw/Zero Token đang được admin dùng.",
          refresh: "Làm mới",
          checking: "Đang kiểm tra",
          modeLabel: "Chế độ",
          restLabel: "REST",
          wsLabel: "WebSocket",
          authLabel: "Token",
          diagnosisLabel: "Chẩn đoán",
          catalogLabel: "Catalog web",
          runtimeModelLabel: "Runtime model",
          authProvidersLabel: "Auth provider web",
          readinessLabels: {
            catalog: "Catalog web",
            auth: "Auth web",
            runtime: "Runtime web",
            ok: "OK",
            notReady: "Chưa đạt",
            unknown: "Không rõ",
          },
          actionTitle: "Bước tiếp theo",
          actionButton: "Mở runbook Zero Token",
          actionDescriptions: {
            missing_token: "Bổ sung token gateway trong env rồi làm mới health.",
            unauthorized: "Đối chiếu lại gateway token giữa VClaw và tiến trình gateway rồi thử lại.",
            unreachable: "Kiểm tra tiến trình gateway, cổng REST/WS và biến OPENCLAW_GATEWAY_URL.",
            missing_catalog: "Nạp cấu hình model web hoặc sample config Zero Token rồi làm mới health.",
            auth_unusable: "Chạy webauth hoặc đăng nhập lại provider web rồi làm mới health.",
            runtime_not_web: "Đổi model mặc định hoặc session hiện tại sang provider *-web/* rồi kiểm tra lại.",
            runtime_unknown: "Mở session status hoặc cấu hình mặc định của gateway để xác nhận runtime model.",
          },
          modeValues: {
            "zero-token": "Zero Token",
            upstream: "OpenClaw thường",
            unknown: "Chưa rõ",
          },
          authValues: {
            configured: "Đã cấu hình",
            missing: "Chưa cấu hình",
          },
          diagnosisValues: {
            ok: "Sẵn sàng",
            unauthorized: "Sai token / bị từ chối",
            unreachable: "Không kết nối được",
            http_error: "Lỗi HTTP",
          },
          empty: "Chưa có dữ liệu health.",
        }}
        onRefresh={vi.fn()}
        actionHref="/vi/docs/18-VClaw-Zero-Token-Onboarding"
      />,
    );

    expect(screen.getByText("Chưa có dữ liệu health.")).toBeInTheDocument();
  });

  it("hiển thị Auth web là không rõ khi gateway không báo provider auth", () => {
    const state: GatewayHealthCardState = {
      ok: true,
      status: 200,
      baseUrl: "http://127.0.0.1:3001",
      wsUrl: "ws://127.0.0.1:3001/ws",
      authConfigured: true,
      mode: "zero-token",
      diagnosis: "ok",
      readiness: {
        hasZeroTokenModels: true,
        hasUsableZeroTokenAuth: false,
        hasZeroTokenRuntimeModel: true,
        zeroTokenProviders: ["deepseek-web"],
        sampleModels: ["deepseek-web/deepseek-chat"],
        runtimeModelRef: "deepseek-web/deepseek-chat",
        runtimeModelSource: "recent",
        authProviders: [],
      },
    };

    render(
      <OpenclawZeroTokenStatusCard
        state={state}
        isLoading={false}
        labels={{
          title: "Zero Token readiness",
          description: "Theo dõi gateway OpenClaw/Zero Token đang được admin dùng.",
          refresh: "Làm mới",
          checking: "Đang kiểm tra",
          modeLabel: "Chế độ",
          restLabel: "REST",
          wsLabel: "WebSocket",
          authLabel: "Token",
          diagnosisLabel: "Chẩn đoán",
          catalogLabel: "Catalog web",
          runtimeModelLabel: "Runtime model",
          authProvidersLabel: "Auth provider web",
          readinessLabels: {
            catalog: "Catalog web",
            auth: "Auth web",
            runtime: "Runtime web",
            ok: "OK",
            notReady: "Chưa đạt",
            unknown: "Không rõ",
          },
          actionTitle: "Bước tiếp theo",
          actionButton: "Mở runbook Zero Token",
          actionDescriptions: {
            missing_token: "Bổ sung token gateway trong env rồi làm mới health.",
            unauthorized: "Đối chiếu lại gateway token giữa VClaw và tiến trình gateway rồi thử lại.",
            unreachable: "Kiểm tra tiến trình gateway, cổng REST/WS và biến OPENCLAW_GATEWAY_URL.",
            missing_catalog: "Nạp cấu hình model web hoặc sample config Zero Token rồi làm mới health.",
            auth_unusable: "Chạy webauth hoặc đăng nhập lại provider web rồi làm mới health.",
            runtime_not_web: "Đổi model mặc định hoặc session hiện tại sang provider *-web/* rồi kiểm tra lại.",
            runtime_unknown: "Mở session status hoặc cấu hình mặc định của gateway để xác nhận runtime model.",
          },
          modeValues: {
            "zero-token": "Zero Token",
            upstream: "OpenClaw thường",
            unknown: "Chưa rõ",
          },
          authValues: {
            configured: "Đã cấu hình",
            missing: "Chưa cấu hình",
          },
          diagnosisValues: {
            ok: "Sẵn sàng",
            unauthorized: "Sai token / bị từ chối",
            unreachable: "Không kết nối được",
            http_error: "Lỗi HTTP",
          },
          empty: "Chưa có dữ liệu health.",
        }}
        onRefresh={vi.fn()}
        actionHref="/vi/docs/18-VClaw-Zero-Token-Onboarding"
      />,
    );

    expect(screen.getByText("Auth web: Không rõ")).toBeInTheDocument();
    expect(screen.queryByText("Auth web: Chưa đạt")).not.toBeInTheDocument();
    expect(screen.queryByText("Mở runbook Zero Token")).not.toBeInTheDocument();
  });
});
