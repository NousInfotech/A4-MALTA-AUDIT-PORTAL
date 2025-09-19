// src/components/review-components/AuditItemCard.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReviewStatusBadge from './ReviewStatusBadge';
import { AuditItem, UserRole, ReviewStatus } from '@/types/reviews_module';
import { getAvailableActions, cn } from '@/lib/utils'; // Adjust path as needed

interface AuditItemCardProps {
  item: AuditItem;
  userRole: UserRole;
  onAction: (action: string, item: AuditItem) => void;
  isLoading?: boolean; // To indicate if an action is pending
}

const getButtonClass = (action: string) => {
  switch (action) {
    case 'submit':
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    case 'assign':
      return 'bg-gray-600 hover:bg-gray-700 text-white';
    case 'review':
      return 'bg-green-600 hover:bg-green-700 text-white';
    case 'signoff':
      return 'bg-purple-600 hover:bg-purple-700 text-white';
    case 'reopen':
      return 'bg-orange-600 hover:bg-orange-700 text-white';
    default:
      return 'bg-primary hover:bg-primary/90 text-white';
  }
};

const AuditItemCard: React.FC<AuditItemCardProps> = ({ item, userRole, onAction, isLoading }) => {
  const availableActions = getAvailableActions(item.reviewStatus, userRole);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{item.title}</CardTitle>
        <ReviewStatusBadge status={item.reviewStatus} />
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="mb-2">{item.description}</CardDescription>
        {item.reviewerId && (
          <div className="text-sm text-muted-foreground">
            <span>Assigned to: <strong>{item.reviewerName || item.reviewerId}</strong></span>
          </div>
        )}
        {item.dueDate && (
          <div className="text-sm text-muted-foreground">
            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-4 border-t">
        {availableActions.map((action) => (
          <Button
            key={action.action}
            onClick={() => onAction(action.action, item)}
            className={cn(getButtonClass(action.action), 'h-8 px-3 text-xs')}
            disabled={isLoading}
          >
            {action.label}
          </Button>
        ))}
        {/* Potentially add a "View History" button here */}
        <Button
          variant="outline"
          onClick={() => onAction('viewHistory', item)} // Custom action to view history
          className="h-8 px-3 text-xs"
          disabled={isLoading}
        >
          View History
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuditItemCard;