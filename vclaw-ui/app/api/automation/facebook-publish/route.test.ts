import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    facebookAccount: {
      findUnique: vi.fn(),
    },
    facebookPublishJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  publishToFacebookTarget: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/facebook/publisher", () => ({
  publishToFacebookTarget: mocks.publishToFacebookTarget,
}));

describe("API /api/automation/facebook-publish", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.prisma.facebookPublishJob.findFirst.mockResolvedValue(null);
  });

  it("trả danh sách logs gần nhất và chỉ lấy field an toàn của tài khoản", async () => {
    mocks.prisma.facebookPublishJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        content: "Khuyến mãi Tết 2026 - mua 1 tặng 1",
        targetType: "GROUP",
        targetId: "https://facebook.com/groups/retail-group",
        targetName: "Hội Chợ Bán Lẻ Việt Nam",
        status: "SUCCESS",
        evidenceImage: "/evidence/fb-job_1.png",
        errorMessage: null,
        runAt: null,
        createdAt: "2026-06-04T10:00:00.000Z",
        account: {
          displayName: "Nguyễn Văn A",
          avatarUrl: "https://example.com/avatar.png",
        },
      },
    ]);

    const { GET } = await import("@/app/api/automation/facebook-publish/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      jobs: [
        expect.objectContaining({
          id: "job_1",
          status: "SUCCESS",
          account: {
            displayName: "Nguyễn Văn A",
            avatarUrl: "https://example.com/avatar.png",
          },
        }),
      ],
    });
    expect(mocks.prisma.facebookPublishJob.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        account: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  });

  it("trả 400 khi thiếu accountId", async () => {
    const { POST } = await import("@/app/api/automation/facebook-publish/route");
    const res = await POST(
      new Request("http://localhost/api/automation/facebook-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: "Nội dung có dấu tiếng Việt",
          targets: [{ type: "GROUP", id: "https://facebook.com/groups/retail-group" }],
        }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: "Thiếu thông tin tài khoản Facebook",
    });
    expect(mocks.prisma.facebookAccount.findUnique).not.toHaveBeenCalled();
  });

  it("trả 400 khi nội dung trống hoặc chỉ có khoảng trắng", async () => {
    const { POST } = await import("@/app/api/automation/facebook-publish/route");
    const res = await POST(
      new Request("http://localhost/api/automation/facebook-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: "acc_1",
          content: "   ",
          targets: [{ type: "GROUP", id: "https://facebook.com/groups/retail-group" }],
        }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: "Nội dung bài viết không được để trống",
    });
  });

  it("trả 400 khi chưa chọn đích đăng bài", async () => {
    const { POST } = await import("@/app/api/automation/facebook-publish/route");
    const res = await POST(
      new Request("http://localhost/api/automation/facebook-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: "acc_1",
          content: "Nội dung đăng bài",
          targets: [],
        }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: "Vui lòng chọn ít nhất một nơi đăng bài (Page, Group hoặc Profile)",
    });
  });

  it("trả 404 khi tài khoản Facebook không tồn tại", async () => {
    mocks.prisma.facebookAccount.findUnique.mockResolvedValue(null);

    const { POST } = await import("@/app/api/automation/facebook-publish/route");
    const res = await POST(
      new Request("http://localhost/api/automation/facebook-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: "missing-account",
          content: "Nội dung đăng bài",
          targets: [{ type: "GROUP", id: "https://facebook.com/groups/retail-group" }],
        }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({
      success: false,
      error: "Tài khoản Facebook không tồn tại hoặc đã bị hủy kết nối",
    });
  });

  it("giữ nguyên nội dung Unicode và payload nguy hiểm như dữ liệu thô khi tạo job", async () => {
    mocks.prisma.facebookAccount.findUnique.mockResolvedValue({
      id: "acc_1",
    });
    mocks.prisma.facebookPublishJob.create.mockImplementation(async ({ data }) => ({
      id: `job_${mocks.prisma.facebookPublishJob.create.mock.calls.length}`,
      ...data,
    }));

    const { POST } = await import("@/app/api/automation/facebook-publish/route");
    const content =
      "Khuyến mãi Tết 2026 - giảm 30% cho khách thân thiết; DROP TABLE FacebookPublishJob; <script>alert('x')</script>";
    const res = await POST(
      new Request("http://localhost/api/automation/facebook-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: "acc_1",
          content,
          images: [
            "https://example.com/ảnh-1.jpg",
            "/uploads/sản-phẩm-2.jpg",
          ],
          targets: [
            {
              type: "GROUP",
              id: "https://facebook.com/groups/retail-group",
              name: "Hội Chợ Bán Lẻ Việt Nam",
            },
            {
              type: "PROFILE",
              id: "profile",
              name: "Trang cá nhân",
            },
          ],
        }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.jobs).toHaveLength(2);
    expect(mocks.prisma.facebookPublishJob.create).toHaveBeenNthCalledWith(
      1,
      {
        data: {
          accountId: "acc_1",
          content,
          images: "https://example.com/ảnh-1.jpg,/uploads/sản-phẩm-2.jpg",
          targetType: "GROUP",
          targetId: "https://facebook.com/groups/retail-group",
          targetName: "Hội Chợ Bán Lẻ Việt Nam",
          status: "QUEUED",
        },
      },
    );
    expect(mocks.prisma.facebookPublishJob.create).toHaveBeenNthCalledWith(
      2,
      {
        data: {
          accountId: "acc_1",
          content,
          images: "https://example.com/ảnh-1.jpg,/uploads/sản-phẩm-2.jpg",
          targetType: "PROFILE",
          targetId: "profile",
          targetName: "Trang cá nhân",
          status: "QUEUED",
        },
      },
    );
  });
});
