import { NextResponse } from "next/server";
import { mkdir, writeFile, readdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

async function downloadWithYtdlp(url, dest) {
  return new Promise((resolve, reject) => {
    // Prefer yt-dlp if available on PATH
    const bin = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
    const args = ["-f", "mp4/bestvideo+bestaudio/best", "-o", dest, url];
    const child = spawn(bin, args);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
    });
    child.on("error", (err) => reject(err));
  });
}

async function extractFrames(videoPath, outputDir, fps) {
  await mkdir(outputDir, { recursive: true });
  const outputPattern = path.join(outputDir, "%06d.jpg");
  const ffArgs = [
    "-i",
    videoPath,
    "-vf",
    `fps=${fps},scale=1280:-1:flags=lanczos`,
    "-qscale:v",
    "2",
    outputPattern,
  ];
  const ffmpegBin = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  await new Promise((resolve, reject) => {
    const ff = spawn(ffmpegBin, ffArgs);
    let stderr = "";
    ff.stderr.on("data", (d) => (stderr += d.toString()));
    ff.on("close", (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
    });
    ff.on("error", (err) => reject(err));
  });
}

export async function POST(request) {
  try {
    const { url, fps = 1 } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    // Create temp dir and destination file
    const tempDir = path.join(process.cwd(), "temp", uuidv4());
    await mkdir(tempDir, { recursive: true });
    const videoPath = path.join(tempDir, "video.mp4");

    // Download video via yt-dlp
    await downloadWithYtdlp(url, videoPath);

    // Extract frames to a new uploads session
    const sessionId = uuidv4();
    const outputDir = path.join(process.cwd(), "uploads", sessionId);
    await extractFrames(
      videoPath,
      outputDir,
      Number(fps) > 0 ? Number(fps) : 1
    );

    // Cleanup temp
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}

    // List result files
    const files = (await readdir(outputDir))
      .filter((f) => /\.(jpg|jpeg|png|bmp|webp)$/i.test(f))
      .sort();

    return NextResponse.json({
      message: "Frames extracted from YouTube video",
      sessionId,
      count: files.length,
      folder: `/uploads/${sessionId}`,
      sample: files.slice(0, 5),
      previewUrls: files
        .slice(0, 5)
        .map((f) => `/api/get-frame/${sessionId}/${encodeURIComponent(f)}`),
    });
  } catch (error) {
    console.error("extract-from-youtube error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract from YouTube" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message:
        "POST { url, fps? } to download a YouTube video and extract frames into a new photo session.",
    },
    { status: 200 }
  );
}
