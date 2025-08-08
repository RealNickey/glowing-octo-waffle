import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

export async function POST(request) {
  try {
    const { sessionId, frameDuration = 0.1 } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "uploads", sessionId);
    const videoDir = path.join(process.cwd(), "videos");

    // Check if upload directory exists
    if (!existsSync(uploadDir)) {
      return NextResponse.json(
        { error: "Session not found or no uploaded files" },
        { status: 404 }
      );
    }

    // Get all image files from upload directory
    const files = await readdir(uploadDir);
    const imageFiles = files
      .filter((file) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file))
      .sort(); // Sort to maintain order

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: "No image files found in session" },
        { status: 400 }
      );
    }

    // Create videos directory if it doesn't exist
    if (!existsSync(videoDir)) {
      await require("fs/promises").mkdir(videoDir, { recursive: true });
    }

    // Generate output filename
    const videoId = uuidv4();
    const outputPath = path.join(videoDir, `${videoId}.mp4`);

    // Create video using FFmpeg with optimized settings for speed
    const success = await createFastVideoFromImages(
      uploadDir,
      imageFiles,
      outputPath,
      frameDuration
    );

    if (success) {
      return NextResponse.json({
        message: "Video created successfully",
        videoId: videoId,
        filename: `${videoId}.mp4`,
        path: `/api/download-video/${videoId}`,
        imageCount: imageFiles.length,
        duration: frameDuration * imageFiles.length,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to create video" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Video creation error:", error);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}

function createFastVideoFromImages(
  inputDir,
  imageFiles,
  outputPath,
  frameDuration
) {
  return new Promise((resolve, reject) => {
    // Prepare FFmpeg command arguments for fast processing
    const ffmpegArgs = [];

    // Input files with frame duration
    imageFiles.forEach((file) => {
      ffmpegArgs.push("-loop", "1");
      ffmpegArgs.push("-t", frameDuration.toString());
      ffmpegArgs.push("-i", path.join(inputDir, file));
    });

    // Fast concatenation without transitions - optimized for speed
    let filterComplex = "";
    for (let i = 0; i < imageFiles.length; i++) {
      filterComplex += `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,setpts=PTS-STARTPTS[v${i}];`;
    }
    filterComplex +=
      imageFiles.map((_, i) => `[v${i}]`).join("") +
      `concat=n=${imageFiles.length}:v=1[v]`;

    ffmpegArgs.push("-filter_complex", filterComplex);
    ffmpegArgs.push("-map", "[v]");

    // Optimized encoding settings for speed
    ffmpegArgs.push("-c:v", "libx264");
    ffmpegArgs.push("-preset", "ultrafast"); // Fastest encoding preset
    ffmpegArgs.push("-crf", "28"); // Balanced quality/speed
    ffmpegArgs.push("-pix_fmt", "yuv420p");
    ffmpegArgs.push("-r", "30"); // 30 FPS
    ffmpegArgs.push("-movflags", "+faststart"); // Optimize for web streaming
    ffmpegArgs.push("-y"); // Overwrite output file
    ffmpegArgs.push(outputPath);

    console.log("FFmpeg command:", "ffmpeg", ffmpegArgs.join(" "));

    // Try different FFmpeg executables
    let ffmpegPath = "ffmpeg";
    if (process.platform === "win32") {
      ffmpegPath = "ffmpeg.exe";
    }

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
      console.log("FFmpeg stderr:", data.toString());
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log("Video created successfully");
        resolve(true);
      } else {
        console.error("FFmpeg failed with code:", code);
        console.error("FFmpeg stderr:", stderr);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      console.error("FFmpeg spawn error:", error);
      reject(error);
    });
  });
}

export async function GET() {
  return NextResponse.json(
    {
      message:
        "Fast video creation endpoint. Use POST with sessionId to create video from uploaded photos.",
    },
    { status: 200 }
  );
}
