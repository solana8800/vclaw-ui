#!/usr/bin/env node
import process from "node:process";

const ENDPOINT =
  process.env.VCLAW_AGENT_TOOLS_URL || "http://127.0.0.1:12687/api/vclaw/agent-tools";
const SECRET = process.env.VCLAW_AGENT_TOOLS_SECRET || "";

const FALLBACK_TOOLS = {
  "vclaw.customer.upsert": {
    description: "Tạo hoặc cập nhật khách hàng từ thông tin khách cung cấp trong chat.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        channel: { type: "string" },
        externalId: { type: "string" },
      },
    },
  },
  "vclaw.product.list": {
    description:
      "Lấy danh sách sản phẩm active từ database VClaw, gồm commercePolicy/checkoutHint. Bắt buộc gọi trước khi trả lời sản phẩm, giá, shop bán gì, hoặc greeting mơ hồ.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Từ khóa tên, mô tả, hoặc danh mục. Bỏ trống để lấy toàn bộ catalog." },
      },
    },
  },
  "vclaw.checkout.prepare": {
    description:
      "Tính chính sách checkout theo sản phẩm: thiếu thông tin gì, COD hay trả trước, giao GHN/email/bên thứ ba. Gọi trước vclaw.order.create.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        shippingAddress: { type: "string" },
        items: { type: "string" },
      },
      required: ["items"],
    },
  },
  "vclaw.order.create": {
    description: "Tạo đơn theo commercePolicy. Prepaid: pending + QR. COD: không QR. Digital/third-party: theo policy.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        amount: { type: "number" },
        shippingAddress: { type: "string" },
        shippingNote: { type: "string" },
        items: { type: "string" },
        channel: { type: "string" },
      },
      required: ["customerName", "phone", "amount"],
    },
  },
  "vclaw.payment.generate_qr": {
    description: "Sinh lại QR VietQR cho đơn hàng hoặc số tiền đã xác định.",
    parameters: { type: "object", properties: { amount: { type: "number" }, orderId: { type: "string" }, phone: { type: "string" } }, required: ["amount"] },
  },
  "vclaw.payment.verify_bill": {
    description: "Ghi nhận bill chuyển khoản khách gửi để đối soát.",
    parameters: { type: "object", properties: { paymentId: { type: "string" } }, required: ["paymentId"] },
  },
  "vclaw.shipping.quote_from_address": {
    description: "Báo phí ship từ địa chỉ khách nhập tự nhiên.",
    parameters: { type: "object", properties: { rawAddress: { type: "string" }, weightKg: { type: "number" } }, required: ["rawAddress"] },
  },
  "vclaw.shipping.create_ghn_order": {
    description: "Tạo vận đơn GHN. Đơn prepaid bắt buộc đã verified; đơn COD được tạo vận đơn thu hộ.",
    parameters: { type: "object", properties: { orderId: { type: "string" } }, required: ["orderId"] },
  },
  "vclaw.digital.fulfill_email": {
    description: "Tạo yêu cầu xuất/gửi hàng điện tử qua email sau khi đơn prepaid đã xác nhận thanh toán.",
    parameters: { type: "object", properties: { orderId: { type: "string" }, email: { type: "string" } }, required: ["orderId"] },
  },
  "vclaw.third_party.create_order": {
    description: "Tạo yêu cầu xử lý đơn qua bên thứ ba sau khi điều kiện thanh toán của policy đã đạt.",
    parameters: { type: "object", properties: { orderId: { type: "string" }, provider: { type: "string" } }, required: ["orderId"] },
  },
  "vclaw.commerce.get_sales_guidelines": {
    description: "Lấy persona và quy tắc bán hàng của shop.",
    parameters: { type: "object", properties: {} },
  },
};

let inputBuffer = Buffer.alloc(0);
let pending = 0;
let stdinEnded = false;
let outputMode = "line";

function sendMessage(message) {
  const serialized = JSON.stringify(message);
  if (outputMode === "headers") {
    const body = Buffer.from(serialized, "utf8");
    process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
    process.stdout.write(body);
    return;
  }
  process.stdout.write(`${serialized}\n`);
}

