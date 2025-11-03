// import React, { useState, useEffect } from "react";
// import { File, Folder } from "./types/types";
// import { generateFoldersAndFiles } from "./utils/data";

// // Shadcn UI components and icons
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Badge } from "@/components/ui/badge";
// import {
//   Folder as FolderIcon,
//   FileText,
//   FileSpreadsheet,
//   FileImage,
//   FileType,
// } from "lucide-react";
// import { getAllDocumentRequestsbyEngagementId } from "@/lib/api/documentRequests";

// const getFileIcon = (fileType: string) => {
//   switch (fileType) {
//     case "pdf":
//       return <FileType className="w-4 h-4 text-red-500" />;
//     case "docx":
//       return <FileText className="w-4 h-4 text-blue-500" />;
//     case "xlsx":
//       return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
//     case "jpg":
//     case "png":
//       return <FileImage className="w-4 h-4 text-purple-500" />;
//     default:
//       return <FileText className="w-4 h-4 text-gray-500" />;
//   }
// };

// interface PbcFileBrowserProps {
//   engagementId: string;
// }

// export function PbcFileBrowser({ engagementId }: PbcFileBrowserProps) {
//   const [folders, setFolders] = useState<Folder[]>([]);
//   const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
//   const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
//   const [alldocumentRequests, setalldocumentRequests] = useState<any>([]);

//   const GetWholeDocumentRequestsByEnagementId = async () => {
//     try {
//       const response = await getAllDocumentRequestsbyEngagementId(engagementId);
//       console.log("AllDocumentRequestsbyEngagementId", response);
//       setalldocumentRequests(response);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     GetWholeDocumentRequestsByEnagementId();
//   }, []);

//   useEffect(() => {
//     setFolders(generateFoldersAndFiles(10));
//   }, []);

//   const selectedFolder = folders.find(
//     (folder) => folder.id === selectedFolderId
//   );

//   return (
//     <div className="flex gap-32 w-[80vw] h-auto p-4 space-x-4 border border-indigo-100 rounded-lg">
//       {/* Left Column: Folders */}
//       <Card className="w-[30%] flex flex-col">
//         <CardHeader>
//           <CardTitle>Folders</CardTitle>
//         </CardHeader>
//         <CardContent className="flex-grow p-0">
//           <ScrollArea className="h-full pr-4">
//             {folders.map((folder) => (
//               <div
//                 key={folder.id}
//                 className={`flex items-center justify-between p-3 mb-2 rounded-md cursor-pointer
//                             ${
//                               selectedFolderId === folder.id
//                                 ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
//                                 : "hover:bg-gray-50 dark:hover:bg-brand-hover"
//                             }`}
//                 onClick={() => {
//                   setSelectedFolderId(folder.id);
//                   setSelectedFileId(null); // Reset file selection on folder change
//                 }}
//               >
//                 <div className="flex items-center gap-2">
//                   <FolderIcon size={20} className="text-blue-500" />
//                   <span className="font-medium truncate">{folder.name}</span>
//                 </div>
//                 <Badge className="rounded-full bg-indigo-500 text-white">
//                   {folder.files.length}
//                 </Badge>
//               </div>
//             ))}
//           </ScrollArea>
//         </CardContent>
//       </Card>

//       {/* Right Column: Files */}
//       <Card className="w-[60%] flex flex-col">
//         <CardHeader>
//           <CardTitle>
//             Files {selectedFolder ? `in "${selectedFolder.name}"` : ""}
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="flex-grow p-0">
//           {selectedFolder ? (
//             <ScrollArea className="h-full pr-4">
//               {selectedFolder.files.map((file) => (
//                 <div
//                   key={file.id}
//                   className={`flex items-center gap-2 p-3 mb-2 rounded-md cursor-pointer
//                               ${
//                                 selectedFileId === file.id
//                                   ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
//                                   : "hover:bg-gray-50 dark:hover:bg-brand-hover"
//                               }`}
//                   onClick={() => setSelectedFileId(file.id)}
//                 >
//                   {getFileIcon(file.type)}
//                   <span className="font-medium truncate">{file.name}</span>
//                 </div>
//               ))}
//             </ScrollArea>
//           ) : (
//             <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
//               Select a folder to view its files.
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// #############################################################################################################

import React, { useState, useEffect } from "react";
import { File, Folder } from "./types/types"; // Assuming types.ts defines File and Folder
// import { generateFoldersAndFiles } from './utils/data'; // No longer needed for generating dummy data

