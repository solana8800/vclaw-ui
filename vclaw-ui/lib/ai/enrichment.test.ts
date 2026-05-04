import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { getEnrichedContext } from "./enrichment";
import {
  BOT_ENRICHMENT_SCENARIOS,
  buildBotEvalMarkdown,
  evaluateScenarioChecks,
  type BotEnrichmentScenario,
  type ScenarioRunOutcome,
} from "./enrichment-bot-scenarios";
import { prisma } from "../db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.join(__dirname, "reports", "vclaw-bot-enrichment-eval.md");

const TEST_PHONES = [
  "0900111001",
  "0900111002",
  "0900111003",
  "0900111004",
  "0900111005",
  "0900111006",
  "0900111007",
  "0900111008",
  "0900112001",
] as const;

const TEST_SEED_PRODUCTS = [
  { name: "Áo sơ mi nam Oxford Premium", price: 450_000, productCode: "SHIRT-OXFORD-001", category: "Thời trang nam" },
  { name: "iPhone 16 Pro Max 256GB", price: 34_990_000, productCode: "IPHONE-16-PM-256", category: "Điện thoại" },
  { name: "Kem dưỡng ẩm Neutrogena Hydro Boost", price: 350_000, productCode: "SKIN-NEUTRO-HB", category: "Skincare" },
  { name: "Cà phê hạt Arabica Cầu Đất (500g)", price: 250_000, productCode: "CAFFE-ARABICA-500G", category: "Đồ uống" },
  { name: "Kaspersky Internet Security - 1 PC / 1 Year", price: 180_000, productCode: "KASPERSKY-1PC-1Y", category: "Phần mềm" },
  { name: "Vé VinWonders Nha Trang - Người Lớn", price: 1_050_000, productCode: "VIN-NT-ADULT", category: "Vé du lịch" },
] as const;

async function seedTestProducts() {
  for (const p of TEST_SEED_PRODUCTS) {
    await prisma.product.upsert({
      where: { productCode: p.productCode },
      update: { price: p.price, status: "ACTIVE" },
      create: { name: p.name, price: p.price, productCode: p.productCode, category: p.category, status: "ACTIVE" },
    });
  }
}

async function cleanupTestProducts() {
  await prisma.product.deleteMany({
    where: { productCode: { in: TEST_SEED_PRODUCTS.map(p => p.productCode) } },
  });
}

async function cleanupTestPhones() {
  await prisma.order.deleteMany({
    where: { customer: { phone: { in: [...TEST_PHONES] } } },
  });
  await prisma.customer.deleteMany({
    where: { phone: { in: [...TEST_PHONES] } },
  });
}

async function cleanupByExternalPrefix(prefix: string) {
  await prisma.order.deleteMany({
    where: { customer: { channel: { startsWith: prefix } } },
  });
  await prisma.conversation.deleteMany({
    where: { externalThreadId: { startsWith: prefix } },
  });
  await prisma.customer.deleteMany({
    where: { channel: { startsWith: prefix } },
  });
}

async function seedCustomerConversation(args: {
  externalThreadId: string;
  phone: string;
  name: string;
  channel: string;
}) {
  const customer = await prisma.customer.create({
    data: {
      name: args.name,
      phone: args.phone,
      channel: args.channel,
    },
  });
  await prisma.conversation.create({
    data: {
      provider: "zalo",
      externalThreadId: args.externalThreadId,
      customerId: customer.id,
    },
  });
  return customer;
}

