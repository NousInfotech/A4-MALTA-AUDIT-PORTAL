// @ts-nocheck
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Download,
  Save,
  X,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
  FileText,
  CheckCircle,
  Edit,
  Sparkles,
  Trash2 as TrashIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";

// NEW: floating notes + notebook
import FloatingNotesButton from "./FloatingNotesButton";
import NotebookInterface from "./NotebookInterface";

// -------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 9);
const withUids = (procedures: any[]) =>
  (Array.isArray(procedures) ? procedures : []).map((sec: any) => ({
    ...sec,
    fields: (sec?.fields || []).map((f: any) => ({
      __uid: f.__uid || uid(),
      ...f,
    })),
  }));

const normalizeType = (t?: string) => {
  const v = String(t || "").toLowerCase();
  if (v === "textfield") return "text";
  if (v === "selection") return "select";
  return v;
};

// Ensure recommendations are tagged to a section so they render in the right place
const assignSectionToRecommendations = (recs: any[], procedures: any[]) => {
  const defaultSectionId =
    procedures?.[0]?.sectionId || procedures?.[0]?.id || "general";
  return (Array.isArray(recs) ? recs : []).map((rec) => {
    const recSection = rec?.section || rec?.sectionId;
    if (recSection) return rec;
    return { ...rec, section: defaultSectionId };
  });
};

// Normalize API recommendation payloads (array or section-keyed object) and tag with section
const normalizeRecommendations = (incoming: any, sectionId: string) => {
  if (!incoming) return [];
  // If it's a JSON string, try parsing first
  if (typeof incoming === "string") {
    try {
      const parsed = JSON.parse(incoming);
      return normalizeRecommendations(parsed, sectionId);
    } catch {
      // Treat as a single-line rec string
      return [
        {
          id: `rec-${Date.now()}`,
          text: incoming.trim(),
          checked: false,
          section: sectionId,
        },
      ];
    }
  }
  // Already an array
  if (Array.isArray(incoming)) {
    return incoming.map((rec: any, idx: number) => {
      if (typeof rec === "string") {
        return {
          id: `rec-${Date.now()}-${idx}`,
          text: rec.trim(),
          checked: false,
          section: sectionId,
        };
      }
      return {
        ...rec,
        id: rec.id || rec.__uid || `rec-${Date.now()}-${idx}`,
        section: rec.section || rec.sectionId || sectionId,
      };
    });
  }
  // Object keyed by section names (e.g., section1..section6)
  if (typeof incoming === "object") {
    const collected: any[] = [];
    Object.values(incoming).forEach((arr: any, idxOuter: number) => {
      if (Array.isArray(arr)) {
        arr.forEach((rec: any, idxInner: number) => {
          if (typeof rec === "string") {
            collected.push({
              id: `rec-${Date.now()}-${idxOuter}-${idxInner}`,
              text: rec.trim(),
              checked: false,
              section: sectionId,
            });
          } else {
            collected.push({
              ...rec,
              id:
                rec.id ||
                rec.__uid ||
                `rec-${Date.now()}-${idxOuter}-${idxInner}`,
              section: rec.section || rec.sectionId || sectionId,
            });
          }
        });
      }
    });
    return collected;
  }
  return [];
};

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;

  // Don't set Content-Type for FormData - let browser set it with boundary
  const isFormData = options.body instanceof FormData;
  const existingHeaders = (options.headers || {}) as Record<string, string>;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...existingHeaders,
  };

  // Only set Content-Type if not FormData and not already explicitly set
  if (!isFormData && !existingHeaders["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  } else if (isFormData) {
    // Remove Content-Type for FormData to let browser set it with boundary
    delete headers["Content-Type"];
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-muted-foreground">{children}</div>
  );
}

