"use client";

import { useState } from "react";
import { Upload, Video, Download } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState(null);
  const [frameDuration, setFrameDuration] = useState(0.1); // Very fast for speed

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("photos", file);
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setSessionId(result.sessionId);
        alert(`Successfully uploaded ${result.count} photos!`);
      } else {
        alert("Upload failed: " + result.error);
      }
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const createVideo = async () => {
    if (!sessionId) return;

    setCreatingVideo(true);

    try {
      const response = await fetch("/api/create-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          frameDuration: parseFloat(frameDuration),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setVideoResult(result);
        alert("Video created successfully!");
      } else {
        alert("Video creation failed: " + result.error);
      }
    } catch (error) {
      alert("Video creation failed: " + error.message);
    } finally {
      setCreatingVideo(false);
    }
  };

  const downloadVideo = () => {
    if (videoResult?.videoId) {
      window.open(`/api/download-video/${videoResult.videoId}`, "_blank");
    }
  };

  return (
    <>
      <SignedOut>
        <div style={{ minHeight: "100vh", background: "linear-gradient(to bottom right, #dbeafe, #e0e7ff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: "400px", width: "100%", background: "#ffffff", borderRadius: "0.5rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", padding: "2rem", textAlign: "center" }}>
            <div style={{ width: "80px", height: "80px", margin: "0 auto 1.5rem", background: "#dbeafe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Video style={{ width: "40px", height: "40px", color: "#2563eb" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem" }}>
              Welcome to Fast Photo to Video Converter
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
              Sign in to upload photos and convert them to video frames for fast processing.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <SignInButton mode="modal">
                <button style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "0.875rem", fontWeight: "500", color: "#ffffff", background: "#2563eb", border: "1px solid transparent", borderRadius: "0.375rem", cursor: "pointer" }}>
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "0.875rem", fontWeight: "500", color: "#374151", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "0.375rem", cursor: "pointer" }}>
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <div style={{ minHeight: "100vh", background: "linear-gradient(to bottom right, #dbeafe, #e0e7ff)" }}>
          <div style={{ maxWidth: "1024px", margin: "0 auto", padding: "2rem 1rem" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
                <Video style={{ width: "40px", height: "40px", color: "#4f46e5" }} />
                Fast Photo to Video Converter
              </h1>
              <p style={{ fontSize: "1.125rem", color: "#6b7280" }}>
                Upload photos and convert them to video frames for fast processing
              </p>
            </div>

            <div style={{ maxWidth: "896px", margin: "0 auto" }}>
              {/* Upload Section */}
              <div style={{ background: "#ffffff", borderRadius: "0.5rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", padding: "1.5rem", marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Upload style={{ width: "24px", height: "24px", color: "#4f46e5" }} />
                  Step 1: Upload Photos
                </h2>

                <div style={{ marginBottom: "1rem" }}>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: "block", width: "100%", fontSize: "0.875rem", color: "#6b7280" }}
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                      Selected {selectedFiles.length} photo(s):
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", maxHeight: "128px", overflowY: "auto" }}>
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          style={{ fontSize: "0.75rem", background: "#f3f4f6", padding: "0.5rem", borderRadius: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={uploadFiles}
                  disabled={uploading || selectedFiles.length === 0}
                  style={{ 
                    background: uploading || selectedFiles.length === 0 ? "#9ca3af" : "#4f46e5", 
                    color: "#ffffff", 
                    padding: "0.5rem 1.5rem", 
                    borderRadius: "0.5rem", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.5rem",
                    border: "none",
                    cursor: uploading || selectedFiles.length === 0 ? "not-allowed" : "pointer"
                  }}
                >
                  {uploading ? (
                    <>
                      <div style={{ animation: "spin 1s linear infinite", borderRadius: "50%", width: "16px", height: "16px", border: "2px solid transparent", borderTopColor: "#ffffff" }}></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload style={{ width: "16px", height: "16px" }} />
                      Upload Photos
                    </>
                  )}
                </button>
              </div>

              {/* Video Creation Section */}
              {sessionId && (
                <div style={{ background: "#ffffff", borderRadius: "0.5rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", padding: "1.5rem", marginBottom: "2rem" }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Video style={{ width: "24px", height: "24px", color: "#059669" }} />
                    Step 2: Create Video
                  </h2>

                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                      Frame Duration (seconds per photo)
                    </label>
                    <input
                      type="number"
                      min="0.03"
                      max="1"
                      step="0.01"
                      value={frameDuration}
                      onChange={(e) => setFrameDuration(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                    />
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      Lower values = faster video playback (0.03s = ~33 FPS)
                    </p>
                  </div>

                  <button
                    onClick={createVideo}
                    disabled={creatingVideo}
                    style={{ 
                      background: creatingVideo ? "#9ca3af" : "#059669", 
                      color: "#ffffff", 
                      padding: "0.5rem 1.5rem", 
                      borderRadius: "0.5rem", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.5rem",
                      border: "none",
                      cursor: creatingVideo ? "not-allowed" : "pointer"
                    }}
                  >
                    {creatingVideo ? (
                      <>
                        <div style={{ animation: "spin 1s linear infinite", borderRadius: "50%", width: "16px", height: "16px", border: "2px solid transparent", borderTopColor: "#ffffff" }}></div>
                        Creating Video...
                      </>
                    ) : (
                      <>
                        <Video style={{ width: "16px", height: "16px" }} />
                        Create Video
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Download Section */}
              {videoResult && (
                <div style={{ background: "#ffffff", borderRadius: "0.5rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", padding: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Download style={{ width: "24px", height: "24px", color: "#7c3aed" }} />
                    Step 3: Download Video
                  </h2>

                  <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <Video style={{ width: "20px", height: "20px", color: "#059669" }} />
                      <span style={{ fontWeight: "500", color: "#065f46" }}>
                        Video Created Successfully!
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#047857" }}>
                      <p>Images processed: {videoResult.imageCount}</p>
                      <p>
                        Total duration: {videoResult.duration?.toFixed(2)} seconds
                      </p>
                      <p>Video ID: {videoResult.videoId}</p>
                    </div>
                  </div>

                  <button
                    onClick={downloadVideo}
                    style={{ background: "#7c3aed", color: "#ffffff", padding: "0.5rem 1.5rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", border: "none", cursor: "pointer" }}
                  >
                    <Download style={{ width: "16px", height: "16px" }} />
                    Download MP4 Video
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
