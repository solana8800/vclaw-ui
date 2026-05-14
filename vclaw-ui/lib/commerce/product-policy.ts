export type ProductKind = "PHYSICAL" | "DIGITAL" | "THIRD_PARTY" | "SERVICE";
export type PaymentMode = "PREPAID" | "COD" | "EXTERNAL_COLLECT" | "MANUAL_REVIEW";
export type FulfillmentMode = "GHN_SHIPPING" | "ZALO_GROUP" | "EMAIL_DELIVERY" | "THIRD_PARTY_API" | "MANUAL";
export type CustomerField = "name" | "phone" | "address" | "email";

export type ProductPolicySource = {
  id: string;
  name: string;
  price: number;
  type?: string | null;
  metadata?: string | null;
  productCode?: string | null;
  commercePolicyJson?: string | null;
};

export type ProductCommercePolicy = {
  productKind: ProductKind;
  paymentMode: PaymentMode;
  fulfillmentMode: FulfillmentMode;
  requiresPaymentBeforeFulfillment: boolean;
  requiresBillVerification: boolean;
  requiredCustomerFields: CustomerField[];
  provider?: {
    name: string;
    productSku?: string;
    apiMode?: "CREATE_ORDER" | "ISSUE_TICKET" | "EXTERNAL_LINK";
  };
  shipping?: {
    carrier: "GHN" | "MANUAL";
    allowCod: boolean;
    weightGram?: number;
  };
};

export type CheckoutItemInput = {
  product: ProductPolicySource;
  quantity: number;
};

export type CheckoutCustomerInput = Partial<Record<CustomerField, string | null>>;

export type CheckoutNextAction =
  | "COLLECT_MISSING_FIELDS"
  | "CREATE_PENDING_ORDER_AND_SEND_QR"
  | "CREATE_COD_ORDER_AND_SHIPPING"
  | "CREATE_EXTERNAL_ORDER"
  | "MANUAL_REVIEW"
  | "SPLIT_ORDER_BY_POLICY";

export type CheckoutPreparation = {
  canCreateOrder: boolean;
  nextAction: CheckoutNextAction;
  missingFields: CustomerField[];
  totalAmount: number;
  paymentMode: PaymentMode;
  fulfillmentMode: FulfillmentMode;
  requiresPaymentBeforeFulfillment: boolean;
  requiresBillVerification: boolean;
  policyGroups: Array<{
    key: string;
    paymentMode: PaymentMode;
    fulfillmentMode: FulfillmentMode;
    itemProductIds: string[];
  }>;
  items: Array<{
    productId: string;
    productCode: string | null;
    name: string;
    quantity: number;
    price: number;
    amount: number;
    policy: ProductCommercePolicy;
  }>;
  instruction: string;
};

export type OrderCreateNextTool =
  | "vclaw.payment.verify_bill"
  | "vclaw.shipping.create_ghn_order"
  | "vclaw.shipping.notify_zalo_group"
  | "vclaw.digital.fulfill_email"
  | "vclaw.third_party.create_order"
  | "manual_review";

type MetadataPolicyInput = Partial<ProductCommercePolicy> & {
  productKind?: string;
  paymentMode?: string;
  fulfillmentMode?: string;
  requiredCustomerFields?: unknown;
  requiresPaymentBeforeFulfillment?: unknown;
  requiresBillVerification?: unknown;
};

const PRODUCT_KINDS: ProductKind[] = ["PHYSICAL", "DIGITAL", "THIRD_PARTY", "SERVICE"];
const PAYMENT_MODES: PaymentMode[] = ["PREPAID", "COD", "EXTERNAL_COLLECT", "MANUAL_REVIEW"];
const FULFILLMENT_MODES: FulfillmentMode[] = ["GHN_SHIPPING", "ZALO_GROUP", "EMAIL_DELIVERY", "THIRD_PARTY_API", "MANUAL"];
const CUSTOMER_FIELDS: CustomerField[] = ["name", "phone", "address", "email"];

