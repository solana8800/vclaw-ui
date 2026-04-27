import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VClaw-Bot/1.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: response.status });
    }

    const html = await response.text();

    // Basic extraction logic
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || "";
    const description = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || 
                        html.match(/<meta property="og:description" content="(.*?)"/i)?.[1] || "";
    const image = html.match(/<meta property="og:image" content="(.*?)"/i)?.[1] || 
                  html.match(/<meta name="twitter:image" content="(.*?)"/i)?.[1] || "";

    return NextResponse.json({
      title: title.trim(),
      description: description.trim(),
      image: image.trim(),
      url,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
