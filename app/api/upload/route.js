import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("photos");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Create session ID for this upload batch
    const sessionId = uuidv4();
    const uploadDir = path.join(process.cwd(), "uploads", sessionId);

    // Create upload directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file || typeof file === "string") {
        continue;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: `File ${file.name} is not an image` },
          { status: 400 }
        );
      }

      // Generate sequential numeric filename for HD frames
      const fileName = `${String(i + 1).padStart(6, "0")}.jpg`;
      const filePath = path.join(uploadDir, fileName);

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Compress/resize to HD (1280x720) with letterboxing
      const outputBuffer = await sharp(buffer)
        .rotate() // auto-orient
        .resize(1280, 720, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      await writeFile(filePath, outputBuffer);

      uploadedFiles.push({
        originalName: file.name,
        fileName,
        filePath,
        size: outputBuffer.length,
        type: "image/jpeg",
      });
    }

    return NextResponse.json({
      message: "Files uploaded successfully",
      sessionId: sessionId,
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Upload endpoint. Use POST to upload photos." },
    { status: 200 }
  );
}
