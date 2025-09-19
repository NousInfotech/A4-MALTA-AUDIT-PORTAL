// src/components/review-components/ReviewStatusBadge.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge'; // Adjust path as needed
import { ReviewStatus } from '@/types/reviews_module';
import { getStatusColorClass } from '@/lib/utils'; // Adjust path as needed

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
}

const ReviewStatusBadge: React.FC<ReviewStatusBadgeProps> = ({ status }) => {
  const statusClass = getStatusColorClass(status);

  return (
    <Badge className={`px-2 py-1 rounded-md text-xs font-semibold ${statusClass}`}>
      {status.replace('-', ' ').toUpperCase()}
    </Badge>
  );
};

export default ReviewStatusBadge;