"use client";
import { useState } from "react";
import { Upload, Search, MoreHorizontal, Download, Trash2, Eye, Plus, X } from 'lucide-react'
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

// Mock data for photos with different aspect ratios
const photoFiles = [
  {
    id: 1,
    name: "sunset-beach.jpg",
    size: "2.4 MB",
    uploadDate: "2024-01-15",
    thumbnail: "/sunset-beach-landscape.png",
    aspectRatio: "landscape", // 4:3
    width: 400,
    height: 300,
  },
  {
    id: 2,
    name: "team-photo.jpg",
    size: "3.1 MB",
    uploadDate: "2024-01-13",
    thumbnail: "/diverse-team-photo.png",
    aspectRatio: "portrait", // 3:4
    width: 300,
    height: 400,
  },
  {
    id: 3,
    name: "logo-design.png",
    size: "1.8 MB",
    uploadDate: "2024-01-11",
    thumbnail: "/generic-logo-design.png",
    aspectRatio: "square", // 1:1
    width: 300,
    height: 300,
  },
  {
    id: 4,
    name: "nature-landscape.jpg",
    size: "4.2 MB",
    uploadDate: "2024-01-09",
    thumbnail: "/placeholder.svg?height=250&width=400&text=Mountain+Vista",
    aspectRatio: "landscape",
    width: 400,
    height: 250,
  },
  {
    id: 5,
    name: "portrait-shot.jpg",
    size: "2.8 MB",
    uploadDate: "2024-01-08",
    thumbnail: "/placeholder.svg?height=400&width=300&text=Portrait+Photo",
    aspectRatio: "portrait",
    width: 300,
    height: 400,
  },
  {
    id: 6,
    name: "city-skyline.jpg",
    size: "5.1 MB",
    uploadDate: "2024-01-07",
    thumbnail: "/placeholder.svg?height=200&width=400&text=City+Skyline",
    aspectRatio: "landscape",
    width: 400,
    height: 200,
  },
  {
    id: 7,
    name: "flower-macro.jpg",
    size: "3.5 MB",
    uploadDate: "2024-01-06",
    thumbnail: "/placeholder.svg?height=400&width=300&text=Flower+Macro",
    aspectRatio: "portrait",
    width: 300,
    height: 400,
  },
  {
    id: 8,
    name: "architecture.jpg",
    size: "4.8 MB",
    uploadDate: "2024-01-05",
    thumbnail: "/placeholder.svg?height=300&width=300&text=Architecture",
    aspectRatio: "square",
    width: 300,
    height: 300,
  },
  {
    id: 9,
    name: "beach-panorama.jpg",
    size: "6.2 MB",
    uploadDate: "2024-01-04",
    thumbnail: "/placeholder.svg?height=200&width=500&text=Beach+Panorama",
    aspectRatio: "landscape",
    width: 500,
    height: 200,
  },
  {
    id: 10,
    name: "street-art.jpg",
    size: "2.9 MB",
    uploadDate: "2024-01-03",
    thumbnail: "/placeholder.svg?height=450&width=300&text=Street+Art",
    aspectRatio: "portrait",
    width: 300,
    height: 450,
  },
]

export default function PhotoDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const filteredPhotos = photoFiles.filter(photo =>
    photo.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      console.log("Files dropped:", e.dataTransfer.files)
    }
  }

  const togglePhotoSelection = (photoId) => {
    if (selectedPhotos.includes(photoId)) {
      setSelectedPhotos(selectedPhotos.filter(id => id !== photoId))
    } else {
      setSelectedPhotos([...selectedPhotos, photoId])
    }
  }

  const clearSelection = () => {
    setSelectedPhotos([])
    setIsSelectionMode(false)
  }

  const PhotoCard = ({
    photo
  }) => {
    const isSelected = selectedPhotos.includes(photo.id)
    
    return (
      <div
        className={`group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isSelected ? 'ring-4 ring-blue-500' : ''
        }`}
        style={{
          aspectRatio: `${photo.width}/${photo.height}`,
        }}
        onClick={() => {
          if (isSelectionMode) {
            togglePhotoSelection(photo.id)
          }
        }}>
        <Image
          src={photo.thumbnail || "/placeholder.svg"}
          alt={photo.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" />
        {/* Hover overlay */}
        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
        {/* Selection checkbox */}
        {(isSelectionMode || isSelected) && (
          <div className="absolute top-3 left-3">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isSelected 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'bg-white/80 border-white/80 hover:bg-white hover:border-white'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                togglePhotoSelection(photo.id)
              }}>
              {isSelected && (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        )}
        {/* Action menu */}
        <div
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/80 hover:bg-white text-gray-700 w-8 h-8"
                onClick={(e) => e.stopPropagation()}>
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
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
                    className="text-gray-600 hover:text-gray-800">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search your photos"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
              </div>
              
              <Button
                variant="outline"
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={isSelectionMode ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}>
                Select
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-gray-50/50">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Upload Photos</h2>
            
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                dragActive 
                  ? "border-blue-400 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}>
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
            </div>
          </div>

          {/* Recent Photos */}
          <div className="px-6 pb-6">
            <h3 className="font-medium text-gray-800 mb-4">Recent</h3>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {photoFiles.slice(0, 8).map((photo) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={photo.thumbnail || "/placeholder.svg"}
                        alt={photo.name}
                        fill
                        className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{photo.name}</p>
                      <p className="text-xs text-gray-500">{photo.uploadDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-6">
            {filteredPhotos.length > 0 ? (
              <div
                className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="break-inside-avoid animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}>
                    <PhotoCard photo={photo} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div
                  className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">No photos found</h3>
                <p className="text-gray-600">
                  {searchQuery ? "Try a different search term" : "Upload some photos to get started"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
