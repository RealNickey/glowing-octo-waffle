import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { spawn, execSync } from "child_process";
import sharp from "sharp";

export async function POST(request) {
  try {
    const { youtubeUrl, sessionId: providedSessionId, testMode = false } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    // Validate YouTube URL format (skip in test mode)
    if (!testMode) {
      const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeRegex.test(youtubeUrl)) {
        return NextResponse.json(
          { error: "Invalid YouTube URL" },
          { status: 400 }
        );
      }
    }

    // Create or reuse session ID
    const sessionId = (typeof providedSessionId === "string" && providedSessionId.trim()) 
      ? providedSessionId.trim() 
      : uuidv4();
    
    const uploadDir = path.join(process.cwd(), "uploads", sessionId);
    const tempDir = path.join(process.cwd(), "temp", sessionId);

    // Create directories
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    let videoPath;
    if (testMode) {
      // Create a test video instead of downloading from YouTube
      videoPath = await createTestVideo(tempDir);
    } else {
      // Download video using yt-dlp
      videoPath = await downloadYouTubeVideo(youtubeUrl, tempDir);
    }
    
    // Extract frames from video
    const frameCount = await extractFramesFromVideo(videoPath, uploadDir, sessionId);

    // Clean up temporary video file
    try {
      await unlink(videoPath);
    } catch (e) {
      console.warn("Failed to cleanup video file:", e);
    }

    return NextResponse.json({
      message: "YouTube video processed successfully",
      sessionId: sessionId,
      frameCount: frameCount,
      youtubeUrl: youtubeUrl,
      testMode: testMode,
    });

  } catch (error) {
    console.error("YouTube processing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process YouTube video" },
      { status: 500 }
    );
  }
}

async function createTestVideo(tempDir) {
  return new Promise((resolve, reject) => {
    const videoId = uuidv4();
    const outputPath = path.join(tempDir, `${videoId}.mp4`);
    
    // Create a simple test video with colored frames using FFmpeg
    const ffmpegArgs = [
      "-hide_banner",
      "-loglevel", "warning",
      "-f", "lavfi",
      "-i", "testsrc2=duration=5:size=640x480:rate=1", // 5 second test video with different colored frames
      "-y",
      outputPath
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs);
    
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        console.error("FFmpeg test video creation stderr:", stderr);
        reject(new Error(`FFmpeg failed to create test video with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on("error", (err) => {
      reject(new Error(`Failed to spawn FFmpeg for test video: ${err.message}`));
    });
  });
}

async function downloadYouTubeVideo(url, tempDir) {
  return new Promise((resolve, reject) => {
    const videoId = uuidv4();
    const outputPath = path.join(tempDir, `${videoId}.%(ext)s`);
    
    // Use yt-dlp to download video
    const ytDlpArgs = [
      url,
      "-o", outputPath,
      "--format", "best[height<=720]/best",  // Download best quality up to 720p
      "--no-playlist"
    ];

    // Use full path to yt-dlp or check common locations
    let ytdlpPath = "yt-dlp";
    try {
      // Try to find yt-dlp in common locations
      ytdlpPath = execSync("which yt-dlp", { encoding: "utf8" }).trim();
    } catch (e) {
      // Fallback to common locations
      const commonPaths = [
        "/home/runner/.local/bin/yt-dlp",
        "/usr/local/bin/yt-dlp",
        "/usr/bin/yt-dlp"
      ];
      for (const p of commonPaths) {
        if (existsSync(p)) {
          ytdlpPath = p;
          break;
        }
      }
    }
    
    const ytdlp = spawn(ytdlpPath, ytDlpArgs);
    
    let stderr = "";
    let stdout = "";
    
    ytdlp.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    ytdlp.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    ytdlp.on("close", async (code) => {
      if (code === 0) {
        try {
          // Find the downloaded file
          const files = await readdir(tempDir);
          const videoFile = files.find(f => f.startsWith(videoId));
          
          if (videoFile) {
            resolve(path.join(tempDir, videoFile));
          } else {
            reject(new Error("Downloaded video file not found"));
          }
        } catch (e) {
          reject(new Error("Failed to locate downloaded video"));
        }
      } else {
        console.error("yt-dlp stderr:", stderr);
        reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
      }
    });
    
    ytdlp.on("error", (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

async function extractFramesFromVideo(videoPath, outputDir, sessionId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Determine starting index based on existing frames
      const existing = existsSync(outputDir)
        ? (await readdir(outputDir)).filter((f) => /^(\d{6})\.jpe?g$/i.test(f)).sort()
        : [];
      let startIndex = existing.length;

      // Create temp directory for raw frames
      const tempFramesDir = path.join(outputDir, "__temp_frames");
      await mkdir(tempFramesDir, { recursive: true });

      // Extract frames using FFmpeg (1 frame per second)
      const ffmpegArgs = [
        "-hide_banner",
        "-loglevel", "warning",
        "-i", videoPath,
        "-vf", "fps=1", // Extract 1 frame per second
        "-y",
        path.join(tempFramesDir, "frame_%06d.jpg")
      ];

      const ffmpeg = spawn("ffmpeg", ffmpegArgs);
      
      let stderr = "";
      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", async (code) => {
        if (code === 0) {
          try {
            // Get extracted frames
            const rawFrames = await readdir(tempFramesDir);
            const frameFiles = rawFrames.filter(f => f.startsWith("frame_")).sort();
            
            // Process each frame through Sharp to match upload format (1280x720)
            for (let i = 0; i < frameFiles.length; i++) {
              const srcPath = path.join(tempFramesDir, frameFiles[i]);
              const fileName = `${String(startIndex + i + 1).padStart(6, "0")}.jpg`;
              const dstPath = path.join(outputDir, fileName);
              
              const buffer = await require("fs/promises").readFile(srcPath);
              const processedBuffer = await sharp(buffer)
                .rotate() // auto-orient
                .resize(1280, 720, {
                  fit: "contain",
                  background: { r: 0, g: 0, b: 0, alpha: 1 },
                })
                .jpeg({ quality: 85, mozjpeg: true })
                .toBuffer();
              
              await writeFile(dstPath, processedBuffer);
            }
            
            // Clean up temp frames
            await require("fs/promises").rm(tempFramesDir, { recursive: true, force: true });
            
            resolve(frameFiles.length);
          } catch (e) {
            reject(new Error(`Failed to process frames: ${e.message}`));
          }
        } else {
          console.error("FFmpeg stderr:", stderr);
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function GET() {
  return NextResponse.json(
    { message: "YouTube video processing endpoint. Use POST with youtubeUrl to extract frames." },
    { status: 200 }
  );
}