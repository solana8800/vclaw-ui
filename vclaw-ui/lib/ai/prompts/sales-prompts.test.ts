import {
  ENRICHMENT_GENERAL_BEHAVIOR,
  ENRICHMENT_NO_QR_WARNING,
  FOLLOWUP_DRAFT_ORDER_PROMPT,
  getSalesPersona,
  PRODUCT_MARKETING_PROMPT,
  SALES_GUIDELINES_RULES,
  TOOL_NOTE_CATALOG,
} from "@/lib/ai/prompts";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "..");

function readSeed(file: string) {
  return fs.readFileSync(
    path.join(repoRoot, "scripts/packaging/openclaw-workspace", file),
    "utf8",
  );
}

describe("sales prompts", () => {
  it("defines an active sales funnel instead of passive holding replies", () => {
    const prompt = getSalesPersona("Shop Test");
    const promptText = [
      prompt,
      ...SALES_GUIDELINES_RULES,
      ENRICHMENT_GENERAL_BEHAVIOR,
    ].join("\n");

    expect(promptText).toContain("không trả lời giữ chỗ");
    expect(promptText).toContain("Dạ em vẫn nghe");
    expect(promptText).toContain("phễu bán hàng");
    expect(promptText).toContain("đề xuất sản phẩm");
    expect(promptText).toContain("câu hỏi nghiệp vụ duy nhất");
  });

  it("requires pending order, QR payment, and bill verification after close", () => {
    const promptText = [
      getSalesPersona("Shop Test"),
      ...SALES_GUIDELINES_RULES,
      ENRICHMENT_NO_QR_WARNING,
      FOLLOWUP_DRAFT_ORDER_PROMPT,
    ].join("\n");

    expect(promptText).toContain("order pending");
    expect(promptText).toContain("vclaw.order.create");
    expect(promptText).toContain("img.vietqr.io");
    expect(promptText).toContain("gửi bill");
    expect(promptText).toContain("vclaw.payment.verify_bill");
  });

  it("handles greeting-only messages as sales openings, not receptionist replies", () => {
    const promptText = [
      getSalesPersona("Shop Test"),
      ...SALES_GUIDELINES_RULES,
      ENRICHMENT_GENERAL_BEHAVIOR,
    ].join("\n");

    expect(promptText).toContain("Alo");
    expect(promptText).toContain("vclaw.product.list");
    expect(promptText).toContain("mở bán hàng");
    expect(promptText).toContain("không hỏi \"cần gì\"");
  });

  it("forces product questions through catalog truth before answering", () => {
    const promptText = [
      getSalesPersona("Shop Test"),
      TOOL_NOTE_CATALOG,
      ...SALES_GUIDELINES_RULES,
      ENRICHMENT_GENERAL_BEHAVIOR,
    ].join("\n");

    expect(promptText).toContain("KỶ LUẬT CATALOG");
    expect(promptText).toContain("không có trong catalog thì không bán");
    expect(promptText).toContain("không lấy giá từ trí nhớ");
    expect(promptText).toContain("vclaw.product.list");
    expect(promptText).toContain("gợi sản phẩm gần nhất đang có");
    expect(promptText).toContain("catalog rỗng");
    expect(promptText).toContain("không được tự nghĩ sản phẩm");
  });

  it("separates customer-facing sales bot from admin assistant behavior", () => {
    const promptText = [
      getSalesPersona("Shop Test"),
      ...SALES_GUIDELINES_RULES,
      ENRICHMENT_GENERAL_BEHAVIOR,
    ].join("\n");

    expect(promptText).toContain("khách hàng cuối");
    expect(promptText).toContain("không phải admin");
    expect(promptText).toContain("không tư vấn vận hành trang admin");
  });

  it("defines a concrete reply playbook for greeting and product interest", () => {
    const promptText = [
      getSalesPersona("Shop Test"),
      ...SALES_GUIDELINES_RULES,
      ENRICHMENT_GENERAL_BEHAVIOR,
    ].join("\n");

    expect(promptText).toContain("[PLAYBOOK]");
    expect(promptText).toContain("Greeting-only");
    expect(promptText).toContain("Hỏi sản phẩm/giá");
    expect(promptText).toContain("Quan tâm mua");
    expect(promptText).toContain("Bán sai sản phẩm là lỗi nghiêm trọng");
  });

  it("keeps packaged runtime workspace strict enough for the real bot", () => {
    const seedText = [
      readSeed("AGENTS.md"),
      readSeed("TOOLS.md"),
      readSeed("SOUL.md"),
      readSeed("IDENTITY.md"),
    ].join("\n");

    expect(seedText).toContain("KỶ LUẬT CATALOG");
    expect(seedText).toContain("Bán sai sản phẩm là lỗi nghiêm trọng");
    expect(seedText).toContain("Không có catalog thì không báo giá");
    expect(seedText).toContain("catalog rỗng");
    expect(seedText).toContain("không tự nghĩ sản phẩm");
    expect(seedText).toContain("khách hàng cuối");
    expect(seedText).toContain("không phải admin");
    expect(seedText).toContain("Nếu khách chỉ chào");
    expect(seedText).toContain("không hỏi \"cần gì\"");
  });

  it("makes product marketing copy sell the exact product, not generic inbox bait", () => {
    const prompt = PRODUCT_MARKETING_PROMPT("Vé Bà Nà Hills", "vé người lớn cuối tuần");

    expect(prompt).toContain("đúng sản phẩm");
    expect(prompt).toContain("không đổi sang sản phẩm khác");
    expect(prompt).toContain("giá thật");
    expect(prompt).toContain("SĐT");
  });
});
