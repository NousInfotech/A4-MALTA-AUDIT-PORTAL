// import React, { useState, useEffect, useCallback } from "react";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
// import AuditItemCard from "./AuditItemCard";
// import { UserRole, ReviewWorkflow, AuditItem } from "@/types/reviews_module";
// import { getReviewQueue } from "@/lib/api/review-api"; // Adjust path as needed
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Button } from "@/components/ui/button"; // Assuming button is used for refresh

// interface ReviewQueueProps {
//   userRole: UserRole;
//   userId: string;
//   onAction: (action: string, item: AuditItem) => void;
//   // FIX: Change signature to accept both action and item
//   onViewHistory: (action: string, item: AuditItem) => void;
//   onRefresh?: () => void; // Callback to notify parent to refresh
//   engagementId?: string; // Optional: to filter queue by engagement
// }

// const ReviewQueue: React.FC<ReviewQueueProps> = ({
//   userRole,
//   userId,
//   onAction,
//   onViewHistory,
//   onRefresh,
//   engagementId,
// }) => {
//   const [queue, setQueue] = useState<AuditItem[]>([]); // State should hold AuditItem
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchQueue = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       // Filter by status if needed, e.g., only 'ready-for-review', 'under-review', 'rejected'
//       // Your API `/api/review/queue` actually supports a `status` query param.
//       // For a review queue, you might only want items requiring action.
//       // For now, fetching all and filtering in UI (as per original doc)
//       const response = await getReviewQueue(
//         userRole === "employee" ? undefined : userId,
//         "ready-for-review,under-review,rejected"
//       ); // Example: only these statuses
//       if (response.success && response.workflows) {
//         const filteredAndMappedQueue: AuditItem[] = response.workflows
//           .filter((wf) =>
//             engagementId
//               ? typeof wf.engagement === "string"
//                 ? wf.engagement === engagementId
//                 : wf.engagement._id === engagementId
//               : true
//           )
//           .map((wf) => ({
//             _id: wf._id, // Workflow ID is the primary ID for actions in this context
//             itemId: wf.itemId, // The original item ID
//             itemType: wf.itemType,
//             engagement:
//               typeof wf.engagement === "string"
//                 ? wf.engagement
//                 : wf.engagement._id, // Store engagement ID if it's an object
//             title: `[${wf.itemType.toUpperCase()}] ${
//               typeof wf.engagement === "object"
//                 ? wf.engagement.title + " - "
//                 : ""
//             }Item ${wf.itemId}`, // More descriptive title
//             description: `Current Status: ${wf.status.replace("-", " ")}`, // Description for queue
//             reviewStatus: wf.status,
//             reviewerId: wf.assignedReviewer,
//             // You'll need to fetch reviewerName and actual item details if not populated in workflow
//             // For now, let's assume item details are available or mocked
//             reviewerName: wf.assignedReviewer
//               ? `User ${wf.assignedReviewer}`
//               : undefined,
//             dueDate: (wf as any).dueDate, // Assuming dueDate might be part of workflow in queue response
//           }));
//         setQueue(filteredAndMappedQueue);
//       } else {
//         setError(response.message || "Failed to fetch review queue.");
//       }
//     } catch (err: any) {
//       setError(err.message || "An unexpected error occurred.");
//     } finally {
//       setLoading(false);
//     }
//   }, [userRole, userId, engagementId]);

//   useEffect(() => {
//     fetchQueue();
//   }, [fetchQueue]);

//   const handleActionWrapper = (action: string, item: AuditItem) => {
//     if (action === "viewHistory") {
//       onViewHistory(action, item); // Pass both action and item
//     } else {
//       onAction(action, item);
//     }
//   };

//   if (loading)
//     return (
//       <Card>
//         <CardContent className="p-6 text-center">
//           Loading review queue...
//         </CardContent>
//       </Card>
//     );
//   if (error)
//     return (
//       <Card>
//         <CardContent className="p-6 text-center text-red-600">
//           Error: {error}
//         </CardContent>
//       </Card>
//     );

//   const pendingItemsCount = queue.filter(
//     (item) => item.reviewStatus !== "signed-off"
//   ).length;

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Review Queue</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="flex items-center gap-4 mb-4">
//           <div className="text-center">
//             <span className="block text-2xl font-bold text-blue-600">
//               {pendingItemsCount}
//             </span>
//             <span className="text-sm text-gray-500">Items Pending</span>
//           </div>
//           <Separator orientation="vertical" className="h-10" />
//           <Button onClick={fetchQueue} variant="outline" size="sm">
//             Refresh Queue
//           </Button>
//         </div>

