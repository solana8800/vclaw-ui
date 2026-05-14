import { describe, expect, it } from "vitest";
import {
  nextToolAfterOrderCreate,
  prepareCheckout,
  resolveProductCommercePolicy,
  type CheckoutItemInput,
  type ProductPolicySource,
} from "@/lib/commerce/product-policy";

function product(overrides: Partial<ProductPolicySource>): ProductPolicySource {
  return {
    id: "prod_1",
    name: "Sản phẩm test",
    price: 100000,
    type: "GOODS",
    metadata: null,
    productCode: "TEST",
    ...overrides,
  };
}

describe("product commerce policy", () => {
  it("defaults physical goods to prepaid GHN shipping with bill verification", () => {
    const policy = resolveProductCommercePolicy(product({}));

    expect(policy.productKind).toBe("PHYSICAL");
    expect(policy.paymentMode).toBe("PREPAID");
    expect(policy.fulfillmentMode).toBe("GHN_SHIPPING");
    expect(policy.requiresPaymentBeforeFulfillment).toBe(true);
    expect(policy.requiresBillVerification).toBe(true);
    expect(policy.requiredCustomerFields).toEqual(["name", "phone", "address"]);
  });

  it("honors COD policy from product metadata and does not require prepaid verification", () => {
    const policy = resolveProductCommercePolicy(product({
      metadata: JSON.stringify({
        commercePolicy: {
          paymentMode: "COD",
          fulfillmentMode: "GHN_SHIPPING",
          shipping: { carrier: "GHN", allowCod: true, weightGram: 700 },
        },
      }),
    }));

    expect(policy.paymentMode).toBe("COD");
    expect(policy.requiresPaymentBeforeFulfillment).toBe(false);
    expect(policy.requiresBillVerification).toBe(false);
    expect(policy.shipping?.allowCod).toBe(true);
    expect(policy.shipping?.weightGram).toBe(700);
  });

  it("treats digital products as prepaid email delivery and requires email", () => {
    const policy = resolveProductCommercePolicy(product({
      type: "DIGITAL",
      metadata: JSON.stringify({
        commercePolicy: {
          productKind: "DIGITAL",
          fulfillmentMode: "EMAIL_DELIVERY",
        },
      }),
    }));

    expect(policy.productKind).toBe("DIGITAL");
    expect(policy.paymentMode).toBe("PREPAID");
    expect(policy.fulfillmentMode).toBe("EMAIL_DELIVERY");
    expect(policy.requiredCustomerFields).toEqual(["name", "phone", "email"]);
  });

  it("keeps third-party products in manual review unless a provider policy is explicit", () => {
    const policy = resolveProductCommercePolicy(product({ type: "THIRD_PARTY" }));

    expect(policy.productKind).toBe("THIRD_PARTY");
    expect(policy.paymentMode).toBe("MANUAL_REVIEW");
    expect(policy.fulfillmentMode).toBe("MANUAL");
    expect(policy.requiredCustomerFields).toEqual(["name", "phone"]);
  });

  it("honors custom required customer fields for third-party provider policies", () => {
    const checkout = prepareCheckout({
      items: [{
        product: product({
          type: "THIRD_PARTY",
          metadata: JSON.stringify({
            commercePolicy: {
              productKind: "THIRD_PARTY",
              paymentMode: "PREPAID",
              fulfillmentMode: "THIRD_PARTY_API",
              requiredCustomerFields: ["name", "phone", "email"],
              provider: { name: "SIM_PARTNER", apiMode: "ISSUE_TICKET" },
            },
          }),
        }),
        quantity: 1,
      }],
      customer: { name: "Chị Test", phone: "0900000000" },
    });

    expect(checkout.missingFields).toEqual(["email"]);
    expect(checkout.nextAction).toBe("COLLECT_MISSING_FIELDS");
  });

  it("prepares next action and missing fields from policy", () => {
    const item: CheckoutItemInput = {
      product: product({
        id: "digital_ticket",
        type: "DIGITAL",
        metadata: JSON.stringify({
          commercePolicy: {
            productKind: "DIGITAL",
            paymentMode: "PREPAID",
            fulfillmentMode: "EMAIL_DELIVERY",
          },
        }),
      }),
      quantity: 2,
    };

    const checkout = prepareCheckout({
      items: [item],
      customer: { name: "Anh Nam", phone: "0909000000" },
    });

    expect(checkout.canCreateOrder).toBe(false);
    expect(checkout.missingFields).toEqual(["email"]);
    expect(checkout.nextAction).toBe("COLLECT_MISSING_FIELDS");
    expect(checkout.totalAmount).toBe(200000);
  });

  it("asks the bot to split an order when items have incompatible policies", () => {
    const checkout = prepareCheckout({
      items: [
        {
          product: product({
            id: "prepaid_physical",
            metadata: JSON.stringify({
              commercePolicy: { paymentMode: "PREPAID", fulfillmentMode: "GHN_SHIPPING" },
            }),
          }),
          quantity: 1,
        },
        {
          product: product({
            id: "cod_physical",
            metadata: JSON.stringify({
              commercePolicy: { paymentMode: "COD", fulfillmentMode: "GHN_SHIPPING" },
            }),
          }),
          quantity: 1,
        },
      ],
      customer: { name: "Anh Nam", phone: "0909000000", address: "Quận 1, TP.HCM" },
    });

    expect(checkout.canCreateOrder).toBe(false);
    expect(checkout.nextAction).toBe("SPLIT_ORDER_BY_POLICY");
    expect(checkout.policyGroups).toHaveLength(2);
  });

  it("routes prepaid orders to bill verification before any fulfillment tool", () => {
    expect(nextToolAfterOrderCreate({
      paymentMode: "PREPAID",
      fulfillmentMode: "EMAIL_DELIVERY",
    })).toBe("vclaw.payment.verify_bill");

    expect(nextToolAfterOrderCreate({
      paymentMode: "PREPAID",
      fulfillmentMode: "THIRD_PARTY_API",
    })).toBe("vclaw.payment.verify_bill");
  });

  it("routes COD orders to shipping after the order is created for shop follow-up", () => {
    expect(nextToolAfterOrderCreate({
      paymentMode: "COD",
      fulfillmentMode: "GHN_SHIPPING",
    })).toBe("vclaw.shipping.create_ghn_order");
  });
});