describe("VClaw bot — harness enrichment + báo cáo .md", () => {
  const runBase = `vitest_bot_${Date.now().toString(36)}`;

  afterAll(async () => {
    await cleanupTestPhones();
    await cleanupByExternalPrefix(runBase);
    await cleanupTestProducts();
  });

  it("chạy tuần tự toàn bộ kịch bản, chấm điểm và ghi lib/ai/reports/vclaw-bot-enrichment-eval.md", async () => {
    await cleanupTestPhones();
    await cleanupByExternalPrefix(runBase);
    await seedTestProducts();

    const runOutcomes: ScenarioRunOutcome[] = [];
    let suiteEarned = 0;
    let suiteMax = 0;

    for (const sc of BOT_ENRICHMENT_SCENARIOS) {
      await cleanupForScenario(sc, runBase);

      const externalId =
        sc.seed !== "none" ? `${runBase}_${sc.id.slice(0, 24)}` : `${runBase}_anon`;

      if (sc.seed === "customer_conversation" && sc.seedPhone) {
        await seedCustomerConversation({
          externalThreadId: externalId,
          phone: sc.seedPhone,
          name: "Vitest Bot Khách",
          channel: `${runBase}_${sc.id}`,
        });
      }

      if (sc.seed === "customer_conversation_pending_order" && sc.seedPhone) {
        const customer = await seedCustomerConversation({
          externalThreadId: externalId,
          phone: sc.seedPhone,
          name: "Vitest CK",
          channel: `${runBase}_${sc.id}`,
        });
        await prisma.order.create({
          data: {
            orderNumber: `ORD-T${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            customerId: customer.id,
            amount: sc.pendingOrderAmount ?? 100_000,
            status: "PENDING",
          },
        });
      }

      const contexts: string[] = [];
      for (let r = 0; r < sc.enrichRepeat; r++) {
        const ctx = await getEnrichedContext(sc.pathname, sc.message, externalId, sc.source);
        contexts.push(ctx);
        expect(ctx.length).toBeGreaterThan(100);
      }

      const { outcomes, earned, max } = await evaluateScenarioChecks(prisma, contexts, sc.checks);
      suiteEarned += earned;
      suiteMax += max;

      const scorePercent = max > 0 ? Math.round((100 * earned) / max) : 0;

      runOutcomes.push({
        scenarioId: sc.id,
        title: sc.title,
        difficulty: sc.difficulty,
        difficultyScore: sc.difficultyScore,
        goal: sc.goal,
        earnedPoints: earned,
        maxPoints: max,
        scorePercent,
        checks: outcomes,
        contexts,
        llmManualReviewHint: sc.llmManualReviewHint,
      });
    }

    const md = buildBotEvalMarkdown({
      generatedAtIso: new Date().toISOString(),
      runs: runOutcomes,
      suiteEarned,
      suiteMax,
      noteFooter:
        "## Ghi chú\n\n" +
        "- Điểm thấp ở kịch bản **kho** thường là heuristic SP/SĐT/qty — cần tinh chỉnh `enrichment.ts`.\n" +
        "- Để đánh giá câu trả lời thật của bot: bật gateway + soạn regression prompt hoặc ghi log channel Zalo.\n",
    });

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, md, "utf8");

    expect(fs.existsSync(REPORT_PATH)).toBe(true);

    /** Ngưỡng regression: enrichment + tool chốt đơn tụt nhiều hơn mức này thì fail CI. */
    const minPassRatio = 0.82;
    const ratio = suiteMax > 0 ? suiteEarned / suiteMax : 0;
    if (ratio < minPassRatio) {
      throw new Error(
        `Tổng điểm harness ${suiteEarned}/${suiteMax} (${Math.round(ratio * 100)}%) dưới ngưỡng ${Math.round(minPassRatio * 100)}% — xem ${REPORT_PATH}`
      );
    }
  }, 120_000);
});

async function cleanupForScenario(sc: BotEnrichmentScenario, runBase: string) {
  if (sc.seedPhone) {
    await prisma.order.deleteMany({ where: { customer: { phone: sc.seedPhone } } });
    await prisma.customer.deleteMany({ where: { phone: sc.seedPhone } });
  }
  const extPrefix = `${runBase}_${sc.id.slice(0, 24)}`;
  await prisma.conversation.deleteMany({
    where: { externalThreadId: { startsWith: extPrefix } },
  });
  await prisma.customer.deleteMany({
    where: { channel: { startsWith: `${runBase}_${sc.id}` } },
  });
}
