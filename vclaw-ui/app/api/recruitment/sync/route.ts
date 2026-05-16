import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Endpoint nội bộ — chỉ Gateway Bridge mới gọi vào đây
function checkAuth(req: NextRequest) {
  const secret = process.env.VCLAW_AGENT_TOOLS_SECRET;
  const auth = req.headers.get("x-vclaw-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || auth !== secret) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, data } = body;

  try {
    // ---- Lưu ứng viên tìm được từ LinkedIn ----
    if (type === "candidates") {
      const { candidates, jobPositionId } = data as {
        candidates: { name: string; headline?: string; profile_url: string; location?: string }[];
        jobPositionId?: string;
      };

      const saved = [];
      for (const c of candidates) {
        if (!c.profile_url || !c.profile_url.includes("/in/")) continue;
        const record = await prisma.candidate.upsert({
          where: { profileUrl: c.profile_url },
          update: {
            name: c.name,
            headline: c.headline,
            jobPositionId: jobPositionId || undefined,
          },
          create: {
            name: c.name,
            headline: c.headline ?? null,
            profileUrl: c.profile_url,
            jobPositionId: jobPositionId ?? null,
            status: "POTENTIAL",
          },
        });
        saved.push(record);
      }

      return NextResponse.json({ ok: true, saved: saved.length });
    }

    // ---- Lưu bài đăng tuyển dụng ----
    if (type === "job_post") {
      const { jobPositionId, linkedinJobId, linkedinJobUrl, companyUrl, title } = data as {
        jobPositionId?: string;
        linkedinJobId: string;
        linkedinJobUrl?: string;
        companyUrl?: string;
        title?: string;
      };

      let job;
      if (jobPositionId) {
        // Cập nhật job đã có
        job = await prisma.jobPosition.update({
          where: { id: jobPositionId },
          data: {
            linkedinJobId,
            linkedinJobUrl: linkedinJobUrl ?? null,
            companyUrl: companyUrl ?? null,
            status: "ACTIVE",
          },
        });
      } else {
        // Tạo mới nếu chưa có
        job = await prisma.jobPosition.upsert({
          where: { id: linkedinJobId },
          update: {
            linkedinJobUrl: linkedinJobUrl ?? undefined,
            companyUrl: companyUrl ?? undefined,
          },
          create: {
            id: linkedinJobId,
            title: title ?? "Vị trí tuyển dụng",
            linkedinJobId,
            linkedinJobUrl: linkedinJobUrl ?? null,
            companyUrl: companyUrl ?? null,
            status: "ACTIVE",
          },
        });
      }

      return NextResponse.json({ ok: true, job });
    }

    // ---- Cập nhật LinkedIn URL khi sync xong ----
    if (type === "job_linkedin_url") {
      const { linkedinJobId, linkedinJobUrl } = data as {
        linkedinJobId: string;
        linkedinJobUrl: string;
      };

      const updated = await prisma.jobPosition.updateMany({
        where: { linkedinJobId },
        data: { linkedinJobUrl },
      });

      return NextResponse.json({ ok: true, updated: updated.count });
    }

    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
  } catch (err) {
    console.error("[recruitment/sync] Lỗi:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