//         {queue.length === 0 ? (
//           <p className="text-muted-foreground text-center py-8">
//             No items in the review queue.
//           </p>
//         ) : (
//           <ScrollArea className="h-[400px] pr-4">
//             <div className="grid gap-4">
//               {queue.map((item) => (
//                 <AuditItemCard
//                   key={item._id}
//                   item={item}
//                   userRole={userRole}
//                   onAction={handleActionWrapper}
//                   // You might want to pass an `isProcessing` prop from parent if a modal action is ongoing
//                 />
//               ))}
//             </div>
//           </ScrollArea>
//         )}
//       </CardContent>
//     </Card>
//   );
// };

// export default ReviewQueue;


// ############################################################################################################



// src/components/review-components/ReviewQueue.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AuditItemCard from './AuditItemCard';
import { UserRole, ReviewWorkflow, AuditItem, AuditItemType } from '@/types/reviews_module'; // Added AuditItemType
import { getReviewQueue, fetchAuditItemDetails } from '@/lib/api/review-api'; // Import fetchAuditItemDetails
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner'; // Assuming you use sonner for toasts

interface ReviewQueueProps {
  userRole: UserRole;
  userId: string;
  onAction: (action: string, item: AuditItem) => void;
  onViewHistory: (action: string, item: AuditItem) => void;
  onRefresh?: () => void;
  engagementId?: string;
}

const ReviewQueue: React.FC<ReviewQueueProps> = ({ userRole, userId, onAction, onViewHistory, onRefresh, engagementId }) => {
  const [queue, setQueue] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReviewQueue(
        userRole === 'employee' ? undefined : userId,
        'ready-for-review,under-review,rejected' // Fetch items needing action
      );

      if (response.success && response.workflows) {
        // Filter by engagementId if provided
        const filteredWorkflows = response.workflows.filter(wf =>
          engagementId ? (typeof wf.engagement === 'string' ? wf.engagement === engagementId : wf.engagement._id === engagementId) : true
        );

        // Fetch detailed audit item information for each workflow
        const detailedAuditItemsPromises = filteredWorkflows.map(async (wf) => {
          const itemDetails = await fetchAuditItemDetails(wf.itemType, wf.itemId);

          if (itemDetails) {
            return {
              _id: wf._id, // Workflow ID is the primary ID for actions in this context
              itemId: wf.itemId, // The original item ID
              itemType: wf.itemType,
              engagement: typeof wf.engagement === 'string' ? wf.engagement : wf.engagement._id, // Store engagement ID
              title: itemDetails.title || `[${wf.itemType.toUpperCase()}] Item ${wf.itemId}`, // Use actual title
              description: itemDetails.description || `Current Status: ${wf.status.replace('-', ' ')}`, // Use actual description
              reviewStatus: wf.status,
              reviewerId: wf.assignedReviewer,
              reviewerName: wf.reviewedBy || itemDetails.reviewerName, // Prefer workflow reviewerName, fallback to item's
              dueDate: itemDetails.dueDate, // Use actual due date from item details
            } as AuditItem; // Explicitly cast to AuditItem
          } else {
            // Fallback if item details cannot be fetched
            return {
              _id: wf._id,
              itemId: wf.itemId,
              itemType: wf.itemType,
              engagement: typeof wf.engagement === 'string' ? wf.engagement : wf.engagement._id,
              title: `[${wf.itemType.toUpperCase()}] Item ${wf.itemId} (Details Unavailable)`,
              description: `Current Status: ${wf.status.replace('-', ' ')}`,
              reviewStatus: wf.status,
              reviewerId: wf.assignedReviewer,
              reviewerName: wf.reviewedBy,
              dueDate: (wf as any).dueDate, // Keep original if available
            } as AuditItem;
          }
        });

        const detailedItems = await Promise.all(detailedAuditItemsPromises);
        setQueue(detailedItems);
      } else {
        setError(response.message || 'Failed to fetch review queue.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      console.error("Error fetching review queue or item details:", err);
      toast.error("Failed to load review queue items. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userRole, userId, engagementId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleActionWrapper = (action: string, item: AuditItem) => {
    if (action === 'viewHistory') {
      onViewHistory(action, item);
    } else {
      onAction(action, item);
    }
  };

  if (loading) return (
    <Card>
      <CardContent className="p-6 text-center">Loading review queue...</CardContent>
    </Card>
  );
  if (error) return (
    <Card>
      <CardContent className="p-6 text-center text-red-600">Error: {error}</CardContent>
    </Card>
  );

  const pendingItemsCount = queue.filter(item => item.reviewStatus !== 'signed-off').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-center">
            <span className="block text-2xl font-bold text-blue-600">{pendingItemsCount}</span>
            <span className="text-sm text-gray-500">Items Pending</span>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <Button onClick={fetchQueue} variant="outline" size="sm">Refresh Queue</Button>
        </div>

        {queue.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No items in the review queue.</p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-4">
              {queue.map((item) => (
                <AuditItemCard
                  key={item._id}
                  item={item}
                  userRole={userRole}
                  onAction={handleActionWrapper}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewQueue;
