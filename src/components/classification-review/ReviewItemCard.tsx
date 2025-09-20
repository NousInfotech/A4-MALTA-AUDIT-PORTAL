// src/components/review-components/ReviewItemCard.tsx
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserRole, ReviewStatus } from "@/types/reviews_module";
import { getAvailableActions, cn } from "@/lib/utils"; // Adjust path as needed
import {
  Clock,
  User,
  Calendar,
  Tag,
  ChevronRight,
  CheckCircle,
  Hourglass,
  XCircle,
  AlertCircle,
} from "lucide-react"; // Importing icons for better visual cues
import { format } from "date-fns";

interface ReviewItemCardProps {
  item: any;
  userRole: UserRole;
  onAction: (action: string, item: any) => void;
  isLoading?: boolean; // To indicate if an action is pending
}

// Custom function to get status-specific styling
const getStatusStyles = (status: ReviewStatus) => {
  switch (status) {
    case "under-review":
      return {
        badgeClass:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        icon: <Hourglass className="h-4 w-4 mr-1" />,
        borderColor: "border-yellow-300 dark:border-yellow-700",
      };
    case "ready-for-review":
      return {
        badgeClass:
          "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: <AlertCircle className="h-4 w-4 mr-1" />,
        borderColor: "border-blue-300 dark:border-blue-700",
      };
    case "approved":
      return {
        badgeClass:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: <CheckCircle className="h-4 w-4 mr-1" />,
        borderColor: "border-green-300 dark:border-green-700",
      };
    case "rejected":
      return {
        badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: <XCircle className="h-4 w-4 mr-1" />,
        borderColor: "border-red-300 dark:border-red-700",
      };
    case "in-progress":
      return {
        badgeClass:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        icon: <Clock className="h-4 w-4 mr-1" />,
        borderColor: "border-purple-300 dark:border-purple-700",
      };
    default:
      return {
        badgeClass:
          "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
        icon: <Tag className="h-4 w-4 mr-1" />,
        borderColor: "border-gray-200 dark:border-gray-800",
      };
  }
};

const getButtonClass = (action: string) => {
  switch (action) {
    case "submit":
      return "bg-blue-600 hover:bg-blue-700 text-white shadow-md";
    case "assign":
      return "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md";
    case "review":
      return "bg-green-600 hover:bg-green-700 text-white shadow-md";
    case "signoff":
      return "bg-purple-600 hover:bg-purple-700 text-white shadow-md";
    case "reopen":
      return "bg-orange-600 hover:bg-orange-700 text-white shadow-md";
    default:
      return "bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-600 dark:hover:bg-gray-700 shadow-md";
  }
};

const ReviewItemCard: React.FC<ReviewItemCardProps> = ({
  item,
  userRole,
  onAction,
  isLoading,
}) => {
  const availableActions = getAvailableActions(item.status, userRole);
  const statusStyles = getStatusStyles(item.status);

  return (
    <Card
      className={cn(
        "flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg justify-between",
        statusStyles.borderColor, // Dynamic border color based on status
        "border-l-4" // Left border accent
      )}
    >
      <CardHeader>
        <CardTitle className="text-lg">
          {item.itemType
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l:any) => l.toUpperCase())}{" "}
          - {item.itemId}
        </CardTitle>
        <CardDescription>
          Engagement: {item.engagement.title} (ID: {item.engagement.id})
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={`font-semibold ${
              item.status === "under-review"
                ? "text-blue-600"
                : item.status === "ready-for-review"
                ? "text-yellow-600"
                : "text-gray-600"
            }`}
          >
            {item.status
              .replace(/-/g, " ")
              .replace(/\b\w/g, (l:any) => l.toUpperCase())}
          </span>
        </p>
        <p>
          <strong>Priority:</strong>{" "}
          <span
            className={`font-semibold ${
              item.priority === "high"
                ? "text-red-600"
                : item.priority === "medium"
                ? "text-orange-600"
                : "text-green-600"
            }`}
          >
            {item.priority.replace(/\b\w/g, (l:any) => l.toUpperCase())}
          </span>
        </p>
        <p>
          <strong>Submitted:</strong>{" "}
          {format(new Date(item.submittedForReviewAt), "MMM dd, yyyy HH:mm")}
        </p>
        {item.assignedReviewer && (
          <p>
            <strong>Assigned To:</strong> {item.assignedReviewer} (at{" "}
            {format(new Date(item.assignedAt), "MMM dd, yyyy HH:mm")})
          </p>
        )}
        {item.notes && item.notes.length > 0 && (
          <p>
            <strong>Latest Note:</strong>{" "}
            {item.notes[item.notes.length - 1].comment}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {availableActions.map((action) => (
          <Button
            key={action.action}
            onClick={() => onAction(action.action, item)}
            className={cn(
              getButtonClass(action.action),
              "h-9 px-4 text-sm font-semibold rounded-md transition-transform transform hover:-translate-y-0.5"
            )}
            disabled={isLoading}
          >
            {action.label}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => onAction("viewHistory", item)} // Custom action to view history
          className="h-9 px-4 text-sm font-semibold rounded-md text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-transform transform hover:-translate-y-0.5"
          disabled={isLoading}
        >
          View History <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ReviewItemCard;
