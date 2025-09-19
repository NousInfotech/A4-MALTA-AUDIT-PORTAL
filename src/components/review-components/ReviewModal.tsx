// src/components/review-components/ReviewModal.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuditItem, UserRole, ReviewWorkflow } from '@/types/reviews_module'; // Added ReviewWorkflow type for mapping
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UpdateReviewWorkflowFunction } from './EngagementAuditItems'; // Import the type

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: string; // 'submit', 'assign', 'review', 'signoff', 'reopen', 'viewHistory'
  item: AuditItem | null;
  userRole: UserRole;
  onComplete: (updatedAuditItem?: AuditItem) => void; // Expects AuditItem
  engagementId: string; // Required for 'submit' action
  availableReviewers: { id: string; name: string }[]; // For 'assign' action
  updateReviewWorkflow: UpdateReviewWorkflowFunction; // Add this prop
  onViewHistoryRequest?: (workflowId: string, itemName: string) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  action,
  item,
  userRole,
  onComplete,
  engagementId,
  availableReviewers,
  updateReviewWorkflow, // Destructure the prop
  onViewHistoryRequest
}) => {
  const [comments, setComments] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [approved, setApproved] = useState<boolean | null>(null); // For 'review' action
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setComments('');
      setReviewerId('');
      setApproved(null);
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // For 'viewHistory', no form validation needed, it's just a button click
    if (action === 'viewHistory') return true;

    if (!comments.trim()) {
      newErrors.comments = 'Comments are required.';
    }

    if (action === 'assign' && !reviewerId) {
      newErrors.reviewerId = 'Please select a reviewer.';
    }

    if (action === 'review' && approved === null) {
        newErrors.approved = 'Please select Approved or Rejected.';
    }

    if (action === 'reopen' && !comments.trim()) { // comments is the 'reason' for reopen
        newErrors.comments = 'Reopen reason is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Special handling for 'viewHistory'
    if (action === 'viewHistory') {
        if (item?._id && onViewHistoryRequest) {
            onViewHistoryRequest(item._id, item.title);
        }
        onClose(); // Close this modal if history is handled separately
        return; // Exit early
    }

    if (!item) {
        toast.error("No audit item selected for this action.");
        return;
    }

    if (!validateForm()) return;

    setLoading(true);
    let workflowIdToUse = item._id || ''; // Use existing workflow ID if available

    try {
      let payload: any = { comments }; // Base payload includes comments

      switch (action) {
        case 'submit':
          // For 'submit', the item is the actual audit item needing a workflow,
          // so we pass its details and the engagement ID.
          // The `workflowIdToUse` for the `updateReviewWorkflow` call will be empty for a new submission.
          payload = {
            itemType: item.itemType,
            itemId: item._id,
            engagementId: engagementId,
            comments: comments,
            // submittedBy: will be added in updateReviewWorkflow in ReviewDetailsPage
          };
          workflowIdToUse = ''; // Explicitly empty for initial submission
          break;
        case 'assign':
          payload.reviewerId = reviewerId;
          break;
        case 'review':
          payload.approved = approved;
          break;
        case 'signoff':
          // Comments already in payload
          break;
        case 'reopen':
          payload.reason = comments; // For reopen, comments are specifically the reason
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Use the centralized `updateReviewWorkflow` function
      const updatedWorkflow: ReviewWorkflow = await updateReviewWorkflow(workflowIdToUse, action, payload);

      toast.success('Action completed successfully!');
      // Map the returned ReviewWorkflow to an AuditItem structure before calling onComplete
      const updatedAuditItem: AuditItem = {
          _id: updatedWorkflow._id,
          
          itemType: updatedWorkflow.itemType,
          engagement: typeof updatedWorkflow.engagement === 'string' ? updatedWorkflow.engagement : updatedWorkflow.engagement._id,
          title: item.title, // Preserve original item title
          description: item.description, // Preserve original item description
          reviewStatus: updatedWorkflow.status,
          reviewerId: updatedWorkflow.assignedReviewer,
          dueDate: item.dueDate, // Preserve original due date
      };
      onComplete(updatedAuditItem);

    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred.';
      toast.error(errorMessage);
      console.error('Action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    const titles: Record<string, string> = {
      'submit': 'Submit for Review',
      'assign': 'Assign Reviewer',
      'review': 'Review Item',
      'signoff': 'Sign Off',
      'reopen': 'Reopen Item',
      'viewHistory': 'Review History'
    };
    return titles[action] || 'Review Action';
  };

  if (!item && action !== 'viewHistory') return null; // Only render if item is provided or action is viewHistory
  console.log(availableReviewers)
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription>
            {item ? `Item: ${item.title} (${item.itemType})` : 'Perform an action on the audit item.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {action === 'assign' && (
            <div className="grid gap-2">
              <Label htmlFor="reviewer">Select Reviewer</Label>
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger id="reviewer">
                  <SelectValue placeholder="Choose a reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {availableReviewers.map((reviewer) => (
                    <SelectItem key={reviewer.id} value={reviewer.id}>
                      {reviewer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reviewerId && <p className="text-red-500 text-sm">{errors.reviewerId}</p>}
            </div>
          )}

          {action === 'review' && (
            <div className="grid gap-2">
              <Label>Review Decision</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={approved === true ? 'default' : 'outline'}
                  onClick={() => setApproved(true)}
                  className="w-full"
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant={approved === false ? 'destructive' : 'outline'}
                  onClick={() => setApproved(false)}
                  className="w-full"
                >
                  Reject
                </Button>
              </div>
              {errors.approved && <p className="text-red-500 text-sm">{errors.approved}</p>}
            </div>
          )}

          {/* Comments/Reason field - not shown for viewHistory which is handled by a separate modal */}
          {action !== 'viewHistory' && (
            <div className="grid gap-2">
              <Label htmlFor="comments">Comments {action === 'reopen' && '(Reason)'}</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={action === 'reopen' ? 'Provide a reason for reopening...' : 'Add your comments here...'}
                rows={4}
                required
              />
              {errors.comments && <p className="text-red-500 text-sm">{errors.comments}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            {/* The 'viewHistory' action is now handled by directly calling onViewHistoryRequest
                and closing this modal, so it doesn't need a submit button here. */}
            {action !== 'viewHistory' && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing...' : 'Submit'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;