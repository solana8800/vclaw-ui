"use server";

import { prisma } from "@/lib/db";
import { gateway } from "@/lib/gateway/server";
import { sendLinkedInMessageCDP } from "@/lib/recruitment/actions";
import { revalidatePath } from "next/cache";

const MAX_HISTORY = 20;
const MAX_JOBS = 4;

type ExtractedInfo = {
  about?: string | null;
  location?: string | null;
  experiences?: string[];
  education?: string[];
  skills?: string[];
};

function buildCandidateBlock(candidate: {
  name: string;
  headline?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  availability?: string | null;
  currentSalary?: string | null;
  expectedSalary?: string | null;
  extractedInfo?: string | null;
  strengths?: string | null;
  matchScore?: number | null;
  matchSummary?: string | null;
}): string {
  const lines: string[] = [`Ứng viên: ${candidate.name}`];
  if (candidate.headline) lines.push(`Headline: ${candidate.headline}`);
  if (candidate.location) lines.push(`Địa điểm: ${candidate.location}`);
  if (candidate.currentCompany) lines.push(`Công ty hiện tại: ${candidate.currentCompany}`);
  if (candidate.availability) lines.push(`Sẵn sàng: ${candidate.availability}`);
  if (candidate.currentSalary) lines.push(`Lương hiện tại: ${candidate.currentSalary}`);
  if (candidate.expectedSalary) lines.push(`Mức lương kỳ vọng: ${candidate.expectedSalary}`);
  if (candidate.matchScore != null) lines.push(`Điểm khớp JD: ${candidate.matchScore}/100`);
  if (candidate.matchSummary) lines.push(`Đánh giá: ${candidate.matchSummary}`);
  if (candidate.strengths) lines.push(`Điểm mạnh: ${candidate.strengths}`);

  if (candidate.extractedInfo) {
    try {
      const info: ExtractedInfo = JSON.parse(candidate.extractedInfo);
      if (info.about) lines.push(`Tổng quan: ${info.about.slice(0, 400)}`);
      if (info.skills?.length) lines.push(`Kỹ năng: ${info.skills.slice(0, 12).join(", ")}`);
      if (info.experiences?.length) {
        lines.push("Kinh nghiệm:");
        info.experiences.slice(0, 5).forEach((e) => lines.push(`  - ${e}`));
      }
    } catch {
      // extractedInfo không parse được — bỏ qua
    }
  }

  return `=== THÔNG TIN ỨNG VIÊN ===\n${lines.join("\n")}`;
}

function buildJobsBlock(
  jobs: {
    title: string;
    requirements?: string | null;
    salaryRange?: string | null;
    workMode?: string | null;
    contractType?: string | null;
  }[],
): string {
  if (jobs.length === 0) return "";
  const blocks = jobs.map((j, i) => {
    const parts = [`${i + 1}. ${j.title}`];
    if (j.workMode) parts.push(`   Hình thức: ${j.workMode}`);
    if (j.contractType) parts.push(`   Hợp đồng: ${j.contractType}`);
    if (j.salaryRange) parts.push(`   Mức lương: ${j.salaryRange}`);
    if (j.requirements) parts.push(`   Yêu cầu: ${j.requirements.slice(0, 300)}`);
    return parts.join("\n");
  });
  return `=== VỊ TRÍ ĐANG TUYỂN ===\n${blocks.join("\n\n")}`;
}

