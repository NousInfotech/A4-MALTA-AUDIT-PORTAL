// @ts-nocheck
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Folder, FolderOpen, File, FileText, ImageIcon, Grid3X3, List, Search, RefreshCw, FolderInputIcon, MoreVertical, Upload, Download, Pencil, Trash2, Home, Loader2, Plus, Library, Sparkles, Eye, History, Filter, CheckSquare, Square, X, Calendar, Tag, User, FileCheck, ChevronRight, ChevronDown } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  createFolder as apiCreateFolder,
  deleteFile as apiDeleteFile,
  deleteFolder as apiDeleteFolder,
  getFiles as apiGetFiles,
  getFolders as apiGetFolders,
  moveFile as apiMoveFile,
  renameFolder as apiRenameFolder,
  uploadFile as apiUploadFile,
  getFileVersions,
  restoreVersion,
  previewFile,
  bulkDownload,
  getFileActivity,
  updateFileMetadata,
  downloadFile as apiDownloadFile,
  type GlobalFile,
  type GlobalFolder,
  type DocumentVersion,
  type DocumentActivity,
  getFilesReviewStatus,
  saveAnnotation,
} from "@/lib/api/global-library"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { EnhancedLoader } from "@/components/ui/enhanced-loader"
import { useActivityLogger } from "@/hooks/useActivityLogger"
import { PDFAnnotator } from "@/components/pdf-annotator/PDFAnnotator"

