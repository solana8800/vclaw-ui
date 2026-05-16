import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Endpoint nội bộ — nhận data từ Gateway Bridge và lưu vào DB
function checkAuth(req: NextRequest) {
  const secret = process.env.VCLAW_AGENT_TOOLS_SECRET;
  const auth =
    req.headers.get("x-vclaw-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  return !secret || auth === secret;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  // ---- Nhận ứng viên từ Gateway head-hunter search ----
  if (action === "sync_candidates") {
    const { candidates, jobPositionId } = body as {
      candidates: { name: string; headline?: string; profile_url: string }[];
      jobPositionId?: string;
    };

    let saved = 0;
    for (const c of candidates ?? []) {
      if (!c.profile_url?.includes("/in/")) continue;
      await prisma.candidate.upsert({
        where: { profileUrl: c.profile_url },
        update: {
          name: c.name,
          headline: c.headline,
          jobPositionId: jobPositionId ?? undefined,
        },
        create: {
          name: c.name,
          headline: c.headline ?? null,
          profileUrl: c.profile_url,
          jobPositionId: jobPositionId ?? null,
          status: "POTENTIAL",
        },
      });
      saved++;
    }

    return NextResponse.json({ ok: true, saved });
  }

  // ---- Lưu kết quả đăng bài LinkedIn (từ create_job_post Playwright) ----
  if (action === "save_job_post") {
    const { jobPositionId, title, linkedinJobUrl, companyUrl } = body as {
      jobPositionId?: string;
      title?: string;
      linkedinJobUrl?: string;
      companyUrl?: string;
    };

    try {
      if (jobPositionId) {
        await prisma.jobPosition.update({
          where: { id: jobPositionId },
          data: {
            ...(linkedinJobUrl ? { linkedinJobUrl } : {}),
            ...(companyUrl    ? { companyUrl }     : {}),
            status: "ACTIVE",
          },
        });
      } else if (title) {
        // Tạo mới nếu không có jobPositionId
        await prisma.jobPosition.create({
          data: {
            title,
            linkedinJobUrl: linkedinJobUrl ?? null,
            companyUrl: companyUrl ?? null,
            status: "ACTIVE",
          },
        });
      }
    } catch {
      // Không để lỗi DB block response
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
