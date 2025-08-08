"use client";

import { useState } from "react";
import { Upload, Video, Download } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
            <Video className="w-10 h-10 text-indigo-600" />
            Fast Photo to Video Converter
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Upload photos and convert them to video frames for fast processing
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-6 h-6 text-indigo-600" />
              Step 1: Upload Photos
            </h2>

            <div className="mb-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Selected {selectedFiles.length} photo(s):
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded truncate"
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
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Photos
                </>
              )}
            </button>
          </div>

          {/* Video Creation Section */}
          {sessionId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Video className="w-6 h-6 text-green-600" />
                Step 2: Create Video
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Frame Duration (seconds per photo)
                </label>
                <input
                  type="number"
                  min="0.03"
                  max="1"
                  step="0.01"
                  value={frameDuration}
                  onChange={(e) => setFrameDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower values = faster video playback (0.03s = ~33 FPS)
                </p>
              </div>

              <button
                onClick={createVideo}
                disabled={creatingVideo}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                {creatingVideo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Video...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Create Video
                  </>
                )}
              </button>
            </div>
          )}

          {/* Download Section */}
          {videoResult && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Download className="w-6 h-6 text-purple-600" />
                Step 3: Download Video
              </h2>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-300">
                    Video Created Successfully!
                  </span>
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">
                  <p>Images processed: {videoResult.imageCount}</p>
                  <p>
                    Total duration: {videoResult.duration?.toFixed(2)} seconds
                  </p>
                  <p>Video ID: {videoResult.videoId}</p>
                </div>
              </div>

              <button
                onClick={downloadVideo}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download MP4 Video
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
