// src/components/ReviewWorkflowCard.tsx
import React, { useState } from "react";
import {
  ReviewWorkflow,
  ReviewStatus,
  AuditItemType,
  ReviewPriority,
  Engagement,
} from "@/types/reviews_module";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; // Import Dialog components

interface ReviewWorkflowCardProps {
  workflow: any; // Use the ReviewWorkflow type for better type safety
  onViewDetails: (workflowId: string) => void;
  onAssignReviewer?: (workflowId: string) => void;
  onPerformReview?: (workflowId: string) => void;
  onSignOff?: (workflowId: string) => void;
}

const getStatusColor = (status: ReviewStatus) => {
  switch (status) {
    case ReviewStatus.InProgress:
      return "bg-yellow-100 text-yellow-800";
    case ReviewStatus.UnderReview:
      return "bg-blue-100 text-blue-800";
    case ReviewStatus.Approved:
      return "bg-green-100 text-green-800";
    case ReviewStatus.Rejected:
      return "bg-red-100 text-red-800";
    case ReviewStatus.SignedOff:
      return "bg-purple-100 text-purple-800";
    case ReviewStatus.ReOpened:
      return "bg-orange-100 text-orange-800";
    case ReviewStatus.ReadyForReview:
      return "bg-teal-100 text-teal-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: ReviewPriority) => {
  switch (priority) {
    case ReviewPriority.High:
      return "bg-red-500 text-white";
    case ReviewPriority.Medium:
      return "bg-orange-500 text-white";
    case ReviewPriority.Low:
      return "bg-green-500 text-white";
    case ReviewPriority.Critical:
      return "bg-rose-500 text-white";
    default:
      return "bg-gray-300 text-gray-800";
  }
};

const ReviewWorkflowCard: React.FC<ReviewWorkflowCardProps> = ({
  workflow,
  onViewDetails,
  onAssignReviewer,
  onPerformReview,
  onSignOff,
}) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const engagementTitle =
    typeof workflow.engagement === "string"
      ? "Loading..."
      : (workflow.engagement as Engagement).title;

  const handleViewDetailsClick = () => {
    // Call the prop function if it exists, but also open the local modal
    onViewDetails(workflow._id);
    setIsDetailsModalOpen(true);
  };

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col justify-between h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-md font-semibold">
            {engagementTitle}
          </CardTitle>
          <Badge className={getStatusColor(workflow.status)}>
            {workflow.status.replace(/-/g, " ")}
          </Badge>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-gray-600">
              <span className="font-medium">Item:</span>{" "}
              <span className="capitalize">
                {workflow.itemType.replace(/-/g, " ")}
              </span>
            </p>
            <Badge className={getPriorityColor(workflow.priority)}>
              {workflow.priority}
            </Badge>
          </div>
          <p className="text-gray-600 mb-1">
            <span className="font-medium">Assigned To:</span>{" "}
            {workflow.assignedReviewer || "N/A"}
          </p>
          <p className="text-gray-600 mb-1">
            <span className="font-medium">Created:</span>{" "}
            {format(new Date(workflow.createdAt), "PPP")}
          </p>
          {workflow.assignedAt && (
            <p className="text-gray-600">
              <span className="font-medium">Assigned At:</span>{" "}
              {format(new Date(workflow.assignedAt), "PPP")}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetailsClick}
          >
            View Details
          </Button>
        </CardFooter>
      </div>

      {/* Details Dialog Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="w-full md:min-w-[70vw]">
          <DialogHeader>
            <DialogTitle>Review Workflow Details</DialogTitle>
            <DialogDescription>
              A comprehensive view of the selected review workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="text-sm font-medium">Engagement Title:</p>
              <p className="col-span-2 text-sm">{engagementTitle}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="text-sm font-medium">Status:</p>
              <Badge className={`col-span-2 ${getStatusColor(workflow.status)}`}>
                {workflow.status.replace(/-/g, " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="text-sm font-medium">Item Type:</p>
              <p className="col-span-2 text-sm capitalize">
                {workflow.itemType.replace(/-/g, " ")}
              </p>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="text-sm font-medium">Priority:</p>
              <Badge className={`col-span-2 ${getPriorityColor(workflow.priority)}`}>
                {workflow.priority}
              </Badge>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="text-sm font-medium">Assigned Reviewer:</p>
              <p className="col-span-2 text-sm">{workflow.assignedReviewer || "N/A"}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="text-sm font-medium">Submitted By:</p>
              <p className="col-span-2 text-sm">{workflow.submittedBy || "N/A"}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="text-sm font-medium">Created At:</p>
              <p className="col-span-2 text-sm">
                {format(new Date(workflow.createdAt), "PPPPpp")}
              </p>
            </div>
            {workflow.submittedForReviewAt && (
              <div className="grid grid-cols-3 items-center gap-4">
                <p className="text-sm font-medium">Submitted For Review:</p>
                <p className="col-span-2 text-sm">
                  {format(new Date(workflow.submittedForReviewAt), "PPPPpp")}
                </p>
              </div>
            )}
            {workflow.assignedAt && (
              <div className="grid grid-cols-3 items-center gap-4">
                <p className="text-sm font-medium">Assigned At:</p>
                <p className="col-span-2 text-sm">
                  {format(new Date(workflow.assignedAt), "PPPPpp")}
                </p>
              </div>
            )}
            {workflow.updatedAt && (
              <div className="grid grid-cols-3 items-center gap-4">
                <p className="text-sm font-medium">Last Updated:</p>
                <p className="col-span-2 text-sm">
                  {format(new Date(workflow.updatedAt), "PPPPpp")}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 items-center gap-4">
              <p className="text-sm font-medium">Is Locked:</p>
              <p className="col-span-2 text-sm">{workflow.isLocked ? "Yes" : "No"}</p>
            </div>
            {workflow.tags && workflow.tags.length > 0 && (
              <div className="grid grid-cols-3 items-start gap-4">
                <p className="text-sm font-medium">Tags:</p>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {workflow.tags.map((tag:any, index: number) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {workflow.notes && workflow.notes.length > 0 && (
              <div className="grid grid-cols-3 items-start gap-4">
                <p className="text-sm font-medium">Notes:</p>
                <ul className="col-span-2 text-sm list-disc list-inside">
                  {workflow.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ReviewWorkflowCard;