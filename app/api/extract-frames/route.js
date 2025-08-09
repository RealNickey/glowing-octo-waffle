import { NextResponse } from "next/server";
import { mkdir, writeFile, readdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let inputVideoPath = null;
    let fps = 1; // default 1 frame per second
    let tempDir = null;

    // Prepare input video either from multipart upload or from existing videoId
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const videoFile = formData.get("video");
      const fpsParam = formData.get("fps");
      if (fpsParam) {
        const maybeFps = Number(fpsParam);
        if (!Number.isNaN(maybeFps) && maybeFps > 0) fps = maybeFps;
      }
      if (!videoFile || typeof videoFile === "string") {
        return NextResponse.json(
          { error: "No video file provided" },
          { status: 400 }
        );
      }

      tempDir = path.join(process.cwd(), "temp", uuidv4());
      await mkdir(tempDir, { recursive: true });
      const ext = path.extname(videoFile.name || "").toLowerCase() || ".mp4";
      inputVideoPath = path.join(tempDir, `input${ext}`);
      const bytes = await videoFile.arrayBuffer();
      await writeFile(inputVideoPath, Buffer.from(bytes));
    } else {
      const body = await request.json().catch(() => ({}));
      const { videoId, fps: fpsBody } = body || {};
      if (fpsBody) {
        const maybeFps = Number(fpsBody);
        if (!Number.isNaN(maybeFps) && maybeFps > 0) fps = maybeFps;
      }
      if (!videoId) {
        return NextResponse.json(
          { error: "Provide multipart 'video' file or JSON with 'videoId'" },
          { status: 400 }
        );
      }
      const candidate = path.join(process.cwd(), "videos", `${videoId}.mp4`);
      if (!existsSync(candidate)) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }
      inputVideoPath = candidate;
    }

    // Create a new session folder under uploads to store extracted frames
    const sessionId = uuidv4();
    const outputDir = path.join(process.cwd(), "uploads", sessionId);
    await mkdir(outputDir, { recursive: true });

    // Build ffmpeg args to extract frames as JPGs
    const outputPattern = path.join(outputDir, "%06d.jpg");
    const ffmpegArgs = [
      "-i",
      inputVideoPath,
      "-vf",
      `fps=${fps},scale=1280:-1:flags=lanczos`,
      "-qscale:v",
      "2",
      outputPattern,
    ];

    // Pick ffmpeg executable
    let ffmpegPath = "ffmpeg";
    if (process.platform === "win32") {
      ffmpegPath = "ffmpeg.exe";
    }

    const success = await new Promise((resolve, reject) => {
      const ff = spawn(ffmpegPath, ffmpegArgs);
      let stderr = "";

      ff.stderr.on("data", (d) => (stderr += d.toString()));
      ff.on("close", (code) => {
        if (code === 0) return resolve(true);
        console.error("FFmpeg failed:", stderr);
        return reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ff.on("error", (err) => reject(err));
    });

    // Cleanup temp dir if we created one
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {}
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to extract frames" },
        { status: 500 }
      );
    }

    const files = await readdir(outputDir);
    const images = files
      .filter((f) => /\.(jpg|jpeg|png|bmp|webp)$/i.test(f))
      .sort();

    return NextResponse.json({
      message: "Frames extracted successfully",
      sessionId,
      count: images.length,
      folder: `/uploads/${sessionId}`,
      sample: images.slice(0, 5),
      previewUrls: images
        .slice(0, 5)
        .map((f) => `/api/get-frame/${sessionId}/${encodeURIComponent(f)}`),
    });
  } catch (error) {
    console.error("extract-frames error:", error);
    return NextResponse.json(
      { error: "Failed to extract frames" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message:
        "Extract frames endpoint. Use POST with multipart {video} or JSON {videoId, fps}. Returns a new uploads sessionId with images.",
    },
    { status: 200 }
  );
}