export function parseProductMetadata(metadata: string | null | undefined): Record<string, unknown> {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function resolveProductCommercePolicy(product: ProductPolicySource): ProductCommercePolicy {
  const metadata = parseProductMetadata(product.metadata);
  const policyInput = readPolicyInput(product.commercePolicyJson, metadata);
  const productKind = normalizeProductKind(policyInput.productKind, product.type);
  const defaults = defaultPolicyForKind(productKind);
  const paymentMode = normalizeEnum(policyInput.paymentMode, PAYMENT_MODES) ?? defaults.paymentMode;
  const fulfillmentMode = normalizeEnum(policyInput.fulfillmentMode, FULFILLMENT_MODES) ?? defaults.fulfillmentMode;
  const requiredCustomerFields = normalizeCustomerFields(policyInput.requiredCustomerFields) ??
    defaultRequiredFields(productKind, fulfillmentMode);
  const requiresPaymentBeforeFulfillment =
    typeof policyInput.requiresPaymentBeforeFulfillment === "boolean"
      ? policyInput.requiresPaymentBeforeFulfillment
      : paymentMode === "PREPAID";
  const requiresBillVerification =
    typeof policyInput.requiresBillVerification === "boolean"
      ? policyInput.requiresBillVerification
      : paymentMode === "PREPAID";
  const provider = normalizeProvider(policyInput.provider);
  const shipping = normalizeShipping(policyInput.shipping, paymentMode, fulfillmentMode);

  return {
    productKind,
    paymentMode,
    fulfillmentMode,
    requiresPaymentBeforeFulfillment,
    requiresBillVerification,
    requiredCustomerFields,
    ...(provider ? { provider } : {}),
    ...(shipping ? { shipping } : {}),
  };
}

export function prepareCheckout(params: {
  items: CheckoutItemInput[];
  customer?: CheckoutCustomerInput;
}): CheckoutPreparation {
  const normalizedItems = params.items.map((item) => {
    const quantity = normalizeQuantity(item.quantity);
    const price = Number(item.product.price) || 0;
    return {
      productId: item.product.id,
      productCode: item.product.productCode ?? null,
      name: item.product.name,
      quantity,
      price,
      amount: price * quantity,
      policy: resolveProductCommercePolicy(item.product),
    };
  });

  const policyGroups = buildPolicyGroups(normalizedItems);
  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
  const primaryPolicy = normalizedItems[0]?.policy ?? defaultPolicyForKind("PHYSICAL");

  if (policyGroups.length > 1) {
    return {
      canCreateOrder: false,
      nextAction: "SPLIT_ORDER_BY_POLICY",
      missingFields: [],
      totalAmount,
      paymentMode: primaryPolicy.paymentMode,
      fulfillmentMode: primaryPolicy.fulfillmentMode,
      requiresPaymentBeforeFulfillment: primaryPolicy.requiresPaymentBeforeFulfillment,
      requiresBillVerification: primaryPolicy.requiresBillVerification,
      policyGroups,
      items: normalizedItems,
      instruction: "Các sản phẩm có cách thu tiền/giao hàng khác nhau. Hãy tách thành nhiều đơn theo từng policy.",
    };
  }

  const missingFields = findMissingCustomerFields(
    uniqueFields(normalizedItems.flatMap((item) => item.policy.requiredCustomerFields)),
    params.customer ?? {},
  );
  const nextAction = missingFields.length > 0
    ? "COLLECT_MISSING_FIELDS"
    : nextActionForPolicy(primaryPolicy);

  return {
    canCreateOrder: missingFields.length === 0 && nextAction !== "MANUAL_REVIEW",
    nextAction,
    missingFields,
    totalAmount,
    paymentMode: primaryPolicy.paymentMode,
    fulfillmentMode: primaryPolicy.fulfillmentMode,
    requiresPaymentBeforeFulfillment: primaryPolicy.requiresPaymentBeforeFulfillment,
    requiresBillVerification: primaryPolicy.requiresBillVerification,
    policyGroups,
    items: normalizedItems,
    instruction: instructionFor(nextAction, missingFields),
  };
}

export function nextToolAfterOrderCreate(policy: {
  paymentMode: PaymentMode;
  fulfillmentMode: FulfillmentMode;
}): OrderCreateNextTool {
  if (policy.paymentMode === "PREPAID") return "vclaw.payment.verify_bill";
  if (policy.paymentMode === "COD" && policy.fulfillmentMode === "ZALO_GROUP") return "vclaw.shipping.notify_zalo_group";
  if (policy.paymentMode === "COD") return "vclaw.shipping.create_ghn_order";
  if (policy.fulfillmentMode === "ZALO_GROUP") return "vclaw.shipping.notify_zalo_group";
  if (policy.fulfillmentMode === "EMAIL_DELIVERY") return "vclaw.digital.fulfill_email";
  if (policy.fulfillmentMode === "THIRD_PARTY_API") return "vclaw.third_party.create_order";
  if (policy.fulfillmentMode === "GHN_SHIPPING") return "vclaw.shipping.create_ghn_order";
  return "manual_review";
}

function readPolicyInput(
  commercePolicyJson: string | null | undefined,
  metadata: Record<string, unknown>,
): MetadataPolicyInput {
  // Ưu tiên cột commercePolicyJson (field riêng của sản phẩm)
  if (commercePolicyJson) {
    try {
      const parsed = JSON.parse(commercePolicyJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as MetadataPolicyInput;
      }
    } catch {
      // bỏ qua lỗi parse, fallback xuống metadata
    }
  }
  // Fallback: đọc từ metadata.commercePolicy hoặc metadata trực tiếp
  const nested = metadata.commercePolicy;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as MetadataPolicyInput;
  }
  return metadata as MetadataPolicyInput;
}

