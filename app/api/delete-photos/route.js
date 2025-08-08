import { NextResponse } from "next/server";
import path from "path";
import { existsSync } from "fs";
import { readdir, unlink, rename } from "fs/promises";

export async function POST(request) {
  try {
    const { sessionId, files } = await request.json();
    if (!sessionId || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "sessionId and files[] are required" }, { status: 400 });
    }

    const sessionDir = path.join(process.cwd(), "uploads", sessionId);
    if (!existsSync(sessionDir)) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const setToDelete = new Set(files.map((f) => String(f)));
    const all = (await readdir(sessionDir)).filter((f) => /^(\d{6})\.jpe?g$/i.test(f)).sort();

    // Delete requested files
    const kept = [];
    for (const f of all) {
      if (setToDelete.has(f)) {
        try { await unlink(path.join(sessionDir, f)); } catch {}
      } else {
        kept.push(f);
      }
    }

    // Reindex remaining
    // First move to temporary names to avoid collisions
    const tmpSuffix = ".tmp_" + Date.now();
    for (const f of kept) {
      const src = path.join(sessionDir, f);
      const tmp = path.join(sessionDir, f + tmpSuffix);
      try { await rename(src, tmp); } catch {}
    }

    const tmpFiles = (await readdir(sessionDir)).filter((f) => f.endsWith(tmpSuffix)).sort();
    const newNames = [];
    for (let i = 0; i < tmpFiles.length; i++) {
      const tmp = path.join(sessionDir, tmpFiles[i]);
      const targetName = `${String(i + 1).padStart(6, "0")}.jpg`;
      const dst = path.join(sessionDir, targetName);
      try { await rename(tmp, dst); newNames.push(targetName); } catch {}
    }

    return NextResponse.json({ message: "Deleted and reindexed", files: newNames, count: newNames.length });
  } catch (error) {
    console.error("Delete photos error:", error);
    return NextResponse.json({ error: "Failed to delete photos" }, { status: 500 });
  }
}
