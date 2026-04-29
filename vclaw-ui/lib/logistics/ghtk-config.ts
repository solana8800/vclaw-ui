import { prisma } from "@/lib/db";
import { CHANNEL_GHTK } from "@/lib/channel/providers";

type GhtkResolvedConfig = {
  token: string | null;
  pickProvince: string | null;
  pickDistrict: string | null;
  receiverProvince: string | null;
  receiverDistrict: string | null;
  receiverAddress: string | null;
};

export async function getGhtkResolvedConfig(): Promise<GhtkResolvedConfig> {
  const row = await prisma.channelConnection.findUnique({
    where: { provider: CHANNEL_GHTK },
  });
  if (row?.accessToken?.trim() && row.profileJson) {
    try {
      const j = JSON.parse(row.profileJson) as Record<string, string | undefined>;
      return {
        token: row.accessToken.trim(),
        pickProvince: j.pickProvince?.trim() ?? null,
        pickDistrict: j.pickDistrict?.trim() ?? null,
        receiverProvince: j.receiverProvince?.trim() ?? null,
        receiverDistrict: j.receiverDistrict?.trim() ?? null,
        receiverAddress: j.receiverAddress?.trim() ?? null,
      };
    } catch {
      /* fall through */
    }
  }
  return {
    token: process.env.GHTK_TOKEN?.trim() ?? null,
    pickProvince: process.env.GHTK_PICK_PROVINCE?.trim() ?? null,
    pickDistrict: process.env.GHTK_PICK_DISTRICT?.trim() ?? null,
    receiverProvince: process.env.GHTK_RECEIVER_PROVINCE?.trim() ?? null,
    receiverDistrict: process.env.GHTK_RECEIVER_DISTRICT?.trim() ?? null,
    receiverAddress: process.env.GHTK_RECEIVER_ADDRESS?.trim() ?? null,
  };
}
