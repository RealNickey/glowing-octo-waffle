import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import path from "path";

export async function GET(request, { params }) {
  try {
    const { sessionId } = params || {};
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }
    const sessionDir = path.join(process.cwd(), "uploads", sessionId);
    if (!existsSync(sessionDir)) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const files = (await readdir(sessionDir))
      .filter((f) => /\.(jpg|jpeg|png|bmp|webp)$/i.test(f))
      .sort();
    return NextResponse.json({ sessionId, files, count: files.length });
  } catch (err) {
    console.error("list-uploads error:", err);
    return NextResponse.json(
      { error: "Failed to list session files" },
      { status: 500 }
    );
  }
}
