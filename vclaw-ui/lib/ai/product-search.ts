export type ProductSearchCandidate = {
  productCode?: string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function queryTokens(query: string): string[] {
  return Array.from(
    new Set(
      normalizeSearchText(query)
        .split(/\s+/)
        .filter((token) => token.length >= 2),
    ),
  );
}

function textTokens(value: string): Set<string> {
  return new Set(value.split(/\s+/).filter(Boolean));
}

function scoreProduct(query: string, tokens: string[], product: ProductSearchCandidate): number {
  if (tokens.length === 0) return 0;

  const normalizedQuery = normalizeSearchText(query);
  const name = normalizeSearchText(product.name ?? "");
  const category = normalizeSearchText(product.category ?? "");
  const description = normalizeSearchText(product.description ?? "");
  const code = normalizeSearchText(product.productCode ?? "");
  const searchable = [name, category, description, code].filter(Boolean).join(" ");
  const searchableTokens = textTokens(searchable);

  if (!searchable) return 0;

  const specificTokens = tokens.filter(
    (token) => !["ve", "cap", "treo", "sun", "world", "hills"].includes(token),
  );
  if (
    specificTokens.length > 0 &&
    !specificTokens.every((token) => searchableTokens.has(token))
  ) {
    return 0;
  }
  if (tokens.includes("ve") && !searchableTokens.has("ve")) {
    return 0;
  }

  let score = 0;
  if (normalizedQuery && name.includes(normalizedQuery)) score += 80;
  const nameTokens = textTokens(name);
  const categoryTokens = textTokens(category);
  const codeTokens = textTokens(code);
  const descriptionTokens = textTokens(description);
  if (tokens.every((token) => nameTokens.has(token))) score += 60;

  for (const token of tokens) {
    if (nameTokens.has(token)) score += 12;
    if (categoryTokens.has(token)) score += 5;
    if (codeTokens.has(token)) score += 4;
    if (descriptionTokens.has(token)) score += 2;
  }

  return score;
}

export function rankCatalogProductsForQuery<T extends ProductSearchCandidate>(
  products: T[],
  query: string,
): T[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return products;

  const tokens = queryTokens(trimmedQuery);
  if (tokens.length === 0) return products;

  return products
    .map((product, index) => ({
      product,
      index,
      score: scoreProduct(trimmedQuery, tokens, product),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.product);
}
