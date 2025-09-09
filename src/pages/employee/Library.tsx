// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react"
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
import { Folder, FolderOpen, File, FileText, ImageIcon, Grid3X3, List, Search, RefreshCw, FolderInputIcon,MoreVertical, Upload, Download, Pencil, Trash2, Home, Loader2, Plus, Library, Sparkles } from 'lucide-react'
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
  type GlobalFile,
  type GlobalFolder,
} from "@/lib/api/global-library"
import { EnhancedLoader } from "@/components/ui/enhanced-loader"

export default function GlobalLibraryPage() {
  const [folders, setFolders] = useState<GlobalFolder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<GlobalFolder | null>(null)
  const [files, setFiles] = useState<GlobalFile[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renameFolderName, setRenameFolderName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<GlobalFolder | null>(null)
  const [fileToDelete, setFileToDelete] = useState<GlobalFile | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  useEffect(()=>{
   if(selectedFolder && selectedFolder?.name)
     setRenameFolderName(selectedFolder?.name);
  },[selectedFolder])

  const filteredFiles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return files.filter((f) => !term || f.name.toLowerCase().includes(term))
  }, [files, searchTerm])

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
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to fetch folders", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const refreshFiles = async (folder: GlobalFolder | null) => {
    if (!folder) {
      setFiles([])
      return
    }
    setLoading(true)
    try {
      const list = await apiGetFiles(folder.name)
      setFiles(list)
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to fetch files", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshFolders()
  }, [])

  useEffect(() => {
    refreshFiles(selectedFolder)
  }, [selectedFolder?._id])

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    setCreating(true)
    try {
      await apiCreateFolder(name)
      setNewFolderName("")
      setIsCreateFolderOpen(false)
      await refreshFolders()
      toast({ title: "Folder created", description: `"${name}" is ready to use.` })
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
      }
      await refreshFiles(selectedFolder)
      toast({ title: "Upload complete", description: `${filesList.length} file(s) uploaded.` })
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message || "Unable to upload file(s)", variant: "destructive" })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
      setUploading(false)
    }
  }

  const handleDownload = async (file: GlobalFile) => {
    try {
      setDownloading(file.name);
      const response = await fetch(file.publicUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } finally {
      setDownloading(null);
    }
  };

  const handleMoveFile = async (file: GlobalFile, toFolder: GlobalFolder) => {
    if (!selectedFolder) return
    if (toFolder.name === selectedFolder.name) return
    setLoading(true)
    try {
      await apiMoveFile({
        fileName: file.name,
        fromFolder: selectedFolder.name,
        toFolder: toFolder.name,
      })
      await refreshFiles(selectedFolder)
      toast({ title: "Moved", description: `Moved to "${toFolder.name}".` })
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
      await apiDeleteFile(selectedFolder.name, fileToDelete.name)
      await refreshFiles(selectedFolder)
      toast({ title: "File deleted", description: `"${fileToDelete.name}" was removed.` })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message || "Unable to delete file", variant: "destructive" })
    } finally {
      setDeleting(false)
      setFileToDelete(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <Library className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                    Global Document Library
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Company-wide folders and documents
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-800">Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="h-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg"
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={handleCreateFolder} 
                        disabled={!newFolderName.trim() || creating} 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                      >
                        {creating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                        Create Folder
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreateFolderOpen(false)}
                        className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
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
                      className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                    >
                      <Pencil className="h-5 w-5 mr-2" />
                      Rename Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-slate-800">Rename Folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="New folder name"
                        value={renameFolderName}
                        onChange={(e) => setRenameFolderName(e.target.value)}
                        className="h-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg"
                      />
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          onClick={handleRenameFolder} 
                          disabled={!renameFolderName.trim() || renaming}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                        >
                          {renaming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                          Rename
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsRenameFolderOpen(false)}
                          className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-slate-700 font-medium">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <span>Global Library</span>
                {selectedFolder ? (
                  <>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-800 font-semibold">{selectedFolder.name}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-1">
                <Button
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
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
                className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-2xl"
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
            <aside className="w-full md:w-80 bg-white/80 backdrop-blur-sm border-r border-blue-100/50">
              <div className="p-6 border-b border-blue-100/50">
                <div className="text-sm text-slate-600 mb-3 font-medium">Folders</div>
                <Input
                  placeholder="Search files or folders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl"
                />
              </div>
              <div className="p-4 space-y-2 max-h-[60vh] md:max-h-[70vh] overflow-auto">
                {folders
                  .filter((f) => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((folder) => (
                    <div
                      key={folder._id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50/50 cursor-pointer group transition-all duration-300",
                        selectedFolder?._id === folder._id ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 shadow-lg" : ""
                      )}
                      onClick={() => setSelectedFolder(folder)}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Folder className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm truncate font-medium">{folder.name}</span>
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-7 w-7 rounded-xl border-blue-200 hover:bg-blue-50/50">
                              <MoreVertical className="h-4 w-4 text-blue-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-2xl">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedFolder(folder)
                                setRenameFolderName(folder.name)
                                setIsRenameFolderOpen(true)
                              }}
                              className="rounded-xl"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 rounded-xl"
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
                {folders.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Folder className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-slate-600 font-medium">No folders yet. Create one to get started.</p>
                  </div>
                )}
              </div>
            </aside>

            {/* Main content */}
            <section className="flex-1 min-w-0">
              {/* Search and upload */}
              <div className="p-6 border-b border-blue-100/50 bg-gradient-to-r from-slate-50 to-blue-50/30">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      disabled={!selectedFolder || uploading}
                      onChange={onFileInputChange}
                      className="w-full sm:w-64 h-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl"
                    />
                    <Button
                      disabled={!selectedFolder || uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="hidden md:flex bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                    >
                      <Upload className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Files list/grid */}
              <div className="p-6">
                {!selectedFolder ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <FolderOpen className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3">No folder selected</h3>
                    <p className="text-slate-600 text-lg">
                      Choose a folder on the left to view its files.
                    </p>
                  </div>
                ) : viewMode === "list" ? (
                  <div className="space-y-2">
                    {/* Header (hidden on mobile) */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-slate-600 border-b border-blue-100/50">
                      <div className="col-span-6">Name</div>
                      <div className="col-span-2">Type</div>
                      <div className="col-span-2">Modified</div>
                      <div className="col-span-2">Actions</div>
                    </div>
                    {/* Rows */}
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map((file) => (
                        <div
                          key={file.name}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 hover:bg-blue-50/30 rounded-2xl group transition-all duration-300"
                        >
                          {/* Name */}
                          <div className="flex items-center gap-3 sm:col-span-6 min-w-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                              {getFileIcon(file.name)}
                            </div>
                            <span className="text-sm truncate font-medium">{decodeURIComponent(file.name)}</span>
                          </div>

                          {/* Type/Modified (stacked on mobile) */}
                          <div className="sm:col-span-2 hidden sm:flex items-center text-sm text-slate-500">
                            {(file.name.split(".").pop() || "").toUpperCase()} File
                          </div>
                          <div className="sm:col-span-2 hidden sm:flex items-center text-sm text-slate-500">
                            {new Date(file.updatedAt).toLocaleDateString()}
                          </div>
                          <div className="sm:hidden text-xs text-slate-500 -mt-2">
                            {(file.name.split(".").pop() || "").toUpperCase()} • {new Date(file.updatedAt).toLocaleDateString()}
                          </div>

                          {/* Actions */}
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(file)}
                              disabled={downloading === file.name}
                              className="rounded-xl border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800"
                              aria-label={`Download ${file.name}`}
                            >
                              {downloading === file.name ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="rounded-xl border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800" aria-label={`Move ${file.name}`}>
                                  <FolderInputIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="max-h-44 overflow-y-auto bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-2xl">
                                {folders
                                  .filter((f) => selectedFolder && f._id !== selectedFolder._id)
                                  .map((f) => (
                                    <DropdownMenuItem key={f._id} onClick={() => handleMoveFile(file, f)} className="rounded-xl">
                                      Move to {f.name}
                                    </DropdownMenuItem>
                                  ))}
                                <DropdownMenuItem
                                  className="text-red-600 rounded-xl sm:hidden"
                                  onClick={() => setFileToDelete(file)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete File
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              onClick={() => setFileToDelete(file)}
                              className="rounded-xl border-red-200 hover:bg-red-50/50 text-red-600 hover:text-red-700"
                              aria-label={`Delete ${file.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <File className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">This folder is empty</h3>
                        <p className="text-slate-600">Upload documents to get started</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map((file) => (
                        <Card key={file.name} className="p-4 text-center bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                          <div className="mb-3 flex justify-center">
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">{getFileIcon(file.name)}</div>
                          </div>
                          <div className="text-sm font-semibold truncate text-slate-800" title={file.name}>
                            {decodeURIComponent(file.name)}
                          </div>
                          <div className="mt-3 flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(file)}
                              disabled={downloading === file.name}
                              className="rounded-xl border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800"
                              aria-label={`Download ${file.name}`}
                            >
                              {downloading === file.name ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="rounded-xl border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800" aria-label={`Move ${file.name}`}>
                                  <FolderInputIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="max-h-44 overflow-y-auto bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-2xl">
                                {folders
                                  .filter((f) => selectedFolder && f._id !== selectedFolder._id)
                                  .map((f) => (
                                    <DropdownMenuItem key={f._id} onClick={() => handleMoveFile(file, f)} className="rounded-xl">
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
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <File className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">This folder is empty</h3>
                        <p className="text-slate-600">Upload documents to get started</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="border-t border-blue-100/50 px-6 py-3 bg-gradient-to-r from-slate-50 to-blue-50/30 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center sm:justify-between text-sm text-slate-600">
                <span className="truncate font-medium">
                  {filteredFiles.length} items{selectedFolder ? ` in ${selectedFolder.name}` : ""}
                </span>
                <span>{loading ? "Refreshing..." : ""}</span>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Delete folder confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-800">Delete folder?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              This will permanently delete the folder{" "}
              <span className="font-semibold text-slate-800">{folderToDelete?.name}</span> and all of its contents
              from storage and the backend. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
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
        <AlertDialogContent className="bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-800">Delete file?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800 break-all">{fileToDelete?.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
              onClick={handleDeleteFile}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Trash2 className="h-5 w-5 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
