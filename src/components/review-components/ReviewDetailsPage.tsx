import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import EngagementAuditItems, {
  UpdateReviewWorkflowFunction,
} from "@/components/review-components/EngagementAuditItems";
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
  fetchAuditItemDetails, // Import the new API function
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
        [AuditItemType.IsqmDocument]: '/api/isqm',
        [AuditItemType.WorkingPaper]: `/${engagementId}/sections/:classification/working-papers/db`,
        [AuditItemType.ClassificationSection]: `/${engagementId}/etb/:classification/classification`,
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
          console.log('responseId', id);
          return id;
        }
      } else if (typeof responseData === 'object' && responseData !== null) {
        if (responseData._id && responseData.engagement?._id === engagementId) {
          console.log('responseId (single object)', responseData._id);
          return responseData._id;
        }
      }
      toast.error(`No matching engagement ID found for item type ${itemType}`);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          'Axios error fetching audit item:',
          error.response?.data || error.message
        );
      } else {
        console.error('Error fetching audit item:', error);
      }
      return null;
    }
  };

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

// const SOCKET_SERVER_URL = "http://localhost:8000";
const SOCKET_SERVER_URL: string =
  import.meta.env.VITE_APIURL || "http://localhost:8000";

// --- The ReviewDetailsPage Component ---
const ReviewDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  // All hooks must be called unconditionally at the top level
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { engagementId: urlEngagementId } = useParams<{
    engagementId: string;
  }>();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [availableReviewers, setAvailableReviewers] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [loadingReviewWorkflows, setLoadingReviewWorkflows] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewItems, setReviewItems] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "engagement">(
    urlEngagementId ? "engagement" : "all"
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

  const socketRef = useRef<Socket | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine the title based on the selected filter - MOVED UP
  const displayTitle = useMemo(() => {
    if (selectedFilter === "all") {
      return "All Review Workflows";
    } else if (urlEngagementId) {
      return `Review Workflows for Engagement ID: ${urlEngagementId}`;
    }
    return "Review Workflows";
  }, [selectedFilter, urlEngagementId]);

  // Function to handle item type selection and fetch available items
  const handleItemTypeChange = async (itemType: AuditItemType) => {
    setNewItemType(itemType);
    setNewItemId(""); // Reset item ID when item type changes
    setAvailableItems([]); // Clear available items (to be populated when item type changes)

    // Fetch the item ID based on the selected item type
    if (itemType && urlEngagementId) {
      const fetchedItemId = await fetchAuditItemId(itemType, urlEngagementId);
      if (fetchedItemId) {
        setNewItemId(fetchedItemId);
      }
    }
  };

  // This function now centralizes fetching logic and updates local state
  const fetchAndSetReviewWorkflows = useCallback(
    async (filterType: "all" | "engagement") => {
      const idToFetch =
        filterType === "engagement" ? urlEngagementId : undefined;

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
        const fetchedWorkflows = await fetchReviewWorkflowsApi(idToFetch);

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
    [urlEngagementId] // Only depends on urlEngagementId
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
        selectedFilter === "engagement" ? urlEngagementId : undefined;

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
            urlEngagementId &&
            data.engagementId === urlEngagementId);

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
    [urlEngagementId, selectedFilter, fetchAndSetReviewWorkflows]
  );

  // Effect to initialize and manage the Socket.IO connection in the parent
  useEffect(() => {
    // Determine the ID to join the room for. If 'all', we might want to join a general room
    // or simply not join any specific engagement room and rely on general updates
    // For simplicity, we'll only join an engagement-specific room if 'engagement' filter is active
    // and urlEngagementId is present.
    const roomToJoin =
      selectedFilter === "engagement" && urlEngagementId
        ? urlEngagementId
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
        `Cleaning up Socket.IO for engagement (filter: ${selectedFilter}, id: ${urlEngagementId})`
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
    urlEngagementId,
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
    if (!newItemType || !newItemId || !urlEngagementId) {
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
        urlEngagementId, // Use the URL's engagementId for new submissions
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
      // AuditItemType.ClassificationSection,
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

  return (
    <div className="container mx-auto p-2">
      <div className="review-details-page bg-gray-50 min-h-screen rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-500 mb-6">
          {displayTitle}
        </h1>

        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <Button
              onClick={() => navigate("/employee/engagements")}
              className="flex items-center gap-2 bg-white border border-gray-500 text-blue-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>

            {urlEngagementId && (
              <Button
                onClick={() => setSelectedFilter("engagement")}
                variant={
                  selectedFilter === "engagement" ? "default" : "outline"
                }
              >
                Show Current Engagement Workflows
              </Button>
            )}
            {/* <Button
            onClick={() => setSelectedFilter("all")}
            variant={selectedFilter === "all" ? "default" : "outline"}
          >
            Show All Workflows
          </Button> */}
            <Button
              onClick={() => navigate("/employee/review")}
              variant="link"
              className="bg-white text-blue-500 border border-gray-500 rounded-lg"
            >
              Show All Workflows
            </Button>
          </div>
          {urlEngagementId && (
            <Button onClick={() => setShowCreateWorkflowModal(true)}>
              Create New Review Workflow
            </Button>
          )}
        </div>

        <EngagementAuditItems
          engagementId={
            selectedFilter === "engagement" ? urlEngagementId : undefined
          } // Pass engagementId based on filter
          currentUser={currentUser}
          availableReviewers={availableReviewers}
          reviewItems={reviewItems}
          setReviewItems={setReviewItems}
          refreshReviewItems={() => fetchAndSetReviewWorkflows(selectedFilter)} // Refresh current filtered view
          updateReviewWorkflow={updateReviewWorkflow}
        />

        {/* Create New Review Workflow Modal */}
        <Dialog
          open={showCreateWorkflowModal}
          onOpenChange={(open) => {
            setShowCreateWorkflowModal(open);
            if (!open) {
              // Reset form when modal is closed
              setNewItemType("");
              setNewItemId("");
              setNewItemComments("");
              setAvailableItems([]);
            }
          }}
        >
          <DialogContent className="min-w-[50vw]">
            <DialogHeader>
              <DialogTitle>Create New Review Workflow</DialogTitle>
              <DialogDescription>
                Submit an item from engagement &quot;{urlEngagementId}&quot; for
                review.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Item Type Field */}
              <div className="grid gap-2">
                <Label htmlFor="itemType" className="text-left">
                  Item Type
                </Label>
                <Select
                  value={newItemType}
                  onValueChange={handleItemTypeChange}
                >
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

              {/* Item ID Field - Using an input field now */}
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
                    disabled
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
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateWorkflowModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitNewWorkflow}
                disabled={isSubmittingNewWorkflow || !newItemType || !newItemId}
              >
                {isSubmittingNewWorkflow
                  ? "Submitting..."
                  : "Submit for Review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ReviewDetailsPage;