function sendResult(id, result) {
  if (id === undefined || id === null) return;
  sendMessage({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message, data) {
  if (id === undefined || id === null) return;
  sendMessage({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });
}

function maybeExit() {
  if (stdinEnded && pending === 0) process.exit(0);
}

function toMcpTools(metadata) {
  return Object.entries(metadata || {}).map(([name, meta]) => ({
    name,
    description: String(meta?.description || ""),
    inputSchema: meta?.parameters || { type: "object", properties: {} },
  }));
}

async function listTools() {
  try {
    const res = await fetch(ENDPOINT, { method: "GET" });
    if (!res.ok) throw new Error(`GET ${ENDPOINT} -> HTTP ${res.status}`);
    const data = await res.json();
    if (data?.tools && typeof data.tools === "object") {
      return toMcpTools(data.tools);
    }
  } catch (error) {
    process.stderr.write(`[vclaw-mcp] tools/list fallback: ${String(error)}\n`);
  }
  return toMcpTools(FALLBACK_TOOLS);
}

async function callTool(name, args) {
  if (!SECRET) {
    throw new Error("VCLAW_AGENT_TOOLS_SECRET is missing in MCP server env");
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ tool: name, arguments: args && typeof args === "object" ? args : {} }),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { ok: false, error: text };
  }
  if (!res.ok || data?.ok === false) {
    const message = data?.error || `HTTP ${res.status}`;
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      isError: true,
      _errorMessage: message,
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

async function handleRequest(message) {
  const id = message?.id;
  try {
    switch (message?.method) {
      case "initialize":
        sendResult(id, {
          protocolVersion: message?.params?.protocolVersion || "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "vclaw-business", version: "1.0.0" },
        });
        break;
      case "notifications/initialized":
        break;
      case "ping":
        sendResult(id, {});
        break;
      case "tools/list":
        sendResult(id, { tools: await listTools() });
        break;
      case "tools/call": {
        const name = String(message?.params?.name || "");
        if (!name) {
          sendError(id, -32602, "missing tool name");
          break;
        }
        const result = await callTool(name, message?.params?.arguments);
        const errorMessage = result._errorMessage;
        delete result._errorMessage;
        if (result.isError) {
          sendResult(id, result);
          process.stderr.write(`[vclaw-mcp] tools/call ${name} failed: ${errorMessage}\n`);
        } else {
          sendResult(id, result);
        }
        break;
      }
      default:
        sendError(id, -32601, `method not found: ${String(message?.method || "")}`);
    }
  } catch (error) {
    sendError(id, -32000, String(error?.message || error));
  }
}

function extractMessages() {
  while (inputBuffer.length > 0) {
    const headerEnd = inputBuffer.indexOf("\r\n\r\n");
    const altHeaderEnd = inputBuffer.indexOf("\n\n");
    const separatorIndex = headerEnd >= 0 ? headerEnd : altHeaderEnd;
    const separatorLength = headerEnd >= 0 ? 4 : altHeaderEnd >= 0 ? 2 : 0;
    if (separatorIndex < 0) {
      const lineEnd = inputBuffer.indexOf("\n");
      if (lineEnd < 0) return;
      outputMode = "line";
      const rawLine = inputBuffer.slice(0, lineEnd).toString("utf8").replace(/\r$/, "").trim();
      inputBuffer = inputBuffer.slice(lineEnd + 1);
      if (!rawLine) continue;
      const message = JSON.parse(rawLine);
      pending += 1;
      handleRequest(message)
        .catch((error) => sendError(message?.id, -32000, String(error?.message || error)))
        .finally(() => {
          pending -= 1;
          maybeExit();
        });
      continue;
    }

    const header = inputBuffer.slice(0, separatorIndex).toString("utf8");
    const match = header.match(/content-length:\s*(\d+)/i);
    if (!match) {
      inputBuffer = Buffer.alloc(0);
      throw new Error("missing Content-Length header");
    }
    outputMode = "headers";
    const length = Number(match[1]);
    const bodyStart = separatorIndex + separatorLength;
    const bodyEnd = bodyStart + length;
    if (inputBuffer.length < bodyEnd) return;

    const rawBody = inputBuffer.slice(bodyStart, bodyEnd).toString("utf8");
    inputBuffer = inputBuffer.slice(bodyEnd);
    const message = JSON.parse(rawBody);
    pending += 1;
    handleRequest(message)
      .catch((error) => sendError(message?.id, -32000, String(error?.message || error)))
      .finally(() => {
        pending -= 1;
        maybeExit();
      });
  }
}

process.stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  try {
    extractMessages();
  } catch (error) {
    process.stderr.write(`[vclaw-mcp] protocol error: ${String(error?.message || error)}\n`);
    process.exit(1);
  }
});

process.stdin.on("end", () => {
  stdinEnded = true;
  maybeExit();
});
