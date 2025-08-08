import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(request, { params }) {
  try {
    const { videoId } = params;

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    const videoPath = path.join(process.cwd(), "videos", `${videoId}.mp4`);

    if (!existsSync(videoPath)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const videoBuffer = await readFile(videoPath);

    return new NextResponse(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${videoId}.mp4"`,
        "Content-Length": videoBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download video" },
      { status: 500 }
    );
  }
}
