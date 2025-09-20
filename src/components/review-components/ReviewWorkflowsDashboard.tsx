// src/components/ReviewWorkflowsDashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ReviewWorkflow,
  ReviewWorkflowFilters,
} from "@/types/reviews_module";
import { getAllReviewWorkflows, GetAllReviewers, GetEngagements } from "@/lib/api/review-api"; // Import GetEngagements
import ReviewWorkflowCard from "./ReviewWorkflowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Keep Input if you use it elsewhere, otherwise remove
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

import { Loader } from "lucide-react";

const reviewStatuses = [
  "pending",
  "under-review",
  "approved",
  "rejected",
  "signed-off",
  "reopened",
];

// Define a type for your engagement data, adjust as per your actual engagement structure
interface Engagement {
  _id: string;
  title: string;
  // Add other properties if needed
}

interface ReviewWorkflowsDashboardProps {
  // Any props for the dashboard itself, e.g., initial filters
}

const ReviewWorkflowsDashboard: React.FC<
  ReviewWorkflowsDashboardProps
> = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReviewWorkflowFilters>({
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState(null);
  const [reviewers, setReviewers] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [engagements, setEngagements] = useState<Engagement[]>([]); // New state for engagements

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllReviewWorkflows(filters);
      if (response.success && response.workflows) {
        setWorkflows(response.workflows);
        console.log("review workflows", response.workflows)
        setPagination(response.pagination || null);
      } else {
        setError(response.message || "Failed to fetch workflows.");
        setWorkflows([]);
        setPagination(null);
      }
    } catch (err) {
      console.error("Error fetching review workflows:", err);
      setError("An unexpected error occurred while fetching workflows.");
      setWorkflows([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchReviewers = useCallback(async () => {
    try {
      const response = await GetAllReviewers();
      if (response.success && response.users) {
        setReviewers(
          response.users.map((user: any) => ({
            _id: user._id,
            name: user.name || user.email,
          }))
        );
      } else {
        console.error("Failed to fetch reviewers:", response.message);
      }
    } catch (err) {
      console.error("Error fetching reviewers:", err);
    }
  }, []);

  // New useCallback to fetch engagements
  const fetchEngagements = useCallback(async () => {
    try {
      const response = await GetEngagements();
      console.log("engagements",response)
      if (response) { 
        setEngagements(response);
      } else {
        console.error("Failed to fetch engagements:", response.message);
      }
    } catch (err) {
      console.error("Error fetching engagements:", err);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    fetchReviewers();
  }, [fetchReviewers]);

  // Call fetchEngagements on component mount
  useEffect(() => {
    fetchEngagements();
  }, [fetchEngagements]);


  const handleFilterChange = (key: keyof ReviewWorkflowFilters, value: any) => {
    // Special handling for "all" values in select filters
    if (key === "status" && value === "all") {
      setFilters((prev) => {
        const newFilters = { ...prev, page: 1 };
        delete newFilters.status; // Remove the status filter
        return newFilters;
      });
    } else if (key === "assignedReviewer" && value === "all") {
      setFilters((prev) => {
        const newFilters = { ...prev, page: 1 };
        delete newFilters.assignedReviewer; // Remove the assignedReviewer filter
        return newFilters;
      });
    } else if (key === "engagementId" && value === "all") { // New: Handle "all" for engagementId
        setFilters((prev) => {
            const newFilters = { ...prev, page: 1 };
            delete newFilters.engagementId; // Remove the engagementId filter
            return newFilters;
        });
    }
    else {
      setFilters((prev) => ({ ...prev, [key]: value, page: 1 })); // Reset to first page on filter change
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleRefresh = () => {
    setFilters({ page: 1, limit: 10 }); // Reset filters and refetch
    // Re-fetch all data after a refresh
    fetchWorkflows();
    fetchReviewers();
    fetchEngagements();
  };

  const handleViewDetails = (workflowId: string) => {
    console.log("View details for workflow:", workflowId);
    // Implement navigation or modal display for workflow details
    // router.push(`/reviews/workflow/${workflowId}`);
  };

  const handleAssignReviewer = (workflowId: string) => {
    console.log("Assign reviewer for workflow:", workflowId);
    // Implement assign reviewer logic (e.g., open a dialog)
  };

  const handlePerformReview = (workflowId: string) => {
    console.log("Perform review for workflow:", workflowId);
    // Implement perform review logic (e.g., open a dialog)
  };

  const handleSignOff = (workflowId: string) => {
    console.log("Sign off for workflow:", workflowId);
    // Implement sign off logic (e.g., open a confirmation dialog)
  };

  return (
    <div className="p-6 bg-gray-300 rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Review Workflows</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        {/* Replaced Input with Select for Engagement Title */}
        <Select
          value={filters.engagementId || "all"} // Default to "all" if no engagementId is filtered
          onValueChange={(value) => handleFilterChange("engagementId", value)}
        >
          <SelectTrigger className="w-[200px]"> {/* Adjusted width */}
            <SelectValue placeholder="Filter by Engagement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engagements</SelectItem> {/* Use "all" as value */}
            {engagements.map((engagement) => (
              <SelectItem key={engagement._id} value={engagement._id}>
                {engagement.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>


        <Select
          value={filters.status || "all"}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {reviewStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace(/-/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.assignedReviewer || "all"}
          onValueChange={(value) => handleFilterChange("assignedReviewer", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Reviewer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviewers</SelectItem>
            {reviewers.map((reviewer, index) => (
              <SelectItem key={index} value={reviewer._id}>
                {reviewer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleRefresh} variant="outline">
          {loading ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Refresh"
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: filters.limit || 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
          ))}
        </div>
      )}

      {!loading && workflows.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No review workflows found matching your criteria.
        </div>
      )}

      {!loading && workflows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <ReviewWorkflowCard
                key={workflow._id}
                workflow={workflow}
                onViewDetails={handleViewDetails}
                onAssignReviewer={handleAssignReviewer}
                onPerformReview={handlePerformReview}
                onSignOff={handleSignOff}
              />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <ShadcnPagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (pagination.hasPrevPage)
                        handlePageChange(pagination.currentPage - 1);
                    }}
                    className={
                      !pagination.hasPrevPage
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
                {Array.from({ length: pagination.totalPages }, (_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={i + 1 === pagination.currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(i + 1);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (pagination.hasNextPage)
                        handlePageChange(pagination.currentPage + 1);
                    }}
                    className={
                      !pagination.hasNextPage
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </ShadcnPagination>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewWorkflowsDashboard;