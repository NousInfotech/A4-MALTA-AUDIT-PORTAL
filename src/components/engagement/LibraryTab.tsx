"use client"

// @ts-nocheck

// Add these imports at the top
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FolderInputIcon, Trash2, ImageIcon } from "lucide-react"
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  Grid3X3,
  List,
  Search,
  RefreshCwIcon as Refresh,
  Home,
  Upload,
  Download,
  Loader2,
  Eye,
  History,
  Filter,
  CheckSquare,
  Square,
  X,
  FileCheck,
  MoreVertical,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { engagementApi } from "@/services/api"
import { supabase } from "@/integrations/supabase/client"
import { EnhancedLoader } from "../ui/enhanced-loader"

const categories = [
  "Trial Balance",
  "Audit Sections",
  "Planning",
  "Capital & Reserves",
  "Property, plant and equipment",
  "Intangible Assets",
  "Investment Property",
  "Investment in Subsidiaries & Associates investments",
  "Receivables",
  "Payables",
  "Inventory",
  "Bank & Cash",
  "Borrowings & loans",
  "Taxation",
  "Going Concern",
  "Others",
]

interface LibraryTabProps {
  engagement: any
  requests: any[]
}

interface LibraryFile {
  _id: string
  category: string
  url: string
  fileName: string
  createdAt: string
  fileSize?: number
  uploadedBy?: string
  uploadedByName?: string
  uploadedByRole?: string
  version?: number
  fileType?: string
}
interface DeleteConfirmationDialogProps {
  deleteDialogOpen: boolean
  setDeleteDialogOpen: (open: boolean) => void
  fileToDelete: LibraryFile | null
  handleDelete: () => Promise<void>
  deletingId: string | null
}

