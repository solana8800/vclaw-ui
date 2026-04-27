import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  // Decode URL và kiểm tra hợp lệ
  let url: string;
  let urlObj: URL;
  try {
    url = decodeURIComponent(rawUrl);
    urlObj = new URL(url);

    // Bảo mật: Chặn truy cập mạng nội bộ để tránh SSRF
    if (
      urlObj.hostname === "localhost" || 
      urlObj.hostname === "127.0.0.1" || 
      urlObj.hostname.startsWith("192.168.") ||
      urlObj.hostname.startsWith("10.")
    ) {
      return NextResponse.json({ 
        title: urlObj.hostname, 
        description: "Access to local network is restricted", 
        image: "", 
        url 
      });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Thực thi fetch tới URL đã được kiểm tra
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VClaw-Bot/1.0",
      },
      next: { revalidate: 3600 }, // Cache trong 1 giờ
      // @ts-ignore - signal timeout có thể không có trong một số môi trường type cũ nhưng chạy được ở runtime
      signal: AbortSignal.timeout(5000), 
    });

    if (!response.ok) {
      // Nếu không fetch được nội dung, trả về domain để giao diện vẫn hiển thị được link card cơ bản
      return NextResponse.json({
        title: urlObj.hostname,
        description: "",
        image: "",
        url,
      });
    }

    const html = await response.text();

    // Logic trích xuất metadata cơ bản
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i) || 
                      html.match(/<meta property="og:description" content="(.*?)"/i);
    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i) || 
                       html.match(/<meta name="twitter:image" content="(.*?)"/i);

    return NextResponse.json({
      title: (titleMatch?.[1] || urlObj.hostname).trim(),
      description: (descMatch?.[1] || "").trim(),
      image: (imageMatch?.[1] || "").trim(),
      url,
    });
  } catch (error) {
    // Trả về thông tin tối thiểu khi gặp lỗi kết nối (DNS, Timeout, v.v.)
    // Việc này giúp tránh trả về lỗi 500 làm bẩn log hệ thống
    console.log(`[Metadata] Không thể lấy dữ liệu cho ${url}:`, error instanceof Error ? error.message : String(error));
    
    return NextResponse.json({
      title: urlObj.hostname,
      description: "",
      image: "",
      url,
    });
  }
}
