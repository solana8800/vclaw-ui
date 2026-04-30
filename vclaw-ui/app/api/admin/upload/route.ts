import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Không có file nào được gửi lên." }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), "public", "uploads");
    const urls: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Tạo tên file duy nhất để tránh trùng lặp
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${randomUUID()}.${ext}`;
      const path = join(uploadDir, fileName);

      await writeFile(path, buffer);
      urls.push(`/uploads/${fileName}`);
    }

    return NextResponse.json({ success: true, urls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Lỗi khi upload file." }, { status: 500 });
  }
}
