import WebSocket from "ws";
import path from "node:path";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { handleZalouserGatewayEvent } from "../lib/zalouser/zalouser-conversation-sync";
import { resolveGatewayWebSocketUrlForServer } from "../lib/gateway/ws-url";
import { getGatewayAuthToken, getPublicGatewayAuthToken } from "../lib/gateway/env";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";

/**
 * Script lắng nghe tin nhắn từ OpenClaw Gateway qua WebSocket.
 * Tự động lưu vào Database khi có tin nhắn mới từ Zalo User.
 */

const GATEWAY_CLIENT_ID = "gateway-client";
const GATEWAY_CLIENT_MODE = "backend";
const GATEWAY_ROLE = "operator";
const GATEWAY_SCOPES = ["operator.read", "operator.write"];

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: "spki", format: "der" }) as Buffer;
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function fingerprintPublicKey(publicKeyPem: string): string {
  return crypto.createHash("sha256").update(derivePublicKeyRaw(publicKeyPem)).digest("hex");
}

function loadOrCreateIdentity() {
  const filePath = path.join(os.homedir(), ".vclaw", "gateway-sync-identity.json");
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const identity = {
    deviceId: fingerprintPublicKey(publicKeyPem),
    publicKeyPem,
    privateKeyPem,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(identity, null, 2));
  return identity;
}

function startListener() {
  const token = (getGatewayAuthToken() ?? getPublicGatewayAuthToken())?.trim();
  const url = resolveGatewayWebSocketUrlForServer();
  const identity = loadOrCreateIdentity();

  console.log(`[Listen] Đang kết nối tới Gateway: ${url}...`);

  const ws = new WebSocket(url);
  let authId = "";
  const subscribedSessions = new Set<string>();

  const sendRequest = (method: string, params: any = {}) => {
    const id = Math.random().toString(36).slice(2, 11);
    const frame = { type: "req", id, method, params };
    ws.send(JSON.stringify(frame));
    return id;
  };

  const subscribeToSession = (sessionKey: string) => {
    if (subscribedSessions.has(sessionKey)) return;
    if (!sessionKey.includes("zalouser") && !sessionKey.includes("telegram")) return; // Quan tâm Zalo và Telegram

    console.log(`[Listen] Subscribing messages: ${sessionKey}`);
    sendRequest("sessions.messages.subscribe", { key: sessionKey });
    subscribedSessions.add(sessionKey);
  };

  const syncAndSubscribeAll = async () => {
    console.log("[Listen] Đang quét danh sách hội thoại hiện có...");
    sendRequest("sessions.list", {
      limit: 100,
      search: "" // Để trống để lấy tất cả các session (Zalo, Telegram, v.v.)
    });
    
    // Subscribe vào sự kiện thay đổi danh sách session chung
    sendRequest("sessions.subscribe", {});
  };

  ws.on("open", () => {
    console.log("[Listen] WebSocket đã mở. Chờ connect.challenge...");
  });

  ws.on("message", async (data) => {
    try {
      const frame = JSON.parse(data.toString());

      // 1. Handshake: connect.challenge
      if (frame.type === "event" && frame.event === "connect.challenge") {
        const nonce = frame.payload?.nonce || "";
        authId = `auth-${Math.random().toString(36).slice(2, 11)}`;

        const signedAtMs = Date.now();
        const authPayload = [
          "v3",
          identity.deviceId,
          GATEWAY_CLIENT_ID,
          GATEWAY_CLIENT_MODE,
          GATEWAY_ROLE,
          GATEWAY_SCOPES.join(","),
          String(signedAtMs),
          token,
          nonce,
          process.platform.toLowerCase(),
          "",
        ].join("|");

        const signature = crypto.sign(
          null,
          Buffer.from(authPayload, "utf8"),
          crypto.createPrivateKey(identity.privateKeyPem)
        );

        const connectFrame = {
          type: "req",
          id: authId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: GATEWAY_CLIENT_ID,
              version: "1.0.0",
              platform: process.platform,
              mode: GATEWAY_CLIENT_MODE,
            },
            role: GATEWAY_ROLE,
            caps: ["tool-events"],
            scopes: GATEWAY_SCOPES,
            auth: { token },
            device: {
              id: identity.deviceId,
              publicKey: base64UrlEncode(derivePublicKeyRaw(identity.publicKeyPem)),
              signature: base64UrlEncode(signature),
              signedAt: signedAtMs,
              nonce,
            },
          },
        };

        ws.send(JSON.stringify(connectFrame));
        return;
      }

      // 2. Auth result
      if (frame.type === "res" && frame.id === authId) {
        if (frame.ok) {
          console.log("[Listen] Kết nối Gateway thành công!");
          await syncAndSubscribeAll();
        } else {
          console.error("[Listen] Kết nối Gateway thất bại:", frame.error);
          ws.close();
        }
        return;
      }

      // 3. Handle RPC results (sessions.list)
      if (frame.type === "res" && frame.payload?.sessions) {
        const sessions = frame.payload.sessions;
        if (Array.isArray(sessions)) {
          console.log(`[Listen] Tìm thấy ${sessions.length} hội thoại. Đang tiến hành subscribe...`);
          for (const s of sessions) {
            if (s.key) subscribeToSession(s.key);
          }
        }
        return;
      }

      // 4. Handle events
      if (frame.type === "event") {
        const event = frame.event;
        const payload = frame.payload;

        if (event === "session.message") {
          const text = (payload as any)?.message?.content?.[0]?.text || "[Không có nội dung văn bản]";
          console.log(`[Listen] Nhận tin nhắn mới từ ${payload?.sessionKey}: "${text}"`);
          try {
            const result = await handleZalouserGatewayEvent(event, payload);
            if ((result as any).success) {
              console.log(`[Listen] Đã lưu tin nhắn thành công (${(result as any).inserted} mới, ${(result as any).skipped} bỏ qua)`);
            } else {
              console.warn(`[Listen] Xử lý tin nhắn thất bại: ${(result as any).reason || (result as any).error}`);
            }
          } catch (err) {
            console.error("[Listen] Lỗi khi gọi handleZalouserGatewayEvent:", err);
          }
        } else if (event === "sessions.changed") {
          // Có hội thoại mới hoặc thay đổi
          const sessions = payload?.sessions;
          if (Array.isArray(sessions)) {
            for (const s of sessions) {
              if (s.key) subscribeToSession(s.key);
            }
          }
        }
      }
    } catch (e) {
      console.error("[Listen] Lỗi parse frame:", e);
    }
  });

  ws.on("error", (err) => {
    console.error("[Listen] Lỗi WebSocket:", err.message);
  });

  ws.on("close", () => {
    console.log("[Listen] WebSocket đã đóng. Đang thử kết nối lại sau 5 giây...");
    subscribedSessions.clear(); // Xóa sạch danh sách để subscribe lại từ đầu khi kết nối lại
    setTimeout(startListener, 5000);
  });
}

// Khởi chạy
startListener();
