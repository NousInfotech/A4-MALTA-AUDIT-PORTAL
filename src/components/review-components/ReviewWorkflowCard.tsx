// src/components/ReviewWorkflowCard.tsx
import React from "react";
import { ReviewWorkflow, ReviewStatus, AuditItemType, ReviewPriority, Engagement } from "@/types/reviews_module"; // Import enums and Engagement
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ReviewWorkflowCardProps {
  workflow: ReviewWorkflow;
  onViewDetails: (workflowId: string) => void;
  onAssignReviewer?: (workflowId: string) => void;
  onPerformReview?: (workflowId: string) => void;
  onSignOff?: (workflowId: string) => void;
}

const getStatusColor = (status: ReviewStatus) => { // Use ReviewStatus enum
  switch (status) {
    case ReviewStatus.InProgress: // Changed from "pending" to InProgress
      return "bg-yellow-100 text-yellow-800";
    case ReviewStatus.UnderReview:
      return "bg-blue-100 text-blue-800";
    case ReviewStatus.Approved:
      return "bg-green-100 text-green-800";
    case ReviewStatus.Rejected:
      return "bg-red-100 text-red-800";
    case ReviewStatus.SignedOff:
      return "bg-purple-100 text-purple-800";
    case ReviewStatus.ReOpened: // Changed from "reopened" to ReOpened
      return "bg-orange-100 text-orange-800";
    case ReviewStatus.ReadyForReview: // Added for completeness based on enum
      return "bg-teal-100 text-teal-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: ReviewPriority) => { // Use ReviewPriority enum
  switch (priority) {
    case ReviewPriority.High: // Use enum
      return "bg-red-500 text-white";
    case ReviewPriority.Medium: // Use enum
      return "bg-orange-500 text-white";
    case ReviewPriority.Low: // Use enum
      return "bg-green-500 text-white";
    case ReviewPriority.Critical: // Added for completeness based on enum
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
  // Ensure engagement is an object before trying to access its properties
  // This handles the case where `engagement` might still be an ObjectId string
  const engagementTitle = typeof workflow.engagement === 'string'
    ? 'Loading...' // Or fetch engagement details, or show the ID
    : (workflow.engagement as Engagement).title; // Cast to Engagement if it's not a string

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
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
            <span className="capitalize">{workflow.itemType.replace(/-/g, " ")}</span>
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
          {format(workflow.createdAt, "PPP")} {/* workflow.createdAt is already a Date */}
        </p>
        {workflow.assignedAt && (
          <p className="text-gray-600">
            <span className="font-medium">Assigned At:</span>{" "}
            {format(workflow.assignedAt, "PPP")} {/* workflow.assignedAt is already a Date */}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-4 hidden">
        <Button variant="outline" size="sm" onClick={() => onViewDetails(workflow._id)}>
          View Details
        </Button>
        {/* Conditional actions based on workflow status or user roles */}
        {workflow.status === ReviewStatus.ReadyForReview && onAssignReviewer && ( // Changed from "pending"
          <Button size="sm" onClick={() => onAssignReviewer(workflow._id)}>
            Assign Reviewer
          </Button>
        )}
        {workflow.status === ReviewStatus.UnderReview && onPerformReview && (
          <Button size="sm" onClick={() => onPerformReview(workflow._id)}>
            Perform Review
          </Button>
        )}
        {workflow.status === ReviewStatus.Approved && onSignOff && (
          <Button size="sm" onClick={() => onSignOff(workflow._id)}>
            Sign Off
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ReviewWorkflowCard;