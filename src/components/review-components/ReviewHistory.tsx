// src/components/review-components/ReviewHistory.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ReviewHistoryEntry } from '@/types/reviews_module';
import { getReviewHistory } from '@/lib/api/review-api'; // Adjust path as needed
import { cn } from '@/lib/utils'; // Adjust path as needed

interface ReviewHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string | null;
  itemName: string; // Title of the item for context
}

const getActionIcon = (action: string) => {
  const icons: Record<string, string> = {
    'submitted-for-review': '📤',
    'assigned-reviewer': '👤',
    'review-approved': '✅',
    'review-rejected': '❌',
    'signed-off': '🔒',
    'reopened': '🔓',
    // Add more actions as needed from your backend
  };
  return icons[action] || '📝'; // Default icon
};

const ReviewHistory: React.FC<ReviewHistoryProps> = ({ isOpen, onClose, workflowId, itemName }) => {
  const [history, setHistory] = useState<ReviewHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!workflowId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getReviewHistory(workflowId);
      if (response.success && response.history) {
        setHistory(response.history);
      } else {
        setError(response.message || 'Failed to fetch review history.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (isOpen && workflowId) {
      fetchHistory();
    } else if (!isOpen) {
      setHistory([]); // Clear history when modal closes
    }
  }, [isOpen, workflowId, fetchHistory]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[70vw] min-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review History</DialogTitle>
          <DialogDescription>
            Audit trail for: <span className="font-semibold">{itemName}</span>
          </DialogDescription>
        </DialogHeader>

        {loading && <div className="p-4 text-center">Loading history...</div>}
        {error && <div className="p-4 text-center text-red-600">Error: {error}</div>}

        {!loading && !error && history.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">No review history found for this item.</div>
        )}

        {!loading && !error && history.length > 0 && (
          <ScrollArea className="flex-grow max-h-[60vh] pr-4 py-2">
            <div className="relative pl-6">
              {/* Timeline vertical line */}
              <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {history.map((entry, index) => (
                <div key={entry._id} className="relative mb-6 pb-2">
                  {/* Timeline marker */}
                  <div className="absolute left-0 top-0 -ml-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white z-10">
                    <span className="text-xs">{getActionIcon(entry.action)}</span>
                  </div>

                  <div className="ml-6 flex flex-col">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-semibold text-sm capitalize">
                        {entry.action.replace(/-/g, ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.performedAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Performed by:</strong> {entry.performedBy || 'N/A'}
                    </p>

                    {entry.previousStatus && entry.newStatus && (
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Status:</strong>{' '}
                        <span className="font-medium text-gray-700">{entry.previousStatus}</span> →{' '}
                        <span className={cn(
                            'font-medium',
                            entry.newStatus === 'approved' && 'text-green-600',
                            entry.newStatus === 'rejected' && 'text-red-600',
                            entry.newStatus === 'signed-off' && 'text-purple-600',
                            entry.newStatus === 're-opened' && 'text-yellow-600',
                        )}>
                            {entry.newStatus}
                        </span>
                      </p>
                    )}

                    {entry.comments && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong className="text-foreground">Comments:</strong> {entry.comments}
                      </p>
                    )}
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                            <strong className="text-foreground">Metadata:</strong> {JSON.stringify(entry.metadata)}
                        </p>
                    )}
                  </div>
                  {index < history.length - 1 && <Separator className="ml-6 mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewHistory;