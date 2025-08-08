import { NextResponse } from "next/server";
import path from "path";
import { uploadToYouTube } from "../../../../lib/youtube";

export async function POST(request) {
  try {
    const { videoId, title, description, tags, privacyStatus } =
      await request.json();
    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }
    const videoPath = path.join(process.cwd(), "videos", `${videoId}.mp4`);
    const result = await uploadToYouTube({
      filePath: videoPath,
      title,
      description,
      tags,
      privacyStatus,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("YouTube upload error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
