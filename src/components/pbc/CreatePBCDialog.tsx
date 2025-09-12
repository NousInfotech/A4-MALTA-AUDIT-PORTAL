// import { useState } from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// import { Textarea } from "@/components/ui/textarea";
// import { toast } from "sonner";
// import { useAuth } from "@/contexts/AuthContext";
// import { pbcApi } from "@/lib/api/pbc-workflow";

// interface CreatePBCDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   selectedEngagement: any;
//   documentRequests: any;
//   loadWorkflows: () => void;
// }

// export function CreatePBCDialog({
//   open,
//   onOpenChange,
//   selectedEngagement,
//   documentRequests,
//   loadWorkflows,
// }: CreatePBCDialogProps) {
//   const { user, isLoading: authLoading } = useAuth();
//   const [formData, setFormData] = useState({
//     name: selectedEngagement.title,
//     notes: "",
//   });

//   const handleCreatePBCWorkflow = async (event: React.FormEvent) => {
//     event.preventDefault();
//     if (!selectedEngagement || !user) {
//       toast.error("Engagement or user information is missing.");
//       return;
//     }

//     try {
//       const body = {
//         engagementId: selectedEngagement.id,
//         clientId: selectedEngagement.clientId,
//         auditorId: user.id,
//         documentRequests: documentRequests?.map((item: any) => item._id) ?? [],
//         entityName: formData.name,
//         notes: formData.notes,
//         customFields: null,
//       };
//       const response = await pbcApi.createPBCWorkflow(body);
//       if (response) {
//         toast.success("PBC Workflow created successfully!");
//         loadWorkflows();
//         onOpenChange(false);
//       }
//     } catch (error) {
//       console.error("Error creating PBC Workflow:", error);
//       toast.error("Failed to create PBC Workflow.");
//     }
//   };

//   console.log("documentRequests",documentRequests)

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-[500px]">
//         <DialogHeader>
//           <DialogTitle>Create New PBC Workflow</DialogTitle>
//         </DialogHeader>

//         <form onSubmit={handleCreatePBCWorkflow} className="space-y-4">
//           <div className="space-y-2">
//             <Label htmlFor="name">PBC Name</Label>
//             <Input
//               id="name"
//               value={formData.name}
//               onChange={(e) =>
//                 setFormData((prev) => ({ ...prev, name: e.target.value }))
//               }
//               placeholder="Enter workflow name"
//               required
//             />
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="notes">Notes</Label>
//             <Textarea
//               id="notes"
//               value={formData.notes}
//               onChange={(e) =>
//                 setFormData((prev) => ({ ...prev, notes: e.target.value }))
//               }
//               placeholder="Add any relevant notes here"
//               rows={4}
//             />
//           </div>

//           <div className="flex justify-end gap-3 pt-4">
//             <button
//             className="px-4 py-1 rounded-lg bg-indigo-500 hover:brightness-110"
//               type="button"

//               onClick={() => onOpenChange(false)}
//             >
//               Cancel
//             </button>
//             <button className="px-4 py-2 rounded-lg bg-indigo-500 hover:brightness-110" type="submit">Create Workflow</button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }

// #############################################################################################################

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { pbcApi } from "@/lib/api/pbc-workflow";
import { singleUploadPbc } from "@/lib/api/pbc-workflow";

// Define a more specific type for DocumentRequest
interface DocumentRequest {
  _id: string;
  name: string;
  description: string;
  documents?: any[]; // Adjust if you have a specific type for documents within a request
  // Add any other properties of a document request
}

interface CreatePBCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEngagement: {
    id: string;
    clientId: string;
    title: string;
    // Add other relevant properties of selectedEngagement
  };
  documentRequests: DocumentRequest[]; // Use the more specific type
  loadWorkflows: () => void;
}

