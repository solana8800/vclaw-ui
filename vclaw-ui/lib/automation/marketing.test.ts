import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
    },
    automationJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    order: {
      update: vi.fn(),
    },
    integrationPeer: {
      findMany: vi.fn(),
    },
    integrationGroup: {
      findMany: vi.fn(),
    },
  },
  sendZalouserMessage: vi.fn(),
  generateMarketingMessageAction: vi.fn(),
  generateFollowUpAction: vi.fn(),
  getAutomationRules: vi.fn(),
  getApprovalConfig: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/zalouser/zalouser-cli-actions", () => ({
  sendZalouserMessage: mocks.sendZalouserMessage,
}));

vi.mock("@/lib/actions/marketing-actions", () => ({
  generateMarketingMessageAction: mocks.generateMarketingMessageAction,
  generateFollowUpAction: mocks.generateFollowUpAction,
}));

vi.mock("@/lib/actions/shop-settings-actions", () => ({
  getAutomationRules: mocks.getAutomationRules,
}));

vi.mock("@/lib/automation/approval-config", () => ({
  getApprovalConfig: mocks.getApprovalConfig,
}));

function defaultRules() {
  return {
    paymentFollowup: { enabled: true, delayValue: 1, delayUnit: "hours" },
    appointmentReminder: { enabled: false, delayValue: 1, delayUnit: "hours" },
    leadReactivation: { enabled: false, delayValue: 1, delayUnit: "days" },
  };
}

describe("executeHeartbeat", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getApprovalConfig.mockResolvedValue({ automationEnabled: true, paymentAutoApprove: false });
    mocks.getAutomationRules.mockResolvedValue(defaultRules());
    mocks.prisma.conversation.findMany.mockResolvedValue([]);
    mocks.prisma.conversation.findUnique.mockResolvedValue(null);
    mocks.prisma.conversation.findFirst.mockResolvedValue(null);
    mocks.prisma.booking.findMany.mockResolvedValue([]);
    mocks.prisma.automationJob.findFirst.mockResolvedValue(null);
    mocks.prisma.automationJob.create.mockResolvedValue({});
    mocks.prisma.order.update.mockResolvedValue({});
    mocks.sendZalouserMessage.mockResolvedValue(undefined);
  });

  it("chạy follow-up thanh toán theo delay cấu hình và không spam bạn bè/nhóm", async () => {
    mocks.getApprovalConfig.mockResolvedValue({ automationEnabled: true, paymentAutoApprove: false });
    mocks.getAutomationRules.mockResolvedValue(defaultRules());
    mocks.prisma.conversation.findMany.mockResolvedValue([
      {
        id: "conv_1",
        provider: "zalouser",
        externalThreadId: "user_1",
        customer: {
          name: "Anh Nam",
          orders: [{ id: "order_1", status: "PENDING" }],
        },
      },
    ]);
    mocks.prisma.conversation.findUnique.mockResolvedValue({
      id: "conv_1",
      provider: "zalouser",
      externalThreadId: "user_1",
      customer: { name: "Anh Nam" },
    });
    mocks.generateFollowUpAction.mockResolvedValue({ ok: true, content: "Anh Nam gửi bill giúp em nhé." });

    const { executeHeartbeat } = await import("@/lib/automation/marketing");
    const results = await executeHeartbeat();

    expect(mocks.prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          updatedAt: { lt: expect.any(Date) },
        }),
      }),
    );
    expect(mocks.generateFollowUpAction).toHaveBeenCalledWith("conv_1", "order_1");
    expect(mocks.sendZalouserMessage).toHaveBeenCalledWith("user_1", "Anh Nam gửi bill giúp em nhé.");
    expect(mocks.prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { status: "FOLLOW_UP" },
    });
    expect(mocks.prisma.integrationPeer.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.integrationGroup.findMany).not.toHaveBeenCalled();
    expect(results).toEqual([
      expect.objectContaining({ type: "payment_followup", target: "user_1", ok: true }),
    ]);
  });

  it("nhắc lịch hẹn đến hạn và bỏ qua khi booking đã có job", async () => {
    const startTime = new Date(Date.now() + 30 * 60 * 1000);
    mocks.getAutomationRules.mockResolvedValue({
      paymentFollowup: { enabled: false, delayValue: 1, delayUnit: "hours" },
      appointmentReminder: { enabled: true, delayValue: 1, delayUnit: "hours" },
      leadReactivation: { enabled: false, delayValue: 1, delayUnit: "days" },
    });
    mocks.prisma.booking.findMany.mockResolvedValue([
      { id: "booking_sent", customerId: "cus_1", serviceName: "Tư vấn", startTime, customer: { name: "Anh Nam" } },
      { id: "booking_skip", customerId: "cus_2", serviceName: "Demo", startTime, customer: { name: "Chị Linh" } },
    ]);
    mocks.prisma.automationJob.findFirst.mockImplementation(({ where }: any) => {
      const marker = String(where?.notes?.contains ?? "");
      return marker.includes("booking:booking_skip") ? Promise.resolve({ id: "job_old" }) : Promise.resolve(null);
    });
    mocks.prisma.conversation.findFirst.mockResolvedValue({
      id: "conv_booking",
      provider: "zalouser",
      externalThreadId: "user_booking",
    });

    const { executeHeartbeat } = await import("@/lib/automation/marketing");
    const results = await executeHeartbeat();

    expect(mocks.sendZalouserMessage).toHaveBeenCalledTimes(1);
    expect(mocks.sendZalouserMessage).toHaveBeenCalledWith(
      "user_booking",
      expect.stringContaining("Tư vấn"),
    );
    expect(results).toEqual([
      expect.objectContaining({ type: "appointment_reminder", target: "user_booking", ok: true }),
      expect.objectContaining({ type: "appointment_reminder", target: "booking_skip", skipped: true }),
    ]);
  });

  it("không chạy rule nào khi cổng Automation đang tắt", async () => {
    mocks.getApprovalConfig.mockResolvedValue({ automationEnabled: false, paymentAutoApprove: false });

    const { executeHeartbeat } = await import("@/lib/automation/marketing");
    const results = await executeHeartbeat();

    expect(mocks.getAutomationRules).not.toHaveBeenCalled();
    expect(mocks.prisma.conversation.findMany).not.toHaveBeenCalled();
    expect(results).toEqual([
      expect.objectContaining({ type: "automation_gate", skipped: true, error: "automation_disabled" }),
    ]);
  });
});
