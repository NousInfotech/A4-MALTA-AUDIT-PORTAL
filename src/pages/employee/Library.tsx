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
import { Folder, FolderOpen, File, FileText, ImageIcon, Grid3X3, List, Search, RefreshCw, FolderInputIcon,MoreVertical, Upload, Download, Pencil, Trash2, Home, Loader2, Plus } from 'lucide-react'
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
    console.log(selectedFolder)
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
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground truncate">Global Document Library</h1>
          <p className="text-muted-foreground mt-1">Company-wide folders and documents</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creating}>
                    {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Create Folder
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {selectedFolder && (
            <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rename Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="New folder name"
                    value={renameFolderName}
                    onChange={(e) => setRenameFolderName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleRenameFolder} disabled={!renameFolderName.trim() || renaming}>
                      {renaming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Rename
                    </Button>
                    <Button variant="outline" onClick={() => setIsRenameFolderOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border rounded-lg">
        <div className="bg-white border-b border-gray-200 px-4 py-2 rounded-t-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-sm text-gray-600 min-w-0">
                <Home className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium truncate">Global Library</span>
                {selectedFolder ? (
                  <>
                    <span className="mx-1 text-gray-400">/</span>
                    <span className="text-gray-700 truncate">{selectedFolder.name}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center border rounded-md">
                <Button
                  className="rounded-r-none"
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  className="rounded-l-none"
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
              >
                <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
                    <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
                  </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* Sidebar: Folders */}
            <aside className="w-full md:w-80 bg-white border-r border-gray-200">
              <div className="p-3 border-b">
                <div className="text-sm text-gray-600 mb-2">Folders</div>
                <Input
                  placeholder="Search folders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="p-2 space-y-1 max-h-[60vh] overflow-auto">
                {folders
                  .filter((f) => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((folder) => (
                    <div
                      key={folder._id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer group",
                        selectedFolder?._id === folder._id ? "bg-blue-50 border-l-2 border-blue-500" : ""
                      )}
                      onClick={() => setSelectedFolder(folder)}
                    >
                      <Folder className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm truncate">{folder.name}</span>
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedFolder(folder)
                                setRenameFolderName(folder.name)
                                setIsRenameFolderOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
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
                  <div className="text-sm text-muted-foreground p-4">
                    No folders yet. Create one to get started.
                  </div>
                )}
              </div>
            </aside>

            {/* Main content */}
            <section className="flex-1">
              {/* Search and upload */}
              <div className="p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    disabled={!selectedFolder || uploading}
                    onChange={onFileInputChange}
                    className="w-full sm:w-56"
                  />
                  
                  <Button
                    disabled={!selectedFolder || uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full hidden md:block"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>

              {/* Files list/grid */}
              <div className="p-4">
                {!selectedFolder ? (
                  <div className="text-center py-16">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <div className="text-lg font-medium">No folder selected</div>
                    <div className="text-sm text-muted-foreground">
                      Choose a folder on the left to view its files.
                    </div>
                  </div>
                ) : viewMode === "list" ? (
                  <div className="space-y-1">
                    {/* Header (hidden on mobile) */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 p-2 text-xs font-medium text-gray-500 border-b">
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
                          className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-2 hover:bg-gray-50 rounded group"
                        >
                          {/* Name */}
                          <div className="flex items-center gap-2 sm:col-span-6 min-w-0">
                            {getFileIcon(file.name)}
                            <span className="text-sm truncate">{decodeURIComponent(file.name)}</span>
                          </div>

                          {/* Type/Modified (stacked on mobile) */}
                          <div className="sm:col-span-2 hidden sm:flex items-center text-sm text-gray-500">
                            {(file.name.split(".").pop() || "").toUpperCase()} File
                          </div>
                          <div className="sm:col-span-2 hidden sm:flex items-center text-sm text-gray-500">
                            {new Date(file.updatedAt).toLocaleDateString()}
                          </div>
                          <div className="sm:hidden text-xs text-gray-500 -mt-2">
                            {(file.name.split(".").pop() || "").toUpperCase()} • {new Date(file.updatedAt).toLocaleDateString()}
                          </div>

                          {/* Actions */}
                          <div className="sm:col-span-2 flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(file)}
                              disabled={downloading === file.name}
                              className="shrink-0"
                            >
                              {downloading === file.name ? (
                                <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 " />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="shrink-0">
                                  <FolderInputIcon className="h-4 w-4 " />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="max-h-44 overflow-y-auto">
                                {folders
                                  .filter((f) => selectedFolder && f._id !== selectedFolder._id)
                                  .map((f) => (
                                    <DropdownMenuItem key={f._id} onClick={() => handleMoveFile(file, f)}>
                                      Move to {f.name}
                                    </DropdownMenuItem>
                                  ))}
                                <DropdownMenuItem
                                  className="text-destructive sm:hidden"
                                  onClick={() => setFileToDelete(file)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete File
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              onClick={() => setFileToDelete(file)}
                              className="p-2 rounded bg-inherit hover:bg-gray-200 text-gray-600 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>This folder is empty</p>
                        <p className="text-sm">Upload documents to get started</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map((file) => (
                        <Card key={file.name} className="p-4 text-center">
                          <div className="mb-3 flex justify-center">
                            <div className="p-3 bg-gray-100 rounded-lg">{getFileIcon(file.name)}</div>
                          </div>
                          <div className="text-sm font-medium truncate" title={file.name}>
                            {decodeURIComponent(file.name)}
                          </div>
                          <div className="mt-2 flex justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(file)}
                              disabled={downloading === file.name}
                            >
                              {downloading === file.name ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <FolderInputIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="max-h-44 overflow-y-auto">
                                {folders
                                  .filter((f) => selectedFolder && f._id !== selectedFolder._id)
                                  .map((f) => (
                                    <DropdownMenuItem key={f._id} onClick={() => handleMoveFile(file, f)}>
                                      Move to {f.name}
                                    </DropdownMenuItem>
                                  ))}
                                <DropdownMenuItem
                                  className="text-destructive"
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
                      <div className="col-span-full text-center py-12 text-gray-500">
                        <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>This folder is empty</p>
                        <p className="text-sm">Upload documents to get started</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="border-t px-4 py-2 bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center sm:justify-between text-xs text-gray-500">
                <span>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the folder{" "}
              <span className="font-medium">{folderToDelete?.name}</span> and all of its contents
              from storage and the backend. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteFolder}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete file confirmation */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{fileToDelete?.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteFile}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
