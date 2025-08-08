import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(request, context) {
  try {
    const { sessionId, fileName } = await context.params;

    if (!sessionId || !fileName) {
      return NextResponse.json(
        { error: "Session ID and file name are required" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "uploads", sessionId, fileName);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Frame preview error:", error);
    return NextResponse.json(
      { error: "Failed to load frame preview" },
      { status: 500 }
    );
  }
}