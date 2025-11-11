// @ts-nocheck
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Edit3, Trash2, FileCheck, FileX, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface HistoryEntry {
  _id: string;
  action: "created" | "updated" | "posted" | "unposted" | "deleted" | "reversed";
  timestamp: string;
  userId: string;
  userName: string;
  previousValues?: any;
  newValues?: any;
  metadata?: any;
  description: string;
}

interface ReclassificationHistoryProps {
  history: HistoryEntry[];
  reclassificationNo: string;
  loading?: boolean;
  onBack: () => void;
}

const actionIcons = {
  created: <FileCheck className="h-5 w-5 text-green-600" />,
  updated: <Edit3 className="h-5 w-5 text-blue-600" />,
  posted: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  unposted: <FileX className="h-5 w-5 text-amber-600" />,
  deleted: <Trash2 className="h-5 w-5 text-red-600" />,
  reversed: <FileX className="h-5 w-5 text-red-600" />,
};

const actionColors = {
  created: "bg-green-100 text-green-800 border-green-300",
  updated: "bg-blue-100 text-blue-800 border-blue-300",
  posted: "bg-green-100 text-green-800 border-green-300",
  unposted: "bg-amber-100 text-amber-800 border-amber-300",
  deleted: "bg-red-100 text-red-800 border-red-300",
  reversed: "bg-red-100 text-red-800 border-red-300",
};

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateString;
  }
};

const renderValue = (value: any): string => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

export const ReclassificationHistory: React.FC<ReclassificationHistoryProps> = ({
  history,
  reclassificationNo,
  loading = false,
  onBack,
}) => {
  // Calculate user activity summary
  const userSummary = React.useMemo(() => {
    const users = history.reduce((acc, entry) => {
      const name = entry.userName || "Unknown User";
      if (!acc[name]) {
        acc[name] = { count: 0, actions: [] };
      }
      acc[name].count++;
      acc[name].actions.push(entry.action);
      return acc;
    }, {} as Record<string, { count: number; actions: string[] }>);
    
    return Object.entries(users)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3); // Top 3 contributors
  }, [history]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <CardTitle className="text-xl">
              Reclassification History: {reclassificationNo}
            </CardTitle>
            <CardDescription>
              Complete audit trail of all changes made to this reclassification
            </CardDescription>
            {userSummary.length > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-500">Contributors:</span>
                {userSummary.map(([userName, data], idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {userName} ({data.count})
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No history available for this reclassification</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <Card key={entry._id || index} className="relative">
                <CardContent className="pt-6">
                  {/* Timeline connector */}
                  {index < history.length - 1 && (
                    <div className="absolute left-[29px] top-[60px] bottom-[-16px] w-0.5 bg-gray-200" />
                  )}

                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 z-10 bg-white">
                      {actionIcons[entry.action] || actionIcons.updated}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`${actionColors[entry.action]} font-semibold uppercase text-xs`}
                            >
                              {entry.action}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-gray-400">by</span>
                              <span className="font-semibold text-gray-700">
                                {entry.userName || "Unknown User"}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-gray-700">
                            {entry.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400 whitespace-nowrap block">
                            {formatDate(entry.timestamp)}
                          </span>
                          {entry.userId && entry.userId !== "system" && (
                            <span className="text-xs text-gray-300 block mt-1">
                              ID: {entry.userId.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Changes Details */}
                      {(entry.previousValues || entry.newValues) && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {/* Previous Values */}
                          {entry.previousValues && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-3">
                              <div className="font-semibold text-red-800 mb-2">
                                Previous State:
                              </div>
                              <div className="space-y-1 text-red-700 font-mono">
                                {Object.entries(entry.previousValues).map(
                                  ([key, value]) => (
                                    <div key={key}>
                                      <span className="font-semibold">{key}:</span>{" "}
                                      {renderValue(value)}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* New Values */}
                          {entry.newValues && (
                            <div className="rounded-md bg-green-50 border border-green-200 p-3">
                              <div className="font-semibold text-green-800 mb-2">
                                New State:
                              </div>
                              <div className="space-y-1 text-green-700 font-mono">
                                {Object.entries(entry.newValues).map(
                                  ([key, value]) => (
                                    <div key={key}>
                                      <span className="font-semibold">{key}:</span>{" "}
                                      {renderValue(value)}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                          <div className="font-semibold text-gray-700 text-xs mb-2">
                            Additional Information:
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600">
                            {Object.entries(entry.metadata).map(([key, value]) => {
                              // Highlight user-related fields
                              const isUserField = key.toLowerCase().includes('by') || 
                                                  key.toLowerCase().includes('user');
                              return (
                                <div key={key} className={isUserField ? "col-span-2" : ""}>
                                  <span className={`font-medium ${isUserField ? "text-blue-700" : ""}`}>
                                    {key}:
                                  </span>{" "}
                                  <span className={isUserField ? "font-semibold text-blue-600" : ""}>
                                    {renderValue(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

