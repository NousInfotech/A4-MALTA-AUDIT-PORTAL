// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserRole, ReviewStatus } from '@/types/reviews_module';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStatusColorClass = (status: ReviewStatus): string => {
  const colors: Record<ReviewStatus, string> = {
    'in-progress': 'bg-yellow-100 text-yellow-800', // Yellow
    'ready-for-review': 'bg-blue-100 text-blue-800', // Blue
    'under-review': 'bg-orange-100 text-orange-800', // Orange (changed from 'warning' for consistency)
    'approved': 'bg-green-100 text-green-800', // Green
    'rejected': 'bg-red-100 text-red-800', // Red
    'signed-off': 'bg-purple-100 text-purple-800', // Purple (changed from 'gray' for consistency)
    're-opened': 'bg-yellow-100 text-yellow-800', // Yellow
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Frontend Permission Checks (from documentation)
export const canSubmitForReview = (userRole: UserRole) => {
  return ['employee', 'reviewer', 'partner', 'admin'].includes(userRole);
};

export const canReview = (userRole: UserRole) => {
  return ['employee', 'reviewer', 'partner', 'admin'].includes(userRole);
};

export const canSignOff = (userRole: UserRole) => {
  return ['employee', 'reviewer', 'partner', 'admin'].includes(userRole);
};

export const canReopen = (userRole: UserRole) => {
  return ['employee', 'reviewer', 'partner', 'admin'].includes(userRole);
};

// Get available actions based on status and role
export const getAvailableActions = (status: ReviewStatus, userRole: UserRole) => {
  const actions: { label: string; action: string }[] = [];

  if (status === 'in-progress' && canSubmitForReview(userRole)) {
    actions.push({ label: 'Submit for Review', action: 'submit' });
  }

  if (status === 'ready-for-review' && canReview(userRole)) {
    actions.push({ label: 'Assign Reviewer', action: 'assign' });
  }

  if (status === 'under-review' && canReview(userRole)) {
    actions.push({ label: 'Review', action: 'review' });
  }

  if (status === 'approved' && canSignOff(userRole)) {
    actions.push({ label: 'Sign Off', action: 'signoff' });
  }

  if (status === 'signed-off' && canReopen(userRole)) {
    actions.push({ label: 'Reopen', action: 'reopen' });
  }
  // If rejected, allow employee/admin/reviewer/partner to resubmit
  if (status === 'rejected' && canSubmitForReview(userRole)) {
    actions.push({ label: 'Resubmit for Review', action: 'submit' });
  }

  return actions;
};