export async function generateAndSendLinkedInAutoReply(candidateId: string): Promise<{
  success: boolean;
  reply?: string;
  error?: string;
}> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      name: true,
      headline: true,
      location: true,
      currentCompany: true,
      availability: true,
      currentSalary: true,
      expectedSalary: true,
      extractedInfo: true,
      strengths: true,
      matchScore: true,
      matchSummary: true,
      linkedinProfileIdUrl: true,
      profileUrl: true,
    },
  });

  if (!candidate) {
    return { success: false, error: "Không tìm thấy ứng viên." };
  }

  const profileUrl = candidate.linkedinProfileIdUrl ?? candidate.profileUrl;
  if (!profileUrl) {
    return { success: false, error: "Ứng viên chưa có LinkedIn profile URL." };
  }

  const [conversation, openJobs] = await Promise.all([
    prisma.conversation.findFirst({
      where: { candidateId, provider: "LINKEDIN" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: MAX_HISTORY,
          select: { body: true, direction: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.jobPosition.findMany({
      where: { status: "OPEN" },
      select: { title: true, requirements: true, salaryRange: true, workMode: true, contractType: true },
      take: MAX_JOBS,
    }),
  ]);

  const systemPrompt = `Mày là một recruiter người Việt đang chat LinkedIn với ứng viên, kiểu chat bình thường như nhắn zalo/messenger với bạn bè thôi.

Giai đoạn hội thoại — tự đọc lịch sử rồi nhảy vào đúng chỗ:
- Lần đầu: chào kiểu tự nhiên, hỏi luôn 1 câu về tình trạng đang làm gì / có đang open không
- Đang tìm hiểu: hỏi thêm kn, stack, lương expect, remote hay office
- Đủ info: giới thiệu vị trí match + lý do ngắn tại sao match
- Gần chốt: xin CV hoặc đề xuất call 15 phút

Cách viết — quan trọng nhất:
- Thường 20–55 ký tự, tối đa 80 — ngắn bất thường, như nhắn điện thoại lúc bận
- Độ dài không đều: lúc 20 ký tự lúc 60, đừng đều nhau lần nào
- Dùng trạng từ tự nhiên: à, ừ, oke, vậy hả, thế à, hay đó, được nè, ờ, thật không, ngon đó
- Được dùng teen code: bro, sis, cty, kn (kinh nghiệm), đang open, stack, remote/hybrid, deal, inbox
- Code-switch tự nhiên: nếu người kia nhắn tiếng Anh thì reply tiếng Anh, Việt thì Việt, mix cũng ok
- Câu không cần có chủ ngữ — "Đang làm ở đâu vậy?" thay vì "Bạn đang làm ở đâu vậy?"
- Không bao giờ viết kiểu formal: không "Xin chào", không "Kính gửi", không bullet point, không markdown
- Kết thúc bằng câu hỏi hoặc CTA ngắn — nhưng tự nhiên, không phải template
- Đừng hỏi lại thứ đã biết trong lịch sử chat

Ví dụ tone đúng:
- "Ừa bên mình đang có 1 vị trí khá hợp, đang open không bạn?"
- "Vậy hả, stack của bạn match lắm đó. Expect lương khoảng bao nhiêu?"
- "Oke, inbox mình CV nhé mình xem liền"
- "Thú vị đó, bên mình full remote, bạn có muốn nghe thêm không?"

${buildCandidateBlock(candidate)}

${buildJobsBlock(openJobs)}`;

  const historyMessages = [...(conversation?.messages ?? [])].reverse().map((m) => ({
    role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
    content: m.body,
  }));

  const messages =
    historyMessages.length > 0
      ? historyMessages
      : [{ role: "user" as const, content: "(Ứng viên vừa kết nối lần đầu chưa nhắn gì)" }];

  let reply: string;
  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.72,
        max_tokens: 65,
      },
      { headers: { "x-openclaw-model": "deepseek-web/deepseek-chat" } },
    );
    reply = res.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) return { success: false, error: "AI không trả về nội dung." };
  } catch (err) {
    return { success: false, error: `AI lỗi: ${err instanceof Error ? err.message : String(err)}` };
  }

  console.error(`[autoReply] AI soạn cho ${candidate.name}: "${reply.slice(0, 100)}"`);

  const sendResult = await sendLinkedInMessageCDP(profileUrl, reply, conversation?.externalThreadId);
  if (!sendResult.success) {
    // Vẫn trả reply để caller biết nội dung dù gửi thất bại
    return { success: false, error: `Gửi thất bại: ${sendResult.error}`, reply };
  }

  // Lưu OUTBOUND vào DB để duy trì lịch sử hội thoại cho lần sau
  if (conversation) {
    await prisma.conversationMessage
      .create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          body: reply,
          externalMessageId: `auto_${Date.now()}`,
        },
      })
      .catch(() => {});
  }

  revalidatePath("/admin/recruitment/candidates");
  return { success: true, reply };
}
