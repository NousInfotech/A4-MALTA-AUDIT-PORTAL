// src/components/audit-workbooks/AuditLogEntryDisplay.tsx
import React, { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns"; // Import for "time ago" formatting
import { getUsernameFromUserId } from "../auth/utils"; // Adjust path as needed
import { AuditLogEntry } from "../../types/audit-workbooks/types"; // Adjust path as needed
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Import Avatar components
import { User as UserIcon } from "lucide-react"; // Renamed to avoid conflict with `User` type

interface AuditLogEntryDisplayProps {
  log: AuditLogEntry & { workbookName?: string };
}

export const AuditLogEntryDisplay: React.FC<AuditLogEntryDisplayProps> = ({
  log,
}) => {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoadingUsername, setIsLoadingUsername] = useState<boolean>(true);
  const [errorUsername, setErrorUsername] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUsername = async () => {
      if (!log.user) {
        if (isMounted) {
          setUsername("Unknown User");
          setIsLoadingUsername(false);
        }
        return;
      }

      setIsLoadingUsername(true);
      setErrorUsername(null);
      try {
        const fetchedUsername = await getUsernameFromUserId(log.user);
        if (isMounted) {
          setUsername(fetchedUsername);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to fetch username:", err);
          setErrorUsername("Failed to load username.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsername(false);
        }
      }
    };

    fetchUsername();

    return () => {
      isMounted = false;
    };
  }, [log.user]); // Dependency: re-fetch if the user ID for this log changes

  // Determine the display name (fetched username or fallback)
  const displayName = isLoadingUsername
    ? "Loading..."
    : errorUsername
    ? "Error"
    : username || "Unknown";

  // Get the first initial for the avatar
  const userInitial = displayName.charAt(0).toUpperCase();

  // Format the timestamp to "X time ago"
  const formattedTime = formatDistanceToNowStrict(new Date(log.timestamp), {
    addSuffix: true,
  });

  // Construct the action message based on your log structure
  // You might need to adjust this based on the exact `log.action` values
  const actionMessage = `${log.action} ${log.workbookName ? `workbook ${log.workbookName}` : ''}`;


  return (
    <div className="flex items-start space-x-3 text-sm">
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-xs">
          {isLoadingUsername ? <UserIcon className="h-4 w-4" /> : userInitial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <p className="text-xs">
          <span className="font-medium">{displayName}</span>{" "}
          {actionMessage}
        </p>
        <p className="text-xs text-gray-500">{formattedTime}</p>
      </div>
    </div>
  );
};