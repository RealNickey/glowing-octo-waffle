import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export async function GET(request, { params }) {
  const { sessionId, file } = params;
  if (!sessionId || !file) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  // Basic sanitization: disallow path traversal
  const safeFile = decodeURIComponent(file).replace(/\\/g, "/");
  if (safeFile.includes("..") || safeFile.includes("/")) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }
  const filePath = path.join(process.cwd(), "uploads", sessionId, safeFile);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buf = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const ct =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
      ? "image/webp"
      : "image/jpeg";
  return new NextResponse(buf, { headers: { "Content-Type": ct } });
}
