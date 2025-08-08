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
} from "@/components/ui/alert-dialog";
import { FolderInputIcon, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  Image,
  Grid3X3,
  List,
  Search,
  RefreshCwIcon as Refresh,
  Home,
  Upload,
  Download,
  Bot,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { engagementApi } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  "Planning",
  "Capital & Reserves",
  "Property, plant and equipment",
  "Intangible Assets",
  "Investment Property",
  "Investment in Subsidiaries & Associates investments",
  "Receivables",
  "Payables Inventory",
  "Bank & Cash",
  "Borrowings & loans",
  "Taxation",
  "Going Concern",
  "Others",
];

interface LibraryTabProps {
  engagement: any;
  requests: any[];
  procedures: any[];
  handleGenerateProcedures: () => void;
  isGeneratingProcedures: boolean;
}

interface LibraryFile {
  _id: string;
  category: string;
  url: string;
  fileName: string;
  createdAt: string;
}
interface DeleteConfirmationDialogProps {
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  fileToDelete: LibraryFile | null;
  handleDelete: () => Promise<void>;
  deletingId: string | null;
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
          Are you sure you want to permanently delete "
          {decodeURIComponent(fileToDelete?.fileName)}"?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDelete}
          disabled={deletingId !== null}
          className="bg-red-600 hover:bg-red-700"
        >
          {deletingId ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const LibraryTab = ({
  engagement,
  requests,
  procedures,
}: LibraryTabProps) => {
  const [selectedFolder, setSelectedFolder] = useState(categories[0]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<LibraryFile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // In your LibraryTab component
  const handleDelete = async () => {
    if (!fileToDelete) return;
    setLoading(true)
    try {
      setDeletingId(fileToDelete._id);
      await engagementApi.deleteFromLibrary(engagement._id, fileToDelete.url);
      await fetchLibraryFiles(); // Refresh the file list
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete error", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setFileToDelete(null);
      setDeleteDialogOpen(false);
    setLoading(false)
    }
  };

  const handleDownload = async (file: LibraryFile) => {
    try {
      setDownloadingId(file._id);
      // build the storage path
      const path = `${engagement._id}/${file.category}/${file.fileName}`;

      // fetch the file as a blob
      const { data, error } = await supabase.storage
        .from("engagement-documents")
        .download(path);

      if (error || !data) throw error || new Error("No data");

      // create a blob URL and click it
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error", err);
      toast({
        title: "Download failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "xlsx":
      case "xls":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "docx":
      case "doc":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "jpg":
      case "png":
      case "gif":
        return <Image className="h-4 w-4 text-purple-500" />;
      case "zip":
        return <File className="h-4 w-4 text-yellow-600" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const fetchLibraryFiles = async () => {
    setLoading(true);
    try {
      const files = await engagementApi.getLibraryFiles(engagement._id);
      setLibraryFiles(files);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch library files:", error);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to fetch library files",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (engagement?._id) {
      fetchLibraryFiles();
    }
  }, [engagement?._id]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await engagementApi.uploadToLibrary(engagement._id, file, selectedFolder);
      await fetchLibraryFiles();
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Upload failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Somewhere in your component…
  const changeFolder = async (category: string, url: string) => {
    setLoading(true);
    try {
      // send { category, url } in the JSON body
      await engagementApi.changeFolder(engagement._id, category, url);
      await fetchLibraryFiles();
      toast({
        title: "Success",
        description: `Moved to ${category} successfully`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Operation failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter files by selected folder and search term
  const filteredFiles = libraryFiles.filter((file) => {
    const matchesFolder = file.category === selectedFolder;
    const matchesSearch =
      searchTerm === "" ||
      file.fileName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  // Group files by category for folder counts
  const filesByCategory = libraryFiles.reduce((acc, file) => {
    acc[file.category] = (acc[file.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    );

  return (
    <div className="h-[800px] flex flex-col bg-gray-50 rounded-lg border">
      {/* Windows-style toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Home className="h-4 w-4" />
              <ChevronRight className="h-3 w-3" />
              <span>Engagement Library</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">{selectedFolder}</span>
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
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Status cards */}
          <div className="p-4 space-y-3 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3">
                <div className="text-xs text-gray-500">Trial Balance</div>
                <div
                  className={`text-sm font-medium ${
                    engagement.trialBalanceUrl
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                >
                  {engagement.trialBalanceUrl ? "✓ Uploaded" : "Pending"}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-gray-500">Status</div>
                <div className="text-sm font-medium">{engagement.status}</div>
              </Card>
            </div>
            <div className="flex space-x-2">
              <Badge variant="secondary">{requests.length} Requests</Badge>
              <Badge variant="secondary">{procedures.length} Procedures</Badge>
            </div>
          </div>

          {/* Folder tree */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              <div className="flex items-center space-x-1 p-2 hover:bg-gray-100 rounded cursor-pointer">
                <ChevronDown className="h-4 w-4" />
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Document Library</span>
              </div>
              <div className="ml-4 space-y-1">
                {categories.map((folder) => (
                  <div
                    key={folder}
                    className={`flex items-center space-x-1 p-2 hover:bg-gray-100 rounded cursor-pointer ${
                      selectedFolder === folder
                        ? "bg-blue-50 border-l-2 border-blue-500"
                        : ""
                    }`}
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <div className="w-4" /> {/* Indent */}
                    <Folder className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">{folder}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {filesByCategory[folder] || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Search and upload bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  onChange={onFileChange}
                  disabled={uploading}
                  className="w-56"
                />
                <Button disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </div>

          {/* File listing */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === "list" ? (
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-2 text-xs font-medium text-gray-500 border-b">
                  <div className="col-span-6">Name</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Modified</div>
                  <div className="col-span-2">Actions</div>
                </div>
                {/* Files */}
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <div
                      key={file._id}
                      className="grid grid-cols-12 gap-4 p-2 hover:bg-gray-50 rounded cursor-pointer group"
                    >
                      <div className="col-span-6 flex items-center space-x-2">
                        {getFileIcon(file.fileName || "")}
                        <span className="text-sm">
                          {decodeURIComponent(file.fileName)}
                        </span>
                      </div>
                      <div className="col-span-2 items-center flex text-sm text-gray-500">
                        {file.fileName?.split(".").pop()?.toUpperCase()} File
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                        </div>
                        <div className="col-span-2 flex items-center">
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button className="p-2 rounded bg-inherit hover:bg-gray-200">
                                <FolderInputIcon className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="max-h-44 overflow-y-auto"
                            >
                              {categories.map((category) => (
                                <DropdownMenuItem
                                  key={category}
                                  className="bg-inherit hover:bg-sidebar-foreground"
                                  onClick={() =>
                                    changeFolder(category, file.url)
                                  }
                                  disabled={file.category === category}
                                >
                                  Move to {category}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              setFileToDelete(file);
                              setDeleteDialogOpen(true);
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
                          
                        </div>
                        {/* Direct download link only */}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>This folder is empty</p>
                    <p className="text-sm">
                      Drag files here or use the upload button
                    </p>
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
                      <div className="p-3 bg-gray-100 rounded-lg">
                        {getFileIcon(file.fileName || "")}
                      </div>
                    </div>
                    <div
                      className="text-sm font-medium truncate"
                      title={file.fileName}
                    >
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
                        e.preventDefault();
                        setFileToDelete(file);
                        setDeleteDialogOpen(true);
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
                      <DropdownMenuContent
                        align="start"
                        className="max-h-44 overflow-y-auto"
                      >
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
          <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {filteredFiles.length} items in {selectedFolder}
              </span>
              <span>
                Created: {new Date(engagement.createdAt).toLocaleDateString()}
              </span>
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
    </div>
  );
};
