import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

import {
  CurrentUser,
  AuditItemType,
  ReviewWorkflow,
  ApiResponse,
  AuditItem,
  ReviewStatus,
} from "@/types/reviews_module";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  GetAllReviewers,
  getAllReviewWorkflows,
  GetReviewworkflowByEngagementId,
  submitForReview,
  assignReviewer,
  performReview,
  signOff,
  reopenItem,
} from "@/lib/api/review-api";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // Assuming you have Dialog components
import { Input } from "@/components/ui/input"; // Assuming you have an Input component
import { Label } from "@/components/ui/label"; // Assuming you have a Label component
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Assuming you have Select components
import { Textarea } from "../ui/textarea";
import axiosInstance from "@/lib/axiosInstance";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { format } from "date-fns";
import ClassificationReviewItems, {
  UpdateReviewWorkflowFunction,
} from "./ClassificationReviewItems";

// export const fetchAuditItemId = async (
//   itemType: AuditItemType,
//   engagementId: string
// ): Promise<string | null> => {
//   try {
//     const apiEndpoints: Record<AuditItemType, string> = {
//       [AuditItemType.Procedure]: `/api/procedures/${engagementId}`,
//       [AuditItemType.PlanningProcedure]: `/api/planning-procedures/${engagementId}`,
//       [AuditItemType.DocumentRequest]: `/api/document-requests/engagement/${engagementId}`,
//       [AuditItemType.ChecklistItem]: `/api/checklist/engagement/${engagementId}`,
//       [AuditItemType.Pbc]: `/api/pbc?engagementId=${engagementId}`,
//       [AuditItemType.Kyc]: `/api/kyc?engagementId=${engagementId}`,
//       [AuditItemType.IsqmDocument]: "/api/isqm",
//       [AuditItemType.WorkingPaper]: `/${engagementId}/sections/:classification/working-papers/db`,
//       [AuditItemType.ClassificationSection]: `/${engagementId}/etb/:classification/classification`,
//     };

//     const apiUrl = apiEndpoints[itemType];

//     if (!apiUrl) {
//       console.warn(`Unhandled item type: ${itemType}`);
//       return null;
//     }

//     const response = await axiosInstance.get(apiUrl);

//     // Safely handle response and ensure that response.data is an array of objects with engagement._id
//     const id = response.data?.find(
//       (item: { engagement: { _id: string } }) =>
//         item.engagement._id === engagementId
//     )?._id;

//     if (id) {
//       console.log("responseId", id);
//       return id;
//     }

//     // If no matching ID is found
//     console.warn(`No matching engagement ID found for item type ${itemType}`);
//     return null;
//   } catch (error) {
//     if (axios.isAxiosError(error)) {
//       // More specific error logging for Axios
//       console.error(
//         "Axios error fetching audit item:",
//         error.response?.data || error.message
//       );
//     } else {
//       // General error logging
//       console.error("Error fetching audit item:", error);
//     }
//     return null;
//   }
// };

// --- API Calls to fetch ReviewWorkflows (Moved and Refactored) ---
// This function now encapsulates both getAllReviewWorkflows and GetReviewworkflowByEngagementId
const fetchReviewWorkflowsApi = async (engagementId?: string) => {
  try {
    let response: any;
    if (engagementId) {
      response = await GetReviewworkflowByEngagementId(engagementId);
      console.log("work flow response", response);
    } else {
      response = await getAllReviewWorkflows();
    }

    if (response && response.workflows) {
      // For each workflow, if 'item' is not populated, attempt to fetch its details

      return response.workflows;
    } else {
      console.error("API Error fetching review workflows:", response?.message);
      throw new Error(response?.message || "Failed to fetch review workflows.");
    }
  } catch (error) {
    console.error("Error fetching review workflows:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || error.message);
    }
    throw error;
  }
};

const SOCKET_SERVER_URL: string =
  import.meta.env.VITE_APIURL || "http://localhost:8000";