// Shadcn UI components and icons
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Folder as FolderIcon,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileType,
} from "lucide-react";
import { getAllDocumentRequestsbyEngagementId } from "@/lib/api/documentRequests";

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case "pdf":
      return <FileType className="w-4 h-4 text-red-500" />;
    case "docx":
      return <FileText className="w-4 h-4 text-blue-500" />;
    case "xlsx":
      return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    case "jpg":
    case "png":
      return <FileImage className="w-4 h-4 text-purple-500" />;
    default:
      return <FileText className="w-4 h-4 text-gray-500" />;
  }
};

interface PbcFileBrowserProps {
  engagementId: string;
}

export function PbcFileBrowser({ engagementId }: PbcFileBrowserProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [alldocumentRequests, setAlldocumentRequests] = useState<any[]>([]); // Renamed for consistency

  const GetWholeDocumentRequestsByEnagementId = async () => {
    try {
      const response = await getAllDocumentRequestsbyEngagementId(engagementId);
      console.log("AllDocumentRequestsbyEngagementId", response);
      setAlldocumentRequests(response);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    GetWholeDocumentRequestsByEnagementId();
  }, [engagementId]); // Add engagementId to dependencies if it can change

  useEffect(() => {
    if (alldocumentRequests.length > 0) {
      const newFolders: Folder[] = [];
      const categoryMap = new Map<string, Folder>();

      alldocumentRequests.forEach((request) => {
        const categoryName = request.category;
        let folder = categoryMap.get(categoryName);

        if (!folder) {
          // Create a new folder if it doesn't exist
          folder = {
            id: request._id, // Using category name as a unique ID for simplicity
            name: categoryName,
            files: [],
          };
          categoryMap.set(categoryName, folder);
          newFolders.push(folder);
        }

        // Add documents from the current request to the folder's files
        if (request.documents && request.documents.length > 0) {
          request.documents.forEach((doc: any) => {
            const fileName = doc.name;
            const fileType = fileName.split(".").pop() || "unknown";
            folder?.files.push({
              id: doc._id || `${categoryName}-${fileName}`, // Use document ID or a generated one
              name: fileName,
              type: fileType,
              url: doc.url,
            });
          });
        }
      });
      setFolders(newFolders);
      // Optionally select the first folder by default
      if (newFolders.length > 0 && !selectedFolderId) {
        setSelectedFolderId(newFolders[0].id);
      }
    }
  }, [alldocumentRequests]); // Re-run when alldocumentRequests changes

  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId
  );

  return (
    <div className="flex gap-32 w-[80vw] h-auto p-4 space-x-4 border border-indigo-100 rounded-lg">
      {/* Left Column: Folders */}
      <Card className="w-[30%] flex flex-col">
        <CardHeader>
          <CardTitle>Folders</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow p-0">
          <ScrollArea className="h-full pr-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`flex items-center justify-between p-3 mb-2 rounded-md cursor-pointer
                            ${
                              selectedFolderId === folder.id
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
                                : "hover:bg-gray-50 dark:hover:bg-brand-hover"
                            }`}
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setSelectedFileId(null); // Reset file selection on folder change
                }}
              >
                <div className="flex items-center gap-2">
                  <FolderIcon size={20} className="text-blue-500" />
                  <span className="font-medium truncate">{folder.name}</span>
                </div>
                <Badge className="rounded-full bg-indigo-500 text-white">
                  {folder.files.length}
                </Badge>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Column: Files */}
      <Card className="w-[60%] flex flex-col">
        <CardHeader>
          <CardTitle>
            Files {selectedFolder ? `in "${selectedFolder.name}"` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow p-0">
          {selectedFolder && selectedFolder.files.length > 0 ? (
            <ScrollArea className="h-full pr-4">
              {selectedFolder.files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-3 mb-2 rounded-md cursor-pointer
                              ${
                                selectedFileId === file.id
                                  ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                                  : "hover:bg-gray-50 dark:hover:bg-brand-hover"
                              }`}
                  onClick={() => setSelectedFileId(file.id)}
                >
                  {getFileIcon(file.type)}
                  <span className="font-medium truncate">{file.name}</span>
                </div>
              ))}
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              {selectedFolder
                ? "No files in this folder."
                : "Select a folder to view its files."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
