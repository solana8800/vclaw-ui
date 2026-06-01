import { prisma } from "@/lib/db";
import { deleteCandidateResumeFile } from "@/lib/recruitment/candidate-resume";

export async function deleteCandidateRecord(candidateId: string) {
  const id = candidateId?.trim();
  if (!id) return { success: false as const, error: "Không tìm thấy ứng viên." };

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { cvFileUrl: true },
  });
  if (!candidate) return { success: false as const, error: "Không tìm thấy ứng viên." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.conversation.deleteMany({ where: { candidateId: id } });
      await tx.candidate.delete({ where: { id } });
    });
  } catch (error) {
    console.error("[deleteCandidateRecord]", error);
    return { success: false as const, error: "Không xóa được ứng viên." };
  }

  deleteCandidateResumeFile(candidate.cvFileUrl);
  return { success: true as const };
}