// --- The ReviewDetailsPage Component ---
const ClassificationReviewPanel: React.FC = ({ engagementId, reviewClassification }: any) => {
  // All hooks must be called unconditionally at the top level
  const { user: authUser, isLoading: authLoading } = useAuth();
  //   const { engagementId: urlEngagementId } = useParams<{
  //     engagementId: string;
  //   }>();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [availableReviewers, setAvailableReviewers] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [loadingReviewWorkflows, setLoadingReviewWorkflows] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewItems, setReviewItems] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "engagement">(
    engagementId ? "engagement" : "all"
  );

  // State for creating a new workflow
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [newItemType, setNewItemType] = useState<AuditItemType | "">("");
  const [newItemId, setNewItemId] = useState<string>("");
  const [newItemComments, setNewItemComments] = useState<string>("");
  const [isSubmittingNewWorkflow, setIsSubmittingNewWorkflow] = useState(false);

  // New state for available items based on selected type
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAuditItemId = async (
    itemType: AuditItemType,
    engagementId: string
  ): Promise<string | null> => {
    try {
      const apiEndpoints: Record<AuditItemType, string> = {
        [AuditItemType.Procedure]: `/api/procedures/${engagementId}`,
        [AuditItemType.PlanningProcedure]: `/api/planning-procedures/${engagementId}`,
        [AuditItemType.DocumentRequest]: `/api/document-requests/engagement/${engagementId}`,
        [AuditItemType.ChecklistItem]: `/api/checklist/engagement/${engagementId}`,
        [AuditItemType.Pbc]: `/api/pbc?engagementId=${engagementId}`,
        [AuditItemType.Kyc]: `/api/kyc?engagementId=${engagementId}`,
        [AuditItemType.IsqmDocument]: "/api/isqm",
        [AuditItemType.WorkingPaper]: `/api/engagements/${engagementId}/sections/${encodeURIComponent(reviewClassification)}/working-papers/db`,
        [AuditItemType.ClassificationSection]: `/api/engagements/${engagementId}/etb/classification/${encodeURIComponent(reviewClassification)}`,
      };

      const apiUrl = apiEndpoints[itemType];

      if (!apiUrl) {
        console.warn(`Unhandled item type: ${itemType}`);
        return null;
      }

      const response = await axiosInstance.get(apiUrl);
      const responseData = response.data;

      if (Array.isArray(responseData)) {
        const id = responseData.find(
          (item: { engagement?: { _id: string }; _id?: string }) =>
            item.engagement?._id === engagementId
        )?._id;

        if (id) {
          console.log("responseId", id);
          return id;
        }
      } else if (typeof responseData === "object" && responseData !== null) {
        if (responseData._id && responseData.engagement?._id === engagementId) {
          console.log("responseId (single object)", responseData._id);
          return responseData._id;
        }
      }
      console.warn(`No matching engagement ID found for item type ${itemType}`);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Axios error fetching audit item:",
          error.response?.data || error.message
        );
      } else {
        console.error("Error fetching audit item:", error);
      }
      return null;
    }
  };

  // Determine the title based on the selected filter - MOVED UP
  const displayTitle = useMemo(() => {
    if (selectedFilter === "all") {
      return "All Review Workflows";
    } else if (engagementId) {
      return `Review Workflows for Engagement ID: ${engagementId}`;
    }
    return "Review Workflows";
  }, [selectedFilter, engagementId]);

  // Function to handle item type selection and fetch available items
  const handleItemTypeChange = async (itemType: AuditItemType) => {
    setNewItemType(itemType);
    setNewItemId(""); // Reset item ID when item type changes
    setAvailableItems([]); // Clear available items (to be populated when item type changes)

    // Fetch the item ID based on the selected item type
    if (itemType && engagementId) {
      const fetchedItemId = await fetchAuditItemId(itemType, engagementId);
      if (fetchedItemId) {
        setNewItemId(fetchedItemId);
      }
    }
  };

  // This function now centralizes fetching logic and updates local state
  const fetchAndSetReviewWorkflows = useCallback(
    async (filterType: "all" | "engagement") => {
      const idToFetch = filterType === "engagement" ? engagementId : undefined;

      // Only proceed if an engagementId is needed but not available
      if (filterType === "engagement" && !idToFetch) {
        console.warn(
          "Attempted to fetch engagement-specific workflows but no engagementId in URL."
        );
        setReviewItems([]);
        setLoadingReviewWorkflows(false);
        setError(
          "No engagement ID found in URL for engagement-specific filter."
        );
        return [];
      }

      setLoadingReviewWorkflows(true);
      setError(null);
      try {
        const fetchedWorkflows = await fetchReviewWorkflowsApi();

        setReviewItems(fetchedWorkflows);
        return fetchedWorkflows;
      } catch (err: any) {
        setError(err.message || "Failed to load review workflows.");
        console.error("Review workflows loading error:", err);
        setReviewItems([]);
        return [];
      } finally {
        setLoadingReviewWorkflows(false);
      }
    },
    [engagementId] // Only depends on urlEngagementId
  );

  // Effect to load initial user data and reviewers
  useEffect(() => {
    const loadInitialAuthData = async () => {
      try {
        setCurrentUser(authUser);
        const revs = await GetAllReviewers();
        console.log("revs", revs);
        if (revs.success) {
          setAvailableReviewers(revs.users);
        } else {
          throw new Error(revs.message);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load initial data.");
        console.error("Initial data loading error:", err);
      } finally {
        setLoadingInitialData(false);
      }
    };
    if (authUser && !authLoading) {
      loadInitialAuthData();
    }
  }, [authUser, authLoading]);

  // Main data fetching effect, now sensitive to selectedFilter
  useEffect(() => {
    if (!loadingInitialData && currentUser) {
      fetchAndSetReviewWorkflows(selectedFilter);
    }
  }, [
    loadingInitialData,
    currentUser,
    selectedFilter, // Rerun when filter changes
    fetchAndSetReviewWorkflows, // Depend on memoized function
  ]);

  // Memoized event handler for real-time Socket.IO updates, now owned by parent
  const handleReviewEvent = useCallback(
    (data: {
      workflowId: string;
      itemType: AuditItem["itemType"];
      itemId: AuditItem["_id"];
      engagementId: string;
      status: AuditItem["reviewStatus"];
      performedBy: string;
      timestamp: string;
    }) => {
      const currentEngagementFilter =
        selectedFilter === "engagement" ? engagementId : undefined;

      // Only process events relevant to the currently applied filter
      if (
        currentEngagementFilter &&
        data.engagementId !== currentEngagementFilter
      ) {
        console.log(
          `Ignoring event for engagement ${data.engagementId}, current filter is ${currentEngagementFilter}.`
        );
        return;
      }
      // If 'all' filter is active, we care about all engagement events.
      // If 'engagement' filter is active, we care only about events for that engagement.

      toast.info(
        `Real-time Update: ${data.itemType} (ID: ${
          data.itemId
        }) is now ${data.status.replace("-", " ").toUpperCase()}`
      );

      setReviewItems((prevItems) => {
        let itemUpdated = false;
        const updatedItems = prevItems.map((item) => {
          // Match by workflowId if available, or by itemType/itemId combination
          if (
            (data.workflowId && item._id === data.workflowId) ||
            (!data.workflowId &&
              item.itemType === data.itemType &&
              item._id === data.itemId)
          ) {
            itemUpdated = true;
            return {
              ...item,
              reviewStatus: data.status,
              _id: data.workflowId || item._id, // Ensure _id is workflowId
              // Optionally update reviewerName if data includes it (needs backend to send it)
              // reviewerName: data.assignedReviewerName || item.reviewerName,
            };
          }
          return item;
        });

        // If the event was for a workflow not currently in the list (e.g., a newly submitted item)
        // and it's relevant to the current view, trigger a full refresh to get the latest data.
        const isEventRelevantToCurrentView =
          selectedFilter === "all" ||
          (selectedFilter === "engagement" &&
            engagementId &&
            data.engagementId === engagementId);

        if (!itemUpdated && isEventRelevantToCurrentView) {
          console.log(
            "Socket event for new or unseen item relevant to current view. Triggering a full refresh."
          );
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          refreshTimeoutRef.current = setTimeout(() => {
            fetchAndSetReviewWorkflows(selectedFilter); // Use the centralized fetch function
            refreshTimeoutRef.current = null;
          }, 500);
          return prevItems;
        }

        return updatedItems;
      });
    },
    [engagementId, selectedFilter, fetchAndSetReviewWorkflows]
  );

  // Effect to initialize and manage the Socket.IO connection in the parent
  useEffect(() => {
    // Determine the ID to join the room for. If 'all', we might want to join a general room
    // or simply not join any specific engagement room and rely on general updates
    // For simplicity, we'll only join an engagement-specific room if 'engagement' filter is active
    // and urlEngagementId is present.
    const roomToJoin =
      selectedFilter === "engagement" && engagementId
        ? engagementId
        : undefined;

    if (!currentUser || authLoading) {
      console.log("Skipping Socket.IO setup: User not loaded or auth loading.");
      return;
    }

    // If there's a room to join and we're not already in it, or we need to leave a previous one
    if (roomToJoin) {
      if (
        socketRef.current &&
        (socketRef.current as any)._currentEngagementId === roomToJoin &&
        socketRef.current.connected
      ) {
        console.log(
          `Socket already connected for engagement ${roomToJoin}. No action needed.`
        );
        return;
      }
      // Disconnect existing if it's for a different room or not connected
      if (socketRef.current) {
        console.log(
          `Disconnecting previous socket for engagement ${
            (socketRef.current as any)._currentEngagementId || "N/A"
          }`
        );
        const prevEngagementId = (socketRef.current as any)
          ._currentEngagementId;
        if (prevEngagementId) {
          socketRef.current.emit("leaveEngagement", prevEngagementId);
        }
        socketRef.current.off("review:submitted", handleReviewEvent);
        socketRef.current.off("review:assigned", handleReviewEvent);
        socketRef.current.off("review:completed", handleReviewEvent);
        socketRef.current.off("review:signedoff", handleReviewEvent);
        socketRef.current.off("review:reopened", handleReviewEvent);
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      console.log(
        `Attempting new Socket.IO connection for engagement: ${roomToJoin}`
      );
      const newSocket = io(SOCKET_SERVER_URL, { autoConnect: true });
      socketRef.current = newSocket;
      (newSocket as any)._currentEngagementId = roomToJoin; // Store current engagementId on the socket

      newSocket.on("connect", () => {
        console.log(`Socket.IO connected for engagement: ${roomToJoin}`);
        newSocket.emit("joinEngagement", roomToJoin); // Join the engagement-specific room
      });

      newSocket.on("review:submitted", handleReviewEvent);
      newSocket.on("review:assigned", handleReviewEvent);
      newSocket.on("review:completed", handleReviewEvent);
      newSocket.on("review:signedoff", handleReviewEvent);
      newSocket.on("review:reopened", handleReviewEvent);

      newSocket.on("disconnect", (reason) => {
        console.log(
          `Socket.IO disconnected for engagement: ${roomToJoin}. Reason: ${reason}`
        );
        if (reason === "io server disconnect") {
          console.log(
            "Server initiated disconnect, client will attempt to reconnect..."
          );
        }
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
      });

      newSocket.on("connect_error", (error) => {
        console.error(
          `Socket.IO connection error for engagement ${roomToJoin}:`,
          error.message
        );
        toast.error(`Real-time connection failed: ${error.message}`);
      });
      newSocket.on("error", (err) =>
        console.error(
          `Socket.IO general error for engagement ${roomToJoin}:`,
          err
        )
      );
    } else {
      // No specific room to join (e.g., 'all' filter or no urlEngagementId)
      if (socketRef.current) {
        console.log(
          "No specific engagement room to join or filter is 'all'. Disconnecting any existing engagement-specific socket."
        );
        const prevEngagementId = (socketRef.current as any)
          ._currentEngagementId;
        if (prevEngagementId) {
          socketRef.current.emit("leaveEngagement", prevEngagementId);
        }
        socketRef.current.off("review:submitted", handleReviewEvent);
        socketRef.current.off("review:assigned", handleReviewEvent);
        socketRef.current.off("review:completed", handleReviewEvent);
        socketRef.current.off("review:signedoff", handleReviewEvent);
        socketRef.current.off("review:reopened", handleReviewEvent);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      console.log(
        `Cleaning up Socket.IO for engagement (filter: ${selectedFilter}, id: ${engagementId})`
      );
      if (socketRef.current) {
        const currentSocketEngagementId = (socketRef.current as any)
          ._currentEngagementId;
        if (currentSocketEngagementId) {
          socketRef.current.emit("leaveEngagement", currentSocketEngagementId);
        }
        socketRef.current.off("review:submitted", handleReviewEvent);
        socketRef.current.off("review:assigned", handleReviewEvent);
        socketRef.current.off("review:completed", handleReviewEvent);
        socketRef.current.off("review:signedoff", handleReviewEvent);
        socketRef.current.off("review:reopened", handleReviewEvent);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [
    engagementId,
    selectedFilter,
    currentUser,
    authLoading,
    handleReviewEvent,
  ]);

  const updateReviewWorkflow: UpdateReviewWorkflowFunction = useCallback(
    async (workflowId: string | null, action: string, payload?: any) => {
      try {
        let response: ApiResponse<ReviewWorkflow | null>;

        switch (action) {
          case "submit":
            if (
              !payload?.itemType ||
              !payload?.itemId ||
              !payload?.engagementId
            )
              // Ensure engagementId is explicitly passed for submit
              throw new Error(
                "Item details and engagementId required for submission."
              );
            response = await submitForReview(
              payload.itemType,
              payload.itemId,
              payload.engagementId, // Use payload.engagementId here
              payload.comments || ""
            );
            break;
          case "assign":
            if (!workflowId)
              throw new Error("Workflow ID is required for assignment.");
            if (!payload?.reviewerId)
              throw new Error("Reviewer ID is required for assignment.");
            response = await assignReviewer(
              workflowId,
              payload.reviewerId,
              payload.comments || ""
            );
            break;
          case "review":
            if (!workflowId)
              throw new Error("Workflow ID is required for review.");
            if (typeof payload?.approved !== "boolean")
              throw new Error(
                "Approval status (approved: true/false) is required."
              );
            response = await performReview(
              workflowId,
              payload.approved,
              payload.comments || ""
            );
            break;
          case "signoff":
            if (!workflowId)
              throw new Error("Workflow ID is required for signoff.");
            response = await signOff(workflowId, payload.comments || "");
            break;
          case "reopen":
            if (!workflowId)
              throw new Error("Workflow ID is required for reopen.");
            if (!payload?.reason) throw new Error("Reopen reason is required.");
            response = await reopenItem(workflowId, payload.reason);
            break;
          default:
            throw new Error(`Unknown workflow action: ${action}`);
        }

        if (response.success) {
          toast.success(
            `Action '${action}' on workflow ${
              workflowId || "new item"
            } completed.`
          );
          // Re-fetch all workflows to get the latest state after an update
          await fetchAndSetReviewWorkflows(selectedFilter); // Use the centralized fetch function
          return response;
        } else {
          throw new Error(
            response.message || `API error during '${action}' update.`
          );
        }
      } catch (err: any) {
        console.error(
          `Error updating workflow ${
            workflowId || "new item"
          } with action '${action}':`,
          err
        );
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "An unknown error occurred.";
        toast.error(errorMessage);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [selectedFilter, fetchAndSetReviewWorkflows]
  );

  // Handle new workflow submission
  const handleSubmitNewWorkflow = async () => {
    if (!newItemType || !newItemId || !engagementId) {
      // New workflows MUST be tied to an engagement
      toast.error(
        "Item type, item ID, and current engagement ID are required to submit a new workflow."
      );
      return;
    }
    setIsSubmittingNewWorkflow(true);
    try {
      const response = await submitForReview(
        newItemType,
        newItemId,
        engagementId, // Use the URL's engagementId for new submissions
        newItemComments
      );
      if (response.success) {
        toast.success("New workflow submitted successfully!");
        setShowCreateWorkflowModal(false);
        setNewItemType("");
        setNewItemId("");
        setNewItemComments("");
        setAvailableItems([]); // Clear available items
        await fetchAndSetReviewWorkflows(selectedFilter); // Refresh data
      } else {
        throw new Error(response.message || "Failed to submit new workflow.");
      }
    } catch (err: any) {
      console.error("Error submitting new workflow:", err);
      toast.error(err.message || "An error occurred while submitting.");
    } finally {
      setIsSubmittingNewWorkflow(false);
    }
  };

  // List of all possible AuditItemType values for the dropdown
  const auditItemTypes: AuditItemType[] = useMemo(
    () => [
      AuditItemType.Procedure,
      AuditItemType.PlanningProcedure,
      AuditItemType.DocumentRequest,
      AuditItemType.ChecklistItem,
      AuditItemType.Pbc,
      AuditItemType.Kyc,
      AuditItemType.IsqmDocument,
      AuditItemType.WorkingPaper,
      AuditItemType.ClassificationSection,
    ],
    []
  );

  // Conditional returns for loading/error states should come AFTER all hooks
  if (loadingInitialData || loadingReviewWorkflows) {
    return (
      <div className="p-8 text-center text-gray-700">
        Loading{" "}
        {loadingInitialData ? "user data and reviewers" : "review workflows"}
        ...
        <div className="mt-4 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  }

  if (!currentUser) {
    return (
      <div className="p-8 text-center text-red-600">
        User authentication failed or not available. Please log in.
      </div>
    );
  }
  console.log(reviewClassification)
  return (
    <div className="p-4 space-y-8">
      {/* Create New Review Workflow Card */}
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Review Workflow</CardTitle>
          <CardDescription>
            Submit an item from engagement &quot;{engagementId}&quot; for
            review.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 py-4">
          {/* Item Type Field */}
          <div className="grid gap-2">
            <Label htmlFor="itemType" className="text-left">
              Item Type
            </Label>
            <Select value={newItemType} onValueChange={handleItemTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an item type" />
              </SelectTrigger>
              <SelectContent>
                {auditItemTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item ID Field */}
          <div className="grid gap-2">
            <Label htmlFor="itemId" className="text-left">
              ItemID
            </Label>
            {loadingItems && (
              <div className="flex items-center justify-center p-4 border rounded">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                Loading items...
              </div>
            )}
            {!newItemType && !newItemId && (
              <Input
                id="itemId"
                value={newItemId}
                onChange={(e) => setNewItemId(e.target.value)}
                className="w-full"
                placeholder="Select an item type first"
              />
            )}
            {newItemType && newItemId && (
              <Input
                id="itemId"
                value={newItemId}
                onChange={(e) => setNewItemId(e.target.value)}
                className="w-full"
                placeholder="Select an item type first"
                // disabled // Uncomment to disable if ID is auto-fetched
              />
            )}
          </div>

          {/* Comments Field */}
          <div className="grid gap-2">
            <Label htmlFor="comments" className="text-left">
              Comments (Optional)
            </Label>
            <Textarea
              id="comments"
              value={newItemComments}
              onChange={(e) => setNewItemComments(e.target.value)}
              className="w-full"
              placeholder="Initial comments for review"
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={handleSubmitNewWorkflow}
            disabled={isSubmittingNewWorkflow || !newItemType || !newItemId}
          >
            {isSubmittingNewWorkflow ? "Submitting..." : "Submit for Review"}
          </Button>
        </CardFooter>
      </Card>

      {/* Review Workflows Section */}
      {/* <div className="w-full mx-auto p-6 bg-white rounded-lg">
        <h3 className="text-lg font-semibold mb-4">
          Existing Review Workflows
        </h3>
        {loadingWorkflows ? (
          <div className="flex items-center justify-center p-4 border rounded">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
            Loading review workflows...
          </div>
        ) : reviewItems.length === 0 ? (
          <p className="text-center text-gray-500">
            No review workflows found for this engagement.sssss
          </p>
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewItems.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {workflow.itemType
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                    - {workflow.itemId}
                  </CardTitle>
                  <CardDescription>
                    Engagement: {workflow.engagement.title} (ID:{" "}
                    {workflow.engagement.id})
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`font-semibold ${
                        workflow.status === "under-review"
                          ? "text-blue-600"
                          : workflow.status === "ready-for-review"
                          ? "text-yellow-600"
                          : "text-gray-600"
                      }`}
                    >
                      {workflow.status
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </p>
                  <p>
                    <strong>Priority:</strong>{" "}
                    <span
                      className={`font-semibold ${
                        workflow.priority === "high"
                          ? "text-red-600"
                          : workflow.priority === "medium"
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {workflow.priority.replace(/\b\w/g, (l) =>
                        l.toUpperCase()
                      )}
                    </span>
                  </p>
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {format(
                      new Date(workflow.submittedForReviewAt),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </p>
                  {workflow.assignedReviewer && (
                    <p>
                      <strong>Assigned To:</strong> {workflow.assignedReviewer}{" "}
                      (at{" "}
                      {format(
                        new Date(workflow.assignedAt),
                        "MMM dd, yyyy HH:mm"
                      )}
                      )
                    </p>
                  )}
                  {workflow.notes && workflow.notes.length > 0 && (
                    <p>
                      <strong>Latest Note:</strong>{" "}
                      {workflow.notes[workflow.notes.length - 1].comment}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div> */}

      <ClassificationReviewItems
        engagementId={
          selectedFilter === "engagement" ? engagementId : undefined
        } // Pass engagementId based on filter
        currentUser={currentUser}
        availableReviewers={availableReviewers}
        reviewItems={reviewItems}
        setReviewItems={setReviewItems}
        refreshReviewItems={() => fetchAndSetReviewWorkflows(selectedFilter)} // Refresh current filtered view
        updateReviewWorkflow={updateReviewWorkflow}
      />
    </div>
  );
};

export default ClassificationReviewPanel;
