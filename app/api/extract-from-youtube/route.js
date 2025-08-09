import { NextResponse } from "next/server";
import { mkdir, readdir, rm } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";

function spawnSafe(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true });
      else
        reject(
          Object.assign(new Error(`${cmd} exited with code ${code}`), {
            stderr,
          })
        );
    });
    child.on("error", (err) => reject(err));
  });
}

async function findYtDlp() {
  // Try PATH binaries
  const pathBins =
    process.platform === "win32" ? ["yt-dlp.exe", "yt-dlp"] : ["yt-dlp"];
  for (const b of pathBins) {
    try {
      await spawnSafe(b, ["--version"]);
      return { cmd: b, argsPrefix: [] };
    } catch {}
  }

  // Windows: where.exe
  if (process.platform === "win32") {
    try {
      const out = await new Promise((resolve, reject) => {
        const child = spawn("where.exe", ["yt-dlp"], {
          stdio: ["ignore", "pipe", "pipe"],
        });
        let data = "";
        child.stdout.on("data", (d) => (data += d.toString()));
        child.on("close", (code) =>
          code === 0 ? resolve(data) : reject(new Error("where failed"))
        );
        child.on("error", reject);
      });
      const lines = String(out)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const line of lines) {
        if (existsSync(line)) {
          try {
            await spawnSafe(line, ["--version"]);
            return { cmd: line, argsPrefix: [] };
          } catch {}
        }
      }
    } catch {}

    // WindowsApps
    const localApp = process.env.LOCALAPPDATA;
    if (localApp) {
      const winApps = path.join(
        localApp,
        "Microsoft",
        "WindowsApps",
        "yt-dlp.exe"
      );
      if (existsSync(winApps)) {
        try {
          await spawnSafe(winApps, ["--version"]);
          return { cmd: winApps, argsPrefix: [] };
        } catch {}
      }
    }
  }

  // Python module fallback
  const pyCandidates = [
    { cmd: "py", argsPrefix: ["-m", "yt_dlp"] },
    { cmd: "python", argsPrefix: ["-m", "yt_dlp"] },
    { cmd: "python3", argsPrefix: ["-m", "yt_dlp"] },
  ];
  for (const c of pyCandidates) {
    try {
      await spawnSafe(c.cmd, [...c.argsPrefix, "--version"]);
      return c;
    } catch {}
  }

  return null;
}

async function downloadWithYtdlp(url, dest) {
  const spec = await findYtDlp();
  if (!spec) {
    const msg =
      process.platform === "win32"
        ? "yt-dlp is not available to this process. Try: winget install -e --id yt-dlp.yt-dlp, then restart your terminal/VS Code."
        : "yt-dlp is not available to this process. Please install yt-dlp and ensure it is on PATH, then restart the dev server.";
    const err = new Error(msg);
    err.code = "NO_YTDLP";
    throw err;
  }
  const args = [
    ...spec.argsPrefix,
    "-f",
    "mp4/bestvideo+bestaudio/best",
    "-o",
    dest,
    url,
  ];
  await spawnSafe(spec.cmd, args);
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
  await spawnSafe(ffmpegBin, ffArgs);
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

    const tempDir = path.join(process.cwd(), "temp", uuidv4());
    await mkdir(tempDir, { recursive: true });
    const videoPath = path.join(tempDir, "video.mp4");

    await downloadWithYtdlp(url.trim(), videoPath);

    const sessionId = uuidv4();
    const outputDir = path.join(process.cwd(), "uploads", sessionId);
    await extractFrames(
      videoPath,
      outputDir,
      Number(fps) > 0 ? Number(fps) : 1
    );

    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}

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
    const hint = error?.code === "NO_YTDLP" ? error.message : undefined;
    return NextResponse.json(
      { error: error.message || "Failed to extract from YouTube", hint },
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
