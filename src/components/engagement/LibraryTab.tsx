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
import { Textarea } from "@/components/ui/textarea"
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
  Pencil,
  Tag,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { engagementApi } from "@/services/api"
import { supabase } from "@/integrations/supabase/client"
import { EnhancedLoader } from "../ui/enhanced-loader"
import { PDFAnnotator } from "../pdf-annotator/PDFAnnotator"
import {
  getFileVersions,
  restoreVersion,
  getFileActivity,
  updateFileMetadata,
  bulkDownload as apiBulkDownload,
  previewFile as apiPreviewFile,
  type DocumentVersion,
  type DocumentActivity,
} from "@/lib/api/global-library"
import { db_WorkbookApi } from "@/lib/api/workbookApi"
import { getAllClassificationEvidence } from "@/lib/api/classification-evidence-api"
import axiosInstance from "@/lib/axiosInstance"

const categories = [
  "Trial Balance",
  "Audit Sections",
  "Planning",
  // "Capital & Reserves",
  // "Property, plant and equipment",
  // "Intangible Assets",
  // "Investment Property",
  // "Investment in Subsidiaries & Associates investments",
  // "Receivables",
  // "Payables",
  // "Inventory",
  // "Bank & Cash",
  // "Borrowings & loans",
  // "Taxation",
  // "Going Concern",
  "Workbooks",
  "Evidence Files",
  "MBR Documents",
  "Tax Documents",
  "Document Requests",
  "Others",
]

interface LibraryTabProps {
  engagement: any
  requests: any[]
}

interface EngagementFolder {
  _id: string
  name: string
  category: string
  parentId?: string | { _id: string } | null
  engagement: string
  path: string
  createdAt: Date | string
  createdBy?: string
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
  description?: string
  tags?: string[]
  folderId?: string | null
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
  // Use engagement requests directly (filtered by engagementId)
  const allRequests = useMemo(() => {
    return requests || []
  }, [requests])
  