export default function GlobalLibraryPage() {
  const [folders, setFolders] = useState<GlobalFolder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<GlobalFolder | null>(null)
  const [files, setFiles] = useState<GlobalFile[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [localSearchTerm, setLocalSearchTerm] = useState("") // For immediate UI feedback
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedParentFolder, setSelectedParentFolder] = useState<GlobalFolder | null>(null)
  const [renameFolderName, setRenameFolderName] = useState("")
  const [isCreateFolderInCurrentOpen, setIsCreateFolderInCurrentOpen] = useState(false)
  const [newFolderInCurrentName, setNewFolderInCurrentName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<GlobalFolder | null>(null)
  const [fileToDelete, setFileToDelete] = useState<GlobalFile | null>(null)
  const [contextMenuFolder, setContextMenuFolder] = useState<GlobalFolder | null>(null)

  // New state for enhanced features
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [previewFileState, setPreviewFileState] = useState<GlobalFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showAnnotator, setShowAnnotator] = useState(false)
  const [annotatorFile, setAnnotatorFile] = useState<GlobalFile | null>(null)
  const [annotatorUrl, setAnnotatorUrl] = useState<string | null>(null)
  const [versionHistory, setVersionHistory] = useState<DocumentVersion[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [fileForVersions, setFileForVersions] = useState<GlobalFile | null>(null)
  const [fileActivity, setFileActivity] = useState<DocumentActivity[]>([])
  const [showActivity, setShowActivity] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const [reviewStatuses, setReviewStatuses] = useState<Record<string, boolean>>({});

  // Advanced search/filter state
  const [advancedSearch, setAdvancedSearch] = useState({
    search: "",
    fileType: undefined as string | undefined,
    uploadedBy: "",
    dateFrom: "",
    dateTo: "",
    tags: [] as string[],
    sortBy: "uploadedAt",
    sortOrder: "desc" as "asc" | "desc",
  })
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)


  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dropZoneRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()
  const { logUploadDocument, logDeleteDocument, logViewClientFile } = useActivityLogger()

  useEffect(() => {
    if (selectedFolder && selectedFolder?.name)
      setRenameFolderName(selectedFolder?.name);
  }, [selectedFolder])

  // Debounced search effect - only trigger API call after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setAdvancedSearch(prev => ({ ...prev, search: localSearchTerm }))
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [localSearchTerm])

  const filteredFiles = useMemo(() => {
    // Apply local search filter immediately for better UX
    const term = localSearchTerm.trim().toLowerCase()
    if (!term) return files

    return files.filter((f) => {
      const fileName = f.name || f.fileName || ""
      return fileName.toLowerCase().includes(term)
    })
  }, [files, localSearchTerm])


  // Build folder tree - only show root-level folders in sidebar (no nested folders)
  const buildFolderTree = useMemo(() => {
    // Only show folders without a parent (root-level folders)
    const rootFolders = folders
      .filter(folder => {
        const parentId = folder.parentId?._id || folder.parentId
        return !parentId
      })
      .map(folder => ({ ...folder, children: [] }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return rootFolders
  }, [folders])

  // Build full path for a folder by traversing up the parent chain
  const getFolderPath = useCallback((folder: GlobalFolder | null): GlobalFolder[] => {
    if (!folder) return []

    const path: GlobalFolder[] = []
    const folderMap = new Map<string, GlobalFolder>()

    // Create a map of all folders by ID for quick lookup
    folders.forEach(f => {
      const id = f._id
      folderMap.set(id, f)
    })

    // Traverse up the parent chain
    let current: GlobalFolder | null = folder
    const visited = new Set<string>()

    while (current && !visited.has(current._id)) {
      visited.add(current._id)
      path.unshift(current) // Add to beginning to maintain order

      // Get parent ID (handle both object and string)
      const parentId = current.parentId?._id || current.parentId
      if (parentId) {
        current = folderMap.get(String(parentId)) || null
      } else {
        current = null
      }
    }

    return path
  }, [folders])

  // No need to auto-expand in sidebar since we're not showing nested folders there
  // Nested folders appear in the right panel instead

  // Get nested folders for the selected folder
  const nestedFolders = useMemo(() => {
    if (!selectedFolder) return []
    const selectedFolderId = String(selectedFolder._id)
    const filtered = folders.filter(folder => {
      // Handle both null and undefined for parentId
      // parentId can be: null, undefined, string (_id), or object (populated)
      const folderParentId = folder.parentId

      // If parentId is null or undefined, it's a root folder
      if (!folderParentId) {
        return false
      }

      // If parentId is an object (populated), extract the _id
      if (typeof folderParentId === 'object') {
        const parentIdStr = String(folderParentId._id || folderParentId)
        return parentIdStr === selectedFolderId
      }

      // If parentId is a string, compare directly
      return String(folderParentId) === selectedFolderId
    })
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, selectedFolder])

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
        return <FileText className="h-4 w-4 text-gray-600" />
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon className="h-4 w-4 text-purple-500" />
      case "zip":
        return <File className="h-4 w-4 text-yellow-600" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }


  // Render folder list - only root-level folders (flat list, no nesting in sidebar)
  const renderFolderTree = (folderTree: GlobalFolder[]): React.ReactNode => {
    return folderTree.map((folder) => {
      const isSelected = selectedFolder?._id === folder._id
      const matchesSearch = !searchTerm || folder.name.toLowerCase().includes(searchTerm.toLowerCase())

      if (searchTerm && !matchesSearch) {
        return null
      }

      return (
        <div key={folder._id} className="select-none">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer group transition-colors",
              isSelected ? "bg-blue-50 hover:bg-blue-100" : ""
            )}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedFolder(folder)
            }}
          >
            {/* Folder icon */}
            <div className={cn(
              "w-5 h-5 flex items-center justify-center flex-shrink-0",
              isSelected ? "text-blue-600" : "text-yellow-600"
            )}>
              <Folder className="h-4 w-4" />
            </div>

            {/* Folder name */}
            <span className={cn(
              "text-sm truncate flex-1",
              isSelected ? "font-semibold text-blue-900" : "font-medium text-gray-700"
            )}>
              {folder.name}
            </span>

            {/* Actions menu */}
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded hover:bg-gray-200">
                    <MoreVertical className="h-3.5 w-3.5 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFolder(folder)
                      setRenameFolderName(folder.name)
                      setIsRenameFolderOpen(true)
                    }}
                    className="rounded-md"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 rounded-md"
                    onClick={(e) => {
                      e.stopPropagation()
                      confirmDeleteFolder(folder)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )
    })
  }

  const refreshFolders = async () => {
    setLoading(true)
    try {
      const list = await apiGetFolders()
      setFolders(list)
      // maintain selection if still exists
      if (selectedFolder) {
        const found = list.find((f) => f._id === selectedFolder._id)
        setSelectedFolder(found ?? null)
      }
      // Keep expanded folders expanded after refresh
      // This ensures nested folders remain visible after refresh
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to fetch folders", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const refreshFiles = async (folder: GlobalFolder | null, customFilters?: Partial<typeof advancedSearch>) => {
    if (!folder) {
      setFiles([])
      return
    }
    setLoading(true)
    try {
      // Merge custom filters with current advancedSearch state
      const activeFilters = customFilters ? { ...advancedSearch, ...customFilters } : advancedSearch;
      const list = await apiGetFiles(folder.name, {
        search: activeFilters.search || undefined,
        fileType: activeFilters.fileType || undefined,
        uploadedBy: activeFilters.uploadedBy || undefined,
        dateFrom: activeFilters.dateFrom || undefined,
        dateTo: activeFilters.dateTo || undefined,
        tags: activeFilters.tags.length > 0 ? activeFilters.tags : undefined,
        sortBy: activeFilters.sortBy || "uploadedAt",
        sortOrder: activeFilters.sortOrder || "desc",
      })
      setFiles(list)

      // Check review status for files
      if (list.length > 0) {
        // Construct file IDs consistent with how they are saved in annotations (typically just the file object ID or name if using gridfs/s3 references)
        // Adjust based on your backend logic. The annotationController uses `fileId` which maps to `_id` of the file record if available.
        // If files are from filesystem-like storage, mapping might be different.
        // Assuming list contains objects with _id.
        const fileIds = list.map(f => f._id).filter(Boolean) as string[];
        if (fileIds.length > 0) {
          getFilesReviewStatus(fileIds).then(statusMap => {
            setReviewStatuses(prev => ({ ...prev, ...statusMap }));
          }).catch(console.error);
        }
      }

    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to fetch files", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    refreshFolders()
  }, [])

  // Refresh files when folder changes
  useEffect(() => {
    if (selectedFolder) {
      refreshFiles(selectedFolder)
    }
  }, [selectedFolder?._id])

  // Separate effect for search term (debounced) - filters apply automatically via onValueChange handlers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedFolder && advancedSearch.search) {
        refreshFiles(selectedFolder)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [advancedSearch.search, selectedFolder?._id])

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    setCreating(true)
    try {
      const parentId = selectedParentFolder?._id || null
      const createdFolder = await apiCreateFolder(name, parentId)

      setNewFolderName("")
      setSelectedParentFolder(null)
      setIsCreateFolderOpen(false)

      // Refresh folders to get the updated list
      const updatedFolders = await apiGetFolders()
      setFolders(updatedFolders)

      // Maintain selection if still exists
      if (selectedFolder) {
        const found = updatedFolders.find((f) => f._id === selectedFolder._id)
        if (found) {
          setSelectedFolder(found)
          // Refresh files view to ensure nested folders show up
          await refreshFiles(found)
        }
      }

      toast({ title: "Folder created", description: `"${name}" is ready to use.` })
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message || "Unable to create folder", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const handleCreateFolderInCurrent = async () => {
    if (!selectedFolder) {
      toast({ title: "Select a folder", description: "Please select a folder first.", variant: "destructive" })
      return
    }
    const name = newFolderInCurrentName.trim()
    if (!name) return
    setCreating(true)
    try {
      const parentId = selectedFolder._id
      const createdFolder = await apiCreateFolder(name, parentId)

      setNewFolderInCurrentName("")
      setIsCreateFolderInCurrentOpen(false)

      // Refresh folders to get the updated list
      const updatedFolders = await apiGetFolders()
      setFolders(updatedFolders)

      // Maintain selection and refresh files view to show the new nested folder
      const found = updatedFolders.find((f) => f._id === selectedFolder._id)
      if (found) {
        setSelectedFolder(found)
        await refreshFiles(found)
      }

      toast({ title: "Folder created", description: `"${name}" created inside "${selectedFolder.name}".` })
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message || "Unable to create folder", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const handleRenameFolder = async () => {
    if (!selectedFolder) return
    const newName = renameFolderName.trim()
    if (!newName || newName === selectedFolder.name) {
      setIsRenameFolderOpen(false)
      return
    }
    setRenaming(true)
    try {
      await apiRenameFolder(selectedFolder._id, newName)
      setIsRenameFolderOpen(false)
      setRenameFolderName("")
      await refreshFolders()
      // If the selected folder was renamed, re-select by name
      const updated = (await apiGetFolders()).find((f) => f.name === newName) || null
      setSelectedFolder(updated)
      await refreshFiles(updated)
      toast({ title: "Folder renamed", description: `Folder renamed to "${newName}"` })
    } catch (e: any) {
      toast({ title: "Rename failed", description: e.message || "Unable to rename folder", variant: "destructive" })
    } finally {
      setRenaming(false)
    }
  }

  const confirmDeleteFolder = (folder: GlobalFolder) => {
    setFolderToDelete(folder)
    setDeleteDialogOpen(true)
  }

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return
    setDeleting(true)
    try {
      await apiDeleteFolder(folderToDelete._id)
      setDeleteDialogOpen(false)
      if (selectedFolder?._id === folderToDelete._id) {
        setSelectedFolder(null)
      }
      await refreshFolders()
      toast({ title: "Folder deleted", description: `"${folderToDelete.name}" and its contents were removed.` })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message || "Unable to delete folder", variant: "destructive" })
    } finally {
      setDeleting(false)
      setFolderToDelete(null)
    }
  }

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFolder) {
      toast({ title: "Select a folder", description: "Please choose a folder first.", variant: "destructive" })
      return
    }
    const filesList = e.target.files
    if (!filesList || filesList.length === 0) return


    setUploading(true)
    try {
      for (const file of Array.from(filesList)) {
        await apiUploadFile(selectedFolder.name, file)
        // Log file upload
        logUploadDocument(`Uploaded file: ${file.name} to folder: ${selectedFolder.name}`)
      }
      await refreshFiles(selectedFolder)
      toast({ title: "Upload complete", description: `${filesList.length} file(s) uploaded.` })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
      setUploading(false)
    }
  }

  const handleDownload = async (file: GlobalFile, useBulk: boolean = false) => {
    try {
      const fileName = file.name || file.fileName || "";
      setDownloading(fileName);

      if (!selectedFolder) return;

      // If multiple files are selected, use bulk download
      if (useBulk && selectedFiles.size > 1) {
        const fileNames = Array.from(selectedFiles);
        const blob = await bulkDownload(selectedFolder.name, fileNames);
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${selectedFolder.name}-files.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        setSelectedFiles(new Set());
        toast({ title: "Download started", description: `Downloading ${fileNames.length} file(s) as ZIP...` });
        return;
      }

      // Single file download - direct download (not ZIP)
      const result = await apiDownloadFile(selectedFolder.name, fileName);
      const response = await fetch(result.downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = result.fileName; // Use original filename, not ZIP
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      logViewClientFile(`Downloaded/viewed file: ${file.name} from folder: ${selectedFolder?.name || 'Unknown'}`);
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message || "Unable to download file", variant: "destructive" })
    } finally {
      setDownloading(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!selectedFolder) {
      toast({ title: "Select a folder", description: "Please choose a folder first.", variant: "destructive" });
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of droppedFiles) {
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 20 MB limit`, variant: "destructive" });
          continue;
        }
        await apiUploadFile(selectedFolder.name, file);
        logUploadDocument(`Uploaded file: ${file.name} to folder: ${selectedFolder.name}`);
      }
      await refreshFiles(selectedFolder);
      toast({ title: "Upload complete", description: `${droppedFiles.length} file(s) uploaded.` });
    } finally {
      setUploading(false);
    }
  };

  // Preview handler
  const handlePreview = async (file: GlobalFile) => {
    if (!selectedFolder) return;
    try {
      const result = await previewFile(selectedFolder.name, file.name || file.fileName || "");
      setPreviewFileState(file);
      setPreviewUrl(result.previewUrl);
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message || "Unable to preview file", variant: "destructive" });
    }
  };

  // Open PDF annotator
  // Helper function to decode URLs and add version parameter (similar to engagement library)
  const withVersion = (url: string, addDownload = false) => {
    try {
      // Decode URL first to avoid double encoding
      let decodedUrl = url
      try {
        decodedUrl = decodeURIComponent(url)
      } catch {
        // If decoding fails, use original URL
        decodedUrl = url
      }

      const u = new URL(decodedUrl)
      if (addDownload && !u.searchParams.has("download")) {
        // makes the CDN return with Content-Disposition: attachment
        u.searchParams.set("download", "")
      }
      // force a fresh URL every time to avoid disk cache
      u.searchParams.set("v", String(Date.now()))
      return u.toString()
    } catch {
      // If URL parsing fails, try to fix encoding
      let fixedUrl = url
      try {
        // Decode if double-encoded
        fixedUrl = decodeURIComponent(url)
      } catch {
        fixedUrl = url
      }
      const join = fixedUrl.includes("?") ? "&" : "?"
      const download = addDownload ? `${join}download=&` : join
      return `${fixedUrl}${download}v=${Date.now()}`
    }
  }

  const handleOpenAnnotator = async (file: GlobalFile) => {
    if (!selectedFolder) return;
    try {
      const result = await previewFile(selectedFolder.name, file.name || file.fileName || "");
      setAnnotatorFile(file);
      // Decode and process the URL to avoid double encoding issues
      let processedUrl = result.previewUrl;
      try {
        // Try decoding once to handle double encoding
        const decoded = decodeURIComponent(result.previewUrl);
        processedUrl = withVersion(decoded, false);
      } catch {
        // If decoding fails, use original URL with version
        processedUrl = withVersion(result.previewUrl, false);
      }
      setAnnotatorUrl(processedUrl);
      setShowAnnotator(true);
    } catch (e: any) {
      toast({
        title: "Failed to open annotator",
        description: e.message || "Unable to open PDF annotator",
        variant: "destructive"
      });
    }
  };

  // Version history handler
  const handleViewVersions = async (file: GlobalFile) => {
    if (!selectedFolder) return;
    try {
      const versions = await getFileVersions(selectedFolder.name, file.name || file.fileName || "");
      setVersionHistory(versions);
      setFileForVersions(file);
      setShowVersions(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Unable to fetch versions", variant: "destructive" });
    }
  };

  // Activity log handler
  const handleViewActivity = async (file: GlobalFile) => {
    if (!selectedFolder) return;
    try {
      const activity = await getFileActivity(selectedFolder.name, file.name || file.fileName || "");
      setFileActivity(activity);
      setFileForVersions(file);
      setShowActivity(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Unable to fetch activity", variant: "destructive" });
    }
  };

  // Bulk download handler
  const handleBulkDownload = async () => {
    if (!selectedFolder || selectedFiles.size === 0) return;

    // If only one file selected, download directly (not ZIP)
    if (selectedFiles.size === 1) {
      const fileName = Array.from(selectedFiles)[0];
      const file = files.find(f => (f.name || f.fileName) === fileName);
      if (file) {
        setSelectedFiles(new Set()); // Clear selection first
        await handleDownload(file, false); // Single file download
        return;
      }
    }

    // Multiple files - download as ZIP
    try {
      const fileNames = Array.from(selectedFiles);
      const blob = await bulkDownload(selectedFolder.name, fileNames);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${selectedFolder.name}-files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setSelectedFiles(new Set());
      toast({ title: "Download started", description: `Downloading ${fileNames.length} file(s) as ZIP...` });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message || "Unable to download files", variant: "destructive" });
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName);
    } else {
      newSelection.add(fileName);
    }
    setSelectedFiles(newSelection);
  };

  const selectAllFiles = () => {
    const totalItems = filteredFiles.length + nestedFolders.length
    if (selectedFiles.size === totalItems) {
      setSelectedFiles(new Set());
    } else {
      const allItems = [
        ...filteredFiles.map(f => f.name || f.fileName || ""),
        ...nestedFolders.map(f => f._id)
      ]
      setSelectedFiles(new Set(allItems));
    }
  };

  const handleMoveFile = async (file: GlobalFile, toFolder: GlobalFolder) => {
    if (!selectedFolder) return
    if (toFolder.name === selectedFolder.name) {
      toast({ title: "Same folder", description: "File is already in this folder.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const fileName = file.name || file.fileName || "";
      if (!fileName) {
        toast({ title: "Error", description: "File name not found", variant: "destructive" })
        return
      }
      await apiMoveFile({
        fileName: fileName,
        fromFolder: selectedFolder.name,
        toFolder: toFolder.name,
      })
      await refreshFiles(selectedFolder)
      toast({ title: "Moved", description: `"${fileName}" moved to "${toFolder.name}".` })
    } catch (e: any) {
      toast({ title: "Move failed", description: e.message || "Unable to move file", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFile = async () => {
    if (!selectedFolder || !fileToDelete) return
    setDeleting(true)
    try {
      const fileName = fileToDelete.name || fileToDelete.fileName || "";
      if (!fileName) {
        toast({ title: "Error", description: "File name not found", variant: "destructive" })
        return
      }
      await apiDeleteFile(selectedFolder.name, fileName)
      await refreshFiles(selectedFolder)

      // Log file deletion
      logDeleteDocument(`Deleted file: ${fileName} from folder: ${selectedFolder.name}`)

      toast({ title: "File deleted", description: `"${fileName}" was removed.` })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message || "Unable to delete file", variant: "destructive" })
    } finally {
      setDeleting(false)
      setFileToDelete(null)
    }
  }

  return (
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Library className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-brand-body animate-fade-in">Global Document Library</h1>
              <p className="text-brand-body animate-fade-in-delay">Company-wide folders and documents</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Dialog open={isCreateFolderOpen} onOpenChange={(open) => {
            setIsCreateFolderOpen(open)
            if (open) {
              // When dialog opens, pre-select the currently selected folder as parent (if any)
              setSelectedParentFolder(selectedFolder)
            } else {
              // Reset when dialog closes
              setNewFolderName("")
              setSelectedParentFolder(null)
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 transition-all duration-300 rounded-xl px-6 py-3 h-auto"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border border-gray-200 rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="parent-folder" className="text-sm font-medium text-gray-700">Parent Folder</Label>
                  <Select
                    value={selectedParentFolder?._id || "root"}
                    onValueChange={(value) => {
                      if (value === "root") {
                        setSelectedParentFolder(null)
                      } else {
                        const folder = folders.find(f => f._id === value)
                        setSelectedParentFolder(folder || null)
                      }
                    }}
                  >
                    <SelectTrigger id="parent-folder" className="h-12 border-gray-200 focus:border-gray-400 rounded-xl">
                      <SelectValue placeholder="Select parent folder" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="root">Root (Top Level)</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder._id} value={folder._id}>
                          {folder.path.replace(/\/$/, '') || folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {selectedParentFolder
                      ? `Creating folder inside: ${selectedParentFolder.name}`
                      : "Creating folder at root level. Select a folder to create inside it."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="folder-name" className="text-sm font-medium text-gray-700">Folder Name</Label>
                  <Input
                    id="folder-name"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || creating}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 h-auto"
                  >
                    {creating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                    Create Folder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateFolderOpen(false)
                    }}
                    className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 transition-all duration-300 rounded-xl px-6 py-3 h-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {selectedFolder && (
            <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 transition-all duration-300 rounded-xl px-6 py-3 h-auto"
                >
                  <Pencil className="h-5 w-5 mr-2" />
                  Rename Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-gray-200 rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-gray-900">Rename Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="New folder name"
                    value={renameFolderName}
                    onChange={(e) => setRenameFolderName(e.target.value)}
                    className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleRenameFolder}
                      disabled={!renameFolderName.trim() || renaming}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 h-auto"
                    >
                      {renaming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                      Rename
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsRenameFolderOpen(false)}
                      className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 transition-all duration-300 rounded-xl px-6 py-3 h-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          {/* Toolbar */}
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-700 font-medium flex-wrap">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <Home className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="hover:text-primary transition-colors"
                  >
                    Global Library
                  </button>
                  {selectedFolder && getFolderPath(selectedFolder).map((folder, index, pathArray) => (
                    <span key={folder._id} className="flex items-center gap-2">
                      <span className="text-gray-400">/</span>
                      {index === pathArray.length - 1 ? (
                        <span className="text-gray-900 font-semibold">{folder.name}</span>
                      ) : (
                        <button
                          onClick={() => setSelectedFolder(folder)}
                          className="hover:text-primary transition-colors"
                        >
                          {folder.name}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1">
                  <Button
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg"
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg"
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refreshFolders()
                    refreshFiles(selectedFolder)
                  }}
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 rounded-xl"
                >
                  <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 sm:h-[40vh]">
              <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              {/* Sidebar: Folders */}
              <aside className="w-full md:w-80 bg-white border-r border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="text-sm text-gray-600 mb-3 font-medium">Folders</div>
                  <Input
                    placeholder="Search files or folders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 border-gray-200 focus:border-gray-400 rounded-xl"
                  />
                </div>
                <div className="p-2 space-y-0.5 max-h-[60vh] md:max-h-[70vh] overflow-auto">
                  {buildFolderTree.length > 0 ? (
                    <div className="space-y-0.5">
                      {renderFolderTree(buildFolderTree)}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Folder className="h-8 w-8 text-gray-600" />
                      </div>
                      <p className="text-gray-600 font-medium">No folders yet. Create one to get started.</p>
                    </div>
                  )}
                </div>
              </aside>

              {/* Main content */}
              <section className="flex-1 min-w-0">
                {/* Search and upload */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col gap-4">
                    {/* Basic search and upload */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search files..."
                          value={localSearchTerm}
                          onChange={(e) => setLocalSearchTerm(e.target.value)}
                          className="pl-10 h-12 bg-white/90 border-gray-200 focus:border-gray-400 focus:ring-gray-400/20 rounded-2xl"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAdvancedSearch(prev => !prev)}
                          className={`border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 rounded-xl transition-colors ${showAdvancedSearch ? 'bg-gray-100 border-gray-300' : ''}`}
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Filters
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!selectedFolder || creating}
                          onClick={() => setIsCreateFolderInCurrentOpen(true)}
                          className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 rounded-xl transition-colors"
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          New Folder
                        </Button>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          disabled={!selectedFolder || uploading}
                          onChange={onFileInputChange}
                          className="hidden"
                        />
                        <Button
                          disabled={!selectedFolder || uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 h-auto"
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          Upload
                        </Button>
                        {selectedFiles.size > 0 && (
                          <Button
                            onClick={handleBulkDownload}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 py-3 h-auto"
                          >
                            <Download className="h-5 w-5 mr-2" />
                            Download ({selectedFiles.size})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Advanced search/filter panel */}
                    {showAdvancedSearch && (
                      <div className="p-6 bg-white rounded-xl border-2 border-gray-300 space-y-4 mt-4 shadow-lg relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvancedSearch(false)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <X className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="file-type" className="text-sm font-medium text-gray-700">File Type</Label>
                            <Select
                              value={advancedSearch.fileType || "all"}
                              onValueChange={(value) => {
                                const fileTypeValue = value === "all" ? undefined : value;
                                const newFilters = { ...advancedSearch, fileType: fileTypeValue };
                                setAdvancedSearch(newFilters);
                                // Apply filter immediately with new value
                                if (selectedFolder) {
                                  refreshFiles(selectedFolder, { fileType: fileTypeValue });
                                }
                              }}
                            >
                              <SelectTrigger id="file-type" className="h-10 w-full">
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
                            <Label htmlFor="sort-by" className="text-sm font-medium text-gray-700">Sort By</Label>
                            <Select
                              value={advancedSearch.sortBy || "uploadedAt"}
                              onValueChange={(value) => {
                                const newFilters = { ...advancedSearch, sortBy: value };
                                setAdvancedSearch(newFilters);
                                // Apply filter immediately with new value
                                if (selectedFolder) {
                                  refreshFiles(selectedFolder, { sortBy: value });
                                }
                              }}
                            >
                              <SelectTrigger id="sort-by" className="h-10 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="uploadedAt">Upload Date</SelectItem>
                                <SelectItem value="fileName">File Name</SelectItem>
                                <SelectItem value="fileSize">File Size</SelectItem>
                                <SelectItem value="uploadedByName">Uploader</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sort-order" className="text-sm font-medium text-gray-700">Order</Label>
                            <Select
                              value={advancedSearch.sortOrder || "desc"}
                              onValueChange={(value: "asc" | "desc") => {
                                const newFilters = { ...advancedSearch, sortOrder: value };
                                setAdvancedSearch(newFilters);
                                // Apply filter immediately with new value
                                if (selectedFolder) {
                                  refreshFiles(selectedFolder, { sortOrder: value });
                                }
                              }}
                            >
                              <SelectTrigger id="sort-order" className="h-10 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="desc">Descending</SelectItem>
                                <SelectItem value="asc">Ascending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="date-from" className="text-sm font-medium text-gray-700">Date From</Label>
                            <Input
                              id="date-from"
                              type="date"
                              value={advancedSearch.dateFrom || ""}
                              onChange={(e) => {
                                const newFilters = { ...advancedSearch, dateFrom: e.target.value };
                                setAdvancedSearch(newFilters);
                              }}
                              onBlur={() => {
                                // Apply filter when user finishes selecting date
                                if (selectedFolder) {
                                  refreshFiles(selectedFolder);
                                }
                              }}
                              className="h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="date-to" className="text-sm font-medium text-gray-700">Date To</Label>
                            <Input
                              id="date-to"
                              type="date"
                              value={advancedSearch.dateTo || ""}
                              onChange={(e) => {
                                const newFilters = { ...advancedSearch, dateTo: e.target.value };
                                setAdvancedSearch(newFilters);
                              }}
                              onBlur={() => {
                                // Apply filter when user finishes selecting date
                                if (selectedFolder) {
                                  refreshFiles(selectedFolder);
                                }
                              }}
                              className="h-10"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setAdvancedSearch({
                                  search: "",
                                  fileType: "",
                                  uploadedBy: "",
                                  dateFrom: "",
                                  dateTo: "",
                                  tags: [],
                                  sortBy: "uploadedAt",
                                  sortOrder: "desc",
                                });
                                setLocalSearchTerm("");
                                // Refresh files after clearing
                                if (selectedFolder) {
                                  refreshFiles(selectedFolder);
                                }
                              }}
                              className="flex-1 h-10"
                            >
                              Clear Filters
                            </Button>
                            <Button
                              variant="default"
                              onClick={() => {
                                // Apply filters manually
                                if (selectedFolder) {
                                  refreshFiles(selectedFolder);
                                  toast({
                                    title: "Filters applied",
                                    description: "Files have been filtered according to your criteria."
                                  });
                                }
                              }}
                              className="flex-1 h-10 bg-primary hover:bg-primary/90"
                            >
                              Apply Filters
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drag and drop zone */}
                    {selectedFolder && (
                      <div
                        ref={dropZoneRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                          "border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300",
                          isDragOver
                            ? "border-primary bg-primary/5"
                            : "border-gray-300 bg-white/50 hover:border-gray-400"
                        )}
                      >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 font-medium mb-2">Drag and drop files here to upload</p>
                        <p className="text-sm text-gray-500">File size must be less than 20 MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Files and Folders list/grid */}
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div className="p-6 min-h-[400px]">
                      {!selectedFolder ? (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <FolderOpen className="h-10 w-10 text-gray-600" />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800 mb-3">No folder selected</h3>
                          <p className="text-gray-600 text-lg">
                            Choose a folder on the left to view its contents.
                          </p>
                        </div>
                      ) : viewMode === "list" ? (
                        <div className="space-y-2">
                          {/* Header (hidden on mobile) */}
                          <div className="hidden sm:grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-gray-600 border-b border-gray-200">
                            <div className="col-span-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={selectAllFiles}
                                className="h-6 w-6"
                              >
                                {selectedFiles.size === (filteredFiles.length + nestedFolders.length) ? (
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

                          {/* Nested Folders */}
                          {nestedFolders.length > 0 && nestedFolders.map((folder) => (
                            <div
                              key={folder._id}
                              className={cn(
                                "grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 hover:bg-gray-50/30 rounded-2xl group transition-all duration-300 cursor-pointer",
                                selectedFolder?._id === folder._id && "bg-blue-50 border border-blue-200"
                              )}
                              onClick={() => setSelectedFolder(folder)}
                            >
                              <div className="sm:col-span-1 flex items-center">
                                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                                  <Folder className="h-4 w-4 text-primary-foreground" />
                                </div>
                              </div>
                              <div className="flex items-center gap-3 sm:col-span-5 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm truncate font-medium block">{folder.name}</span>
                                  <span className="text-xs text-gray-500">Folder</span>
                                </div>
                              </div>
                              <div className="sm:col-span-2 hidden sm:flex items-center text-sm text-slate-500">
                                Folder
                              </div>
                              <div className="sm:col-span-2 hidden sm:flex items-center text-sm text-slate-500">
                                {new Date(folder.createdAt).toLocaleDateString()}
                              </div>
                              <div className="sm:col-span-2 flex items-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="outline" size="icon" className="rounded-xl border-gray-200 hover:bg-gray-50">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedFolder(folder)
                                      setRenameFolderName(folder.name)
                                      setIsRenameFolderOpen(true)
                                    }}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        confirmDeleteFolder(folder)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}

                          {/* Files */}
                          {filteredFiles.length > 0 ? (
                            filteredFiles.map((file) => {
                              const fileName = file.name || file.fileName || "";
                              const isSelected = selectedFiles.has(fileName);
                              return (
                                <div
                                  key={fileName}
                                  className={cn(
                                    "grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 hover:bg-gray-50/30 rounded-2xl group transition-all duration-300",
                                    isSelected && "bg-blue-50 border border-blue-200"
                                  )}
                                >
                                  {/* Checkbox */}
                                  <div className="sm:col-span-1 flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => toggleFileSelection(fileName)}
                                      className="h-6 w-6"
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="h-4 w-4 text-primary" />
                                      ) : (
                                        <Square className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  {/* Name */}
                                  <div className="flex items-center gap-3 sm:col-span-5 min-w-0">
                                    <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                                      {getFileIcon(fileName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm truncate font-medium block">{decodeURIComponent(fileName)}</span>
                                      {file.version && (
                                        <span className="text-xs text-gray-500">v{file.version}</span>
                                      )}
                                      {file.uploadedByName && (
                                        <span className="text-xs text-gray-500 block">by {file.uploadedByName}</span>
                                      )}
                                      {reviewStatuses[file._id || ''] && (
                                        <Badge variant="destructive" className="mt-1 text-xs px-2 py-0 border-transparent bg-red-500 text-white hover:bg-red-600">
                                          Review Points
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Type/Modified (stacked on mobile) */}
                                  <div className="sm:col-span-2 hidden sm:flex items-center text-sm text-slate-500">
                                    {(fileName.split(".").pop() || "").toUpperCase()} File
                                  </div>
                                  <div className="sm:col-span-2 hidden sm:flex items-center text-sm text-slate-500">
                                    {new Date(file.updatedAt || file.uploadedAt || Date.now()).toLocaleDateString()}
                                  </div>
                                  <div className="sm:hidden text-xs text-slate-500 -mt-2">
                                    {(fileName.split(".").pop() || "").toUpperCase()} • {new Date(file.updatedAt || file.uploadedAt || Date.now()).toLocaleDateString()}
                                  </div>

                                  {/* Actions - vertically aligned buttons */}
                                  <div className="sm:col-span-2 flex flex-col items-start gap-2">
                                    {(["pdf", "jpg", "jpeg", "png", "docx", "doc"].includes((fileName.split(".").pop() || "").toLowerCase())) && (
                                      <>
                                        {fileName.toLowerCase().endsWith(".pdf") && (
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleOpenAnnotator(file)}
                                            className="rounded-xl border-gray-200 hover:bg-gray-50 text-blue-600 hover:text-blue-700"
                                            aria-label={`Annotate ${fileName}`}
                                            title="Annotate PDF"
                                          >
                                            <FileText className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => handlePreview(file)}
                                          className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800"
                                          aria-label={`Preview ${fileName}`}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent triggering row selection
                                        handleDownload(file, false); // Always direct download, never ZIP
                                      }}
                                      disabled={downloading === fileName}
                                      className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 flex-shrink-0"
                                      aria-label={`Download ${fileName}`}
                                    >
                                      {downloading === fileName ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 flex-shrink-0"
                                          aria-label={`More actions ${fileName}`}
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="max-h-60 overflow-y-auto bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-2xl"
                                      >
                                        <DropdownMenuItem
                                          onClick={() => handleViewVersions(file)}
                                          className="rounded-xl"
                                        >
                                          <History className="h-4 w-4 mr-2" />
                                          Version History
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleViewActivity(file)}
                                          className="rounded-xl"
                                        >
                                          <FileCheck className="h-4 w-4 mr-2" />
                                          Activity Log
                                        </DropdownMenuItem>
                                        {folders
                                          .filter((f) => selectedFolder && f._id !== selectedFolder._id)
                                          .map((f) => (
                                            <DropdownMenuItem
                                              key={f._id}
                                              onClick={() => handleMoveFile(file, f)}
                                              className="rounded-xl"
                                            >
                                              <FolderInputIcon className="h-4 w-4 mr-2" />
                                              Move to {f.name}
                                            </DropdownMenuItem>
                                          ))}
                                        <DropdownMenuItem
                                          className="text-red-600 rounded-xl"
                                          onClick={() => setFileToDelete(file)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete File
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              );
                            })
                          ) : nestedFolders.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <File className="h-8 w-8 text-gray-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">This folder is empty</h3>
                              <p className="text-gray-600">Right-click to create a folder or upload files</p>
                            </div>
                          ) : null}
                        </div>
                      ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                          {/* Nested Folders in Grid */}
                          {nestedFolders.length > 0 && nestedFolders.map((folder) => (
                            <Card
                              key={folder._id}
                              className="p-4 text-center bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                              onClick={() => setSelectedFolder(folder)}
                            >
                              <div className="mb-3 flex justify-center">
                                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                                  <Folder className="h-6 w-6 text-primary" />
                                </div>
                              </div>
                              <div className="text-sm font-semibold truncate text-gray-800 mb-1" title={folder.name}>
                                {folder.name}
                              </div>
                              <div className="text-xs text-gray-500 mb-2">Folder</div>
                            </Card>
                          ))}

                          {/* Files in Grid */}
                          {filteredFiles.length > 0 ? (
                            filteredFiles.map((file) => {
                              const fileName = file.name || file.fileName || "";
                              return (
                                <Card key={fileName} className="p-4 text-center bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                                  <div className="mb-3 flex justify-center">
                                    <div className="p-3 bg-gray-100 rounded-2xl border border-gray-200">{getFileIcon(fileName)}</div>
                                  </div>
                                  <div className="text-sm font-semibold truncate text-gray-800 mb-1" title={fileName}>
                                    {decodeURIComponent(fileName)}
                                  </div>
                                  {file.version && (
                                    <div className="text-xs text-gray-500 mb-2">v{file.version}</div>
                                  )}
                                  {reviewStatuses[file._id || ''] && (
                                    <Badge variant="destructive" className="mb-2 text-xs px-2 py-0 border-transparent bg-red-500 text-white hover:bg-red-600">
                                      Review Points
                                    </Badge>
                                  )}
                                  <div className="mt-3 flex flex-col items-center gap-2">
                                    {(["pdf", "jpg", "jpeg", "png", "docx", "doc"].includes((fileName.split(".").pop() || "").toLowerCase())) && (
                                      <>
                                        {fileName.toLowerCase().endsWith(".pdf") && (
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleOpenAnnotator(file)}
                                            className="rounded-xl border-gray-200 hover:bg-gray-50 text-blue-600 hover:text-blue-700"
                                            aria-label={`Annotate ${fileName}`}
                                            title="Annotate PDF"
                                          >
                                            <FileText className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => handlePreview(file)}
                                          className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800"
                                          aria-label={`Preview ${fileName}`}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent triggering row selection
                                        handleDownload(file, false); // Always direct download, never ZIP
                                      }}
                                      disabled={downloading === fileName}
                                      className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 flex-shrink-0"
                                      aria-label={`Download ${fileName}`}
                                    >
                                      {downloading === fileName ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 flex-shrink-0"
                                          aria-label={`More actions ${fileName}`}
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="max-h-60 overflow-y-auto bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-2xl"
                                      >
                                        <DropdownMenuItem
                                          onClick={() => handleViewVersions(file)}
                                          className="rounded-xl"
                                        >
                                          <History className="h-4 w-4 mr-2" />
                                          Version History
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleViewActivity(file)}
                                          className="rounded-xl"
                                        >
                                          <FileCheck className="h-4 w-4 mr-2" />
                                          Activity Log
                                        </DropdownMenuItem>
                                        {folders
                                          .filter((f) => selectedFolder && f._id !== selectedFolder._id)
                                          .map((f) => (
                                            <DropdownMenuItem key={f._id} onClick={() => handleMoveFile(file, f)} className="rounded-xl">
                                              <FolderInputIcon className="h-4 w-4 mr-2" />
                                              Move to {f.name}
                                            </DropdownMenuItem>
                                          ))}
                                        <DropdownMenuItem
                                          className="text-red-600 rounded-xl"
                                          onClick={() => setFileToDelete(file)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete File
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </Card>
                              );
                            })
                          ) : nestedFolders.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                              <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <File className="h-8 w-8 text-gray-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">This folder is empty</h3>
                              <p className="text-gray-600">Right-click to create a folder or upload files</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuItem
                      onClick={() => {
                        if (selectedFolder) {
                          setSelectedParentFolder(selectedFolder)
                          setIsCreateFolderOpen(true)
                        }
                      }}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      New Folder
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        if (selectedFolder) {
                          fileInputRef.current?.click()
                        }
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => {
                        if (selectedFolder) {
                          refreshFolders()
                          refreshFiles(selectedFolder)
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {/* Status bar */}
                <div className="border-t border-gray-200 px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100/30 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center sm:justify-between text-sm text-gray-600">
                  <span className="truncate font-medium">
                    {nestedFolders.length + filteredFiles.length} items{selectedFolder ? ` in ${selectedFolder.name}` : ""}
                    {nestedFolders.length > 0 && ` (${nestedFolders.length} folders, ${filteredFiles.length} files)`}
                  </span>
                  <span>{loading ? "Refreshing..." : ""}</span>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Delete folder confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-800">Delete folder?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                This will permanently delete the folder{" "}
                <span className="font-semibold text-gray-800">{folderToDelete?.name}</span> and all of its contents
                from storage and the backend. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 rounded-2xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
                onClick={handleDeleteFolder}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Trash2 className="h-5 w-5 mr-2" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete file confirmation */}
        <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
          <AlertDialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-800">Delete file?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-800 break-all">{fileToDelete?.name}</span>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 rounded-2xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
                onClick={handleDeleteFile}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Trash2 className="h-5 w-5 mr-2" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* PDF Annotator */}
        {showAnnotator && annotatorFile && annotatorUrl && selectedFolder && (
          <PDFAnnotator
            fileUrl={annotatorUrl}
            fileName={annotatorFile.name || annotatorFile.fileName || "document.pdf"}
            engagementId={`global-${selectedFolder.name}`}
            fileId={`${selectedFolder.name}-${annotatorFile.name || annotatorFile.fileName || ""}`}
            onClose={() => {
              setShowAnnotator(false);
              setAnnotatorFile(null);
              setAnnotatorUrl(null);
            }}
            onSave={async (annotations) => {
              // Annotations are automatically saved to localStorage by the component
              // We also save them to the backend
              try {
                await saveAnnotation({
                  engagementId: `global-${selectedFolder.name}`,
                  fileId: annotatorFile?._id || `${selectedFolder.name}-${annotatorFile.name || annotatorFile.fileName || ""}`,
                  annotations
                });
                // Update the local review status
                if (annotatorFile?._id) {
                  setReviewStatuses(prev => ({ ...prev, [annotatorFile._id!]: annotations.length > 0 }));
                }
                toast({ title: "Annotations saved", description: "Review points synced with server." });
              } catch (error) {
                console.error("Failed to save annotations to backend", error);
                toast({ title: "Warning", description: "Saved locally, but failed to sync with server.", variant: "destructive" });
              }
            }}
          />
        )}

        {/* Preview Modal */}
        <Dialog open={!!previewFileState && !showAnnotator} onOpenChange={(open) => !open && setPreviewFileState(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-white">
            <DialogHeader>
              <DialogTitle>{previewFileState?.name || previewFileState?.fileName}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {previewUrl && (
                <div className="w-full h-[70vh] overflow-auto border rounded-lg">
                  {previewFileState?.fileType === "pdf" ? (
                    <div className="flex flex-col gap-2 p-4">
                      <Button
                        onClick={() => {
                          setPreviewFileState(null);
                          handleOpenAnnotator(previewFileState);
                        }}
                        className="w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Open in PDF Annotator
                      </Button>
                      <iframe src={previewUrl} className="w-full h-full min-h-[500px]" />
                    </div>
                  ) : (["jpg", "jpeg", "png"].includes(previewFileState?.fileType || "")) ? (
                    <img src={previewUrl} alt={previewFileState?.name} className="w-full h-auto" />
                  ) : (["docx", "doc"].includes(previewFileState?.fileType || "")) ? (
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
              <DialogTitle>Version History - {fileForVersions?.name || fileForVersions?.fileName}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {versionHistory.length > 0 ? (
                <div className="space-y-2">
                  {versionHistory.map((version, idx) => (
                    <div
                      key={idx}
                      className="p-4 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Version {version.version}</span>
                          {version.isLatest && (
                            <Badge variant="default">Latest</Badge>
                          )}
                          {version.restoredFromVersion && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              Restored from v{version.restoredFromVersion}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {version.restoredFromVersion
                            ? `Restored by ${version.uploadedBy} on ${new Date(version.uploadedAt).toLocaleString()}`
                            : `Uploaded by ${version.uploadedBy} on ${new Date(version.uploadedAt).toLocaleString()}`
                          }
                        </p>
                        <p className="text-xs text-gray-400">Size: {(version.fileSize / 1024).toFixed(2)} KB</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(version.publicUrl, "_blank");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {!version.isLatest && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (selectedFolder && fileForVersions) {
                                try {
                                  await restoreVersion(selectedFolder.name, fileForVersions.name || fileForVersions.fileName || "", version.version);
                                  toast({ title: "Version restored", description: `Version ${version.version} has been restored` });
                                  setShowVersions(false);
                                  await refreshFiles(selectedFolder);
                                } catch (e: any) {
                                  toast({ title: "Error", description: e.message || "Failed to restore version", variant: "destructive" });
                                }
                              }
                            }}
                          >
                            <History className="h-4 w-4 mr-2" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No version history available</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Activity Log Dialog */}
        <Dialog open={showActivity} onOpenChange={setShowActivity}>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle>Activity Log - {fileForVersions?.name || fileForVersions?.fileName}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {fileActivity.length > 0 ? (
                <div className="space-y-2">
                  {fileActivity.map((activity, idx) => (
                    <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{activity.action}</Badge>
                            <span className="font-medium">{activity.userName}</span>
                            <span className="text-sm text-gray-500">({activity.userRole})</span>
                          </div>
                          {activity.details && (
                            <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No activity recorded</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Folder in Current Folder Dialog */}
        <Dialog open={isCreateFolderInCurrentOpen} onOpenChange={(open) => {
          setIsCreateFolderInCurrentOpen(open)
          if (!open) {
            setNewFolderInCurrentName("")
          }
        }}>
          <DialogContent className="bg-white border border-gray-200 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedFolder && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  Creating folder inside: <span className="font-semibold text-gray-900">{selectedFolder.name}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="folder-name-current" className="text-sm font-medium text-gray-700">Folder Name</Label>
                <Input
                  id="folder-name-current"
                  placeholder="Enter folder name"
                  value={newFolderInCurrentName}
                  onChange={(e) => setNewFolderInCurrentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFolderInCurrentName.trim()) {
                      handleCreateFolderInCurrent()
                    }
                  }}
                  className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                  autoFocus
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleCreateFolderInCurrent}
                  disabled={!newFolderInCurrentName.trim() || creating || !selectedFolder}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 h-auto"
                >
                  {creating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                  Create Folder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateFolderInCurrentOpen(false)
                    setNewFolderInCurrentName("")
                  }}
                  disabled={creating}
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 transition-all duration-300 rounded-xl px-6 py-3 h-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