function defaultPolicyForKind(productKind: ProductKind): ProductCommercePolicy {
  switch (productKind) {
    case "DIGITAL":
      return {
        productKind,
        paymentMode: "PREPAID",
        fulfillmentMode: "EMAIL_DELIVERY",
        requiresPaymentBeforeFulfillment: true,
        requiresBillVerification: true,
        requiredCustomerFields: ["name", "phone", "email"],
      };
    case "THIRD_PARTY":
      return {
        productKind,
        paymentMode: "MANUAL_REVIEW",
        fulfillmentMode: "MANUAL",
        requiresPaymentBeforeFulfillment: false,
        requiresBillVerification: false,
        requiredCustomerFields: ["name", "phone"],
      };
    case "SERVICE":
      return {
        productKind,
        paymentMode: "MANUAL_REVIEW",
        fulfillmentMode: "MANUAL",
        requiresPaymentBeforeFulfillment: false,
        requiresBillVerification: false,
        requiredCustomerFields: ["name", "phone"],
      };
    case "PHYSICAL":
    default:
      return {
        productKind: "PHYSICAL",
        paymentMode: "PREPAID",
        fulfillmentMode: "GHN_SHIPPING",
        requiresPaymentBeforeFulfillment: true,
        requiresBillVerification: true,
        requiredCustomerFields: ["name", "phone", "address"],
        shipping: { carrier: "GHN", allowCod: false },
      };
  }
}

function defaultRequiredFields(productKind: ProductKind, fulfillmentMode: FulfillmentMode): CustomerField[] {
  if (fulfillmentMode === "GHN_SHIPPING") return ["name", "phone", "address"];
  if (fulfillmentMode === "ZALO_GROUP") return ["name", "phone", "address"];
  if (fulfillmentMode === "EMAIL_DELIVERY") return ["name", "phone", "email"];
  if (productKind === "DIGITAL") return ["name", "phone", "email"];
  return ["name", "phone"];
}

function normalizeProductKind(input: unknown, fallbackType: string | null | undefined): ProductKind {
  const direct = normalizeEnum(input, PRODUCT_KINDS);
  if (direct) return direct;
  const normalizedType = String(fallbackType ?? "GOODS").trim().toUpperCase();
  if (normalizedType === "DIGITAL") return "DIGITAL";
  if (normalizedType === "THIRD_PARTY" || normalizedType === "THIRD-PARTY") return "THIRD_PARTY";
  if (normalizedType === "SERVICE") return "SERVICE";
  return "PHYSICAL";
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return allowed.includes(normalized as T) ? normalized as T : null;
}

function normalizeCustomerFields(value: unknown): CustomerField[] | null {
  if (!Array.isArray(value)) return null;
  const fields = value
    .map((field) => {
      const normalized = String(field ?? "").trim().toLowerCase();
      return CUSTOMER_FIELDS.includes(normalized as CustomerField) ? normalized as CustomerField : null;
    })
    .filter((field): field is CustomerField => field != null);
  return fields.length > 0 ? uniqueFields(fields) : null;
}