  const [selectedFolder, setSelectedFolder] = useState<string>(categories[0])
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([])
  const [engagementFolders, setEngagementFolders] = useState<EngagementFolder[]>([])
  const [currentFolder, setCurrentFolder] = useState<EngagementFolder | null>(null)
  const [folderPath, setFolderPath] = useState<EngagementFolder[]>([])
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renameFolderName, setRenameFolderName] = useState("")
  const [folderToDelete, setFolderToDelete] = useState<EngagementFolder | null>(null)
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState(false)
  const [deletingFolder, setDeletingFolder] = useState(false)

  
  const [searchTerm, setSearchTerm] = useState("")
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showAnnotator, setShowAnnotator] = useState(false)
  const [annotatorFile, setAnnotatorFile] = useState<LibraryFile | null>(null)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [fileForDetails, setFileForDetails] = useState<LibraryFile | null>(null)
  const [versionHistory, setVersionHistory] = useState<DocumentVersion[]>([])
  const [fileActivity, setFileActivity] = useState<DocumentActivity[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [fileForMetadata, setFileForMetadata] = useState<LibraryFile | null>(null)
  const [fileDescription, setFileDescription] = useState("")
  const [fileTags, setFileTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  
  // Document Requests virtual folder state
  const [documentRequestCategory, setDocumentRequestCategory] = useState<string | null>(null)
  
  // Classification sections state for Workbooks and Evidence Files
  const [classificationSections, setClassificationSections] = useState<Array<{ _id: string; classification: string }>>([])
  const [allClassifications, setAllClassifications] = useState<string[]>([]) // All classifications from ETB
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null)
  const [workbooks, setWorkbooks] = useState<any[]>([])
  const [evidenceFiles, setEvidenceFiles] = useState<any[]>([])
  const [loadingClassifications, setLoadingClassifications] = useState(false)
  
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

  // Bulk download handler - using global library API
  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return

    try {
      const fileNames = Array.from(selectedFiles)
      const filesToDownload = filteredFiles.filter(f => fileNames.includes(f.fileName || f._id))

      if (filesToDownload.length === 0) return

      // Use global library bulk download if all files are in the same category
      const categories = new Set(filesToDownload.map(f => f.category))
      if (categories.size === 1) {
        const category = Array.from(categories)[0]
        const fileNamesList = filesToDownload.map(f => f.fileName || "").filter(Boolean)
        
        try {
          const blob = await apiBulkDownload(category, fileNamesList)
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `engagement-library-${category}-${Date.now()}.zip`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          
          setSelectedFiles(new Set())
          toast({
            title: "Download complete",
            description: `Downloaded ${fileNamesList.length} file(s) as ZIP`,
          })
          return
        } catch (err) {
          console.error("Bulk download failed, falling back to individual downloads:", err)
        }
      }

      // Fallback to individual downloads
      toast({
        title: "Downloading files",
        description: `Starting download of ${fileNames.length} file(s)...`,
      })

      for (const file of filesToDownload) {
        try {
          await handleDownload(file, false)
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
      let previewUrl: string
      if (file.url) {
        // Decode URL to avoid double encoding
        try {
          const decodedUrl = decodeURIComponent(file.url)
          previewUrl = withVersion(decodedUrl, false)
        } catch {
          previewUrl = withVersion(file.url, false)
        }
      } else {
        const path = `${engagement._id}/${file.category}/${file.fileName}`
        const { data } = supabase.storage.from("engagement-documents").getPublicUrl(path)
        previewUrl = withVersion(data.publicUrl, false)
      }

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

  // Open PDF annotator
  const handleOpenAnnotator = async (file: LibraryFile) => {
    try {
      let annotatorUrl: string
      if (file.url) {
        // Decode URL to avoid double encoding
        try {
          const decodedUrl = decodeURIComponent(file.url)
          annotatorUrl = withVersion(decodedUrl, false)
        } catch {
          annotatorUrl = withVersion(file.url, false)
        }
      } else {
        const path = `${engagement._id}/${file.category}/${file.fileName}`
        const { data } = supabase.storage.from("engagement-documents").getPublicUrl(path)
        annotatorUrl = withVersion(data.publicUrl, false)
      }

      setAnnotatorFile(file)
      setPreviewUrl(annotatorUrl)
      setShowAnnotator(true)
    } catch (err: any) {
      toast({
        title: "Failed to open annotator",
        description: err.message || "Unable to open PDF annotator",
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

  // Version history handler - using global library API
  const handleViewVersions = async (file: LibraryFile) => {
    setFileForDetails(file)
    setLoadingVersions(true)
    setShowVersions(true)
    try {
      const versions = await getFileVersions(file.category, file.fileName || "")
      setVersionHistory(versions)
    } catch (error: any) {
      console.error("Failed to fetch versions:", error)
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive",
      })
      setVersionHistory([])
    } finally {
      setLoadingVersions(false)
    }
  }

  // Activity log handler - using global library API
  const handleViewActivity = async (file: LibraryFile) => {
    setFileForDetails(file)
    setLoadingActivity(true)
    setShowActivity(true)
    try {
      const activity = await getFileActivity(file.category, file.fileName || "")
      setFileActivity(activity)
    } catch (error: any) {
      console.error("Failed to fetch activity:", error)
      toast({
        title: "Error",
        description: "Failed to load activity log",
        variant: "destructive",
      })
      setFileActivity([])
    } finally {
      setLoadingActivity(false)
    }
  }

  // Handle version restore
  const handleRestoreVersion = async (file: LibraryFile, version: number) => {
    try {
      await restoreVersion(file.category, file.fileName || "", version)
      toast({
        title: "Success",
        description: `Version ${version} restored successfully`,
      })
      await fetchLibraryFiles()
      setShowVersions(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to restore version",
        variant: "destructive",
      })
    }
  }

  // Handle metadata update
  const handleUpdateMetadata = async () => {
    if (!fileForMetadata) return
    try {
      await updateFileMetadata(fileForMetadata.category, fileForMetadata.fileName || "", {
        description: fileDescription,
        tags: fileTags,
      })
      toast({
        title: "Success",
        description: "File metadata updated successfully",
      })
      await fetchLibraryFiles()
      setShowMetadataDialog(false)
      setFileForMetadata(null)
      setFileDescription("")
      setFileTags([])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update metadata",
        variant: "destructive",
      })
    }
  }

  // Open metadata dialog
  const handleOpenMetadata = (file: LibraryFile) => {
    setFileForMetadata(file)
    setFileDescription(file.description || "")
    setFileTags(file.tags || [])
    setShowMetadataDialog(true)
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
      const response = await engagementApi.getLibraryFiles(engagement._id)
      // Handle both old format (array) and new format (object with files and folders)
      if (Array.isArray(response)) {
        setLibraryFiles(response)
        setEngagementFolders([])
      } else {
        setLibraryFiles(response.files || [])
        setEngagementFolders(response.folders || [])
      }
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

  const fetchFolders = async () => {
    try {
      const foldersData = await engagementApi.getEngagementFolders(engagement._id)
      setEngagementFolders(foldersData)
    } catch (error) {
      console.error("Failed to fetch folders:", error)
    }
  }

  // Fetch all classification sections for the engagement
  const fetchClassificationSections = async () => {
    if (!engagement?._id) return
    setLoadingClassifications(true)
    try {
      const response = await axiosInstance.get('/api/classification-sections', {
        params: { engagementId: engagement._id }
      })
      if (response.data?.classificationSections) {
        setClassificationSections(response.data.classificationSections)
      }
    } catch (error) {
      console.error("Failed to fetch classification sections:", error)
    } finally {
      setLoadingClassifications(false)
    }
  }

  // Fetch all classifications from ETB (similar to TrialBalanceTab)
  const fetchAllClassifications = async () => {
    if (!engagement?._id) return
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) {
        console.warn("VITE_APIURL is not set")
        return
      }

      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      const response = await fetch(`${base}/api/engagements/${engagement._id}/etb`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (response.ok) {
        const etbData = await response.json()
        const rows = etbData.rows || []

        // Extract all unique classifications
        const classifications = new Set<string>()
        rows.forEach((row: any) => {
          if (row.classification) {
            classifications.add(row.classification)
          }
        })

        setAllClassifications(Array.from(classifications))
      } else {
        console.warn("Failed to fetch ETB data for classifications")
      }
    } catch (error) {
      console.error("Error fetching classifications from ETB:", error)
    }
  }

  // Fetch workbooks filtered by classification
  const fetchWorkbooks = async (classification?: string) => {
    if (!engagement?._id) return
    try {
      const result = await db_WorkbookApi.listAllWorkbooksForEngagement(engagement._id)
      if (result.success && result.data) {
        let filtered = result.data
        if (classification) {
          filtered = result.data.filter((wb: any) => wb.classification === classification)
        }
        setWorkbooks(filtered || [])
      }
    } catch (error) {
      console.error("Failed to fetch workbooks:", error)
      setWorkbooks([])
    }
  }

  // Fetch evidence files filtered by classification
  const fetchEvidenceFiles = async (classificationId?: string) => {
    if (!engagement?._id) return
    try {
      // If classificationId is provided, fetch filtered evidence
      // Otherwise, fetch all evidence files for the engagement
      const response = await getAllClassificationEvidence(engagement._id, classificationId)
      if (response?.evidence) {
        setEvidenceFiles(response.evidence)
      } else {
        // Ensure we set empty array if no evidence is returned
        setEvidenceFiles([])
      }
    } catch (error) {
      console.error("Failed to fetch evidence files:", error)
      setEvidenceFiles([])
    }
  }

  // Get document request categories (virtual folders)
  const documentRequestCategories = useMemo(() => {
    if (selectedFolder !== "Document Requests") return []
    const categories = new Set<string>()
    if (allRequests && Array.isArray(allRequests)) {
      allRequests.forEach((req: any) => {
        if (req.category) {
          categories.add(req.category)
        }
      })
    }
    return Array.from(categories).sort()
  }, [allRequests, selectedFolder])

  // Convert document request documents to LibraryFile format
  const documentRequestFiles = useMemo(() => {
    if (selectedFolder !== "Document Requests") return []
    if (!documentRequestCategory) return []

    const files: LibraryFile[] = []
    
    if (!allRequests || !Array.isArray(allRequests)) {
      return files
    }
    
    const filteredRequests = allRequests.filter((req: any) => req.category === documentRequestCategory)
    
    filteredRequests.forEach((req: any) => {
        // Single documents
        if (req.documents && Array.isArray(req.documents)) {
          req.documents.forEach((doc: any, index: number) => {
            if (doc.url) {
              files.push({
                _id: `${req._id}_doc_${index}`,
                category: "DocumentRequests",
                url: doc.url,
                fileName: doc.uploadedFileName || doc.name || `document_${index}`,
                createdAt: doc.uploadedAt || req.requestedAt || new Date().toISOString(),
                fileType: doc.uploadedFileName?.split(".").pop()?.toLowerCase(),
                description: req.description || doc.name,
              })
            }
          })
        }
        
        // Multiple documents
        if (req.multipleDocuments && Array.isArray(req.multipleDocuments)) {
          req.multipleDocuments.forEach((multiDoc: any) => {
            if (multiDoc.multiple && Array.isArray(multiDoc.multiple)) {
              multiDoc.multiple.forEach((item: any, itemIndex: number) => {
                if (item.url) {
                  files.push({
                    _id: `${req._id}_multi_${multiDoc._id || 'multi'}_${itemIndex}`,
                    category: "DocumentRequests",
                    url: item.url,
                    fileName: item.uploadedFileName || item.label || `document_${itemIndex}`,
                    createdAt: item.uploadedAt || req.requestedAt || new Date().toISOString(),
                    fileType: item.uploadedFileName?.split(".").pop()?.toLowerCase(),
                    description: `${req.description || multiDoc.name} - ${item.label}`,
                  })
                }
              })
            }
          })
        }
      })
    
    return files
  }, [allRequests, selectedFolder, documentRequestCategory])

  // Convert workbooks to LibraryFile format
  const workbookFiles = useMemo(() => {
    if (selectedFolder !== "Workbooks") return []
    if (!selectedClassification) return []

    const files: LibraryFile[] = []
    
    const filteredWorkbooks = workbooks.filter((wb: any) => wb.classification === selectedClassification)
    
    filteredWorkbooks.forEach((wb: any) => {
      if (wb.webUrl || wb.cloudFileId) {
        files.push({
          _id: wb._id || wb.id,
          category: "Workbooks",
          url: wb.webUrl || wb.cloudFileId || "",
          fileName: wb.name || `workbook_${wb._id || wb.id}`,
          createdAt: wb.uploadedDate || wb.createdAt || new Date().toISOString(),
          fileType: "xlsx",
          description: `Workbook: ${wb.name || ""} - Classification: ${wb.classification || ""}`,
        })
      }
    })
    
    return files
  }, [workbooks, selectedFolder, selectedClassification])

  // Convert evidence files to LibraryFile format
  const evidenceLibraryFiles = useMemo(() => {
    if (selectedFolder !== "Evidence Files") return []
    if (!selectedClassification) return []

    const files: LibraryFile[] = []
    
    // Find the classification section ID for the selected classification
    const classificationSection = classificationSections.find(
      (section) => section.classification === selectedClassification
    )
    
    if (classificationSection) {
      const filteredEvidence = evidenceFiles.filter((evidence: any) => {
        const classificationId = typeof evidence.classificationId === 'object' 
          ? evidence.classificationId._id 
          : evidence.classificationId
        return classificationId === classificationSection._id
      })
      
      filteredEvidence.forEach((evidence: any) => {
        if (evidence.evidenceUrl) {
          const fileName = evidence.evidenceUrl.split('/').pop() || `evidence_${evidence._id}`
          files.push({
            _id: evidence._id,
            category: "Evidence Files",
            url: evidence.evidenceUrl,
            fileName: decodeURIComponent(fileName),
            createdAt: evidence.createdAt || new Date().toISOString(),
            fileType: fileName.split(".").pop()?.toLowerCase(),
            description: `Evidence file for ${selectedClassification}`,
            uploadedBy: evidence.uploadedBy?.userId,
            uploadedByName: evidence.uploadedBy?.name,
            uploadedByRole: evidence.uploadedBy?.role,
          })
        }
      })
    }
    
    return files
  }, [evidenceFiles, selectedFolder, selectedClassification, classificationSections])

  // Group classifications by first 3 levels (same logic as TrialBalanceTab)
  const groupedClassifications = useMemo(() => {
    const grouped: { [key: string]: string[] } = {}
    allClassifications.forEach((classification) => {
      const parts = classification.split(" > ")
      if (parts.length < 3) return // ignore level 1–2

      // Group by first 3 levels (the parent)
      const groupKey = parts.slice(0, 3).join(" > ")
      if (!grouped[groupKey]) grouped[groupKey] = []
      grouped[groupKey].push(classification)
    })
    return grouped
  }, [allClassifications])

  // Helper function to check if a classification is a leaf node (same as TrialBalanceTab)
  const isLeafNode = useCallback((key: string) => {
    const allKeys = Object.keys(groupedClassifications)
    return !allKeys.some(
      (otherKey) =>
        otherKey !== key &&
        otherKey.startsWith(key + " > ")
    )
  }, [groupedClassifications])

  // Get level 3 classification items (leaf nodes only) for Workbooks and Evidence Files
  const level3Classifications = useMemo(() => {
    return Object.keys(groupedClassifications)
      .filter((key) => {
        const parts = key.split(" > ")
        if (parts.length < 3) return false
        return isLeafNode(key)
      })
      .sort()
  }, [groupedClassifications, isLeafNode])

  // Format classification for display (same as TrialBalanceTab)
  const formatClassificationForDisplay = useCallback((classification: string) => {
    if (!classification) return "—"
    const parts = classification.split(" > ")
    return parts.length >= 3 ? parts[2] : parts[parts.length - 1]
  }, [])

  // Get subfolders of current folder
  const currentSubfolders = useMemo(() => {
    // If "Document Requests" is selected and no category subfolder is selected, show document request categories
    if (selectedFolder === "Document Requests" && !documentRequestCategory && !currentFolder) {
      const virtualFolders = documentRequestCategories.map((cat) => ({
        _id: `doc_req_cat_${cat}`,
        name: cat,
        category: "DocumentRequests",
        parentId: null,
        engagement: engagement._id,
        path: `DocumentRequests/${cat}`,
        createdAt: new Date(),
        createdBy: "",
      })) as EngagementFolder[]
      return virtualFolders
    }
    
    // If "Workbooks" or "Evidence Files" is selected and no classification subfolder is selected, show level 3 classification items
    if ((selectedFolder === "Workbooks" || selectedFolder === "Evidence Files") && !selectedClassification && !currentFolder) {
      // Find classification sections that match the level 3 classifications
      const virtualFolders = level3Classifications
        .map((classification) => {
          // Find the classification section for this classification
          const section = classificationSections.find(
            (s) => s.classification === classification
          )
          if (!section) return null

          return {
            _id: `classification_${section._id}`,
            name: classification,
            displayName: formatClassificationForDisplay(classification),
            category: selectedFolder,
            parentId: null,
            engagement: engagement._id,
            path: `${selectedFolder}/${classification}`,
            createdAt: new Date(),
            createdBy: "",
          } as EngagementFolder & { displayName: string }
        })
        .filter((folder): folder is EngagementFolder & { displayName: string } => folder !== null)
      
      return virtualFolders
    }
    
    if (!currentFolder) {
      // Show root folders in current category
      return engagementFolders.filter(f => {
        const parentId = typeof f.parentId === 'object' && f.parentId?._id ? f.parentId._id : f.parentId
        return !parentId && f.category === selectedFolder
      })
    }
    // Show subfolders of current folder
    return engagementFolders.filter(f => {
      const parentId = typeof f.parentId === 'object' && f.parentId?._id ? f.parentId._id : f.parentId
      return parentId === currentFolder._id
    })
  }, [engagementFolders, currentFolder, selectedFolder, documentRequestCategories, documentRequestCategory, engagement._id, classificationSections, selectedClassification, level3Classifications])

  // Navigate into folder
  const navigateToFolder = async (folder: EngagementFolder) => {
    // Handle virtual document request category folders
    if (selectedFolder === "Document Requests" && folder._id?.startsWith("doc_req_cat_")) {
      const category = folder.name
      setDocumentRequestCategory(category)
      setCurrentFolder(null)
      setFolderPath([])
      // Refresh library files to get latest document request files
      await fetchLibraryFiles()
      return
    }
    
    // Handle virtual classification folders for Workbooks and Evidence Files
    if ((selectedFolder === "Workbooks" || selectedFolder === "Evidence Files") && folder._id?.startsWith("classification_")) {
      const classificationSectionId = folder._id.replace("classification_", "")
      const classification = folder.name
      setSelectedClassification(classification)
      setCurrentFolder(null)
      setFolderPath([])
      
      // Fetch files for the selected classification
      if (selectedFolder === "Workbooks") {
        await fetchWorkbooks(classification)
      } else if (selectedFolder === "Evidence Files") {
        // Refresh evidence files to get latest data
        await fetchEvidenceFiles()
      }
      return
    }
    
    setCurrentFolder(folder)
    // Build folder path
    const path: EngagementFolder[] = []
    const folderMap = new Map<string, EngagementFolder>()
    engagementFolders.forEach(f => {
      const id = f._id
      folderMap.set(id, f)
    })
    let current: EngagementFolder | null = folder
    const visited = new Set<string>()
    while (current && !visited.has(current._id)) {
      visited.add(current._id)
      path.unshift(current)
      const parentId = typeof current.parentId === 'object' && current.parentId?._id ? current.parentId._id : current.parentId
      if (parentId) {
        current = folderMap.get(String(parentId)) || null
      } else {
        current = null
      }
    }
    setFolderPath(path)
    // Refresh library files and folders when navigating into a folder
    await fetchLibraryFiles()
    await fetchFolders()
  }

  // Navigate up (back)
  const navigateUp = async () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath]
      newPath.pop()
      setFolderPath(newPath)
      setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1] : null)
    } else {
      setCurrentFolder(null)
      setFolderPath([])
    }
    // Refresh library files and folders when navigating up
    await fetchLibraryFiles()
    await fetchFolders()
  }

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const parentId = currentFolder?._id || null
      await engagementApi.createEngagementFolder(engagement._id, newFolderName.trim(), parentId, selectedFolder)
      await fetchLibraryFiles()
      await fetchFolders()
      setIsCreateFolderOpen(false)
      setNewFolderName("")
      toast({
        title: "Success",
        description: "Folder created successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create folder",
        variant: "destructive",
      })
    } finally {
      setCreatingFolder(false)
    }
  }

  // Rename folder
  const handleRenameFolder = async () => {
    if (!renameFolderName.trim() || !currentFolder) return
    setRenamingFolder(true)
    try {
      await engagementApi.renameEngagementFolder(engagement._id, currentFolder._id, renameFolderName.trim())
      await fetchLibraryFiles()
      await fetchFolders()
      setIsRenameFolderOpen(false)
      setRenameFolderName("")
      toast({
        title: "Success",
        description: "Folder renamed successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to rename folder",
        variant: "destructive",
      })
    } finally {
      setRenamingFolder(false)
    }
  }

  // Delete folder
  const handleDeleteFolder = async () => {
    if (!folderToDelete) return
    setDeletingFolder(true)
    try {
      const folderId = typeof folderToDelete._id === 'string' ? folderToDelete._id : folderToDelete._id
      await engagementApi.deleteEngagementFolder(engagement._id, folderId)
      await fetchLibraryFiles()
      await fetchFolders()
      setDeleteFolderDialogOpen(false)
      setFolderToDelete(null)
      if (currentFolder?._id === folderToDelete._id) {
        navigateUp()
      }
      toast({
        title: "Success",
        description: "Folder deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete folder",
        variant: "destructive",
      })
    } finally {
      setDeletingFolder(false)
    }
  }

  useEffect(() => {
    if (engagement?._id) {
      fetchLibraryFiles()
      fetchFolders()
      // Fetch all evidence files upfront to get accurate count
      // Call without classificationId to fetch all evidence files for the engagement
      fetchEvidenceFiles(undefined)
      // Fetch all workbooks upfront to get accurate count
      fetchWorkbooks()
    }
  }, [engagement?._id])

  // Refresh files when currentFolder changes (navigating into/out of folders)
  // Only for regular folders, not Workbooks/Evidence Files/Document Requests which have their own refresh logic
  useEffect(() => {
    if (currentFolder?._id && selectedFolder && 
        selectedFolder !== "Workbooks" && 
        selectedFolder !== "Evidence Files" && 
        selectedFolder !== "Document Requests") {
      fetchLibraryFiles()
      fetchFolders()
    }
  }, [currentFolder?._id])

  // Reset folder navigation when category changes
  useEffect(() => {
    setCurrentFolder(null)
    setFolderPath([])
    setDocumentRequestCategory(null)
    setSelectedClassification(null)
    
    // Refresh library files and folders when category changes
    fetchLibraryFiles()
    fetchFolders()
    
    // Fetch classification sections and classifications when Workbooks or Evidence Files is selected
    if (selectedFolder === "Workbooks" || selectedFolder === "Evidence Files") {
      fetchClassificationSections()
      fetchAllClassifications()
      // Refresh files when folder is selected (in case new files were added)
      // Always fetch ALL files (without classification filter) to maintain accurate count
      if (selectedFolder === "Workbooks") {
        fetchWorkbooks() // Fetch all workbooks
      } else if (selectedFolder === "Evidence Files") {
        fetchEvidenceFiles() // Fetch all evidence files (without classificationId)
      }
    }
  }, [selectedFolder])

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
    // If "Workbooks" is selected, use workbook files
    if (selectedFolder === "Workbooks") {
      let files = workbookFiles
      
      // Apply search filter
      const searchTermLower = localSearchTerm.toLowerCase()
      if (searchTermLower) {
        files = files.filter(file => 
          file.fileName?.toLowerCase().includes(searchTermLower) ||
          file.description?.toLowerCase().includes(searchTermLower)
        )
      }
      
      // Apply file type filter
      if (advancedSearch.fileType && advancedSearch.fileType !== "all") {
        files = files.filter(file => {
          const fileExt = file.fileName?.split(".").pop()?.toLowerCase() || ""
          if (advancedSearch.fileType === "pdf" && fileExt !== "pdf") return false
          if (advancedSearch.fileType === "docx" && !["docx", "doc"].includes(fileExt)) return false
          if (advancedSearch.fileType === "xlsx" && !["xlsx", "xls"].includes(fileExt)) return false
          if (advancedSearch.fileType === "jpg" && !["jpg", "jpeg"].includes(fileExt)) return false
          if (advancedSearch.fileType === "png" && fileExt !== "png") return false
          if (advancedSearch.fileType === "zip" && fileExt !== "zip") return false
          return true
        })
      }
      
      // Date range filter
      if (advancedSearch.dateFrom) {
        const fromDate = new Date(advancedSearch.dateFrom)
        files = files.filter(file => new Date(file.createdAt) >= fromDate)
      }
      if (advancedSearch.dateTo) {
        const toDate = new Date(advancedSearch.dateTo)
        toDate.setHours(23, 59, 59, 999)
        files = files.filter(file => new Date(file.createdAt) <= toDate)
      }
      
      // Sorting
      files.sort((a, b) => {
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
        }
        return advancedSearch.sortOrder === "asc" ? comparison : -comparison
      })
      
      return files
    }
    
    // If "Evidence Files" is selected, use evidence files
    if (selectedFolder === "Evidence Files") {
      let files = evidenceLibraryFiles
      
      // Apply search filter
      const searchTermLower = localSearchTerm.toLowerCase()
      if (searchTermLower) {
        files = files.filter(file => 
          file.fileName?.toLowerCase().includes(searchTermLower) ||
          file.description?.toLowerCase().includes(searchTermLower)
        )
      }
      
      // Apply file type filter
      if (advancedSearch.fileType && advancedSearch.fileType !== "all") {
        files = files.filter(file => {
          const fileExt = file.fileName?.split(".").pop()?.toLowerCase() || ""
          if (advancedSearch.fileType === "pdf" && fileExt !== "pdf") return false
          if (advancedSearch.fileType === "docx" && !["docx", "doc"].includes(fileExt)) return false
          if (advancedSearch.fileType === "xlsx" && !["xlsx", "xls"].includes(fileExt)) return false
          if (advancedSearch.fileType === "jpg" && !["jpg", "jpeg"].includes(fileExt)) return false
          if (advancedSearch.fileType === "png" && fileExt !== "png") return false
          if (advancedSearch.fileType === "zip" && fileExt !== "zip") return false
          return true
        })
      }
      
      // Date range filter
      if (advancedSearch.dateFrom) {
        const fromDate = new Date(advancedSearch.dateFrom)
        files = files.filter(file => new Date(file.createdAt) >= fromDate)
      }
      if (advancedSearch.dateTo) {
        const toDate = new Date(advancedSearch.dateTo)
        toDate.setHours(23, 59, 59, 999)
        files = files.filter(file => new Date(file.createdAt) <= toDate)
      }
      
      // Sorting
      files.sort((a, b) => {
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
        }
        return advancedSearch.sortOrder === "asc" ? comparison : -comparison
      })
      
      return files
    }
    
    // If "Document Requests" is selected, use document request files
    if (selectedFolder === "Document Requests") {
      let files = documentRequestFiles
      
      // Apply search filter
      const searchTermLower = localSearchTerm.toLowerCase()
      if (searchTermLower) {
        files = files.filter(file => 
          file.fileName?.toLowerCase().includes(searchTermLower) ||
          file.description?.toLowerCase().includes(searchTermLower)
        )
      }
      
      // Apply file type filter
      if (advancedSearch.fileType && advancedSearch.fileType !== "all") {
        files = files.filter(file => {
          const fileExt = file.fileName?.split(".").pop()?.toLowerCase() || ""
          if (advancedSearch.fileType === "pdf" && fileExt !== "pdf") return false
          if (advancedSearch.fileType === "docx" && !["docx", "doc"].includes(fileExt)) return false
          if (advancedSearch.fileType === "xlsx" && !["xlsx", "xls"].includes(fileExt)) return false
          if (advancedSearch.fileType === "jpg" && !["jpg", "jpeg"].includes(fileExt)) return false
          if (advancedSearch.fileType === "png" && fileExt !== "png") return false
          if (advancedSearch.fileType === "zip" && fileExt !== "zip") return false
          return true
        })
      }
      
      // Date range filter
      if (advancedSearch.dateFrom) {
        const fromDate = new Date(advancedSearch.dateFrom)
        files = files.filter(file => new Date(file.createdAt) >= fromDate)
      }
      if (advancedSearch.dateTo) {
        const toDate = new Date(advancedSearch.dateTo)
        toDate.setHours(23, 59, 59, 999)
        files = files.filter(file => new Date(file.createdAt) <= toDate)
      }
      
      // Sorting
      files.sort((a, b) => {
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
        }
        return advancedSearch.sortOrder === "asc" ? comparison : -comparison
      })
      
      return files
    }
    
    // First filter by folder
    let baseFiltered: LibraryFile[]
    if (!currentFolder) {
      // Show files without folderId (in category root)
      baseFiltered = libraryFiles.filter(f => !f.folderId && f.category === selectedFolder)
    } else {
      // Show files in current folder
      baseFiltered = libraryFiles.filter(f => f.folderId === currentFolder._id)
    }

    let filtered = baseFiltered.filter((file) => {
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
      }
      return advancedSearch.sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [libraryFiles, currentFolder, selectedFolder, localSearchTerm, advancedSearch, documentRequestFiles, workbookFiles, evidenceLibraryFiles])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setAdvancedSearch(prev => ({ ...prev, search: localSearchTerm }))
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearchTerm])

  // Group files by category for folder counts
  const filesByCategory = useMemo(() => {
    const counts = libraryFiles.reduce(
      (acc, file) => {
        acc[file.category] = (acc[file.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    
    // Add document request files count
    if (allRequests && allRequests.length > 0) {
      let docReqFileCount = 0
      allRequests.forEach((req: any) => {
        if (req.documents && Array.isArray(req.documents)) {
          docReqFileCount += req.documents.filter((doc: any) => doc.url).length
        }
        if (req.multipleDocuments && Array.isArray(req.multipleDocuments)) {
          req.multipleDocuments.forEach((multiDoc: any) => {
            if (multiDoc.multiple && Array.isArray(multiDoc.multiple)) {
              docReqFileCount += multiDoc.multiple.filter((item: any) => item.url).length
            }
          })
        }
      })
      counts["Document Requests"] = docReqFileCount
    }
    
    // Add workbooks count (always show count, even if 0)
    counts["Workbooks"] = workbooks?.length || 0
    
    // Add evidence files count (always show count, even if 0)
    // This ensures the count updates when evidenceFiles state changes
    counts["Evidence Files"] = evidenceFiles?.length || 0
    
    return counts
  }, [libraryFiles, allRequests, workbooks, evidenceFiles])
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
                {selectedFolder !== "Document Requests" && selectedFolder !== "Workbooks" && selectedFolder !== "Evidence Files" && (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                )}
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

              {/* Drag and drop zone - hidden for Document Requests, Workbooks, and Evidence Files */}
              {selectedFolder !== "Document Requests" && selectedFolder !== "Workbooks" && selectedFolder !== "Evidence Files" && (
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
              )}
            </div>
          </div>

          {/* File listing */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Breadcrumb and folder management */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setCurrentFolder(null)
                    setFolderPath([])
                    setDocumentRequestCategory(null)
                    setSelectedClassification(null)
                    // Refresh files when navigating to root
                    await fetchLibraryFiles()
                    await fetchFolders()
                  }}
                  className={!currentFolder && !documentRequestCategory && !selectedClassification ? "font-semibold" : ""}
                >
                  <Home className="h-4 w-4 mr-1" />
                  {selectedFolder}
                </Button>
                {selectedFolder === "Document Requests" && documentRequestCategory && (
                  <>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold">{documentRequestCategory}</span>
                  </>
                )}
                {(selectedFolder === "Workbooks" || selectedFolder === "Evidence Files") && selectedClassification && (
                  <>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold">{formatClassificationForDisplay(selectedClassification)}</span>
                  </>
                )}
                {folderPath.map((folder, idx) => (
                  <React.Fragment key={folder._id}>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const newPath = folderPath.slice(0, idx + 1)
                        setFolderPath(newPath)
                        setCurrentFolder(folder)
                        // Refresh files when navigating via breadcrumb
                        await fetchLibraryFiles()
                        await fetchFolders()
                      }}
                      className={idx === folderPath.length - 1 ? "font-semibold" : ""}
                    >
                      {folder.name}
                    </Button>
                  </React.Fragment>
                ))}
                {currentFolder && (
                  <>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold">{currentFolder.name}</span>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {selectedFolder !== "Document Requests" && selectedFolder !== "Workbooks" && selectedFolder !== "Evidence Files" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateFolderOpen(true)}
                  >
                    <FolderInputIcon className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                )}
                {currentFolder && selectedFolder !== "Document Requests" && selectedFolder !== "Workbooks" && selectedFolder !== "Evidence Files" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRenameFolderName(currentFolder.name)
                        setIsRenameFolderOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFolderToDelete(currentFolder)
                        setDeleteFolderDialogOpen(true)
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Subfolders */}
            {currentSubfolders.length > 0 ? (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {selectedFolder === "Document Requests" ? "Document Request Categories" : 
                   (selectedFolder === "Workbooks" || selectedFolder === "Evidence Files") ? "Classification Sections" : 
                   "Folders"}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {currentSubfolders.map((folder) => {
                    // Use displayName if available (for level 3 classifications), otherwise use name
                    const displayName = (folder as any).displayName || folder.name
                    return (
                      <div
                        key={folder._id}
                        onClick={() => navigateToFolder(folder)}
                        className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Folder className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                        <span className="text-sm font-medium truncate" title={displayName}>{displayName}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              (selectedFolder === "Document Requests" && !documentRequestCategory) || 
              ((selectedFolder === "Workbooks" || selectedFolder === "Evidence Files") && !selectedClassification) ? (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  {selectedFolder === "Document Requests" ? (
                    <>
                      <p className="text-sm text-gray-600">No document request categories found.</p>
                      <p className="text-xs text-gray-500 mt-1">Document requests will appear here once they are created.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">No classification sections found.</p>
                      <p className="text-xs text-gray-500 mt-1">Classification sections will appear here once they are created.</p>
                    </>
                  )}
                </div>
              ) : null
            )}

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
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm truncate">{decodeURIComponent(file.fileName)}</span>
                            {file.description && (
                              <span className="text-xs text-gray-500 truncate max-w-xs">{file.description}</span>
                            )}
                            {file.tags && file.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {file.tags.slice(0, 3).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                                {file.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    +{file.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          {file.version && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">v{file.version}</Badge>
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
                            <>
                              {fileExt === "pdf" && (
                                <Button
                                  onClick={() => handleOpenAnnotator(file)}
                                  className="p-2 rounded bg-inherit hover:bg-gray-200"
                                  title="Annotate PDF"
                                >
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              <Button
                                onClick={() => handlePreview(file)}
                                className="p-2 rounded bg-inherit hover:bg-gray-200"
                                title="Preview"
                              >
                                <Eye className="h-4 w-4 text-gray-600" />
                              </Button>
                            </>
                          )}
                          {file.category !== "DocumentRequests" && (
                            <>
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
                                onClick={() => handleOpenMetadata(file)}
                                className="p-2 rounded bg-inherit hover:bg-gray-200"
                                title="Edit Metadata"
                              >
                                <Pencil className="h-4 w-4 text-gray-600" />
                              </Button>
                            </>
                          )}
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
                          {file.category !== "DocumentRequests" && (
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
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>This folder is empty</p>
                    {selectedFolder === "Document Requests" ? (
                      <p className="text-sm">No files found in this category</p>
                    ) : (selectedFolder === "Workbooks" || selectedFolder === "Evidence Files") ? (
                      <p className="text-sm">No files found in this classification section</p>
                    ) : (
                      <p className="text-sm">Drag files here or use the upload button</p>
                    )}
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

                    {file.category !== "DocumentRequests" && (
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
                    )}
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
                {selectedFolder === "Document Requests" && documentRequestCategory && ` / ${documentRequestCategory}`}
                {(selectedFolder === "Workbooks" || selectedFolder === "Evidence Files") && selectedClassification && ` / ${formatClassificationForDisplay(selectedClassification)}`}
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

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="Enter folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    handleCreateFolder()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
              >
                {creatingFolder ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-folder-name">Folder Name</Label>
              <Input
                id="rename-folder-name"
                placeholder="Enter new folder name..."
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && renameFolderName.trim()) {
                    handleRenameFolder()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRenameFolderOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRenameFolder}
                disabled={!renameFolderName.trim() || renamingFolder}
              >
                {renamingFolder ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  "Rename"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <AlertDialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the folder "{folderToDelete?.name}"? This action cannot be undone.
              The folder must be empty (no files or subfolders) to be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              disabled={deletingFolder}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingFolder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Annotator */}
      {showAnnotator && annotatorFile && previewUrl && (
        <PDFAnnotator
          fileUrl={previewUrl}
          fileName={annotatorFile.fileName || "document.pdf"}
          engagementId={engagement._id}
          fileId={annotatorFile._id}
          onClose={() => {
            setShowAnnotator(false)
            setAnnotatorFile(null)
            setPreviewUrl(null)
          }}
          onSave={(annotations) => {
            // Annotations are automatically saved to localStorage
            // You can extend this to save to backend if needed
            console.log("Annotations saved:", annotations)
          }}
        />
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile && !showAnnotator} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-white">
          <DialogHeader>
            <DialogTitle>{previewFile?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewUrl && previewFile && (
              <div className="w-full h-[70vh] overflow-auto border rounded-lg">
                {previewFile.fileType === "pdf" || (previewFile.fileName?.toLowerCase().endsWith(".pdf")) ? (
                  <div className="flex flex-col gap-2 p-4">
                    <Button
                      onClick={() => {
                        setPreviewFile(null)
                        handleOpenAnnotator(previewFile)
                      }}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open in PDF Annotator
                    </Button>
                    <iframe src={previewUrl} className="w-full h-full min-h-[500px]" />
                  </div>
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
            {loadingVersions ? (
              <div className="flex items-center justify-center py-8">
                <EnhancedLoader size="md" text="Loading versions..." />
              </div>
            ) : versionHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No version history available for this file</p>
              </div>
            ) : (
              <div className="space-y-2">
                {versionHistory.map((version) => (
                  <div key={version.version} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={version.isLatest ? "default" : "outline"}>
                          Version {version.version}
                        </Badge>
                        {version.isLatest && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Latest
                          </Badge>
                        )}
                      </div>
                      {!version.isLatest && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileForDetails && handleRestoreVersion(fileForDetails, version.version)}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Uploaded by {version.uploadedBy} on {new Date(version.uploadedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Size: {(version.fileSize / 1024).toFixed(2)} KB
                    </p>
                    {version.restoredFromVersion && (
                      <p className="text-xs text-blue-600 mt-1">
                        Restored from version {version.restoredFromVersion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
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
            {loadingActivity ? (
              <div className="flex items-center justify-center py-8">
                <EnhancedLoader size="md" text="Loading activity..." />
              </div>
            ) : fileActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No activity recorded for this file</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fileActivity.map((activity) => (
                  <div key={activity._id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{activity.action}</Badge>
                      <span className="font-medium">{activity.userName}</span>
                      <span className="text-xs text-gray-500">({activity.userRole})</span>
                    </div>
                    {activity.details && (
                      <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Metadata Dialog */}
      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Edit Metadata - {fileForMetadata?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter file description..."
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2 flex-wrap">
                {fileTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => setFileTags(fileTags.filter((_, i) => i !== index))}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newTag.trim()) {
                      e.preventDefault()
                      setFileTags([...fileTags, newTag.trim()])
                      setNewTag("")
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newTag.trim()) {
                      setFileTags([...fileTags, newTag.trim()])
                      setNewTag("")
                    }
                  }}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMetadataDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateMetadata}>
                Save Metadata
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
