// import { useState, useEffect } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   Plus,
//   FileText,
//   MessageSquare,
//   CheckCircle,
//   Clock,
//   AlertCircle,
// } from "lucide-react";
// import { PBCWorkflow } from "@/types/pbc";

// import { CreatePBCDialog } from "./CreatePBCDialog";
// import { getDocumentRequests } from "@/lib/api/documentRequests";
// import { useAuth } from "@/contexts/AuthContext";
// import { pbcApi } from "@/lib/api/pbc-workflow";
// import { toast } from "sonner";

// const statusColors = {
//   "document-collection": "bg-blue-500",
//   "qna-preparation": "bg-yellow-500",
//   "client-responses": "bg-orange-500",
//   "doubt-resolution": "bg-red-500",
//   submitted: "bg-green-500",
// };

// const statusIcons = {
//   "document-collection": FileText,
//   "qna-preparation": MessageSquare,
//   "client-responses": Clock,
//   "doubt-resolution": AlertCircle,
//   submitted: CheckCircle,
// };

// interface PBCDashboardProps {
//   userRole: "employee" | "client" | "admin";
//   onSelectWorkflow: (workflow: PBCWorkflow) => void;
//   selectedEngagement: any;
// }

// export function PBCDashboard({
//   userRole,
//   onSelectWorkflow,
//   selectedEngagement,
// }: PBCDashboardProps) {
//   const { user, isLoading: authLoading } = useAuth();
//   const [workflows, setWorkflows] = useState<PBCWorkflow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showCreateDialog, setShowCreateDialog] = useState(false);
//   const [statusFilter, setStatusFilter] = useState<string>("");
//   const [documentRequests, setDocumentrequests] = useState<any>(null);

//   const fetchDoumentrequests = async () => {
//     try {
//       const response = await getDocumentRequests(selectedEngagement.id);
//       console.log("documentrequests", response);
//       setDocumentrequests(response);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     if (selectedEngagement) {
//       fetchDoumentrequests();
//     }
//   }, []);

//   useEffect(() => {
//     loadWorkflows();
//   }, [statusFilter]);

//   const loadWorkflows = async () => {
//     try {
//       setLoading(true);
//       const params = statusFilter ? { status: statusFilter } : undefined;
//       const data = await pbcApi.getAllPBCWorkflows(params);
//       setWorkflows(data);
//     } catch (error) {
//       console.error("Error loading workflows:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlecreatePBCWorkflow = async () => {
//     const body = {
//       engagementId: selectedEngagement.id,
//       clientId: selectedEngagement.clientId,
//       auditorId: user?.id,
//       documentRequests: documentRequests?.map((item: any,index: number) => item.id),
//     };
//     await pbcApi.createPBCWorkflow(body);
//     loadWorkflows();
//     try {
//     } catch (error) {
//         toast.error(error)
//         console.log(error)
//     }
//   };

// //   const handleCreateWorkflow = async (workflowData: any) => {
// //     try {
// //       await pbcApi.createPBCWorkflow(workflowData);
// //       loadWorkflows();
// //       setShowCreateDialog(false);
// //     } catch (error) {
// //       console.error("Error creating workflow:", error);
// //     }
// //   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString();
//   };

//   const getStatusLabel = (status: string) => {
//     return status
//       .split("-")
//       .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(" ");
//   };
//   console.log("selectedEngagement", selectedEngagement);
//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900">PBC Workflows</h1>
//           <p className="text-gray-600 mt-2">Manage client audit preparations</p>
//         </div>
//         {(userRole === "employee" || userRole === "admin") && (
//           <Button
//             // onClick={() => setShowCreateDialog(true)}
//             onClick={handlecreatePBCWorkflow}
//             className="flex items-center gap-2"
//           >
//             <Plus className="h-4 w-4" />
//             New Workflow
//           </Button>
//         )}
//       </div>

//       <div className="flex gap-4 items-center">
//         <span className="text-sm font-medium text-gray-700">
//           Filter by status:
//         </span>
//         <div className="flex gap-2">
//           <Button
//             variant={statusFilter === "" ? "default" : "outline"}
//             size="sm"
//             onClick={() => setStatusFilter("")}
//           >
//             All
//           </Button>
//           {Object.keys(statusColors).map((status) => (
//             <Button
//               key={status}
//               variant={statusFilter === status ? "default" : "outline"}
//               size="sm"
//               onClick={() => setStatusFilter(status)}
//             >
//               {getStatusLabel(status)}
//             </Button>
//           ))}
//         </div>
//       </div>

