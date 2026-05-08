import { describe, expect, it } from "vitest";

import { rankCatalogProductsForQuery } from "@/lib/ai/product-search";

const products = [
  {
    productCode: "SOUV-BANA-TSHIRT",
    name: "Áo thun Bà Nà Hills",
    category: "Quà lưu niệm",
    description: "Áo thun souvenir Bà Nà Hills",
  },
  {
    productCode: "SW-BANA-ADULT",
    name: "Vé Cáp Treo Bà Nà Hills - Người Lớn",
    category: "Vé Sun World",
    description: "Vé điện tử cáp treo Bà Nà Hills cho người lớn",
  },
  {
    productCode: "SW-BANA-CHILD",
    name: "Vé Cáp Treo Bà Nà Hills - Trẻ Em",
    category: "Vé Sun World",
    description: "Vé điện tử cáp treo Bà Nà Hills cho trẻ em",
  },
];

describe("rankCatalogProductsForQuery", () => {
  it("prioritizes Ba Na cable car tickets over souvenirs for ticket queries", () => {
    const ranked = rankCatalogProductsForQuery(products, "vé bà nà");

    expect(ranked.map((product) => product.productCode)).toEqual([
      "SW-BANA-ADULT",
      "SW-BANA-CHILD",
    ]);
  });

  it("matches accent-insensitive multi-word Sun World ticket queries", () => {
    const ranked = rankCatalogProductsForQuery(products, "Ve Sun World Ba Na Hills");

    expect(ranked.map((product) => product.productCode).slice(0, 2)).toEqual([
      "SW-BANA-ADULT",
      "SW-BANA-CHILD",
    ]);
  });
});
