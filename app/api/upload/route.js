import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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

      // Generate filename with order number to maintain sequence
      const fileExtension = path.extname(file.name);
      const fileName = `${String(i + 1).padStart(
        3,
        "0"
      )}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      await writeFile(filePath, buffer);

      uploadedFiles.push({
        originalName: file.name,
        fileName: fileName,
        filePath: filePath,
        size: file.size,
        type: file.type,
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
