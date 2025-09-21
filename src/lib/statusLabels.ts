/**
 * Status label mappings for user-friendly display
 */

export const PBC_STATUS_LABELS = {
  'document-collection': 'Document Collection',
  'qna-preparation': 'Document Evidence Preparation',
  'client-responses': 'Client Responses',
  'doubt-resolution': 'Doubt Resolution',
  'submitted': 'Submitted',
  // Backend status mappings (case variations)
  'pbc-data-collection': 'Document Collection',
  'Pbc-data-collection': 'Document Collection',
  'pbc-qna-preparation': 'Document Evidence Preparation',
  'Pbc-qna-preparation': 'Document Evidence Preparation',
} as const;

export const ENGAGEMENT_STATUS_LABELS = {
  'active': 'Active',
  'completed': 'Completed',
  'draft': 'Draft',
  'pending': 'Pending',
} as const;

/**
 * Get user-friendly label for PBC status
 */
export function getPBCStatusLabel(status: string): string {
  // First try exact match
  if (PBC_STATUS_LABELS[status as keyof typeof PBC_STATUS_LABELS]) {
    return PBC_STATUS_LABELS[status as keyof typeof PBC_STATUS_LABELS];
  }
  
  // Try case-insensitive match
  const lowerStatus = status.toLowerCase();
  for (const [key, value] of Object.entries(PBC_STATUS_LABELS)) {
    if (key.toLowerCase() === lowerStatus) {
      return value;
    }
  }
  
  // Fallback to formatted version
  return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Get user-friendly label for engagement status
 */
export function getEngagementStatusLabel(status: string): string {
  return ENGAGEMENT_STATUS_LABELS[status as keyof typeof ENGAGEMENT_STATUS_LABELS] || 
         status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Get user-friendly label for any status (tries both mappings)
 */
export function getStatusLabel(status: string): string {
  return getPBCStatusLabel(status) || getEngagementStatusLabel(status);
}