const DeleteConfirmationDialog = ({
  deleteDialogOpen,
  setDeleteDialogOpen,
  fileToDelete,
  handleDelete,
  deletingId,
}: DeleteConfirmationDialogProps) => (
  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to permanently delete "{decodeURIComponent(fileToDelete?.fileName)}"?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDelete}
          disabled={deletingId !== null}
          className="bg-red-600 hover:bg-red-700"
        >
          {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const LibraryTab = ({ engagement, requests }: LibraryTabProps) => {
  const [selectedFolder, setSelectedFolder] = useState<string>(categories[0])
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([])

  
  const [searchTerm, setSearchTerm] = useState("")
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [fileForDetails, setFileForDetails] = useState<LibraryFile | null>(null)
  
  // Folder path for breadcrumb navigation (currently just category, but prepared for nested folders)
  const getFolderPath = useCallback((folder: string): string[] => {
    // For now, return just the category
    // When backend supports nested folders, this will traverse the parent chain
    return [folder]
  }, [])

  // Advanced search/filter state
  const [advancedSearch, setAdvancedSearch] = useState({
    search: "",
    fileType: undefined as string | undefined,
    dateFrom: "",
    dateTo: "",
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc",
  })

  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<LibraryFile | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dropZoneRef = useRef<HTMLDivElement | null>(null)

  // In your LibraryTab component
  const handleDelete = async () => {
    if (!fileToDelete) return
    setLoading(true)
    try {
      setDeletingId(fileToDelete._id)
      await engagementApi.deleteFromLibrary(engagement._id, fileToDelete.url)
      await fetchLibraryFiles() // Refresh the file list
      toast({
        title: "Success",
        description: "File deleted successfully",
      })
    } catch (error: any) {
      console.error("Delete error", error)
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
      setFileToDelete(null)
      setDeleteDialogOpen(false)
      setLoading(false)
    }
  }
  // put this near the top, outside the component
  function withVersion(url: string, addDownload = false) {
    try {
      const u = new URL(url)
      if (addDownload && !u.searchParams.has("download")) {
        // makes the CDN return with Content-Disposition: attachment
        u.searchParams.set("download", "")
      }
      // force a fresh URL every time to avoid disk cache
      u.searchParams.set("v", String(Date.now()))
      return u.toString()
    } catch {
      const join = url.includes("?") ? "&" : "?"
      const download = addDownload ? `${join}download=&` : join
      return `${url}${download}v=${Date.now()}`
    }
  }

  const handleDownload = async (file: LibraryFile, useBulk: boolean = false) => {
    try {
      setDownloadingId(file._id)

      // If bulk download with multiple files selected
      if (useBulk && selectedFiles.size > 1) {
        await handleBulkDownload()
        return
      }

      // Single file download
      const downloadUrl = file.url
        ? withVersion(file.url, true)
        : (() => {
            const path = `${engagement._id}/${file.category}/${file.fileName}`
            const { data } = supabase.storage.from("engagement-documents").getPublicUrl(path)
            return withVersion(data.publicUrl, true)
          })()

      const resp = await fetch(downloadUrl, { cache: "no-store" })
      if (!resp.ok) throw new Error(`HTTP ${resp.status} downloading file`)
      const blob = await resp.blob()

      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = file.fileName || "download.xlsx"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch (err: any) {
      console.error("Download error", err)
      toast({
        title: "Download failed",
        description: err.message || "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setDownloadingId(null)
    }
  }

  // Bulk download handler
  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return

    try {
      const fileNames = Array.from(selectedFiles)
      const filesToDownload = filteredFiles.filter(f => fileNames.includes(f.fileName || f._id))

      // For now, download files individually
      // In a production environment, you would use a backend endpoint to create ZIP
      toast({
        title: "Downloading files",
        description: `Starting download of ${fileNames.length} file(s)...`,
      })

      for (const file of filesToDownload) {
        try {
          await handleDownload(file, false)
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.error(`Failed to download ${file.fileName}:`, err)
        }
      }

      setSelectedFiles(new Set())
      toast({
        title: "Download complete",
        description: `Downloaded ${fileNames.length} file(s)`,
      })
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message || "Unable to download files",
        variant: "destructive",
      })
    }
  }

  // File preview handler
  const handlePreview = async (file: LibraryFile) => {
    try {
      const previewUrl = file.url
        ? withVersion(file.url, false)
        : (() => {
            const path = `${engagement._id}/${file.category}/${file.fileName}`
            const { data } = supabase.storage.from("engagement-documents").getPublicUrl(path)
            return withVersion(data.publicUrl, false)
          })()

      setPreviewFile(file)
      setPreviewUrl(previewUrl)
    } catch (err: any) {
      toast({
        title: "Preview failed",
        description: err.message || "Unable to preview file",
        variant: "destructive",
      })
    }
  }

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles)
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId)
    } else {
      newSelection.add(fileId)
    }
    setSelectedFiles(newSelection)
  }

  const selectAllFiles = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.fileName || f._id)))
    }
  }

  // Version history handler (simulated - would need backend support)
  const handleViewVersions = async (file: LibraryFile) => {
    setFileForDetails(file)
    setShowVersions(true)
    // In a real implementation, this would fetch version history from backend
  }

  // Activity log handler (simulated - would need backend support)
  const handleViewActivity = async (file: LibraryFile) => {
    setFileForDetails(file)
    setShowActivity(true)
    // In a real implementation, this would fetch activity log from backend
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />
      case "xlsx":
      case "xls":
        return <FileText className="h-4 w-4 text-green-600" />
      case "docx":
      case "doc":
        return <FileText className="h-4 w-4 text-blue-600" />
      case "jpg":
      case "png":
      case "gif":
        return <ImageIcon className="h-4 w-4 text-purple-500" />
      case "zip":
        return <File className="h-4 w-4 text-yellow-600" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const fetchLibraryFiles = async () => {
    setLoading(true)
    try {
      const files = await engagementApi.getLibraryFiles(engagement._id)
      setLibraryFiles(files)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch library files:", error)
      setLoading(false)
      toast({
        title: "Error",
        description: "Failed to fetch library files",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (engagement?._id) {
      fetchLibraryFiles()
    }
  }, [engagement?._id])

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return

    setUploading(true)
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 20 MB limit`,
            variant: "destructive",
          })
          continue
        }
        await engagementApi.uploadToLibrary(engagement._id, file, selectedFolder)
      }
      await fetchLibraryFiles()
      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Upload failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    await handleFileUpload(files)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return

    await handleFileUpload(droppedFiles)
  }

  // Somewhere in your component…
  const changeFolder = async (category: string, url: string) => {
    setLoading(true)
    try {
      // send { category, url } in the JSON body
      await engagementApi.changeFolder(engagement._id, category, url)
      await fetchLibraryFiles()
      toast({
        title: "Success",
        description: `Moved to ${category} successfully`,
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Operation failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Enhanced filtering with advanced search
  const filteredFiles = useMemo(() => {
    let filtered = libraryFiles.filter((file) => {
      const matchesFolder = file.category === selectedFolder
      if (!matchesFolder) return false

      // Basic search
      const searchTermLower = localSearchTerm.toLowerCase()
      const matchesSearch = !searchTermLower || file.fileName?.toLowerCase().includes(searchTermLower)
      if (!matchesSearch) return false

      // File type filter
      if (advancedSearch.fileType && advancedSearch.fileType !== "all") {
        const fileExt = file.fileName?.split(".").pop()?.toLowerCase() || ""
        if (advancedSearch.fileType === "pdf" && fileExt !== "pdf") return false
        if (advancedSearch.fileType === "docx" && !["docx", "doc"].includes(fileExt)) return false
        if (advancedSearch.fileType === "xlsx" && !["xlsx", "xls"].includes(fileExt)) return false
        if (advancedSearch.fileType === "jpg" && !["jpg", "jpeg"].includes(fileExt)) return false
        if (advancedSearch.fileType === "png" && fileExt !== "png") return false
        if (advancedSearch.fileType === "zip" && fileExt !== "zip") return false
      }

      // Date range filter
      if (advancedSearch.dateFrom) {
        const fileDate = new Date(file.createdAt)
        const fromDate = new Date(advancedSearch.dateFrom)
        if (fileDate < fromDate) return false
      }
      if (advancedSearch.dateTo) {
        const fileDate = new Date(file.createdAt)
        const toDate = new Date(advancedSearch.dateTo)
        toDate.setHours(23, 59, 59, 999) // End of day
        if (fileDate > toDate) return false
      }

      return true
    })

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (advancedSearch.sortBy) {
        case "fileName":
          comparison = (a.fileName || "").localeCompare(b.fileName || "")
          break
        case "fileSize":
          comparison = (a.fileSize || 0) - (b.fileSize || 0)
          break
        case "createdAt":
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return advancedSearch.sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [libraryFiles, selectedFolder, localSearchTerm, advancedSearch])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setAdvancedSearch(prev => ({ ...prev, search: localSearchTerm }))
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearchTerm])

  // Group files by category for folder counts
  const filesByCategory = libraryFiles.reduce(
    (acc, file) => {
      acc[file.category] = (acc[file.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading Engagement Library..." />
        </div>
      )
    }

  return (
    <div className="h-[800px] flex flex-col bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
      {/* Windows-style toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2 text-gray-700 font-medium flex-wrap">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                <Home className="h-4 w-4 text-primary-foreground" />
              </div>
              <button
                onClick={() => setSelectedFolder(categories[0])}
                className="hover:text-primary transition-colors"
              >
                Engagement Library
              </button>
              {selectedFolder && getFolderPath(selectedFolder).map((folder, index, pathArray) => (
                <span key={folder} className="flex items-center gap-2">
                  <span className="text-gray-400">/</span>
                  {index === pathArray.length - 1 ? (
                    <span className="text-gray-900 font-semibold">{folder}</span>
                  ) : (
                    <button
                      onClick={() => setSelectedFolder(folder)}
                      className="hover:text-primary transition-colors"
                    >
                      {folder}
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center border rounded-md">
              <Button
                className="rounded-r-none border-sidebar-foreground"
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                className="rounded-l-none border-sidebar-foreground"
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLibraryFiles}>
              <Refresh className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Folder tree */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Status cards */}
          <div className="p-4 space-y-3 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3 bg-white/80 backdrop-blur-sm border border-white/30 rounded-xl">
                <div className="text-xs text-gray-500">Trial Balance</div>
                <div
                  className={`text-sm font-medium ${engagement.trialBalanceUrl ? "text-green-600" : "text-gray-400"}`}
                >
                  {engagement.trialBalanceUrl ? "✓ Uploaded" : "Pending"}
                </div>
              </Card>
              <Card className="p-3 bg-white/80 backdrop-blur-sm border border-white/30 rounded-xl">
                <div className="text-xs text-gray-500">Status</div>
                <div className="text-sm font-medium">{engagement.status}</div>
              </Card>
            </div>
            <div className="flex space-x-2">
              <Badge variant="secondary">{requests.length} Requests</Badge>
            </div>
          </div>

          {/* Folder tree */}
          <div className="flex-1 overflow-y-auto p-2">
          <div className="w-full">
  <div className="flex flex-col space-y-1">
    {categories.map((folder) => (
      <div
        key={folder}
        onClick={() => setSelectedFolder(folder)}
        className={`flex items-center justify-between w-full p-2 rounded-lg cursor-pointer transition-all duration-150
          hover:bg-gray-100 ${
            selectedFolder === folder
              ? "bg-blue-50 border-l-2 border-blue-500"
              : "border-l-2 border-transparent"
          }`}
      >
        {/* Left section */}
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <Folder className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <span
            className="text-sm font-medium text-gray-700 truncate hover:underline cursor-pointer block w-full"
            title={folder}
          >
            {folder}
          </span>
        </div>

        {/* Right section: badge */}
        <Badge
          variant="outline"
          className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white border-gray-300 text-gray-600 flex-shrink-0"
        >
          {filesByCategory[folder] || 0}
        </Badge>
      </div>
    ))}
  </div>
          </div>


          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm">
          {/* Search and upload bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    className="pl-10"
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  className={showAdvancedSearch ? 'bg-gray-100' : ''}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={onFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                {selectedFiles.size > 0 && (
                  <Button
                    onClick={handleBulkDownload}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download ({selectedFiles.size})
                  </Button>
                )}
              </div>

              {/* Advanced search/filter panel */}
              {showAdvancedSearch && (
                <div className="p-4 bg-white rounded-lg border-2 border-gray-300 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvancedSearch(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="file-type">File Type</Label>
                      <Select
                        value={advancedSearch.fileType || "all"}
                        onValueChange={(value) => {
                          setAdvancedSearch(prev => ({ ...prev, fileType: value === "all" ? undefined : value }))
                        }}
                      >
                        <SelectTrigger id="file-type">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="docx">Word</SelectItem>
                          <SelectItem value="xlsx">Excel</SelectItem>
                          <SelectItem value="jpg">Image</SelectItem>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="zip">ZIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sort-by">Sort By</Label>
                      <Select
                        value={advancedSearch.sortBy}
                        onValueChange={(value) => {
                          setAdvancedSearch(prev => ({ ...prev, sortBy: value }))
                        }}
                      >
                        <SelectTrigger id="sort-by">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt">Upload Date</SelectItem>
                          <SelectItem value="fileName">File Name</SelectItem>
                          <SelectItem value="fileSize">File Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sort-order">Order</Label>
                      <Select
                        value={advancedSearch.sortOrder}
                        onValueChange={(value: "asc" | "desc") => {
                          setAdvancedSearch(prev => ({ ...prev, sortOrder: value }))
                        }}
                      >
                        <SelectTrigger id="sort-order">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Descending</SelectItem>
                          <SelectItem value="asc">Ascending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-from">Date From</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={advancedSearch.dateFrom}
                        onChange={(e) => {
                          setAdvancedSearch(prev => ({ ...prev, dateFrom: e.target.value }))
                        }}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-to">Date To</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={advancedSearch.dateTo}
                        onChange={(e) => {
                          setAdvancedSearch(prev => ({ ...prev, dateTo: e.target.value }))
                        }}
                        className="h-10"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAdvancedSearch({
                            search: "",
                            fileType: undefined,
                            dateFrom: "",
                            dateTo: "",
                            sortBy: "createdAt",
                            sortOrder: "desc",
                          })
                          setLocalSearchTerm("")
                        }}
                        className="w-full"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Drag and drop zone */}
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-all",
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 bg-gray-50/50 hover:border-gray-400"
                )}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">Drag and drop files here to upload</p>
                <p className="text-xs text-gray-500 mt-1">File size must be less than 20 MB</p>
              </div>
            </div>
          </div>

          {/* File listing */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === "list" ? (
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-2 text-xs font-medium text-gray-500 border-b">
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={selectAllFiles}
                      className="h-6 w-6"
                    >
                      {selectedFiles.size === filteredFiles.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Modified</div>
                  <div className="col-span-2">Actions</div>
                </div>
                {/* Files */}
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => {
                    const fileId = file.fileName || file._id
                    const isSelected = selectedFiles.has(fileId)
                    const fileExt = file.fileName?.split(".").pop()?.toLowerCase() || ""
                    const canPreview = ["pdf", "jpg", "jpeg", "png", "docx", "doc"].includes(fileExt)
                    
                    return (
                      <div
                        key={file._id}
                        className={cn(
                          "grid grid-cols-12 gap-4 p-2 hover:bg-gray-50 rounded cursor-pointer group",
                          isSelected && "bg-blue-50 border border-blue-200"
                        )}
                      >
                        <div className="col-span-1 flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFileSelection(fileId)}
                            className="h-6 w-6"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="col-span-5 flex items-center space-x-2">
                          {getFileIcon(file.fileName || "")}
                          <span className="text-sm">{decodeURIComponent(file.fileName)}</span>
                          {file.version && (
                            <Badge variant="outline" className="text-xs">v{file.version}</Badge>
                          )}
                        </div>
                        <div className="col-span-2 items-center flex text-sm text-gray-500">
                          {file.fileName?.split(".").pop()?.toUpperCase()} File
                        </div>
                        <div className="col-span-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          {canPreview && (
                            <Button
                              onClick={() => handlePreview(file)}
                              className="p-2 rounded bg-inherit hover:bg-gray-200"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4 text-gray-600" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleViewVersions(file)}
                            className="p-2 rounded bg-inherit hover:bg-gray-200"
                            title="Version History"
                          >
                            <History className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            onClick={() => handleViewActivity(file)}
                            className="p-2 rounded bg-inherit hover:bg-gray-200"
                            title="Activity Log"
                          >
                            <FileCheck className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            onClick={() => handleDownload(file)}
                            disabled={downloadingId === file._id}
                            className="p-2 rounded bg-inherit hover:bg-gray-200"
                            title="Download"
                          >
                            {downloadingId === file._id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                            ) : (
                              <Download className="h-4 w-4 text-gray-600" />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button className="p-2 rounded bg-inherit hover:bg-gray-200">
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="max-h-44 overflow-y-auto">
                              {categories.map((category) => (
                                <DropdownMenuItem
                                  key={category}
                                  className="bg-inherit hover:bg-sidebar-foreground"
                                  onClick={() => changeFolder(category, file.url)}
                                  disabled={file.category === category}
                                >
                                  <FolderInputIcon className="h-4 w-4 mr-2" />
                                  Move to {category}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.preventDefault()
                                  setFileToDelete(file)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>This folder is empty</p>
                    <p className="text-sm">Drag files here or use the upload button</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file._id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer text-center group"
                  >
                    <div className="mb-2 flex justify-center">
                      <div className="p-3 bg-gray-100 rounded-lg">{getFileIcon(file.fileName || "")}</div>
                    </div>
                    <div className="text-sm font-medium truncate" title={file.fileName}>
                      {decodeURIComponent(file.fileName)}
                    </div>
                    <Button
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file._id}
                      className="p-2 rounded bg-inherit hover:bg-gray-200"
                    >
                      {downloadingId === file._id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-600 bg-inherit hover:bg-gray-200" />
                      ) : (
                        <Download className="h-4 w-4 text-gray-600" />
                      )}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        setFileToDelete(file)
                        setDeleteDialogOpen(true)
                      }}
                      className="
    p-2 
    rounded 
    bg-inherit 
    hover:bg-gray-200 
    text-gray-600       /* default icon color */
    hover:text-red-600  /* icon turns red when BUTTON is hovered */
  "
                    >
                      {/* no explicit color on the icon! it will pick up the button’s text color */}
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="p-2 rounded bg-inherit hover:bg-gray-200">
                          <FolderInputIcon className="h-4 w-4 text-gray-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-44 overflow-y-auto">
                        {categories.map((category) => (
                          <DropdownMenuItem
                            key={category}
                            className="bg-inherit hover:bg-sidebar-foreground"
                            onClick={() => changeFolder(category, file.url)}
                            disabled={file.category === category}
                          >
                            Move to {category}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="border-t border-gray-200 px-4 py-2 bg-gray-50/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {filteredFiles.length} items in {selectedFolder}
              </span>
              <span>Created: {new Date(engagement.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
      <DeleteConfirmationDialog
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        fileToDelete={fileToDelete}
        handleDelete={handleDelete}
        deletingId={deletingId}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-white">
          <DialogHeader>
            <DialogTitle>{previewFile?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewUrl && previewFile && (
              <div className="w-full h-[70vh] overflow-auto border rounded-lg">
                {previewFile.fileType === "pdf" || (previewFile.fileName?.toLowerCase().endsWith(".pdf")) ? (
                  <iframe src={previewUrl} className="w-full h-full" />
                ) : (["jpg", "jpeg", "png"].includes(previewFile.fileName?.split(".").pop()?.toLowerCase() || "")) ? (
                  <img src={previewUrl} alt={previewFile.fileName} className="w-full h-auto" />
                ) : (["docx", "doc"].includes(previewFile.fileName?.split(".").pop()?.toLowerCase() || "")) ? (
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`}
                    className="w-full h-full"
                    frameBorder="0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Preview not available for this file type</p>
                    <Button
                      variant="outline"
                      onClick={() => window.open(previewUrl, "_blank")}
                      className="ml-4"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Version History - {fileForDetails?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Version 1</Badge>
                  <Badge variant="outline">Latest</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Uploaded on {fileForDetails ? new Date(fileForDetails.createdAt).toLocaleString() : "N/A"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {fileForDetails?.fileSize ? `Size: ${(fileForDetails.fileSize / 1024).toFixed(2)} KB` : ""}
                </p>
              </div>
              <p className="text-center text-gray-500 py-4 text-sm">
                Version history tracking will be available when backend support is added
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={showActivity} onOpenChange={setShowActivity}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Activity Log - {fileForDetails?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Upload</Badge>
                  <span className="font-medium">System</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {fileForDetails ? new Date(fileForDetails.createdAt).toLocaleString() : "N/A"}
                </p>
              </div>
              <p className="text-center text-gray-500 py-4 text-sm">
                Activity logging will be available when backend support is added
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
