import { sseEmitter } from "@/lib/admin/sse-emitter";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const listener = (data: unknown) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)).catch(() => {});
  };

  sseEmitter.on("notification", listener);

  // Gửi event khởi tạo ngay lập tức để giữ kết nối
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)).catch(() => {});

  const interval = setInterval(() => {
    writer.write(encoder.encode(`: keepalive\n\n`)).catch(() => {});
  }, 15000); // Rút ngắn ping xuống 15s

  req.signal.addEventListener("abort", () => {
    clearInterval(interval);
    sseEmitter.off("notification", listener);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Encoding": "none",
      "X-Accel-Buffering": "no",
    },
  });
}
