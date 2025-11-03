// src/components/review-components/AuditItemCard.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReviewStatusBadge from './ReviewStatusBadge';
import { UserRole, ReviewStatus } from '@/types/reviews_module';
import { getAvailableActions, cn } from '@/lib/utils'; // Adjust path as needed
import { Clock, User, Calendar, Tag, ChevronRight, CheckCircle, Hourglass, XCircle, AlertCircle } from 'lucide-react'; // Importing icons for better visual cues

interface AuditItemCardProps {
  item: any;
  userRole: UserRole;
  onAction: (action: string, item: any) => void;
  isLoading?: boolean; // To indicate if an action is pending
}

// Custom function to get status-specific styling
const getStatusStyles = (status: ReviewStatus) => {
  switch (status) {
    case 'under-review':
      return {
        badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: <Hourglass className="h-4 w-4 mr-1" />,
        borderColor: 'border-yellow-300 dark:border-yellow-700',
      };
    case 'ready-for-review':
      return {
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: <AlertCircle className="h-4 w-4 mr-1" />,
        borderColor: 'border-blue-300 dark:border-blue-700',
      };
    case 'approved':
      return {
        badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: <CheckCircle className="h-4 w-4 mr-1" />,
        borderColor: 'border-green-300 dark:border-green-700',
      };
    case 'rejected':
      return {
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        icon: <XCircle className="h-4 w-4 mr-1" />,
        borderColor: 'border-red-300 dark:border-red-700',
      };
    case 'in-progress':
        return {
          badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          icon: <Clock className="h-4 w-4 mr-1" />,
          borderColor: 'border-purple-300 dark:border-purple-700',
        };
    default:
      return {
        badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        icon: <Tag className="h-4 w-4 mr-1" />,
        borderColor: 'border-gray-200 dark:border-gray-800',
      };
  }
};


const getButtonClass = (action: string) => {
  switch (action) {
    case 'submit':
      return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md';
    case 'assign':
      return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md';
    case 'review':
      return 'bg-green-600 hover:bg-green-700 text-white shadow-md';
    case 'signoff':
      return 'bg-purple-600 hover:bg-purple-700 text-white shadow-md';
    case 'reopen':
      return 'bg-orange-600 hover:bg-orange-700 text-white shadow-md';
    default:
      return 'bg-brand-hover hover:bg-brand-sidebar text-white dark:bg-gray-600 dark:hover:bg-gray-700 shadow-md';
  }
};

const AuditItemCard: React.FC<AuditItemCardProps> = ({ item, userRole, onAction, isLoading }) => {
  const availableActions = getAvailableActions(item.status, userRole);
  const statusStyles = getStatusStyles(item.status);

  return (
    <Card className={cn(
      "flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg",
      statusStyles.borderColor, // Dynamic border color based on status
      "border-l-4" // Left border accent
    )}>
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-2 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
            {item.itemType.toUpperCase()} Review
          </CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Engagement: <span className="text-gray-800 dark:text-gray-200 font-semibold">{item.engagement.title}</span>
          </CardDescription>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold flex items-center shadow-sm",
          statusStyles.badgeClass
        )}>
          {statusStyles.icon}
          {item.status.replace('-', ' ').toUpperCase()}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
        {item.assignedReviewer && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span>Assigned to: <strong className="text-gray-900 dark:text-gray-100">{item.assignedReviewer}</strong></span>
          </div>
        )}
        {item.engagement.yearEndDate && ( // Use engagement's yearEndDate for due date
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span>Due: <strong className="text-gray-900 dark:text-gray-100">{new Date(item.engagement.yearEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span>Created: {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-brand-hover">
        {availableActions.map((action) => (
          <Button
            key={action.action}
            onClick={() => onAction(action.action, item)}
            className={cn(getButtonClass(action.action), 'h-9 px-4 text-sm font-semibold rounded-md transition-transform transform hover:-translate-y-0.5')}
            disabled={isLoading}
          >
            {action.label}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => onAction('viewHistory', item)} // Custom action to view history
          className="h-9 px-4 text-sm font-semibold rounded-md text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-transform transform hover:-translate-y-0.5"
          disabled={isLoading}
        >
          View History <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuditItemCard;