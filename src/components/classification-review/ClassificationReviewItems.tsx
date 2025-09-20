import React, { useState, useEffect, useCallback, useRef } from "react";
import ReviewItemCard from "./ReviewItemCard";
import ReviewModal from "../review-components/ReviewModal";
import ReviewHistory from "../review-components/ReviewHistory";
import ReviewQueue from "../review-components/ReviewQueue";
import { AuditItem, UserRole, CurrentUser } from "@/types/reviews_module";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { toast } from "sonner";

export type UpdateReviewWorkflowFunction = (
  workflowId: string | null,
  action: string,
  payload: any
) => Promise<any>;

interface ClassificationReviewItemsProps {
  engagementId: string | undefined;
  currentUser: CurrentUser;
  availableReviewers: { id: string; name: string }[];

  reviewItems: any;
  setReviewItems: React.Dispatch<React.SetStateAction<AuditItem[]>>;

  refreshReviewItems: () => Promise<any[]>;
  updateReviewWorkflow: UpdateReviewWorkflowFunction;
}

const ClassificationReviewItems: React.FC<ClassificationReviewItemsProps> = ({
  engagementId,
  currentUser,
  availableReviewers,
  reviewItems,
  setReviewItems,
  refreshReviewItems,
  updateReviewWorkflow,
}) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] =
    useState<AuditItem | null>(null);
  const [reviewAction, setReviewAction] = useState("");

  const [showReviewHistory, setShowReviewHistory] = useState(false);
  const [selectedWorkflowIdForHistory, setSelectedWorkflowIdForHistory] =
    useState<string | null>(null);
  const [selectedItemNameForHistory, setSelectedItemNameForHistory] =
    useState<string>("");

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleActionClick = (action: string, item: AuditItem) => {
    if (action === "viewHistory") {
      setSelectedItemNameForHistory(`${item.title} (${item.itemType})`);
      setSelectedWorkflowIdForHistory(item._id);
      setShowReviewHistory(true);
      return;
    }
    setSelectedItemForReview(item);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const handleReviewComplete = async (updatedAuditItem?: AuditItem) => {
    setShowReviewModal(false);
    setIsProcessingAction(false);
    if (updatedAuditItem) {
      toast.success("Review action completed successfully!");
    }
    await refreshReviewItems();
  };

  const handleReviewHistoryClose = () => {
    setShowReviewHistory(false);
    setSelectedWorkflowIdForHistory(null);
    setSelectedItemNameForHistory("");
  };

  const displayTitle = engagementId
    ? `Engagement: ${engagementId}`
    : "All Review Workflows";

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-slate-500">{displayTitle}</h1>

      {["reviewer", "partner", "admin"].includes(currentUser.role) && (
        <section className="mb-8">
          <ReviewQueue
            userRole={currentUser.role}
            userId={currentUser.id}
            onAction={handleActionClick}
            onViewHistory={handleActionClick}
            engagementId={engagementId}
          />
        </section>
      )}

      <section>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Audit Items on Review</CardTitle>
            <Button onClick={refreshReviewItems} disabled={false}>
              Refresh All Items
            </Button>
          </CardHeader>
          <CardContent>
            {reviewItems.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                No audit items found for this engagement.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviewItems.map((item: any) => (
                <ReviewItemCard
                  key={item._id || `${item.itemType}-${item._id}`}
                  item={item}
                  userRole={currentUser.role}
                  onAction={handleActionClick}
                  isLoading={isProcessingAction}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Review Action Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        action={reviewAction}
        item={selectedItemForReview}
        userRole={currentUser.role}
        onComplete={handleReviewComplete}
        engagementId={engagementId}
        availableReviewers={availableReviewers}
        updateReviewWorkflow={updateReviewWorkflow}
        onViewHistoryRequest={(workflowId, itemName) => {
          setShowReviewModal(false);
          setSelectedWorkflowIdForHistory(workflowId);
          setSelectedItemNameForHistory(itemName);
          setShowReviewHistory(true);
        }}
      />

      {/* Review History Modal */}
      <ReviewHistory
        isOpen={showReviewHistory}
        onClose={handleReviewHistoryClose}
        workflowId={selectedWorkflowIdForHistory}
        itemName={selectedItemNameForHistory}
      />
    </div>
  );
};

export default ClassificationReviewItems;
