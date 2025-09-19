import React, { useState, useEffect, useCallback, useRef } from 'react';
import AuditItemCard from './AuditItemCard';
import ReviewModal from './ReviewModal';
import ReviewHistory from './ReviewHistory';
import ReviewQueue from './ReviewQueue';
import { AuditItem, UserRole, CurrentUser } from '@/types/reviews_module';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// Removed Socket.IO client import, as it's now managed by ReviewDetailsPage
import { toast } from 'sonner';

// Define the type for the update workflow function
export type UpdateReviewWorkflowFunction = (
  workflowId: string | null, // workflowId can be null for 'submit' action
  action: string, // e.g., 'assign', 'complete', 'sign-off', 'reopen', 'submit'
  payload: any // The data to send with the update, e.g., { reviewerId: '...' }
) => Promise<any>;

// Define the props for the EngagementAuditItems component
interface EngagementAuditItemsProps {
  engagementId: string | undefined; // Make engagementId optional for 'all workflows' view
  currentUser: CurrentUser;
  availableReviewers: { id: string; name: string }[];
  // auditItems and setAuditItems are now passed from the parent
  auditItems: AuditItem[];
  setAuditItems: React.Dispatch<React.SetStateAction<AuditItem[]>>;
  // The refresh function to trigger a full data re-fetch from the parent
  refreshAuditItems: () => Promise<AuditItem[]>;
  updateReviewWorkflow: UpdateReviewWorkflowFunction;
}

const EngagementAuditItems: React.FC<EngagementAuditItemsProps> = ({
  engagementId,
  currentUser,
  availableReviewers,
  auditItems, // Received as prop
  setAuditItems, // Received as prop
  refreshAuditItems, // Received as prop
  updateReviewWorkflow
}) => {
  // Removed loadingItems and itemsError state, as parent manages main loading/error
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] = useState<AuditItem | null>(null);
  const [reviewAction, setReviewAction] = useState('');

  const [showReviewHistory, setShowReviewHistory] = useState(false);
  const [selectedWorkflowIdForHistory, setSelectedWorkflowIdForHistory] = useState<string | null>(null);
  const [selectedItemNameForHistory, setSelectedItemNameForHistory] = useState<string>('');

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Removed socketRef and refreshTimeoutRef, as they are now in the parent ReviewDetailsPage.

  // The 'refreshAuditItems' prop is already memoized in the parent, no need to re-memoize here.

  // Removed the Socket.IO useEffect from here. Parent will manage connection and pass updates.

  // No longer need a separate useEffect to load audit items as they are passed as a prop
  // The parent's useEffect for data fetching will manage the initial load.
  // The `refreshAuditItems` prop can still be called to force a re-fetch.

  // Handler for clicking action buttons on AuditItemCard
  const handleActionClick = (action: string, item: AuditItem) => {
    if (action === 'viewHistory') {
        setSelectedItemNameForHistory(`${item.title} (${item.itemType})`);
        setSelectedWorkflowIdForHistory(item._id); // Assuming item._id is the workflowId
        setShowReviewHistory(true);
        return;
    }
    setSelectedItemForReview(item);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  // Callback for when a review action is completed in the modal
  const handleReviewComplete = async (updatedAuditItem?: AuditItem) => {
    setShowReviewModal(false);
    setIsProcessingAction(false);
    if (updatedAuditItem) {
        toast.success("Review action completed successfully!");
    }
    await refreshAuditItems(); // Trigger the parent's refresh function
  };

  // Handler for closing the ReviewHistory modal
  const handleReviewHistoryClose = () => {
    setShowReviewHistory(false);
    setSelectedWorkflowIdForHistory(null);
    setSelectedItemNameForHistory('');
  };

  // Determine the display title based on whether engagementId is present
  const displayTitle = engagementId ? `Engagement: ${engagementId}` : 'All Review Workflows';

  // --- Render the component UI ---
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-slate-500">{displayTitle}</h1>

      {/* Review Queue for applicable roles */}
      {['reviewer', 'partner', 'admin'].includes(currentUser.role) && (
        <section className="mb-8">
          <ReviewQueue
            userRole={currentUser.role}
            userId={currentUser.id}
            onAction={handleActionClick}
            onViewHistory={handleActionClick}
            engagementId={engagementId}
            // ReviewQueue might need access to refreshAuditItems or manage its own internal state
            // For now, it will rely on parent's refresh via updateReviewWorkflow completion
            // or if its own actions implicitly trigger the parent's Socket.IO updates.
          />
        </section>
      )}

      {/* All Audit Items Section */}
      <section>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>All Audit Items</CardTitle>
            <Button onClick={refreshAuditItems} disabled={false /* Removed loadingItems check here */}>
              Refresh All Items
            </Button>
          </CardHeader>
          <CardContent>
            {/* Removed loadingItems and itemsError messages as parent handles them */}
            {auditItems.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">No audit items found for this engagement.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auditItems.map((item) => (
                <AuditItemCard
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

export default EngagementAuditItems;