function MultiSelectEditor({
  field,
  onChange,
}: {
  field: any;
  onChange: (v: any) => void;
}) {
  const valueArray = Array.isArray(field.answer) ? field.answer : [];
  const opts = Array.isArray(field.options) ? field.options : [];
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((opt) => {
        const checked = valueArray.includes(opt);
        return (
          <label
            key={opt}
            className="flex items-center gap-2 border rounded px-2 py-1"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(ck) => {
                if (!!ck) onChange([...valueArray, opt]);
                else onChange(valueArray.filter((x: string) => x !== opt));
              }}
            />
            <span className="text-sm">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function SelectEditor({
  field,
  onChange,
}: {
  field: any;
  onChange: (v: any) => void;
}) {
  const opts = Array.isArray(field.options) ? field.options : [];
  const value = typeof field.answer === "string" ? field.answer : "";
  return (
    <select
      className="w-full border rounded px-3 py-2 bg-background"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Select…
      </option>
      {opts.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

/** Pretty table (read-only) */
function TableDisplay({ columns, rows }: { columns?: string[]; rows?: any[] }) {
  const cols = Array.isArray(columns) && columns.length ? columns : [];
  const data = Array.isArray(rows) ? rows : [];
  if (!cols.length)
    return (
      <div className="text-sm text-muted-foreground">No columns defined.</div>
    );
  if (!data.length)
    return <div className="text-sm text-muted-foreground">No rows.</div>;
  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, idx: number) => (
            <tr key={idx} className="border-t">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2">
                  {String(row?.[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Editable table with Add/Remove row controls */
function TableEditor({
  columns,
  value,
  onChange,
}: {
  columns?: string[];
  value?: any[];
  onChange: (rows: any[]) => void;
}) {
  const cols = Array.isArray(columns) ? columns : [];
  const rows = Array.isArray(value) ? value : [];

  const addRow = () => {
    const empty: any = {};
    cols.forEach((c) => {
      empty[c] = "";
    });
    onChange([...(rows || []), empty]);
  };

  const removeRow = (idx: number) => {
    const next = [...rows];
    next.splice(idx, 1);
    onChange(next);
  };

  const updateCell = (idx: number, col: string, cellVal: string) => {
    const next = [...rows];
    const r = { ...(next[idx] || {}) };
    r[col] = cellVal;
    next[idx] = r;
    onChange(next);
  };

  if (!cols.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No columns defined for this table.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-medium">
                  {c}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-t">
                <td
                  className="px-3 py-2 text-muted-foreground"
                  colSpan={cols.length + 1}
                >
                  No rows. Click "Add row".
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-t">
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2">
                      <Input
                        value={String(row?.[c] ?? "")}
                        onChange={(e) => updateCell(rIdx, c, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRow(rIdx)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="outline" onClick={addRow}>
        + Add row
      </Button>
    </div>
  );
}

/** -------- visibleIf (same logic used in steps) ---------- */
function isNotEmpty(val: any) {
  if (val === null || val === undefined) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return String(val).trim() !== "";
}

function evaluateCondition(
  fieldValue: any,
  cond: { operator?: string; value?: any }
) {
  const op = cond?.operator;
  const v = cond?.value;
  if (!op) return Array.isArray(v) ? v.includes(fieldValue) : fieldValue === v;
  switch (op) {
    case "not_empty":
      return isNotEmpty(fieldValue);
    case ">=":
      return Number(fieldValue ?? 0) >= Number(v);
    case "<=":
      return Number(fieldValue ?? 0) <= Number(v);
    case ">":
      return Number(fieldValue ?? 0) > Number(v);
    case "<":
      return Number(fieldValue ?? 0) < Number(v);
    case "any":
      if (Array.isArray(fieldValue))
        return fieldValue.some((x) => (v as string[]).includes(x));
      if (typeof fieldValue === "object" && fieldValue !== null)
        return Object.keys(fieldValue).some(
          (k) => fieldValue[k] && (v as string[]).includes(k)
        );
      return false;
    default:
      return Array.isArray(v) ? v.includes(fieldValue) : fieldValue === v;
  }
}

function isFieldVisible(field: any, answersMap: Record<string, any>) {
  if (!field.visibleIf) return true;
  const clauses = field.visibleIf as any;
  return Object.entries(clauses).every(([depKey, requirement]) => {
    const depVal = answersMap[depKey];
    if (Array.isArray(requirement)) {
      if (
        requirement.length > 0 &&
        typeof requirement[0] === "object" &&
        "operator" in requirement[0]
      ) {
        return (requirement as any[]).every((cond) =>
          evaluateCondition(depVal, cond)
        );
      }
      return (requirement as any[]).includes(depVal);
    }
    return requirement === depVal;
  });
}

export const PlanningProcedureView: React.FC<{
  procedure: any;
  engagement?: any;
  onProcedureUpdate?: (updatedProcedure: any) => void;
}> = ({ procedure: initial, engagement, onProcedureUpdate }) => {
  const [editMode, setEditMode] = useState(false);
  const [proc, setProc] = useState<any>(() => {
    const initialWithUids = { ...(initial || {}) };
    initialWithUids.procedures = withUids(initialWithUids.procedures || []);
    return initialWithUids;
  });
  // Track which questions are in "pending" state (newly added, not yet confirmed)
  const [pendingQuestions, setPendingQuestions] = useState<Set<string>>(
    new Set()
  );
  // Track active tab for each section
  const [sectionTabs, setSectionTabs] = useState<Record<string, string>>({});
  const [proceduresViewMode, setProceduresViewMode] = useState<
    Record<string, "procedures" | "reviews">
  >({});
  // Track editing question IDs
  const [editingQuestionIds, setEditingQuestionIds] = useState<
    Record<string, string>
  >({});
  const [editQuestionTexts, setEditQuestionTexts] = useState<
    Record<string, string>
  >({});

  // NEW: notes state + modal flag
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  // Fix: Initialize recommendations properly as checklist items array
  const [recommendations, setRecommendations] = useState<any[]>(() => {
    const recs = initial?.recommendations || [];
    let normalized: any[] = [];
    // Ensure we always have an array of checklist items
    if (Array.isArray(recs)) {
      normalized = recs;
    } else if (typeof recs === "string") {
      // If it's a string, try to parse it or convert to empty array
      try {
        const parsed = JSON.parse(recs);
        normalized = Array.isArray(parsed) ? parsed : [];
      } catch {
        normalized = [];
      }
    }
    return assignSectionToRecommendations(
      normalized,
      initial?.procedures || []
    );
  });

  // Edit recommendation state
  const [editingRecommendationId, setEditingRecommendationId] = useState<string | null>(null);
  const [editRecommendationText, setEditRecommendationText] = useState("");

  // Add useEffect to update proc when initial prop changes
  useEffect(() => {
    if (initial) {
      const initialWithUids = { ...(initial || {}) };
      initialWithUids.procedures = withUids(initialWithUids.procedures || []);
      setProc(initialWithUids);
    }
  }, [initial]);

  // Add useEffect to update recommendations when initial prop changes
  // Only update if recommendations actually exist in initial, don't clear if we have local recommendations
  useEffect(() => {
    if (initial?.recommendations !== undefined) {
      const recs = initial.recommendations;
      if (Array.isArray(recs) && recs.length > 0) {
        setRecommendations(
          assignSectionToRecommendations(
            recs,
            initial?.procedures || proc?.procedures || []
          )
        );
      } else if (typeof recs === "string" && recs.trim()) {
        try {
          const parsed = JSON.parse(recs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecommendations(
              assignSectionToRecommendations(
                parsed,
                initial?.procedures || proc?.procedures || []
              )
            );
          }
        } catch {
          // If it's not JSON, try splitting by newlines
          const lines = recs.split("\n").filter((l: string) => l.trim());
          if (lines.length > 0) {
            setRecommendations(
              assignSectionToRecommendations(
                lines.map((text: string, idx: number) => ({
              id: `rec-${Date.now()}-${idx}`,
              text: text.trim(),
              checked: false,
                })),
                initial?.procedures || proc?.procedures || []
              )
            );
          }
        }
      }
      // Don't clear recommendations if initial.recommendations is empty/undefined
      // This preserves locally generated recommendations
    }
  }, [initial?._id]); // Only update when procedure ID changes, not on every recommendations change
  // NEW: handle save of notebook notes
  const handleSaveRecommendations = async (content: string | any[]) => {
    try {
      let recommendationsToSave: any[];

      // Handle both string and array formats from NotebookInterface
      if (Array.isArray(content)) {
        // Preserve section tags from existing recommendations
        recommendationsToSave = content.map((rec: any) => {
          // If it's already an object with section, preserve it
          if (typeof rec === "object" && rec !== null) {
            return {
              ...rec,
              // Ensure section is preserved, or assign to first section if missing
              section:
                rec.section ||
                rec.sectionId ||
                proc.procedures?.[0]?.sectionId ||
                proc.procedures?.[0]?.id ||
                "general",
            };
          }
          // If it's a string, assign to first section
          return {
            id: `rec-${Date.now()}-${Math.random()}`,
            text: String(rec).trim(),
            checked: false,
            section:
              proc.procedures?.[0]?.sectionId ||
              proc.procedures?.[0]?.id ||
              "general",
          };
        });
      } else if (typeof content === "string") {
        // Convert string format to checklist items - assign to first section
        const defaultSectionId =
          proc.procedures?.[0]?.sectionId ||
          proc.procedures?.[0]?.id ||
          "general";
        recommendationsToSave = content
          .split("\n")
          .filter((line) => line.trim())
          .map((line, index) => ({
            id: `rec-${Date.now()}-${index}`,
            text: line.trim(),
            checked: false,
            section: defaultSectionId,
          }));
      } else {
        recommendationsToSave = [];
      }

      // Ensure all recommendations are properly tagged
      recommendationsToSave = assignSectionToRecommendations(
        recommendationsToSave,
        proc.procedures || []
      );

      // Update local state first
      setRecommendations(recommendationsToSave);

      // Save to database
      const form = new FormData();
      const cleanedProcedures = (
        Array.isArray(proc.procedures) ? proc.procedures : []
      ).map((sec) => ({
        ...sec,
        fields: (sec.fields || []).map(({ __uid, ...rest }) => rest),
      }));

      const payload = {
        ...proc,
        procedures: cleanedProcedures,
        recommendations: recommendationsToSave, // Save as array
        status: proc.status || "in-progress",
        procedureType: "planning",
      };

      form.append("data", JSON.stringify(payload));

      const engagementId = proc.engagement || engagement?._id;
      const res = await authFetch(
        `${base}/api/planning-procedures/${engagement?._id}/save`,
        {
        method: "POST",
        body: form,
        }
      );

      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();

      // Update state with server response - this will trigger the useEffect
      const savedWithUids = {
        ...saved,
        procedures: withUids(saved?.procedures || []),
      };
      setProc(savedWithUids);
      // Ensure all recommendations from server are tagged with sections
      setRecommendations(
        assignSectionToRecommendations(
        Array.isArray(saved?.recommendations) ? saved.recommendations : [],
        saved?.procedures || proc?.procedures || []
        )
      );

      toast({
        title: "Notes Saved",
        description:
          "Your audit recommendations have been updated and saved to the database.",
      });
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e.message,
        variant: "destructive",
      });
      // Revert local state if save fails - ensure tags are preserved
      setRecommendations(
        assignSectionToRecommendations(
        Array.isArray(proc?.recommendations) ? proc.recommendations : [],
        proc?.procedures || []
        )
      );
    }
  };

  const fileInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const base = import.meta.env.VITE_APIURL;
  const [generatingSections, setGeneratingSections] = useState<Set<string>>(
    new Set()
  );
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
  const [generatingProcedures, setGeneratingProcedures] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Review state
  const [reviewStatus, setReviewStatus] = useState<string>(
    proc?.reviewStatus || "in-progress"
  );
  const [reviewComments, setReviewComments] = useState<string>(
    proc?.reviewComments || ""
  );
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [editingOverallComments, setEditingOverallComments] = useState<
    Record<string, boolean>
  >({});
  const [editOverallCommentValues, setEditOverallCommentValues] = useState<
    Record<string, string>
  >({});

  // Advanced Review & Sign-off state
  const [reviewerId, setReviewerId] = useState<string>(proc?.reviewerId || "");
  const [reviewedAt, setReviewedAt] = useState<string>(
    proc?.reviewedAt
      ? new Date(proc.reviewedAt).toISOString().split("T")[0]
      : ""
  );
  const [approvedBy, setApprovedBy] = useState<string>(proc?.approvedBy || "");
  const [approvedAt, setApprovedAt] = useState<string>(
    proc?.approvedAt
      ? new Date(proc.approvedAt).toISOString().split("T")[0]
      : ""
  );
  const [signedOffBy, setSignedOffBy] = useState<string>(
    proc?.signedOffBy || ""
  );
  const [signedOffAt, setSignedOffAt] = useState<string>(
    proc?.signedOffAt
      ? new Date(proc.signedOffAt).toISOString().split("T")[0]
      : ""
  );
  const [signOffComments, setSignOffComments] = useState<string>(
    proc?.signOffComments || ""
  );
  const [isSignedOff, setIsSignedOff] = useState<boolean>(
    proc?.isSignedOff || false
  );
  const [isLocked, setIsLocked] = useState<boolean>(proc?.isLocked || false);
  const [lockedAt, setLockedAt] = useState<string>(
    proc?.lockedAt ? new Date(proc.lockedAt).toISOString().split("T")[0] : ""
  );
  const [lockedBy, setLockedBy] = useState<string>(proc?.lockedBy || "");
  const [reopenedAt, setReopenedAt] = useState<string>(
    proc?.reopenedAt
      ? new Date(proc.reopenedAt).toISOString().split("T")[0]
      : ""
  );
  const [reopenedBy, setReopenedBy] = useState<string>(proc?.reopenedBy || "");
  const [reopenReason, setReopenReason] = useState<string>(
    proc?.reopenReason || ""
  );
  const [reviewVersion, setReviewVersion] = useState<number>(
    proc?.reviewVersion || 1
  );
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [editingReview, setEditingReview] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editReviewStatus, setEditReviewStatus] = useState<string>("");
  const [editReviewComments, setEditReviewComments] = useState<string>("");
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState<string | null>(null);

  // Get current user ID
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        setCurrentUserId(data.session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch user name from Supabase profiles
  const fetchUserName = async (userId: string): Promise<string> => {
    if (!userId) return userId;
    if (userNamesMap[userId]) return userNamesMap[userId];
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", userId)
        .single();
      if (!error && data?.name) {
        setUserNamesMap((prev) => ({ ...prev, [userId]: data.name }));
        return data.name;
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
    return userId;
  };

  // Fetch user names for all user IDs in reviews
  const fetchUserNames = async (reviews: any[]) => {
    const userIds = new Set<string>();
    reviews.forEach((review) => {
      if (review.reviewedBy) userIds.add(review.reviewedBy);
      if (review.assignedReviewer) userIds.add(review.assignedReviewer);
      if (review.approvedBy) userIds.add(review.approvedBy);
      if (review.signedOffBy) userIds.add(review.signedOffBy);
      if (review.lockedBy) userIds.add(review.lockedBy);
      if (review.reopenedBy) userIds.add(review.reopenedBy);
    });

    const namesMap: Record<string, string> = {};
    await Promise.all(
      Array.from(userIds).map(async (userId) => {
        if (!userNamesMap[userId]) {
          const name = await fetchUserName(userId);
          namesMap[userId] = name;
        } else {
          namesMap[userId] = userNamesMap[userId];
        }
      })
    );
    setUserNamesMap((prev) => ({ ...prev, ...namesMap }));
  };

  // Fetch reviews for engagement (filtered by itemType: "planning-procedure")
  const fetchReviews = async () => {
    if (!engagement?._id) return;
    setIsLoadingReviews(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const response = await authFetch(
        `${base}/api/review/workflows/engagement/${engagement._id}`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter reviews by itemType: "planning-procedure" for PlanningProcedureView
        const filteredReviews = (data.workflows || []).filter(
          (w: any) => w.itemType === "planning-procedure"
        );

        // Debug: Log review data to see what fields are present
        console.log(
          "Fetched reviews:",
          filteredReviews.map((r: any) => ({
            id: r._id,
            status: r.status,
            approvedBy: r.approvedBy,
            reviewedBy: r.reviewedBy,
            assignedReviewer: r.assignedReviewer,
          }))
        );

        setReviews(filteredReviews);
        // Fetch user names for all reviewers
        await fetchUserNames(filteredReviews);
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Fetch reviews when engagement or review tab is active
  React.useEffect(() => {
    if (engagement?._id) {
      // Check if any section has review tab active
      const hasReviewTabActive = Object.values(sectionTabs).some(
        (tab) => tab === "review"
      );
      if (hasReviewTabActive) {
        fetchReviews();
      }
    }
  }, [engagement?._id, sectionTabs]);

  // Fetch reviews when switching to reviews view mode in procedures tab
  React.useEffect(() => {
    if (engagement?._id) {
      // Check if any section is in reviews view mode
      const hasReviewsMode = Object.values(proceduresViewMode).some(mode => mode === 'reviews')
      if (hasReviewsMode) {
        fetchReviews()
      }
    }
  }, [engagement?._id, proceduresViewMode])

  // Check if user owns a review
  const isReviewOwner = (review: any) => {
    if (!currentUserId) return false;
    return (
      review.reviewedBy === currentUserId ||
      review.approvedBy === currentUserId ||
      review.signedOffBy === currentUserId ||
      review.reopenedBy === currentUserId ||
      review.assignedReviewer === currentUserId
    );
  };

  // Handle edit review
  const handleEditReview = (review: any) => {
    setEditingReview(review);
    setEditReviewStatus(review.status || "");
    setEditReviewComments(review.reviewComments || "");
    setIsEditDialogOpen(true);
  };

  // Handle update review
  const handleUpdateReview = async () => {
    if (!editingReview) return;

    setIsUpdatingReview(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const response = await authFetch(
        `${base}/api/review/workflows/${editingReview._id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: editReviewStatus,
            reviewComments: editReviewComments,
            reviewerId: currentUserId, // Always send current user ID
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          text || `Failed to update review (HTTP ${response.status})`
        );
      }

      await fetchReviews();
      setIsEditDialogOpen(false);
      setEditingReview(null);

      toast({
        title: "Review Updated",
        description: "Your review has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Update review error:", error);
      toast({
        title: "Update failed",
        description: error.message || "Could not update review.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingReview(false);
    }
  };

  // Handle delete review
  const handleDeleteReview = async (reviewId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this review? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeletingReview(reviewId);
    try {
      const base = import.meta.env.VITE_APIURL;
      const response = await authFetch(
        `${base}/api/review/workflows/${reviewId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          text || `Failed to delete review (HTTP ${response.status})`
        );
      }

      await fetchReviews();

      toast({
        title: "Review Deleted",
        description: "Your review has been deleted successfully.",
      });
    } catch (error: any) {
      console.error("Delete review error:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete review.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingReview(null);
    }
  };

  // Sync review data from procedure prop (when loaded from backend)
  React.useEffect(() => {
    if (proc) {
      if (proc.reviewStatus) {
        setReviewStatus(proc.reviewStatus);
      }
      if (proc.reviewComments !== undefined) {
        setReviewComments(proc.reviewComments || "");
      }
      // Advanced review fields - auto-set to current user
      if (currentUserId) {
        if (!proc.reviewerId) setReviewerId(currentUserId);
        if (!proc.approvedBy) setApprovedBy(currentUserId);
        if (!proc.signedOffBy) setSignedOffBy(currentUserId);
        if (!proc.lockedBy) setLockedBy(currentUserId);
        if (!proc.reopenedBy) setReopenedBy(currentUserId);
      }
      // Update existing values if present
      if (proc.reviewerId) setReviewerId(proc.reviewerId);
      if (proc.reviewedAt)
        setReviewedAt(new Date(proc.reviewedAt).toISOString().split("T")[0]);
      if (proc.approvedBy) setApprovedBy(proc.approvedBy);
      if (proc.approvedAt)
        setApprovedAt(new Date(proc.approvedAt).toISOString().split("T")[0]);
      if (proc.signedOffBy) setSignedOffBy(proc.signedOffBy);
      if (proc.signedOffAt)
        setSignedOffAt(new Date(proc.signedOffAt).toISOString().split("T")[0]);
      if (proc.signOffComments !== undefined)
        setSignOffComments(proc.signOffComments || "");
      if (proc.isSignedOff !== undefined) setIsSignedOff(proc.isSignedOff);
      if (proc.isLocked !== undefined) setIsLocked(proc.isLocked);
      if (proc.lockedAt)
        setLockedAt(new Date(proc.lockedAt).toISOString().split("T")[0]);
      if (proc.lockedBy) setLockedBy(proc.lockedBy);
      if (proc.reopenedAt)
        setReopenedAt(new Date(proc.reopenedAt).toISOString().split("T")[0]);
      if (proc.reopenedBy) setReopenedBy(proc.reopenedBy);
      if (proc.reopenReason !== undefined)
        setReopenReason(proc.reopenReason || "");
      if (proc.reviewVersion) setReviewVersion(proc.reviewVersion);
    }
  }, [proc, currentUserId]);

  const handleGenerateSectionQuestions = async (sectionId: string) => {
    setGeneratingSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      return newSet;
    });

    try {
      // Find the section to get the correct sectionId
      const section = proc.procedures?.find(
        (s: any) => (s.sectionId || s.id) === sectionId
      );
      const validSectionId = section?.sectionId || section?.id || sectionId;

      if (!validSectionId) {
        throw new Error("Invalid section ID");
      }

      // Backend will create the procedure document if it doesn't exist when generating questions
      // No need to save it first - generateSectionQuestions handles document creation
      const res = await authFetch(
        `${base}/api/planning-procedures/${engagement?._id}/generate/section-questions`,
        {
        method: "POST",
        body: JSON.stringify({ sectionId: validSectionId }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        let errorMessage = "Failed to generate questions for section";
        try {
          const errorData = errorText
            ? errorText.startsWith("{")
              ? JSON.parse(errorText)
              : { message: errorText }
            : {};
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText?.slice(0, 200) || errorMessage;
        }
        if (
          res.status === 429 ||
          errorMessage.toLowerCase().includes("quota")
        ) {
          errorMessage =
            "OpenAI API quota exceeded. Please check your OpenAI account billing and quota limits.";
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();

      // Update the section with generated questions
      setProc((prev: any) => {
        const next = { ...prev };
        const sections = [...(next.procedures || [])];
        const updatedSections = sections.map((sec: any) => {
          const secId = sec.sectionId || sec.id;
          return secId === sectionId
            ? {
                ...sec,
                fields: (data.fields || []).map((f: any) => ({
                  ...f,
                  __uid: f.__uid || uid(),
                })),
              }
            : sec;
        });
        next.procedures = updatedSections;
        return next;
      });

      toast({
        title: "Questions Generated",
        description: `Questions for section generated successfully.`,
      });
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e.message || "Could not generate questions.",
        variant: "destructive",
      });
    } finally {
      setGeneratingSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  };

  // Generate/Regenerate questions for all sections
  const handleGenerateAllQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const sections = proc.procedures || [];

      for (const section of sections) {
        const sectionId = section.sectionId || section.id;
        if (!sectionId) continue;

        const res = await authFetch(
          `${base}/api/planning-procedures/${engagement?._id}/generate/section-questions`,
          {
          method: "POST",
          body: JSON.stringify({ sectionId }),
          }
        );

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          const errorData = errorText
            ? errorText.startsWith("{")
              ? JSON.parse(errorText)
              : { message: errorText }
            : { message: "Failed to generate questions" };
          throw new Error(
            errorData.message || "Failed to generate questions for section"
          );
        }

        const data = await res.json();
        setProc((prev: any) => {
          const next = { ...prev };
          const sections = [...(next.procedures || [])];
          const updatedSections = sections.map((sec: any) => {
            const secId = sec.sectionId || sec.id;
            return secId === sectionId
              ? {
                  ...sec,
                  fields: (data.fields || []).map((f: any) => ({
                    ...f,
                    __uid: f.__uid || uid(),
                  })),
                }
              : sec;
          });
          next.procedures = updatedSections;
          return next;
        });
      }

      toast({
        title: "Questions Generated",
        description: "Questions for all sections generated successfully.",
      });
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e.message || "Could not generate questions.",
        variant: "destructive",
      });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Generate/Regenerate answers for a specific section
  const handleGenerateSectionAnswers = async (sectionId: string) => {
    setGeneratingSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      return newSet;
    });

    try {
      const section = proc.procedures?.find(
        (s: any) => (s.sectionId || s.id) === sectionId
      );
      const validSectionId = section?.sectionId || section?.id || sectionId;

      if (!validSectionId) {
        throw new Error("Invalid section ID");
      }

      const res = await authFetch(
        `${base}/api/planning-procedures/${engagement?._id}/generate/section-answers`,
        {
        method: "POST",
        body: JSON.stringify({ sectionId: validSectionId }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const answers: Record<string, any> = {};

        if (data.fields && Array.isArray(data.fields)) {
          data.fields.forEach((fieldItem: any) => {
            const fieldData = fieldItem._doc || fieldItem;
            const key = fieldData.key;
            if (key) {
              answers[key] =
                fieldItem.answer !== undefined
                  ? fieldItem.answer
                  : fieldData.answer !== undefined
                  ? fieldData.answer
                  : fieldData.content !== undefined
                  ? fieldData.content
                  : null;
            }
          });
        }

        setProc((prev: any) => {
          const next = { ...prev };
          const sections = [...(next.procedures || [])];
          const updatedSections = sections.map((sec: any) => {
            const secId = sec.sectionId || sec.id;
            return secId === sectionId
              ? {
                ...sec,
                fields: (sec.fields || []).map((f: any) => ({
                  ...f,
                    answer:
                      answers[f.key] !== undefined ? answers[f.key] : f.answer,
                  })),
                }
              : sec;
          });
          next.procedures = updatedSections;
          return next;
        });

        toast({
          title: "Answers Generated",
          description: `Answers for section generated successfully.`,
        });
      } else {
        const errorText = await res.text().catch(() => "");
        const errorData = errorText
          ? errorText.startsWith("{")
            ? JSON.parse(errorText)
            : { message: errorText }
          : { message: "Failed to generate answers" };
        throw new Error(
          errorData.message || "Failed to generate answers for section"
        );
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate answers.",
        variant: "destructive",
      });
    } finally {
      setGeneratingSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  };

  // Save answers
  const handleSaveAnswers = async () => {
    setIsSaving(true);
    try {
      await save(false);
      toast({
        title: "Answers Saved",
        description: "Your answers have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Could not save answers.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle checklist item toggle
  // Handle edit recommendation
  const handleEditRecommendation = (rec: any, idx: number) => {
    const recId = rec.id || rec.__uid || `rec-${idx}`;
    setEditingRecommendationId(recId);
    const recText = typeof rec === 'string' ? rec : rec.text || rec.content || "";
    setEditRecommendationText(recText);
  };

  // Handle save recommendation
  const handleSaveRecommendation = () => {
    if (!editingRecommendationId) return;
    setRecommendations(prev => 
      prev.map((rec, idx) => {
        const recId = rec.id || rec.__uid || `rec-${idx}`;
        if (recId === editingRecommendationId) {
          if (typeof rec === 'string') {
            return editRecommendationText;
          }
          return { ...rec, text: editRecommendationText };
        }
        return rec;
      })
    );
    setEditingRecommendationId(null);
    setEditRecommendationText("");
  };

  // Handle cancel edit recommendation
  const handleCancelEditRecommendation = () => {
    setEditingRecommendationId(null);
    setEditRecommendationText("");
  };

  const handleCheckboxToggle = (itemId: string) => {
    setRecommendations((prev) =>
      prev.map((item: any) => {
        const rId = item.id || item.__uid || `rec-${prev.indexOf(item)}`;
        return rId === itemId
          ? { ...item, checked: !(item.checked || false) }
          : item;
      })
    );
  };

  // Handle save procedures (similar to Save Checklist in NotebookInterface)
  const handleSaveProcedures = async () => {
    setIsSaving(true);
    try {
      await save(false); // Save without marking as completed
      toast({ 
        title: "Procedures Saved", 
        description: "Your checklist has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Could not save procedures.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate/Regenerate procedures (recommendations) for a specific section
  const handleGenerateProcedures = async (sectionId: string) => {
    setGeneratingProcedures(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      
      // Find the specific section - use consistent ID matching
      const section = proc.procedures?.find((s: any) => {
        const sId = String(s.sectionId || s.id || "").trim();
        const targetId = String(sectionId || "").trim();
        return sId === targetId && sId !== "";
      });
      if (!section) {
        throw new Error("Section not found");
      }
      
      // Use the same ID format as in the render
      const actualSectionId = String(
        section.sectionId || section.id || sectionId
      ).trim();

      const res = await authFetch(
        `${base}/api/planning-procedures/${engagement?._id}/generate/recommendations`,
        {
        method: "POST",
        body: JSON.stringify({
            procedures: [
              {
            ...section,
                fields: (section.fields || []).map(
                  ({ __uid, ...rest }) => rest
                ),
              },
            ],
          materiality: proc.materiality || 0,
        }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const newRecs = normalizeRecommendations(
          data.recommendations,
          actualSectionId
        );
        
        // Ensure all new recommendations have the correct section ID (use actualSectionId consistently)
        const taggedRecs = newRecs.map((rec: any) => ({
          ...rec,
          section: actualSectionId,
          sectionId: actualSectionId,
        }));
        
        // Remove old recommendations for this section and add new ones
        setRecommendations((prev: any[]) => {
          const filtered = prev.filter((r: any) => {
            const rSection = String(r.section || r.sectionId || "").trim();
            return rSection !== actualSectionId;
          });
          const updated = [...filtered, ...taggedRecs];
          return updated;
        });

        toast({
          title: "Procedures Generated",
          description: `Generated ${taggedRecs.length} recommendations successfully for this section.`,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to generate recommendations"
        );
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate procedures.",
        variant: "destructive",
      });
    } finally {
      setGeneratingProcedures(false);
    }
  };

  const statusBadge = useMemo(() => {
    const status = proc?.status || "draft";
    const map: any = {
      draft: { variant: "secondary", label: "Draft" },
      "in-progress": { variant: "default", label: "In Progress" },
      completed: { variant: "default", label: "Completed" },
    };
    return (
      <Badge variant={map[status]?.variant || "secondary"}>
        {map[status]?.label || "Draft"}
      </Badge>
    );
  }, [proc?.status]);

  const setField = (sIdx: number, fieldUid: string, patch: any) => {
    setProc((prev: any) => {
      const next = { ...prev };
      const sections = [...(next.procedures || [])];
      const sec = { ...sections[sIdx] };
      sec.fields = (sec.fields || []).map((f: any) =>
        f.__uid === fieldUid ? { ...f, ...patch } : f
      );
      sections[sIdx] = sec;
      next.procedures = sections;
      return next;
    });
  };

  const changeKey = (sIdx: number, fieldUid: string, newKey: string) => {
    const cleaned = (newKey || "").trim().replace(/\s+/g, "_");
    setProc((prev: any) => {
      const next = { ...prev };
      const sections = [...(next.procedures || [])];
      const sec = { ...sections[sIdx] };
      const fields = [...(sec.fields || [])];
      const self = fields.find((f: any) => f.__uid === fieldUid);
      if (!self) return prev;
      if (!cleaned) return prev;
      const dup = fields.some(
        (f: any) => f.__uid !== fieldUid && f.key === cleaned
      );
      if (dup) return prev;
      self.key = cleaned;
      sec.fields = fields;
      sections[sIdx] = sec;
      next.procedures = sections;
      return next;
    });
  };

  const addSectionAndQuestion = () => {
    // Automatically enable edit mode if not already enabled
    if (!editMode) {
      setEditMode(true);
    }
    setProc((prev: any) => {
      const next = { ...prev };
      const sections = [...(next.procedures || [])];
      // Create a simple new section matching the structure used in ProceduresTab generation flow
      // This matches the structure created in PlanningProceduresStep.tsx for manual sections
      const timestamp = Date.now();
      const newSection = {
        id: `sec-${timestamp}`,
        sectionId: `section-${timestamp}`,
        title: "New Section",
        standards: undefined, // Optional - not needed for custom sections
        currency: "EUR",
        fields: [],
        footer: null, // Optional - matches structure from generation flow
      };
      sections.push(newSection);
      next.procedures = sections;
      return next;
    });
  };

  const addQuestion = (sIdx: number) => {
    // Automatically enable edit mode if not already enabled
    if (!editMode) {
      setEditMode(true);
    }
    const newUid = uid();
    setProc((prev: any) => {
      const next = { ...prev };
      const sections = [...(next.procedures || [])];
      const sec = { ...sections[sIdx] };
      const fields = [...(sec.fields || [])];
      const baseKey = "new_question";
      const existing = new Set(fields.map((f) => f.key));
      let k = baseKey,
        i = 1;
      while (existing.has(k)) k = `${baseKey}_${i++}`;
      fields.push({
        __uid: newUid,
        key: k,
        type: "text",
        label: "New Question",
        required: false,
        help: "",
      });
      sec.fields = fields;
      sections[sIdx] = sec;
      next.procedures = sections;
      return next;
    });
    // Mark this question as pending (needs save/cancel)
    setPendingQuestions((prev) => new Set(prev).add(newUid));
  };

  const confirmQuestion = (sIdx: number, fieldUid: string) => {
    // Remove from pending - question is now confirmed
    setPendingQuestions((prev) => {
      const next = new Set(prev);
      next.delete(fieldUid);
      return next;
    });
  };

  const cancelQuestion = (sIdx: number, fieldUid: string) => {
    // Remove the question entirely
    setProc((prev: any) => {
      const next = { ...prev };
      const sections = [...(next.procedures || [])];
      const sec = { ...sections[sIdx] };
      sec.fields = (sec.fields || []).filter((f: any) => f.__uid !== fieldUid);
      sections[sIdx] = sec;
      next.procedures = sections;
      return next;
    });
    // Remove from pending
    setPendingQuestions((prev) => {
      const next = new Set(prev);
      next.delete(fieldUid);
      return next;
    });
  };

  const removeQuestion = (sIdx: number, fieldUid: string) => {
    setProc((prev: any) => {
      const next = { ...prev };
      const sections = [...(next.procedures || [])];
      const sec = { ...sections[sIdx] };
      sec.fields = (sec.fields || []).filter((f: any) => f.__uid !== fieldUid);
      sections[sIdx] = sec;
      next.procedures = sections;
      return next;
    });
  };

  const save = async (asCompleted = false) => {
    try {
      const form = new FormData();
      // robust normalize before mapping
      const cleanedProcedures = (
        Array.isArray(proc.procedures) ? proc.procedures : []
      ).map((sec) => ({
        ...sec,
        fields: (sec.fields || []).map(({ __uid, ...rest }) => rest),
      }));

      // Create the payload with updated recommendations - ensure it's always an array
      // Ensure all recommendations are tagged before saving
      const taggedRecommendations = assignSectionToRecommendations(
        Array.isArray(recommendations) ? recommendations : [],
        cleanedProcedures
      );

      const payload = {
        ...proc,
        procedures: cleanedProcedures,
        // Ensure recommendations are included in the payload as array with proper tags
        recommendations: taggedRecommendations,
        status: asCompleted ? "completed" : proc.status || "in-progress",
        procedureType: "planning",
      };

      form.append("data", JSON.stringify(payload));
      if (fileInput.current?.files?.length) {
        Array.from(fileInput.current.files).forEach((f) =>
          form.append("files", f)
        );
      }

      const engagementId = proc.engagement || engagement?._id;
      const res = await authFetch(
        `${base}/api/planning-procedures/${engagement?._id}/save`,
        {
        method: "POST",
        body: form,
        }
      );

      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();

      // Update state with server response - this will trigger the useEffect
      const savedWithUids = {
        ...saved,
        procedures: withUids(saved?.procedures || []),
      };
      setProc(savedWithUids);
      // keep local recs aligned with server - ensure it's an array and tagged
      setRecommendations(
        assignSectionToRecommendations(
        Array.isArray(saved?.recommendations) ? saved.recommendations : [],
        saved?.procedures || proc?.procedures || []
        )
      );
      // Clear pending questions after successful save
      setPendingQuestions(new Set());
      toast({
        title: "Saved",
        description: asCompleted ? "Marked completed." : "Changes saved.",
      });
      setEditMode(false);
      // Notify parent component of update
      if (onProcedureUpdate) {
        onProcedureUpdate(saved);
      }
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e.message,
        variant: "destructive",
      });
    }
  };
  // answers map for visibleIf
  const makeAnswers = (sec: any) =>
    (sec.fields || []).reduce((acc: any, f: any) => {
      acc[f.key] = f.answer;
      return acc;
    }, {});

  // Export planning procedures to PDF (summary of all sections)
  const handleExportPlanningPDF = async () => {
    try {
      const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      const addFooter = () => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.setFont("helvetica", "normal");
        const footerY = pageHeight - 8;
        doc.text(
          "Confidential — For audit planning purposes only.",
          margin,
          footerY
        );
        doc.text(`Page ${pageCount}`, pageWidth - margin, footerY, {
          align: "right",
        });
      };

      const safeTitle =
        proc?.engagementTitle || engagement?.title || "Engagement";

      // Cover
      doc.setFillColor(245, 246, 248);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20);
      doc.setFontSize(18);
      doc.text("Planning Procedures Report", margin, 40);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Engagement: ${safeTitle}`, margin, 55);
      doc.text(
        `Mode: ${String(proc?.mode || "MANUAL").toUpperCase()}`,
        margin,
        63
      );
      doc.text(`Status: ${String(proc?.status || "draft")}`, margin, 71);

      addFooter();

      // Sections and questions
      Array.isArray(proc.procedures) &&
        proc.procedures.forEach((sec: any, index: number) => {
          if (index > 0) {
            doc.addPage();
          }

          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(
            `Section: ${sec.title || `Section ${index + 1}`}`,
            margin,
            20
          );

          const body: any[] = [];
          (sec.fields || []).forEach((f: any) => {
            const t = normalizeType(f.type);
            if (f.key === "documentation_reminder") return;
            const label = f.label || f.key;
            let answer = "";
              if (t === "multiselect") {
              answer = (Array.isArray(f.answer) ? f.answer : []).join(", ");
              } else if (t === "table") {
              const cols = Array.isArray(f.columns) ? f.columns : [];
              const rows = Array.isArray(f.answer) ? f.answer : [];
                answer = rows
                .map((row: any) =>
                  cols.map((c: string) => String(row?.[c] ?? "")).join(" | ")
                )
                .join("  /  ");
              } else if (t === "group") {
              const val =
                f.answer && typeof f.answer === "object" ? f.answer : {};
              const keys = Object.keys(val).filter((k) => !!val[k]);
              answer = keys.join(", ");
              } else if (t === "checkbox") {
              answer = f.answer ? "Yes" : "No";
              } else {
              answer = String(f.answer ?? "");
              }
            body.push([label, answer || "—"]);
          });

          if (body.length) {
            // @ts-ignore
            autoTable(doc, {
              startY: 28,
              head: [["Procedure", "Answer / Result"]],
              body,
              styles: {
                font: "helvetica",
                fontSize: 9,
                cellPadding: 2,
                valign: "top",
              },
              headStyles: {
                fillColor: [240, 240, 240],
                textColor: 20,
                halign: "left",
              },
              margin: { left: margin, right: margin },
              didDrawPage: addFooter,
            });
          } else {
            addFooter();
          }
        });

      const date = new Date();
      const fname = `Planning_Procedures_${safeTitle
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60)}_${date.toISOString().slice(0, 10)}.pdf`;

      doc.save(fname);
      toast({
        title: "Exported",
        description: `${fname} has been downloaded.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Export failed",
        description: e?.message || "Could not export planning procedures.",
        variant: "destructive",
      });
    }
  };

  // Always render, even if proc is empty/null - allows users to add questions
  // proc is initialized as {} if initial is null/undefined, so this should always render
  return (
    <div className="space-y-6">
      {/* Step-1 Description */}
      <div className="text-sm text-muted-foreground font-body mb-4">
        Step-1: Generate questions for each planning section separately. You can
        freely edit / add / remove questions here before moving to Step-4
      </div>

      {Array.isArray(proc.procedures) && proc.procedures.length > 0 ? (
        <Accordion type="multiple" className="space-y-4">
          {proc.procedures.map((sec: any, sIdx: number) => {
            const answers = makeAnswers(sec);
            const sectionId = sec.sectionId || sec.id || `section-${sIdx}`;
            const activeSectionTab = sectionTabs[sectionId] || "questions";
            const setActiveSectionTab = (value: string) => {
              setSectionTabs((prev) => ({ ...prev, [sectionId]: value }));
            };

            return (
              <AccordionItem
                key={sec.id || sIdx}
                value={sectionId}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="text-left">
                    <div className="font-heading text-lg">{sec.title}</div>
                    {sec.standards?.length ? (
                      <div className="text-xs text-muted-foreground">
                        Standards: {sec.standards.join(", ")}
                      </div>
                    ) : null}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-4">
                  <Tabs
                    value={activeSectionTab}
                    onValueChange={setActiveSectionTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="questions">Questions</TabsTrigger>
                      <TabsTrigger value="answers">Answers</TabsTrigger>
                      <TabsTrigger value="procedures">Procedures</TabsTrigger>
                    </TabsList>

                    <TabsContent value="questions" className="space-y-3 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addQuestion(sIdx)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          {(sec.fields || []).length > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleGenerateSectionQuestions(
                                  sec.sectionId || sec.id
                                )
                              }
                              disabled={generatingSections.has(
                                sec.sectionId || sec.id
                              )}
                            >
                              {generatingSections.has(
                                sec.sectionId || sec.id
                              ) ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Regenerate Questions
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                handleGenerateSectionQuestions(
                                  sec.sectionId || sec.id
                                )
                              }
                              disabled={generatingSections.has(
                                sec.sectionId || sec.id
                              )}
                            >
                              {generatingSections.has(
                                sec.sectionId || sec.id
                              ) ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <FileText className="h-4 w-4 mr-2" />
                              )}
                              Generate Questions
                            </Button>
                          )}
                          {!editMode ? (
                            <Button size="sm" onClick={() => setEditMode(true)}>
                              Edit
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" onClick={() => save(false)}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => save(true)}
                              >
                                Save & Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                pendingQuestions.forEach((uid) => {
                                  setProc((prev: any) => {
                                      const next = { ...prev };
                                      const sections = [
                                        ...(next.procedures || []),
                                      ];
                                    sections.forEach((sec: any) => {
                                        sec.fields = (sec.fields || []).filter(
                                          (f: any) => f.__uid !== uid
                                        );
                                      });
                                      next.procedures = sections;
                                      return next;
                                    });
                                  });
                                  setPendingQuestions(new Set());
                                  setEditMode(false);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                          {(sec.fields || []).map((f: any, idx: number) => {
                            const t = normalizeType(f.type);
                            const isTable = t === "table";
                            // respect visibleIf in view/edit
                            if (!isFieldVisible(f, answers)) return null;
                            if (f.key === "documentation_reminder") return null;

                            const isPending = pendingQuestions.has(f.__uid);
                            const questionKey = `${sIdx}-${f.__uid}`;
                            const isEditing =
                              editingQuestionIds[questionKey] === f.__uid;
                            const editText =
                              editQuestionTexts[questionKey] ??
                              (f.label || f.key);

                            return (
                              <Card key={f.__uid}>
                                <CardContent className="pt-6">
                                  {isEditing || isPending ? (
                                    <div className="space-y-3">
                                      <Input
                                        value={editText}
                                        onChange={(e) =>
                                          setEditQuestionTexts((prev) => ({
                                            ...prev,
                                            [questionKey]: e.target.value,
                                          }))
                                        }
                                        placeholder="Question"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setField(sIdx, f.__uid, {
                                              label: editText,
                                            });
                                            if (isPending)
                                              confirmQuestion(sIdx, f.__uid);
                                            setEditingQuestionIds((prev) => {
                                              const next = { ...prev };
                                              delete next[questionKey];
                                              return next;
                                            });
                                            setEditQuestionTexts((prev) => {
                                              const next = { ...prev };
                                              delete next[questionKey];
                                              return next;
                                            });
                                          }}
                                        >
                                          <Save className="h-4 w-4 mr-1" />
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            if (isPending)
                                              cancelQuestion(sIdx, f.__uid);
                                            setEditingQuestionIds((prev) => {
                                              const next = { ...prev };
                                              delete next[questionKey];
                                              return next;
                                            });
                                            setEditQuestionTexts((prev) => {
                                              const next = { ...prev };
                                              delete next[questionKey];
                                              return next;
                                            });
                                          }}
                                        >
                                          <X className="h-4 w-4 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex justify-between items-start">
                                        <div className="font-medium mb-1">
                                          {idx + 1}. {f.label || f.key}
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setEditingQuestionIds((prev) => ({
                                                ...prev,
                                                [questionKey]: f.__uid,
                                              }));
                                              setEditQuestionTexts((prev) => ({
                                                ...prev,
                                                [questionKey]: f.label || f.key,
                                              }));
                                            }}
                                          >
                                            <Edit2 className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              removeQuestion(sIdx, f.__uid)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      {f.help && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {f.help}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                          {(!sec.fields || sec.fields.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              No questions available. Click "Add Question" to
                              get started.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="answers" className="space-y-3 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                          {(sec.fields || []).length > 0 ? (
                            (sec.fields || []).some((f: any) => f.answer) ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleGenerateSectionAnswers(
                                    sec.sectionId || sec.id
                                  )
                                }
                                disabled={generatingSections.has(
                                  sec.sectionId || sec.id
                                )}
                              >
                                {generatingSections.has(
                                  sec.sectionId || sec.id
                                ) ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Regenerate Answers
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleGenerateSectionAnswers(
                                    sec.sectionId || sec.id
                                  )
                                }
                                disabled={generatingSections.has(
                                  sec.sectionId || sec.id
                                )}
                              >
                                {generatingSections.has(
                                  sec.sectionId || sec.id
                                ) ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <FileText className="h-4 w-4 mr-2" />
                                )}
                                Generate Answers
                              </Button>
                            )
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              No questions added yet.
                            </div>
                          )}
                        </div>
                        {(sec.fields || []).length > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveAnswers}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Answers
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                          {(sec.fields || []).map((f: any, idx: number) => {
                            const t = normalizeType(f.type);
                            const isTable = t === "table";
                            if (!isFieldVisible(f, answers)) return null;
                            if (f.key === "documentation_reminder") return null;

                            const questionKey = `${sIdx}-${f.__uid}`;
                            const isEditingAnswer =
                              editingQuestionIds[`answer-${questionKey}`] ===
                              f.__uid;
                            const editAnswerValue =
                              editQuestionTexts[`answer-${questionKey}`] ??
                              String(f.answer ?? "");

                            return (
                              <Card key={f.__uid}>
                                <CardContent className="pt-6">
                                  <div className="font-medium mb-2">
                                    {idx + 1}. {f.label || f.key}
                                  </div>
                                  {isEditingAnswer ? (
                                    <div className="space-y-3">
                                      <Textarea
                                        value={editAnswerValue}
                                        onChange={(e) =>
                                          setEditQuestionTexts((prev) => ({
                                            ...prev,
                                            [`answer-${questionKey}`]:
                                              e.target.value,
                                          }))
                                        }
                                        placeholder="Answer"
                                        className="min-h-[100px]"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setField(sIdx, f.__uid, {
                                              answer: editAnswerValue,
                                            });
                                            setEditingQuestionIds((prev) => {
                                              const next = { ...prev };
                                              delete next[
                                                `answer-${questionKey}`
                                              ];
                                              return next;
                                            });
                                            setEditQuestionTexts((prev) => {
                                              const next = { ...prev };
                                              delete next[
                                                `answer-${questionKey}`
                                              ];
                                              return next;
                                            });
                                          }}
                                        >
                                          <Save className="h-4 w-4 mr-1" />
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingQuestionIds((prev) => {
                                              const next = { ...prev };
                                              delete next[
                                                `answer-${questionKey}`
                                              ];
                                              return next;
                                            });
                                            setEditQuestionTexts((prev) => {
                                              const next = { ...prev };
                                              delete next[
                                                `answer-${questionKey}`
                                              ];
                                              return next;
                                            });
                                          }}
                                        >
                                          <X className="h-4 w-4 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="text-sm text-muted-foreground mb-3">
                                        {f.answer ? (
                                          <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                          >
                                            {String(f.answer)}
                                          </ReactMarkdown>
                                        ) : (
                                          <span className="italic">
                                            No answer.
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingQuestionIds((prev) => ({
                                              ...prev,
                                              [`answer-${questionKey}`]:
                                                f.__uid,
                                            }));
                                            setEditQuestionTexts((prev) => ({
                                              ...prev,
                                              [`answer-${questionKey}`]: String(
                                                f.answer ?? ""
                                              ),
                                            }));
                                          }}
                                        >
                                          <Edit2 className="h-4 w-4 mr-1" />
                                          {f.answer
                                            ? "Edit Answer"
                                            : "Add Answer"}
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                          {(!sec.fields || sec.fields.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              No answers yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="procedures" className="space-y-3 mt-4">
                      {(proceduresViewMode[sectionId] || "procedures") === "reviews" ? (
                        <div
                          className="space-y-3 overflow-x-hidden"
                          style={{ width: "100%", maxWidth: "100%" }}
                        >
                          <div className="flex flex-col gap-2 mb-4 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setProceduresViewMode((prev) => ({
                                  ...prev,
                                  [sectionId]: "procedures",
                                }))
                              }
                              className="w-full"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Back to Procedures
                            </Button>
                            <div className="flex items-center justify-between w-full">
                              <h4 className="text-lg font-semibold">Overall Review</h4>
                        <div className="flex items-center gap-2">
                                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Review Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="ready-for-review">Ready for Review</SelectItem>
                                    <SelectItem value="under-review">Under Review</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="signed-off">Signed Off</SelectItem>
                                    <SelectItem value="re-opened">Re-opened</SelectItem>
                                  </SelectContent>
                                </Select>
                          <Button 
                            variant="default" 
                            size="sm" 
                                  onClick={async () => {
                                    setIsSavingReview(true);
                                    try {
                                      const base = import.meta.env.VITE_APIURL;
                                      const formData = new FormData();
                                      const now = new Date();
                                      const currentVersion = (reviewVersion || 1) + 1;
                                      let autoFields: any = { reviewVersion: currentVersion, reviewerId: currentUserId };

                                      if (["in-progress", "ready-for-review", "under-review", "rejected"].includes(reviewStatus)) {
                                        autoFields.reviewedAt = now.toISOString();
                                      }
                                      if (reviewStatus === "approved") {
                                        autoFields.approvedBy = currentUserId;
                                        autoFields.approvedAt = now.toISOString();
                                      }
                                      if (reviewStatus === "signed-off") {
                                        autoFields.signedOffBy = currentUserId;
                                        autoFields.signedOffAt = now.toISOString();
                                        autoFields.isSignedOff = true;
                                      }
                                      if (reviewStatus === "re-opened") {
                                        autoFields.reopenedBy = currentUserId;
                                        autoFields.reopenedAt = now.toISOString();
                                      }

                                      const payload = { ...proc, reviewStatus, reviewComments, sectionId, ...autoFields };
                                      formData.append("data", JSON.stringify(payload));
                                      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/save`, {
                                        method: "POST",
                                        body: formData,
                                      });
                                      if (!res.ok) throw new Error("Save failed");
                                      setReviewVersion(currentVersion);
                                      setReviewComments("");
                                      await fetchReviews();
                                      toast({ title: "Saved", description: "Review updated." });
                                    } catch (e: any) {
                                      toast({ title: "Error", description: e.message, variant: "destructive" });
                                    } finally {
                                      setIsSavingReview(false);
                                    }
                                  }}
                                  disabled={isSavingReview}
                                >
                                  {isSavingReview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                  Save Review
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4 w-full">
                            <Label htmlFor="review-comments-overall">Overall Review Comments</Label>
                            <Textarea
                              id="review-comments-overall"
                              value={reviewComments}
                              onChange={(e) => setReviewComments(e.target.value)}
                              placeholder="Add your review comments here..."
                              className="min-h-[100px] mt-2 w-full"
                            />
                          </div>

                          <ScrollArea className="h-[400px] border rounded-md p-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h5 className="font-semibold">Review History</h5>
                                <Button variant="ghost" size="sm" onClick={fetchReviews}><RefreshCw className="h-4 w-4" /></Button>
                              </div>
                              {reviews
                                .filter((r) => r.sectionId === sectionId || (!r.sectionId && sectionId === (proc.procedures?.[0]?.sectionId || proc.procedures?.[0]?.id)))
                                .map((review: any, rIdx: number) => {
                                  const statusColors: Record<string, string> = {
                                    'in-progress': 'bg-gray-100 text-gray-800',
                                    'ready-for-review': 'bg-blue-100 text-blue-800',
                                    'under-review': 'bg-yellow-100 text-yellow-800',
                                    'approved': 'bg-green-100 text-green-800',
                                    'rejected': 'bg-red-100 text-red-800',
                                    'signed-off': 'bg-purple-100 text-purple-800',
                                    're-opened': 'bg-orange-100 text-orange-800',
                                  };
                                  
                                  const isOwner = isReviewOwner(review);
                                  
                                  return (
                                    <Card key={review._id || rIdx} className="mb-4">
                                      <CardContent className="pt-6 pb-6">
                                        <div className="space-y-3">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                <Badge className={statusColors[review.status] || 'bg-gray-100 text-gray-800'}>
                                                  {review.status || 'N/A'}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                  {review.itemType || 'N/A'}
                                                </span>
                                              </div>
                                              {review.reviewComments && (
                                                <div className="text-sm text-muted-foreground mb-2">
                                                  {review.reviewComments}
                                                </div>
                                              )}
                                            </div>
                                            {isOwner && (
                                              <div className="flex gap-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleEditReview(review)}
                                                  disabled={isDeletingReview === review._id}
                                                >
                                                  <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleDeleteReview(review._id)}
                                                  disabled={isDeletingReview === review._id}
                                                >
                                                  {isDeletingReview === review._id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : (
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                  )}
                          </Button>
                                              </div>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <span className="font-medium">Reviewer:</span>{' '}
                                              <span className="text-muted-foreground">
                                                {(() => {
                                                  let reviewerId = null;
                                                  if (review.status === 'approved') {
                                                    reviewerId = review.approvedBy || review.reviewedBy || review.assignedReviewer;
                                                  } else if (review.status === 'signed-off') {
                                                    reviewerId = review.signedOffBy || review.approvedBy || review.reviewedBy || review.assignedReviewer;
                                                  } else if (review.status === 're-opened') {
                                                    reviewerId = review.reopenedBy || review.reviewedBy || review.assignedReviewer;
                                                  } else if (review.status === 'ready-for-review' || review.status === 'under-review') {
                                                    reviewerId = review.reviewedBy || review.assignedReviewer;
                                                  } else {
                                                    reviewerId = review.reviewedBy || review.assignedReviewer;
                                                  }
                                                  return reviewerId ? (userNamesMap[reviewerId] || reviewerId) : 'Not assigned';
                                                })()}
                                              </span>
                                            </div>
                                            {review.reviewedAt && (review.status === 'ready-for-review' || review.status === 'under-review') && (
                                              <div>
                                                <span className="font-medium">Reviewed At:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {new Date(review.reviewedAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                            )}
                                            {review.status === 'approved' && review.approvedBy && (
                                              <div>
                                                <span className="font-medium">Approved By:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {userNamesMap[review.approvedBy] || review.approvedBy}
                                                </span>
                                              </div>
                                            )}
                                            {review.status === 'approved' && review.approvedAt && (
                                              <div>
                                                <span className="font-medium">Approved At:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {new Date(review.approvedAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                            )}
                                            {review.status === 'signed-off' && review.signedOffBy && (
                                              <div>
                                                <span className="font-medium">Signed Off By:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {userNamesMap[review.signedOffBy] || review.signedOffBy}
                                                </span>
                                              </div>
                                            )}
                                            {review.status === 'signed-off' && review.signedOffAt && (
                                              <div>
                                                <span className="font-medium">Signed Off At:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {new Date(review.signedOffAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                            )}
                                            {review.isLocked && (
                                              <div>
                                                <span className="font-medium">Locked:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {review.lockedBy ? `Yes (by ${userNamesMap[review.lockedBy] || review.lockedBy})` : 'Yes'}
                                                </span>
                                              </div>
                                            )}
                                            {review.status === 're-opened' && review.reopenedBy && (
                                              <div>
                                                <span className="font-medium">Reopened By:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {userNamesMap[review.reopenedBy] || review.reopenedBy}
                                                </span>
                                              </div>
                                            )}
                                            {review.status === 're-opened' && review.reopenedAt && (
                                              <div>
                                                <span className="font-medium">Reopened At:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {new Date(review.reopenedAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                            )}
                                            {review.reviewVersion && (
                                              <div>
                                                <span className="font-medium">Version:</span>{' '}
                                                <span className="text-muted-foreground">
                                                  {review.reviewVersion}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold">Audit Recommendations</h4>
                            <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                onClick={() => setProceduresViewMode((prev) => ({ ...prev, [sectionId]: "reviews" }))}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Reviews
                              </Button>
                              {(() => {
                                const hasAnswers = (sec.fields || []).length > 0 && (sec.fields || []).some((f: any) => f.answer);
                                const sectionRecs = recommendations.filter((rec) => String(rec.section || rec.sectionId) === String(sectionId));
                                return hasAnswers ? (
                                  sectionRecs.length > 0 ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleGenerateProcedures(sectionId)}
                                  disabled={generatingProcedures}
                                >
                                      {generatingProcedures ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                  Regenerate Procedures
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                      onClick={() => handleGenerateProcedures(sectionId)}
                                  disabled={generatingProcedures}
                                >
                                      {generatingProcedures ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                                  Generate Procedures
                                </Button>
                              )
                          ) : (
                            <div className="text-muted-foreground text-sm">
                                    {(sec.fields || []).length === 0 ? "Generate questions first." : "Generate answers first."}
                            </div>
                                );
                              })()}
                              <Button variant="default" size="sm" onClick={handleSaveProcedures} disabled={isSaving}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Procedures
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                            const newRec = {
                              id: `rec-${Date.now()}`,
                              text: "New recommendation",
                              checked: false,
                                    section: sectionId,
                                    sectionId: sectionId,
                                  };
                                  setRecommendations((prev) => [...prev, newRec]);
                                }}
                              >
                            <Plus className="h-4 w-4 mr-2" />
                                Add
                          </Button>
                        </div>
                      </div>

                      <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                              {recommendations
                                .filter((rec) => String(rec.section || rec.sectionId) === String(sectionId))
                                .map((rec, idx) => {
                                  const recId = rec.id || rec.__uid || `rec-${idx}`;
                                  const isEditing = editingRecommendationId === recId;
                              return (
                                <Card key={recId}>
                                  <CardContent className="pt-6">
                                    {isEditing ? (
                                      <div className="space-y-3">
                                            <Textarea
                                              value={editRecommendationText}
                                              onChange={(e) => setEditRecommendationText(e.target.value)}
                                              className="min-h-[100px]"
                                            />
                                          <div className="flex gap-2">
                                              <Button size="sm" onClick={handleSaveRecommendation}>
                                              <Save className="h-4 w-4 mr-1" />
                                              Save
                                            </Button>
                                              <Button size="sm" variant="outline" onClick={handleCancelEditRecommendation}>
                                              <X className="h-4 w-4 mr-1" />
                                              Cancel
                                            </Button>
                                          </div>
                                      </div>
                                    ) : (
                                          <div className="flex items-start gap-3">
                                            <Checkbox
                                              checked={rec.checked || false}
                                              onCheckedChange={() => handleCheckboxToggle(rec.id || recId)}
                                            />
                                            <span className={`flex-1 ${rec.checked ? "line-through text-muted-foreground" : ""}`}>
                                              {rec.text}
                                            </span>
                                            <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                                onClick={() => handleEditRecommendation(rec, idx)}
                                            >
                                              <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                                onClick={() => setRecommendations((prev) => prev.filter((r) => {
                                                  const rId = r.id || r.__uid;
                                                  return rId !== recId;
                                                }))}
                                              >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </div>
                                    )}
                                  </CardContent>
                                </Card>
                                  );
                                })}
                              {recommendations.filter((rec) => String(rec.section || rec.sectionId) === String(sectionId)).length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                  No recommendations generated for this section yet.
                                </div>
                              )}
                        </div>
                      </ScrollArea>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="text-muted-foreground">No sections.</div>
            <Button
              variant="outline"
              onClick={addSectionAndQuestion}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportPlanningPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Floating Notes Button (same feel as ProcedureView) */}
      <FloatingNotesButton
        onClick={() => setIsNotesOpen(true)}
        isOpen={isNotesOpen}
      />

      {/* Notebook Interface (re-usable component) */}
      <NotebookInterface
        isOpen={isNotesOpen}
        isEditable={true}
        onClose={() => setIsNotesOpen(false)}
        recommendations={recommendations}
        onSave={handleSaveRecommendations}
        isPlanning={true}
      />

      {/* Edit Review Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-review-status">Status</Label>
              <Select
                value={editReviewStatus}
                onValueChange={setEditReviewStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="ready-for-review">
                    Ready for Review
                  </SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="signed-off">Signed Off</SelectItem>
                  <SelectItem value="re-opened">Re-opened</SelectItem>
                </SelectContent>
              </Select>
    </div>
            <div>
              <Label htmlFor="edit-review-comments">Review Comments</Label>
              <Textarea
                id="edit-review-comments"
                value={editReviewComments}
                onChange={(e) => setEditReviewComments(e.target.value)}
                placeholder="Enter review comments..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateReview} disabled={isUpdatingReview}>
              {isUpdatingReview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