//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {[...Array(6)].map((_, i) => (
//             <Card key={i} className="animate-pulse">
//               <CardHeader>
//                 <div className="h-6 bg-gray-200 rounded"></div>
//                 <div className="h-4 bg-gray-200 rounded w-3/4"></div>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-3">
//                   <div className="h-4 bg-gray-200 rounded"></div>
//                   <div className="h-4 bg-gray-200 rounded w-1/2"></div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {workflows.map((workflow) => {
//             const StatusIcon = statusIcons[workflow.status];
//             return (
//               <Card
//                 key={workflow._id}
//                 className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
//                 onClick={() => onSelectWorkflow(workflow)}
//               >
//                 <CardHeader>
//                   <CardTitle className="flex items-center justify-between">
//                     <span className="truncate">
//                       {workflow.engagement.title}
//                     </span>
//                     <StatusIcon className="h-5 w-5 text-gray-500" />
//                   </CardTitle>
//                   <div className="flex items-center justify-between">
//                     <Badge
//                       className={`${statusColors[workflow.status]} text-white`}
//                     >
//                       {getStatusLabel(workflow.status)}
//                     </Badge>
//                     <span className="text-sm text-gray-500">
//                       {formatDate(workflow.engagement.yearEndDate)}
//                     </span>
//                   </div>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-2">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Documents:</span>
//                       <span className="font-medium">
//                         {workflow.documentRequests.length}
//                       </span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Categories:</span>
//                       <span className="font-medium">
//                         {workflow.categories?.length || 0}
//                       </span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Created:</span>
//                       <span className="font-medium">
//                         {formatDate(workflow.createdAt)}
//                       </span>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             );
//           })}
//         </div>
//       )}

//       {workflows.length === 0 && !loading && (
//         <div className="text-center py-12">
//           <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//           <h3 className="text-lg font-medium text-gray-900 mb-2">
//             No workflows found
//           </h3>
//           <p className="text-gray-600 mb-6">
//             {statusFilter
//               ? `No workflows with status "${getStatusLabel(statusFilter)}"`
//               : "Get started by creating your first PBC workflow"}
//           </p>
//           {!statusFilter &&
//             (userRole === "employee" || userRole === "admin") && (
//               <Button
//                 // onClick={() => setShowCreateDialog(true)}
//                 onClick={handlecreatePBCWorkflow}
//                 className="flex items-center gap-2"
//               >
//                 <Plus className="h-4 w-4" />
//                 Create Workflow
//               </Button>
//             )}
//         </div>
//       )}

//       <CreatePBCDialog
//         open={showCreateDialog}
//         onOpenChange={setShowCreateDialog}
//         onSubmit={() => null}
//       />
//     </div>
//   );
// }

// #################################################################################################################

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { PBCWorkflow } from "@/types/pbc"; // Assuming PBCWorkflow type is correctly defined
import { getDocumentRequests } from "@/lib/api/documentRequests";
import { useAuth } from "@/contexts/AuthContext";
import { pbcApi } from "@/lib/api/pbc-workflow";
import { toast } from "sonner";

const statusColors = {
  "document-collection": "bg-blue-500",
  "qna-preparation": "bg-yellow-500",
  "client-responses": "bg-orange-500",
  "doubt-resolution": "bg-red-500",
  submitted: "bg-green-500",
};

const statusIcons = {
  "document-collection": FileText,
  "qna-preparation": MessageSquare,
  "client-responses": Clock,
  "doubt-resolution": AlertCircle,
  submitted: CheckCircle,
};

interface PBCDashboardProps {
  userRole: "employee" | "client" | "admin";
  onSelectWorkflow: (workflow: PBCWorkflow) => void;
  selectedEngagement: any; // Consider creating a more specific type for selectedEngagement
}

