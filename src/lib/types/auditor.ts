export interface AuditorLog {
  id: string;                  // Unique log ID (UUID or DB ID)
  
  auditorId: string;           // Reference to Auditor entity
  auditorName: string;         // Full name of the auditor
  auditorEmail: string;        // Email of the auditor

  action: string;              // e.g., "LOGIN", "UPLOAD_DOCUMENT", "VIEW_CLIENT_FILE"
  details?: string;            // Additional context about the action

  ipAddress?: string;          // Optional IP for traceability
  location?: string;           // Geo-location (city/country, if resolved)

  timestamp: Date;             // Exact date-time of the event

  deviceInfo?: string;         // Optional: Browser, OS, etc.
  status?: "SUCCESS" | "FAIL"; // Optional: Useful for auth-related logs
}

export interface AuditorLogFilters {
  auditorId?: string;
  action?: string;
  status?: "SUCCESS" | "FAIL";
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface AuditorLogStats {
  totalLogs: number;
  successCount: number;
  failCount: number;
  uniqueAuditors: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
}
