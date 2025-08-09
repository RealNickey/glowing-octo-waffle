"use client";
import { useRef, useState } from "react";
import {
  Upload,
  Search,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  Plus,
  X,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PhotoDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [photos, setPhotos] = useState([]); // { id, file, name, size, previewUrl, width, height, serverFileName }
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [frameDuration, setFrameDuration] = useState(0.1);
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState(null);
  const [uploadToYouTube, setUploadToYouTube] = useState(false);
  const [ytTitle, setYtTitle] = useState("");
  const [ytUploading, setYtUploading] = useState(false);
  const fileInputRef = useRef(null);

  const filteredPhotos = photos.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    // create previews
    const newItems = await Promise.all(
      files.map(async (f, idx) => {
        const url = URL.createObjectURL(f);
        // best-effort to get dimensions
        const dims = await new Promise((res) => {
          const imgEl = document.createElement("img");
          imgEl.onload = () =>
            res({
              width: imgEl.naturalWidth || 400,
              height: imgEl.naturalHeight || 300,
            });
          imgEl.onerror = () => res({ width: 400, height: 300 });
          imgEl.src = url;
        });
        return {
          id: crypto.randomUUID(),
          file: f,
          name: f.name,
          size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
          previewUrl: url,
          width: dims.width,
          height: dims.height,
          serverFileName: null,
        };
      })
    );
    setPhotos((prev) => [...newItems, ...prev]);

    // auto-upload and map server filenames back to these items
    await uploadToServer(
      files,
      newItems.map((i) => i.id)
    );
  };

  const uploadToServer = async (files, newIds) => {
    try {
      setUploading(true);
      const formData = new FormData();
      files.forEach((f) => formData.append("photos", f));
      if (sessionId) formData.append("sessionId", sessionId);
      const resp = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Upload failed");
      setSessionId((prev) => prev || data.sessionId || null);
      const serverFiles = Array.isArray(data.files) ? data.files : [];
      // Map returned server fileNames to the recently added items by order
      setPhotos((prev) => {
        const idQueue = [...newIds];
        const mapped = prev.map((p) => {
          if (!idQueue.length) return p;
          if (newIds.includes(p.id)) {
            const idx = newIds.indexOf(p.id);
            const sf = serverFiles[idx]?.fileName || null;
            return { ...p, serverFileName: sf };
          }
          return p;
        });
        return mapped;
      });
    } catch (e) {
      console.error(e);
      // no-op UI toast here; keeping minimal
    } finally {
      setUploading(false);
    }
  };

  const deleteSelected = async () => {
    if (!sessionId) return;
    const toDelete = photos
      .filter((p) => selectedPhotos.includes(p.id) && p.serverFileName)
      .map((p) => p.serverFileName);
    if (toDelete.length === 0) return;
    try {
      const resp = await fetch("/api/delete-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, files: toDelete }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Delete failed");

      // Remove deleted from local state
      const remaining = photos.filter((p) => !selectedPhotos.includes(p.id));
      setSelectedPhotos([]);

      // Re-map serverFileName for remaining based on new server order (ascending)
      const newOrder = Array.isArray(data.files) ? data.files : [];
      remaining.sort((a, b) =>
        (a.serverFileName || "999999").localeCompare(
          b.serverFileName || "999999"
        )
      );
      const remapped = remaining.map((p, i) => ({
        ...p,
        serverFileName: newOrder[i] || p.serverFileName,
      }));
      setPhotos(remapped);
    } catch (e) {
      console.error(e);
    }
  };

  const createVideo = async () => {
    if (!sessionId) return;
    setCreatingVideo(true);
    setVideoResult(null);
    try {
      const photosCount = photos.length;
      const approxDuration = (Number(frameDuration) || 0.1) * photosCount;
      const computedTitle = ytTitle?.trim()
        ? ytTitle.trim()
        : sessionId
        ? `Session ${sessionId} Slideshow (${photosCount} photos, ${approxDuration.toFixed(
            1
          )}s)`
        : undefined;
      const resp = await fetch("/api/create-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          frameDuration: Number(frameDuration) || 0.1,
          uploadToYouTube,
          youtubeTitle: computedTitle,
          youtubePrivacy: "unlisted",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Video creation failed");
      setVideoResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingVideo(false);
    }
  };

  const downloadVideo = () => {
    if (videoResult?.videoId)
      window.open(`/api/download-video/${videoResult.videoId}`, "_blank");
  };

  const connectYouTube = async () => {
    try {
      const resp = await fetch("/api/youtube/auth");
      const data = await resp.json();
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      console.error("Failed to start YouTube auth:", e);
    }
  };

  const retryYouTubeUpload = async () => {
    if (!videoResult?.videoId) return;
    try {
      setYtUploading(true);
      const photosCount = photos.length;
      const approxDuration = (Number(frameDuration) || 0.1) * photosCount;
      const computedTitle = ytTitle?.trim()
        ? ytTitle.trim()
        : sessionId
        ? `Session ${sessionId} Slideshow (${photosCount} photos, ${approxDuration.toFixed(
            1
          )}s)`
        : `Session Video`;
      const resp = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: videoResult.videoId,
          title: computedTitle,
          privacyStatus: "unlisted",
        }),
      });
      const result = await resp.json();
      setVideoResult((prev) => ({ ...prev, youtube: result }));
    } catch (e) {
      console.error("Retry YouTube upload failed:", e);
    } finally {
      setYtUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await addFiles(e.dataTransfer.files);
    }
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const clearSelection = () => {
    setSelectedPhotos([]);
    setIsSelectionMode(false);
  };

  const PhotoCard = ({ photo }) => {
    const isSelected = selectedPhotos.includes(photo.id);
    return (
      <div
        className={`group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isSelected ? "ring-4 ring-blue-500" : ""
        }`}
        style={{ aspectRatio: `${photo.width}/${photo.height}` }}
        onClick={() => {
          if (isSelectionMode) togglePhotoSelection(photo.id);
        }}
      >
        <Image
          src={photo.previewUrl || "/placeholder.svg"}
          alt={photo.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
        {(isSelectionMode || isSelected) && (
          <div className="absolute top-3 left-3">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isSelected
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white/80 border-white/80 hover:bg-white hover:border-white"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                togglePhotoSelection(photo.id);
              }}
            >
              {isSelected && (
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/80 hover:bg-white text-gray-700 w-8 h-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-normal text-gray-800">Photos</h1>
              {selectedPhotos.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {selectedPhotos.length} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelected}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search your photos"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={
                  isSelectionMode
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : ""
                }
              >
                Select
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        <div className="w-80 border-r border-gray-200 bg-gray-50/50">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Upload Photos
            </h2>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                dragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-4" />
              <h3 className="font-medium text-gray-800 mb-2">Add photos</h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag photos here or click to browse
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Select from computer
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                JPG, PNG, GIF up to 25MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>
          </div>
          <div className="px-6 pb-6">
            <h3 className="font-medium text-gray-800 mb-4">Recent</h3>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {photos.slice(0, 8).map((photo) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={photo.previewUrl || "/placeholder.svg"}
                        alt={photo.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {photo.name}
                      </p>
                      <p className="text-xs text-gray-500">{photo.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <div className="flex-1">
          <div className="p-6">
            {/* Convert to Video Panel */}
            {sessionId && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frame Duration (seconds per photo)
                    </label>
                    <input
                      type="number"
                      min={0.03}
                      max={2}
                      step={0.01}
                      value={frameDuration}
                      onChange={(e) => setFrameDuration(e.target.value)}
                      className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={uploadToYouTube}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUploadToYouTube(checked);
                          if (checked && !ytTitle && sessionId) {
                            const photosCount = photos.length;
                            const approxDuration =
                              (Number(frameDuration) || 0.1) * photosCount;
                              // Pre-fill a sensible default title
                            setYtTitle(
                              `Session ${sessionId} Slideshow (${photosCount} photos, ${approxDuration.toFixed(1)}s)`
                            );
                          }
                        }}
                      />
                      Upload to YouTube as Unlisted
                    </label>
                    {uploadToYouTube && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ytTitle}
                          onChange={(e) => setYtTitle(e.target.value)}
                          placeholder="YouTube title"
                          className="w-80 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={connectYouTube}
                        >
                          Connect YouTube
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={createVideo}
                    disabled={creatingVideo}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {creatingVideo ? "Creating..." : "Create Video"}
                  </Button>
                  {videoResult && (
                    <Button
                      onClick={downloadVideo}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download Video
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Video will include all photos in this session (selection above
                  does not affect the video).
                </p>
                {videoResult && (
                  <div className="mt-3 text-sm text-gray-700">
                    <div>Images processed: {videoResult.imageCount}</div>
                    <div>
                      Total duration: {videoResult.duration?.toFixed(2)}s
                    </div>
                    <div>Video ID: {videoResult.videoId}</div>
                    {videoResult.youtube && (
                      <div className="mt-2">
                        {videoResult.youtube.ok && videoResult.youtube.videoId ? (
                          <a
                            href={`https://youtu.be/${videoResult.youtube.videoId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View on YouTube
                          </a>
                        ) : videoResult.youtube.needsAuth ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                window.open(
                                  videoResult.youtube.authUrl || "/api/youtube/auth",
                                  "_blank"
                                )
                              }
                            >
                              Authorize YouTube
                            </Button>
                            <Button
                              type="button"
                              onClick={retryYouTubeUpload}
                              disabled={ytUploading}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              {ytUploading ? "Uploading..." : "Retry Upload"}
                            </Button>
                          </div>
                        ) : videoResult.youtube.error ? (
                          <div className="text-red-600">
                            YouTube upload failed: {videoResult.youtube.error}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {filteredPhotos.length > 0 ? (
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="break-inside-avoid animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <PhotoCard photo={photo} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">
                  No photos found
                </h3>
                <p className="text-gray-600">
                  {searchQuery
                    ? "Try a different search term"
                    : "Upload some photos to get started"}
                </p>
              </div>
            )}
            {sessionId && (
              <div className="mt-6 text-xs text-gray-500">
                Session: {sessionId}
              </div>
            )}
            {uploading && (
              <div className="mt-4 text-sm text-gray-600">Uploading…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