function normalizeProvider(value: unknown): ProductCommercePolicy["provider"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const provider = value as Record<string, unknown>;
  const name = String(provider.name ?? "").trim();
  if (!name) return null;
  const apiMode = normalizeEnum(provider.apiMode, ["CREATE_ORDER", "ISSUE_TICKET", "EXTERNAL_LINK"] as const);
  return {
    name,
    ...(provider.productSku ? { productSku: String(provider.productSku) } : {}),
    ...(apiMode ? { apiMode } : {}),
  };
}

function normalizeShipping(
  value: unknown,
  paymentMode: PaymentMode,
  fulfillmentMode: FulfillmentMode,
): ProductCommercePolicy["shipping"] | null {
  if (fulfillmentMode !== "GHN_SHIPPING") return null;
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const carrier = normalizeEnum(raw.carrier, ["GHN", "MANUAL"] as const) ?? "GHN";
  const weightGram = Number(raw.weightGram);
  return {
    carrier,
    allowCod: typeof raw.allowCod === "boolean" ? raw.allowCod : paymentMode === "COD",
    ...(Number.isFinite(weightGram) && weightGram > 0 ? { weightGram } : {}),
  };
}

function normalizeQuantity(quantity: number): number {
  const numeric = Number(quantity);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.floor(numeric));
}

function buildPolicyGroups(items: CheckoutPreparation["items"]): CheckoutPreparation["policyGroups"] {
  const groups = new Map<string, CheckoutPreparation["policyGroups"][number]>();
  for (const item of items) {
    const key = [
      item.policy.paymentMode,
      item.policy.fulfillmentMode,
      item.policy.provider?.name ?? "",
    ].join(":");
    const current = groups.get(key);
    if (current) {
      current.itemProductIds.push(item.productId);
    } else {
      groups.set(key, {
        key,
        paymentMode: item.policy.paymentMode,
        fulfillmentMode: item.policy.fulfillmentMode,
        itemProductIds: [item.productId],
      });
    }
  }
  return Array.from(groups.values());
}

function uniqueFields(fields: CustomerField[]): CustomerField[] {
  return CUSTOMER_FIELDS.filter((field) => fields.includes(field));
}

function findMissingCustomerFields(fields: CustomerField[], customer: CheckoutCustomerInput): CustomerField[] {
  return fields.filter((field) => !String(customer[field] ?? "").trim());
}

function nextActionForPolicy(policy: ProductCommercePolicy): CheckoutNextAction {
  if (policy.paymentMode === "MANUAL_REVIEW" || policy.fulfillmentMode === "MANUAL") return "MANUAL_REVIEW";
  if (policy.paymentMode === "COD") return "CREATE_COD_ORDER_AND_SHIPPING";
  if (policy.fulfillmentMode === "THIRD_PARTY_API") return "CREATE_EXTERNAL_ORDER";
  return "CREATE_PENDING_ORDER_AND_SEND_QR";
}

function instructionFor(nextAction: CheckoutNextAction, missingFields: CustomerField[]): string {
  switch (nextAction) {
    case "COLLECT_MISSING_FIELDS":
      return `Còn thiếu: ${missingFields.join(", ")}. Hỏi đúng các thông tin này trước khi tạo đơn.`;
    case "CREATE_COD_ORDER_AND_SHIPPING":
      return "Tạo đơn COD/GHN để chốt trước; nếu tool trả QR thì gửi khách chuyển khoản và đánh dấu Cần Follow-up để shop xử lý ship/GHN sau.";
    case "CREATE_EXTERNAL_ORDER":
      return "Tạo đơn pending theo chính sách sản phẩm rồi gọi adapter bên thứ ba khi đủ điều kiện.";
    case "MANUAL_REVIEW":
      return "Sản phẩm cần nhân viên duyệt chính sách trước khi bot tự tạo đơn.";
    case "SPLIT_ORDER_BY_POLICY":
      return "Tách đơn theo nhóm sản phẩm có cùng cách thu tiền và giao hàng.";
    case "CREATE_PENDING_ORDER_AND_SEND_QR":
    default:
      return "Tạo order pending, gửi VietQR, yêu cầu khách chuyển khoản đúng nội dung và gửi bill để đối soát.";
  }
}