export function CreatePBCDialog({
  open,
  onOpenChange,
  selectedEngagement,
  documentRequests,
  loadWorkflows,
}: CreatePBCDialogProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    entityName: selectedEngagement.title,
    notes: "",
    customFields: {
      industry: "",
      size: "",
    },
  });

  const [filesToUpload, setFilesToUpload] = useState<{
    [key: string]: FileList | null;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false); // New loading state for submission

  const handleFileChange = (
    documentRequestId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFilesToUpload((prev) => ({
      ...prev,
      [documentRequestId]: event.target.files,
    }));
  };

  const uploadFilesForRequest = async (requestId: string, files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      try {
        await singleUploadPbc(requestId, formData);
        console.log("file uploaded successfully");
        toast.success(`File ${file.name} uploaded successfully!`);
      } catch (uploadError: any) {
        console.error(`Error uploading file ${file.name}:`, uploadError);
        let errorMessage = `Failed to upload file ${file.name}.`;

        if (uploadError.response) {
          errorMessage =
            uploadError.response.data.message ||
            `Server error: ${uploadError.response.status} ${uploadError.response.statusText}`;
        } else if (uploadError.request) {
          errorMessage = `No response from server for file ${file.name}.`;
        } else {
          errorMessage = `Request error for file ${file.name}: ${uploadError.message}`;
        }

        toast.error(errorMessage);
      }
    });
    await Promise.all(uploadPromises);
  };

  const handleCreatePBCWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEngagement || !user) {
      toast.error("Engagement or user information is missing.");
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const formattedDocumentRequests = documentRequests?.map((item) => ({
        _id: item._id,
        name: item.name,
        description: item.description,
        documents: item.documents,
      }));

      const body = {
        engagementId: selectedEngagement.id,
        clientId: selectedEngagement.clientId,
        auditorId: user.id,
        entityName: formData.entityName,
        notes: formData.notes,
        customFields: formData.customFields,
        documentRequests: formattedDocumentRequests || [],
      };

      const apiResponse = await pbcApi.createPBCWorkflow(body);

      // --- FIX STARTS HERE ---
      // The API returns a single object, not an array.
      // We expect this object to have a 'documentRequests' property.
      if (
        apiResponse &&
        typeof apiResponse === "object" &&
        apiResponse.documentRequests
      ) {
        const createdWorkflow = apiResponse; // apiResponse itself is the created workflow object

        // Now, proceed with the logic using createdWorkflow.documentRequests
        // (which is an array within the createdWorkflow object)
        if (
          createdWorkflow.documentRequests &&
          createdWorkflow.documentRequests.length > 0
        ) {
          // Create a map from original _id (from your prop) to the new _id (from API response)
          const newIdMap = new Map<string, string>();
          createdWorkflow.documentRequests.forEach(
            (newDocReq: DocumentRequest) => {
              // Find the corresponding original document request using the _id
              // Assuming the _id in newDocReq from the API matches the _id sent in formattedDocumentRequests
              const originalDocReqSent = formattedDocumentRequests.find(
                (fd) => fd._id === newDocReq._id
              );
              if (originalDocReqSent) {
                newIdMap.set(originalDocReqSent._id, newDocReq._id);
              } else {
                console.warn(
                  `Could not find original request for new docReq: ${newDocReq.name} (ID: ${newDocReq._id}). Mapping might be off.`
                );
              }
            }
          );

          // Now iterate over the original documentRequests prop to get files and upload
          for (const originalDocReq of documentRequests) {
            const newDocReqId = newIdMap.get(originalDocReq._id);

            if (newDocReqId) {
              const files = filesToUpload[originalDocReq._id];

              if (files && files.length > 0) {
                await uploadFilesForRequest(newDocReqId, files); // Use the NEW ID for upload
              } else {
                console.log(
                  `No files selected for document request: ${originalDocReq.name}`
                );
              }
            } else {
              console.warn(
                `No new ID mapped for original document request: ${originalDocReq.name} (ID: ${originalDocReq._id}). Skipping file upload.`
              );
            }
          }

          toast.success("PBC Workflow created successfully!");
          loadWorkflows();
          onOpenChange(false);
        } else {
          // This would mean the main workflow object was returned, but its documentRequests array was empty
          toast.error(
            "Failed to create PBC Workflow: Created workflow has no document requests."
          );
        }
      } else {
        // This handles cases where apiResponse is null, undefined, not an object, or lacks documentRequests
        toast.error(
          "Failed to create PBC Workflow: API response was empty or malformed (expected single workflow object with documentRequests)."
        );
      }
      // --- FIX ENDS HERE ---
    } catch (error) {
      console.error("Error creating PBC Workflow:", error);
      toast.error("Failed to create PBC Workflow.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:min-w-[50vw] h-[95vh]">
        <DialogHeader>
          <DialogTitle>Create New PBC Workflow</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleCreatePBCWorkflow}
          className="space-y-4 overflow-y-auto p-2"
        >
          <div className="space-y-2">
            <Label htmlFor="entityName">Entity Name</Label>
            <Input
              id="entityName"
              value={formData.entityName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, entityName: e.target.value }))
              }
              placeholder="Enter entity name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add any relevant notes here"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={formData.customFields.industry}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customFields: {
                    ...prev.customFields,
                    industry: e.target.value,
                  },
                }))
              }
              placeholder="e.g., Manufacturing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Size</Label>
            <Input
              id="size"
              value={formData.customFields.size}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customFields: { ...prev.customFields, size: e.target.value },
                }))
              }
              placeholder="e.g., Mid-size"
            />
          </div>

          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold">Document Requests</h3>
            {documentRequests?.map(
              (
                docReq: DocumentRequest // Use DocumentRequest type here
              ) => (
                <div
                  key={docReq._id}
                  className="border p-4 rounded-md space-y-2"
                >
                  <Label className="font-medium">{docReq.name}</Label>
                  <p className="text-sm text-gray-500 hidden">
                    {docReq.description}
                  </p>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(docReq._id, e)}
                    className="mt-2"
                  />
                  {filesToUpload[docReq._id] &&
                    Array.from(filesToUpload[docReq._id]!).map((file) => (
                      <span
                        key={file.name}
                        className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mt-2"
                      >
                        {file.name}
                      </span>
                    ))}
                </div>
              )
            )}
            {documentRequests?.length === 0 && (
              <p className="text-gray-500">
                No document requests defined for this engagement.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="px-4 py-1 rounded-lg bg-indigo-500 hover:brightness-110"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting} // Disable cancel button too while submitting
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:brightness-110"
              type="submit"
              disabled={isSubmitting || authLoading} // Disable when submitting or auth loading
            >
              {isSubmitting ? "Creating..." : "Create Workflow"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// #############################################################################################################

// import { useState } from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";

// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { toast } from "sonner";
// import { useAuth } from "@/contexts/AuthContext";
// import { pbcApi } from "@/lib/api/pbc-workflow";
// import { singleUploadPbc } from "@/lib/api/pbc-workflow"; // Assuming this is where your upload function is

// interface CreatePBCDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   selectedEngagement: any;
//   documentRequests: any[]; // This will now be an array of objects passed into the component
//   loadWorkflows: () => void;
// }

// export function CreatePBCDialog({
//   open,
//   onOpenChange,
//   selectedEngagement,
//   documentRequests,
//   loadWorkflows,
// }: CreatePBCDialogProps) {
//   const { user, isLoading: authLoading } = useAuth();
//   const [formData, setFormData] = useState({
//     entityName: selectedEngagement.title,
//     notes: "",
//     customFields: {
//       industry: "",
//       size: "",
//     },
//   });

//   const [filesToUpload, setFilesToUpload] = useState<{
//     [key: string]: FileList | null;
//   }>({});

//   const handleFileChange = (
//     documentRequestId: string,
//     event: React.ChangeEvent<HTMLInputElement>
//   ) => {
//     setFilesToUpload((prev) => ({
//       ...prev,
//       [documentRequestId]: event.target.files,
//     }));
//   };

//   const uploadFilesForRequest = async (requestId: string, files: FileList) => {
//     const uploadPromises = Array.from(files).map(async (file) => {
//       const formData = new FormData();
//       formData.append("file", file); // Backend expects 'file' as the field name
//       try {
//         await singleUploadPbc(requestId, formData);
//         toast.success(`File ${file.name} uploaded successfully!`);
//       } catch (uploadError) {
//         console.error(`Error uploading file ${file.name}:`, uploadError);
//         toast.error(`Failed to upload file ${file.name}.`);
//       }
//     });
//     await Promise.all(uploadPromises);
//   };

//   const handleCreatePBCWorkflow = async (event: React.FormEvent) => {
//     event.preventDefault();
//     if (!selectedEngagement || !user) {
//       toast.error("Engagement or user information is missing.");
//       return;
//     }

//     try {
//       // 🚨 THIS IS THE KEY CHANGE 🚨
//       // We now map the incoming documentRequest objects to just their _id strings.
//       const documentRequestIds = documentRequests?.map((item: any) => item._id).filter(Boolean); // Ensure _id exists and is not null/undefined

//       const body = {
//         engagementId: selectedEngagement.id,
//         clientId: selectedEngagement.clientId,
//         auditorId: user.id,
//         entityName: formData.entityName,
//         notes: formData.notes,
//         customFields: formData.customFields,
//         // Pass the array of _id strings
//         documentRequests: documentRequestIds || [],
//       };

//       const response = await pbcApi.createPBCWorkflow(body);

//       if (response && response.documentRequests) {
//         // The server response `response.documentRequests` should now correctly contain
//         // the full DocumentRequest objects (or at least their _id's).
//         // We use these _id's to match with the files stored in filesToUpload.
//         for (const docReq of response.documentRequests) {
//           const files = filesToUpload[docReq._id]; // Use the ID from the response (which should match the original docReq._id)
//           if (files && files.length > 0) {
//             await uploadFilesForRequest(docReq._id, files);
//           }
//         }
//         toast.success("PBC Workflow created successfully!");
//         loadWorkflows();
//         onOpenChange(false);
//       } else {
//         toast.error(
//           "Failed to create PBC Workflow: No document requests in response."
//         );
//       }
//     } catch (error) {
//       console.error("Error creating PBC Workflow:", error);
//       toast.error("Failed to create PBC Workflow.");
//     }
//   };

//   console.log("documentRequests (from props):", documentRequests);
//   // Log the _ids being sent
//   console.log("documentRequestIds being sent:", documentRequests?.map((item: any) => item._id).filter(Boolean));

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="w-full md:min-w-[50vw] h-[95vh]">
//         <DialogHeader>
//           <DialogTitle>Create New PBC Workflow</DialogTitle>
//         </DialogHeader>

//         <form onSubmit={handleCreatePBCWorkflow} className="space-y-4 overflow-y-auto p-2">
//           <div className="space-y-2">
//             <Label htmlFor="entityName">Entity Name</Label>
//             <Input
//               id="entityName"
//               value={formData.entityName}
//               onChange={(e) =>
//                 setFormData((prev) => ({ ...prev, entityName: e.target.value }))
//               }
//               placeholder="Enter entity name"
//               required
//             />
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="notes">Notes</Label>
//             <Textarea
//               id="notes"
//               value={formData.notes}
//               onChange={(e) =>
//                 setFormData((prev) => ({ ...prev, notes: e.target.value }))
//               }
//               placeholder="Add any relevant notes here"
//               rows={4}
//             />
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="industry">Industry</Label>
//             <Input
//               id="industry"
//               value={formData.customFields.industry}
//               onChange={(e) =>
//                 setFormData((prev) => ({
//                   ...prev,
//                   customFields: {
//                     ...prev.customFields,
//                     industry: e.target.value,
//                   },
//                 }))
//               }
//               placeholder="e.g., Manufacturing"
//             />
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="size">Size</Label>
//             <Input
//               id="size"
//               value={formData.customFields.size}
//               onChange={(e) =>
//                 setFormData((prev) => ({
//                   ...prev,
//                   customFields: { ...prev.customFields, size: e.target.value },
//                 }))
//               }
//               placeholder="e.g., Mid-size"
//             />
//           </div>

//           <div className="space-y-4 mt-6">
//             <h3 className="text-lg font-semibold">Document Requests</h3>
//             {/* The documentRequests prop itself is an array of objects, which is correct for rendering */}
//             {documentRequests?.map((docReq: any) => (
//               <div key={docReq._id} className="border p-4 rounded-md space-y-2">
//                 <Label className="font-medium">{docReq.name}</Label>
//                 <p className="text-sm text-gray-500 hidden">{docReq.description}</p>
//                 <Input
//                   type="file"
//                   multiple
//                   onChange={(e) => handleFileChange(docReq._id, e)}
//                   className="mt-2"
//                 />
//                 {filesToUpload[docReq._id] &&
//                   Array.from(filesToUpload[docReq._id]!).map((file) => (
//                     <span
//                       key={file.name}
//                       className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mt-2"
//                     >
//                       {file.name}
//                     </span>
//                   ))}
//               </div>
//             ))}
//             {documentRequests?.length === 0 && (
//               <p className="text-gray-500">
//                 No document requests defined for this engagement.
//               </p>
//             )}
//           </div>

//           <div className="flex justify-end gap-3 pt-4">
//             <button
//               className="px-4 py-1 rounded-lg bg-indigo-500 hover:brightness-110"
//               type="button"
//               onClick={() => onOpenChange(false)}
//             >
//               Cancel
//             </button>
//             <button
//               className="px-4 py-2 rounded-lg bg-indigo-500 hover:brightness-110"
//               type="submit"
//             >
//               Create Workflow
//             </button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }
