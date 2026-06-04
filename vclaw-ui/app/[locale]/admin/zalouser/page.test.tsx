import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  tabs: null as null | Array<{ id: string; label: string }>,
  defaultTab: null as null | string,
}));

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock("@/components/admin/admin-shell", () => ({
  AdminShell: ({ children }: { children: ReactNode }) => (
    <section data-testid="admin-shell">{children}</section>
  ),
}));

vi.mock("@/components/admin/admin-page-tabs", () => ({
  AdminPageTabs: ({
    tabs,
    defaultTab,
  }: {
    tabs: Array<{ id: string; label: string }>;
    defaultTab: string;
  }) => {
    captured.tabs = tabs;
    captured.defaultTab = defaultTab;
    return <div data-testid="admin-page-tabs" />;
  },
}));

vi.mock("@/lib/admin/runtime", () => ({
  getAdminLocaleContent: vi.fn(async () => ({
    admin: {
      navigation: {
        tab_bot: "Zalo Bot",
        tab_automation: "Automation",
      },
      openclawZalouser: {
        title: "Zalo User",
        description: "Màn hình quản trị",
      },
      automation: {
        jobStats: {
          loading: "Đang tải...",
          queued: "Queued",
          pending_publish: "Pending publish",
          done: "Done",
        },
        automationRules: null,
        heartbeat: null,
        marketing: null,
        automationHistory: null,
      },
      common: {},
    },
    navigation: {},
    shell: {
      badge: "beta",
      sidebarTitle: "Sidebar",
      sidebarDescription: "Mô tả",
    },
    workspaceLabels: {},
  })),
}));

vi.mock("@/lib/zalouser/zalouser-cli-actions", () => ({
  getZalouserStateFromDb: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/actions/automation-actions", () => ({
  getAutomationJobs: vi.fn(async () => ({
    data: [],
    totalPages: 1,
  })),
}));

vi.mock("@/lib/actions/shop-settings-actions", () => ({
  getAutomationRules: vi.fn(async () => []),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    automationJob: {
      count: vi.fn(async () => 0),
    },
  },
}));

vi.mock("@/components/admin/facebook-publisher-dashboard", () => ({
  FacebookPublisherDashboard: () => <div data-testid="facebook-dashboard" />,
}));

describe("OpenclawZalouserPage", () => {
  beforeEach(() => {
    vi.resetModules();
    captured.tabs = null;
    captured.defaultTab = null;
  });

  it("hiển thị tab Facebook Auto-Publisher trên trang admin", async () => {
    const { default: OpenclawZalouserPage } = await import(
      "@/app/[locale]/admin/zalouser/page"
    );

    const element = await OpenclawZalouserPage({
      params: Promise.resolve({ locale: "vi" }),
      searchParams: Promise.resolve({}),
    });

    renderToStaticMarkup(element);

    expect(captured.defaultTab).toBe("bot");
    expect(captured.tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "fb_publisher",
          label: "Facebook Auto-Publisher",
        }),
      ]),
    );
  });
});