export function PBCDashboard({
  userRole,
  onSelectWorkflow,
  selectedEngagement,
}: PBCDashboardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [workflows, setWorkflows] = useState<PBCWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [documentRequests, setDocumentRequests] = useState<any[]>([]); // Initialize as an array

  const fetchDocumentRequests = async () => {
    try {
      if (selectedEngagement?.id) {
        const response = await getDocumentRequests(selectedEngagement.id);
        setDocumentRequests(response);
      }
    } catch (error) {
      console.error("Error fetching document requests:", error);
      toast.error("Failed to load document requests.");
    }
  };

  useEffect(() => {
    if (selectedEngagement) {
      fetchDocumentRequests();
    }
  }, [selectedEngagement]);

  const handleCreatePBCWorkflow = async () => {
    if (!selectedEngagement || !user) {
      toast.error("Engagement or user information is missing.");
      return;
    }

    try {
      const body = {
        engagementId: selectedEngagement.id,
        clientId: selectedEngagement.clientId,
        auditorId: user.id,
        documentRequests: documentRequests.map((item: any) => item._id),
      };
      const response = await pbcApi.createPBCWorkflow(body);
      if (response) {
        toast.success("PBC Workflow created successfully!");
        loadWorkflows();
      }
    } catch (error) {
      console.error("Error creating PBC Workflow:", error);
      toast.error("Failed to create PBC Workflow.");
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, [statusFilter, selectedEngagement]); // Add selectedEngagement to dependency array

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const params: { status?: string; clientId?: string } = {};
      if (statusFilter) params.status = statusFilter;
      // Add clientId to the filter if available from selectedEngagement
      if (selectedEngagement?.clientId)
        params.clientId = selectedEngagement.clientId;

      const data = await pbcApi.getAllPBCWorkflows(params);
      setWorkflows(data);
    } catch (error) {
      console.error("Error loading workflows:", error);
      toast.error("Failed to load PBC Workflows.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusLabel = (status: string) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PBC Workflows</h1>
          <p className="text-gray-600 mt-2">Manage client audit preparations</p>
        </div>
        {(userRole === "employee" || userRole === "admin") && (
          <Button
            onClick={handleCreatePBCWorkflow}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-800 text-white border-0 shadow-lg"
            disabled={!selectedEngagement || documentRequests.length === 0} // Disable if no engagement or no document requests
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <span className="text-sm font-medium text-gray-700">
          Filter by status:
        </span>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("")}
            className={`transition-all duration-300 ${
              statusFilter === ""
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg"
                : "border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800"
            }`}
          >
            All
          </Button>
          {Object.keys(statusColors).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={`transition-all duration-300 ${
                statusFilter === status
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg"
                  : "border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800"
              }`}
            >
              {getStatusLabel(status)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => {
            const StatusIcon = statusIcons[workflow.status];
            return (
              <Card
                key={workflow._id}
                // className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden cursor-pointer"
                onClick={() => onSelectWorkflow(workflow)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">
                      {workflow.engagement.title}
                    </span>
                    <StatusIcon className="h-5 w-5 text-gray-500" />
                  </CardTitle>
                  <div className="flex items-center justify-between">
                    <Badge
                      className={`${statusColors[workflow.status]} text-white`}
                    >
                      {getStatusLabel(workflow.status)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(workflow.engagement.yearEndDate)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Documents:</span>
                      <span className="font-medium">
                        {workflow.documentRequests.length}
                      </span>
                    </div>
                    {/* Assuming categories are populated as an array of objects or IDs */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Categories:</span>
                      <span className="font-medium">
                        {new Set(
                          workflow.documentRequests.map((dr) => dr.category)
                        ).size || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {formatDate(workflow.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {workflows.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No workflows found
          </h3>
          <p className="text-gray-600 mb-6">
            {statusFilter
              ? `No workflows with status "${getStatusLabel(statusFilter)}"`
              : "Get started by creating your first PBC workflow"}
          </p>
          {!statusFilter &&
            (userRole === "employee" || userRole === "admin") && (
              <Button
                onClick={handleCreatePBCWorkflow}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-800 text-white border-0 shadow-lg"
                disabled={!selectedEngagement || documentRequests.length === 0}
              >
                <Plus className="h-4 w-4" />
                Create Workflow
              </Button>
            )}
        </div>
      )}
    </div>
  );
}
