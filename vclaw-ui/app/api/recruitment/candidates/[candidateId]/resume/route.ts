import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import {
  assertCandidateResumePath,
  readCandidateResumeFile,
  resumeContentTypeFromExt,
} from "@/lib/recruitment/candidate-resume";

type RouteContext = { params: Promise<{ candidateId: string }> };

/** Phục vụ file CV gốc — PDF mở inline trên Chrome; DOC/DOCX có thể tải về. */
export async function GET(_req: Request, context: RouteContext) {
  const { candidateId } = await context.params;
  const id = candidateId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên." }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { cvFileUrl: true },
  });
  if (!candidate?.cvFileUrl?.trim()) {
    return NextResponse.json({ error: "Ứng viên chưa có file CV." }, { status: 404 });
  }

  const pathCheck = assertCandidateResumePath(candidate.cvFileUrl);
  if (!pathCheck.ok) {
    return NextResponse.json({ error: pathCheck.error }, { status: 400 });
  }

  const file = readCandidateResumeFile(candidate.cvFileUrl);
  if (!file.ok) {
    return NextResponse.json({ error: file.error }, { status: 404 });
  }

  const contentType = resumeContentTypeFromExt(file.ext);
  const inline = file.ext === "pdf";
  const disposition = `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(file.fileName)}"`;

  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Content-Length": String(file.buffer.length),
      "Cache-Control": "private, no-cache",
    },
  });
}
