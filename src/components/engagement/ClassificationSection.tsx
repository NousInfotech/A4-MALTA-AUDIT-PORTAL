// @ts-nocheck



import type React from "react";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// Removed unused shadcn/ui toast imports (using Sonner toast instead)
// import { Toaster } from "@/components/ui/toaster"
// import { useToast } from "@/components/ui/use-toast"

import { createPortal } from "react-dom";

import {

  Card,

  CardContent,

  CardDescription,

  CardFooter,

  CardHeader,

  CardTitle,

} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { getUserContext } from "@/lib/user-context-service";

import { getClassificationId } from "@/lib/classification-mapping";

import { uploadFileToStorage, validateFile } from "@/lib/file-upload-service";

import {

  createClassificationEvidence,

  getAllClassificationEvidence,

  addCommentToEvidence,

  deleteClassificationEvidence,

  updateEvidenceUrl,

  type ClassificationEvidence,

  type EvidenceComment

} from "@/lib/api/classification-evidence-api";

import {

  createClassificationReview,

  getReviewsByClassification,

  updateReviewStatus,

  type ClassificationReview

} from "@/lib/api/classification-review-api";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { ScrollArea } from "@/components/ui/scroll-area";

import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";

import {

  RefreshCw,

  ExternalLink,

  Loader2,

  Maximize2,

  Minimize2,

  FileSpreadsheet,

  Download,

  Upload,

  Plus,

  Search,

  Eye,

  Save,

  TableOfContents, // ⬅️ NEW: icon for Fetch Tabs

  FileText,
  Link,
  Trash2,

  Image,

  File,

  MessageSquare,

  X,

  Edit2,

  Check,

  RotateCcw,

  Info,

  ArrowLeft,

  CheckCircle,

  Sparkles,

  User,

  Bot,

  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import {

  Tooltip,

  TooltipContent,

  TooltipProvider,

  TooltipTrigger,

} from "@/components/ui/tooltip";

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { EnhancedLoader } from "../ui/enhanced-loader";

import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";

import { AuditItemType } from "@/types/reviews_module";

import { getAllReviewWorkflows, submitForReview } from "@/lib/api/review-api";

import { format } from "date-fns";

import ClassificationReviewPanel from "../classification-review/ClassificationReviewPanel";

import axiosInstance from "@/lib/axiosInstance";


import {
  getEvidenceWithMappings,
  linkWorkbookToEvidence,
  unlinkWorkbookFromEvidence,
  type ClassificationEvidence as EvidenceWithMappings
} from "@/lib/api/classificationEvidenceApi";
import { msDriveworkbookApi, db_WorkbookApi } from "@/lib/api/workbookApi";
import { getExtendedTBWithLinkedFiles, deleteWorkbookFromLinkedFilesInExtendedTB, updateLinkedExcelFilesInExtendedTB } from "@/lib/api/extendedTrialBalanceApi";
import { getWorkingPaperWithLinkedFiles, updateLinkedExcelFilesInWP } from "@/lib/api/workingPaperApi";


import ProcedureView from "../procedures/ProcedureView";
import NotebookInterface from "../procedures/NotebookInterface";
import FloatingNotesButton from "../procedures/FloatingNotesButton";
import { PlanningProcedureView } from "../procedures/PlanningProcedureView";
import { CompletionProcedureView } from "../procedures/CompletionProcedureView";
import { ProcedureTypeSelection } from "../procedures/ProcedureTypeSelection";
import { ProcedureGeneration } from "../procedures/ProcedureGeneration";
import { PlanningProcedureGeneration } from "../procedures/PlanningProcedureGeneration";
import { CompletionProcedureGeneration } from "../procedures/CompletionProcedureGeneration";
import WorkBookApp from "../audit-workbooks/WorkBookApp";
import { ExcelViewer } from "../audit-workbooks/ExcelViewer";
import { NEW_CLASSIFICATION_OPTIONS } from "./classificationOptions";
import { AdjustmentManager } from "../adjustments/AdjustmentManager";

import { ReclassificationManager } from "../reclassification/ReclassificationManager";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";



interface ClassificationSectionProps {

  engagement: any;

  classification: string;

  onClose?: () => void;

  onClassificationJump?: (classification: string) => void;

  onReviewStatusChange?: () => void; // Callback to refresh notification counts

  loadExistingData?: () => void; // Callback to refresh ETB data
}

interface ReferenceRowData {

  type: "row";

  reference: { sheetName: string; rowIndex: number; data: any[] };

  // leadSheetRow optional on server shape; we compute locally anyway

  leadSheetRow?: any;

}



interface ReferenceSheetData {

  type: "sheet";

  sheet: { sheetName: string; data: any[][] };

  leadSheetRow?: any;

}



type ReferenceData = ReferenceRowData | ReferenceSheetData | "";



interface ETBRow {

  id: string;

  code: string;

  accountName: string;

  currentYear: number;

  priorYear: number;

  adjustments: number;

  finalBalance: number;

  classification: string;

  reference?: string;

  referenceData?: ReferenceData;

  reclassification?: number;

  grouping1?: string;

  grouping2?: string;

  grouping3?: string;

  grouping4?: string;

}



interface WorksheetRow {

  sheetName: string;

  rowIndex: number;

  data: any[];

}



interface ViewRowData {

  reference: {

    sheetName: string;

    rowIndex: number;

    data: any[];

  };

  leadSheetRow: {

    code: string;

    accountName: string;

    currentYear: number;

    priorYear: number;

    adjustments: number;

    reclassification: number;

    finalBalance: number;

  };

}



// ⬇️ NEW: for viewing full-sheet references

interface ViewSheetData {

  type: "sheet";

  sheet: { sheetName: string; data: any[][] };

  leadSheetRow: {

    code: string;

    accountName: string;

    currentYear: number;

    priorYear: number;

    adjustments: number;

    finalBalance: number;

  };

}



// Evidence-related interfaces

interface EvidenceComment {

  commentor: {

    userId: string;

    name: string;

    email: string;

  };

  comment: string;

  timestamp: string;

}



interface EvidenceFile {

  id: string;

  fileName: string;

  fileUrl: string;

  fileType: string;

  fileSize: number;

  uploadedAt: string;

  uploadedBy: string;

  comments: EvidenceComment[];

  linkedWorkbooks?: any[]; // Array of linked workbooks

  mappings?: any[]; // ✅ Array of mappings for this evidence file

}



// Review-related interfaces

interface ReviewRecord {

  id: string;

  classificationId: string;

  userId: string;

  userName: string;

  timestamp: string;

  comment?: string;

  reviewed: boolean;

  status: 'pending' | 'in-review' | 'signed-off';

  isDone?: boolean; // New field to track if review is marked as done

}



interface ReviewWorkflow {

  classificationId: string;

  engagementId: string;

  reviews: ReviewRecord[];

  isSignedOff: boolean;

  signedOffBy?: string;

  signedOffAt?: string;

}



// 🔹 Auth fetch helper: attaches Supabase Bearer token

async function authFetch(url: string, options: RequestInit = {}) {

  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  const headers = new Headers(options.headers || {});

  if (data.session?.access_token) {

    headers.set("Authorization", `Bearer ${data.session.access_token}`);

  }

  return fetch(url, { ...options, headers });

}



const isTopCategory = (c: string) =>

  ["Equity", "Income", "Expenses"].includes(c);

const isAdjustments = (c: string) => c === "Adjustments";
const isReclassifications = (c: string) => c === "Reclassifications";

const isETB = (c: string) => c === "ETB";



const TOP_CATEGORIES = ["Equity", "Income", "Expenses"];



const shouldHaveWorkingPapers = (classification: string) => {

  return !isETB(classification) && !isAdjustments(classification) && !isReclassifications(classification);

};



const groupByClassification = (

  rows: ETBRow[],

  collapseToTopCategory = false

) => {

  const grouped: Record<string, ETBRow[]> = {};

  for (const r of rows) {

    let key = r.classification || "Unclassified";

    if (collapseToTopCategory && key.includes(" > ")) {

      const top = key.split(" > ")[0];

      if (TOP_CATEGORIES.includes(top)) key = top;

    }

    if (!grouped[key]) grouped[key] = [];

    grouped[key].push(r);

  }

  return grouped;

};



// ✅ Unified display rule

const formatClassificationForDisplay = (c: string) => {

  if (!c) return "—";

  if (isAdjustments(c)) return "Adjustments";
  if (isReclassifications(c)) return "Reclassifications";

  if (isETB(c)) return "Extended Trial Balance";

  const parts = c.split(" > ");

  const top = parts[2];


  return top;

};



/* -----------------------------

   Fullscreen wrapper (Portal)

------------------------------*/

function FullscreenOverlay({

  children,

  onExit,

}: {

  children: React.ReactNode;

  onExit: () => void;

}) {

  // Close on ESC

  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      if (e.key === "Escape") onExit();

    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, [onExit]);



  // Render to body

  return createPortal(

    <div className="fixed inset-0 z-[40]">

      {/* Backdrop */}

      <div

        className="absolute inset-0 bg-black/60 opacity-100 transition-opacity duration-200"

        onClick={onExit}

      />

      {/* Content container */}

      <div className="absolute inset-0 flex p-4 sm:p-6">

        <div

          className="

            relative w-full h-full

            bg-background rounded-xl shadow-xl

            transition-all duration-200

            opacity-100 scale-[1.00]

            border

          "

        >

          {children}

        </div>

      </div>

    </div>,

    document.body

  );

}



// 🧭 small helpers for tab persistence via ?tab=

function getTabFromSearch(): "lead-sheet" | "working-papers" | "evidence" | "procedures" {

  try {

    const sp = new URLSearchParams(window.location.search);

    const t = sp.get("tab");

    if (t === "working-papers") return "working-papers";

    if (t === "evidence") return "evidence";

    if (t === "procedures") return "procedures";

    return "lead-sheet";

  } catch {

    return "lead-sheet";

  }

}

function setTabInSearch(tab: "lead-sheet" | "working-papers" | "evidence" | "procedures") {

  try {

    const url = new URL(window.location.href);

    url.searchParams.set("tab", tab);

    window.history.replaceState({}, "", url.toString());

  } catch {

    // ignore

  }

}

// Helper functions for procedure answers

function normalize(items?: any[]) {

  if (!Array.isArray(items)) return [];

  return items.map((q, i) => {

    const __uid = q.__uid || q.id || q._id || `q_${Math.random().toString(36).slice(2, 10)}_${i}`;

    const id = q.id ?? __uid;

    const key = q.key || q.aiKey || `q${i + 1}`;

    return { ...q, __uid, id, key };

  });

}



function mergeAiAnswers(questions: any[], aiAnswers: any[]) {

  const map = new Map<string, string>();

  (aiAnswers || []).forEach((a) => {

    const k = String(a?.key || "").trim().toLowerCase();

    if (k) map.set(k, a?.answer || "");

  });



  return questions.map((q, i) => {

    const k = String(q.key || `q${i + 1}`).trim().toLowerCase();

    const answer = map.has(k) ? map.get(k) || "" : q.answer || "";

    return { ...q, answer };

  });

}



function replaceClassificationQuestions(all: any[], classification: string, updated: any[]) {

  const others = all.filter((q) => q.classification !== classification);

  return [...others, ...normalize(updated)];

}

// Helper function to split recommendations by classification (similar to ProcedureView)
function splitRecommendationsByClassification(markdown?: string) {
  const map: Record<string, string> = {};
  if (!markdown) return map;

  const lines = markdown.split(/\r?\n/);
  let currentKey: string | null = null;
  let bucket: string[] = [];

  const flush = () => {
    if (currentKey && bucket.length > 0) {
      map[currentKey] = bucket.join("\n").trim();
    }
    bucket = [];
  };

  for (const raw of lines) {
    // Match both formats: *classification* and plain classification headers
    const asteriskMatch = raw.match(/^\s*\*([^*]+)\*\s*$/);
    const plainHeaderMatch = raw.match(/^([A-Za-z][^•\-].*[^:\-])\s*$/); // Match lines that look like headers

    if (asteriskMatch || plainHeaderMatch) {
      // New classification section starts
      flush();
      currentKey = asteriskMatch ? asteriskMatch[1].trim() : plainHeaderMatch[1].trim();
      continue;
    }

    // Skip bullet points that might be mistaken as headers
    const isBulletPoint = /^\s*[-•*]\s+/.test(raw);

    if (!currentKey) {
      // Ignore prelude text or attach it to a special key if needed
      continue;
    }

    // Add content lines (including bullet points) to the current bucket
    if (raw.trim().length > 0) {
      bucket.push(raw);
    }
  }
  flush();
  return map;
}

export const ClassificationSection: React.FC<ClassificationSectionProps> = ({


  engagement,

  classification,

  onClose,

  onClassificationJump,

  onReviewStatusChange,

  loadExistingData,
}) => {
  console.log('classification:', classification);




  // Using Sonner toast (imported at top) instead of shadcn/ui useToast
  // const { toast } = useToast(); // Removed to avoid overriding Sonner toast



  const [reviewClassification, setReviewClassification] = useState("");

  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const [reviewFormRender, setReviewFormRender] = useState(true);

  const [reviewLoading, setreviewLoading] = useState(false);



  // Review Points/Comments state

  const [reviewPointsOpen, setReviewPointsOpen] = useState(false);

  const [reviewComment, setReviewComment] = useState("");

  const [generatingAnswers, setGeneratingAnswers] = useState(false);



  const [procedure, setProcedure] = useState<any | null>(null);

  const [procedureLoading, setProcedureLoading] = useState(false);

  // Procedure type selection state (for Procedures tab) - default to "fieldwork" with "hybrid" mode
  const [selectedProcedureType, setSelectedProcedureType] = useState<"planning" | "fieldwork" | "completion" | null>("fieldwork");
  const [procedureTab, setProcedureTab] = useState<"generate" | "view">("generate");
  const [procedureMode, setProcedureMode] = useState<"manual" | "ai" | "hybrid" | null>("hybrid");
  const [procedureStep, setProcedureStep] = useState<string | null>(null);
  const [planningProcedure, setPlanningProcedure] = useState<any>(null);
  const [fieldworkProcedure, setFieldworkProcedure] = useState<any>(null);
  const [completionProcedure, setCompletionProcedure] = useState<any>(null);
  const [procedureTypeLoading, setProcedureTypeLoading] = useState(false);

  // Create a mock URLSearchParams object that syncs with local state for procedure components
  const procedureSearchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedProcedureType) params.set("procedureType", selectedProcedureType);
    if (procedureTab) params.set("procedureTab", procedureTab);
    if (procedureMode) params.set("mode", procedureMode);
    if (procedureStep) params.set("step", procedureStep);
    return params;
  }, [selectedProcedureType, procedureTab, procedureMode, procedureStep]);

  // Question filter state
  const [questionFilter, setQuestionFilter] = useState<"all" | "unanswered">("all");

  // Editing states for questions/answers
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editAnswerText, setEditAnswerText] = useState("");

  // Notebook state for Audit Recommendations
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Generating states
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingProcedures, setGeneratingProcedures] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [etbId, setEtbId] = useState<string>("");

  const [loading, setLoading] = useState(true); // global loader (ETB / lead-sheet)

  const [wpHydrating, setWpHydrating] = useState(false); // dedicated loader for WP tab pulls

  const [sectionData, setSectionData] = useState<ETBRow[]>([]); // For Lead Sheet tab
  const [workingPaperData, setWorkingPaperData] = useState<ETBRow[]>([]); // For Working Papers tab

  const [viewSpreadsheetUrl, setViewSpreadsheetUrl] = useState<string>("");

  // under other useState hooks

  const [dbBusy, setDbBusy] = useState<null | "save" | "load">(null);

  const [isFullscreen, setIsFullscreen] = useState(false);



  const [workingPapersInitialized, setWorkingPapersInitialized] =

    useState(false);

  const [workingPapersUrl, setWorkingPapersUrl] = useState<string>("");

  const [workingPapersId, setWorkingPapersId] = useState<string>("");

  const [availableSheets, setAvailableSheets] = useState<string[]>([]);

  const [selectedRowForFetch, setSelectedRowForFetch] = useState<ETBRow | null>(

    null

  );

  const [fetchRowsDialog, setFetchRowsDialog] = useState(false);

  const [availableRows, setAvailableRows] = useState<WorksheetRow[]>([]);

  const [selectedRow, setSelectedRow] = useState<WorksheetRow | null>(null);



  const [viewRowDialog, setViewRowDialog] = useState(false);

  const [viewRowData, setViewRowData] = useState<ViewRowData | null>(null);

  const [viewRowLoading, setViewRowLoading] = useState(false);



  // Evidence-related state

  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);

  // ✅ NEW: State to store all classifications from the entire ETB (for global workbook fetching)
  // Initialize with current classification to ensure we always have at least one
  const [allClassificationsFromETB, setAllClassificationsFromETB] = useState<string[]>([classification]);

  // ✅ NEW: Fetch all classifications from the entire ETB (similar to how evidence files work)
  useEffect(() => {
    const fetchAllClassifications = async () => {
      if (!engagement.id) {
        // Ensure we have at least current classification
        setAllClassificationsFromETB([classification]);
        return;
      }

      try {
        const base = import.meta.env.VITE_APIURL;
        if (!base) {
          console.warn("VITE_APIURL is not set");
          // Ensure we have at least current classification
          setAllClassificationsFromETB([classification]);
          return;
        }

        // Fetch all ETB rows to get all classifications
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        const response = await fetch(`${base}/api/engagements/${engagement.id}/etb`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (response.ok) {
          const etbData = await response.json();
          const rows = etbData.rows || [];

          // Extract all unique classifications
          const classifications = new Set<string>();
          classifications.add(classification); // Always include current classification
          rows.forEach((row: any) => {
            if (row.classification) {
              classifications.add(row.classification);
            }
          });

          const allClassKeys = Array.from(classifications);
          setAllClassificationsFromETB(allClassKeys);
          console.log('📚 Fetched all classifications from ETB:', {
            count: allClassKeys.length,
            classifications: allClassKeys.slice(0, 10), // Log first 10
            totalRows: rows.length,
            currentClassification: classification
          });
        } else {
          console.warn('Failed to fetch ETB data, using current classification only');
          setAllClassificationsFromETB([classification]);
        }
      } catch (error) {
        console.error('Error fetching all classifications from ETB:', error);
        // Fallback to current classification
        setAllClassificationsFromETB([classification]);
      }
    };

    fetchAllClassifications();
  }, [engagement.id, classification]); // Re-fetch when engagement or classification changes

  // ✅ NEW: Use allClassificationsFromETB (always has at least current classification)
  const allClassifications = useMemo(() => {
    // allClassificationsFromETB always has at least the current classification
    // If it has more, use all of them; otherwise use current classification
    if (allClassificationsFromETB.length > 0) {
      return allClassificationsFromETB;
    }

    // Final fallback (shouldn't happen, but just in case)
    return [classification];
  }, [allClassificationsFromETB, classification]);

  const handleEvidenceMappingUpdated = (updatedEvidence: any) => {
    if (!updatedEvidence) return;
    const updatedId = updatedEvidence._id || updatedEvidence.id;
    if (!updatedId) return;
    setEvidenceFiles(prev =>
      prev.map(file =>
        file.id === updatedId
          ? {
            ...file,
            linkedWorkbooks: updatedEvidence.linkedWorkbooks || file.linkedWorkbooks,
            mappings: updatedEvidence.mappings || file.mappings,
          }
          : file
      )
    );
  };

  // ✅ MODIFIED: Load ALL evidence files for the engagement (not filtered by classification)
  // Extract loadEvidenceFiles as a reusable function using useCallback
  const loadEvidenceFiles = useCallback(async () => {
    if (!engagement.id) {
      setEvidenceFiles([]);
      return;
    }

    try {
      console.log('Starting to load ALL evidence files for engagement...');
      // ✅ Load all evidence files for the engagement, not just the current classification
      const response = await getAllClassificationEvidence(engagement.id);

      // Convert API response to EvidenceFile format and fetch linked workbooks
      const evidenceFilesPromises = response.evidence.map(async (evidence) => {
        try {
          // Fetch detailed evidence with linked workbooks and mappings
          const detailedEvidence = await getEvidenceWithMappings(evidence._id);

          return {
            id: evidence._id,
            fileName: evidence.evidenceUrl.split('/').pop() || 'Unknown File',
            fileUrl: evidence.evidenceUrl,
            fileType: evidence.evidenceUrl.split('.').pop() || 'unknown',
            fileSize: 0, // Not provided by API
            uploadedAt: evidence.createdAt,
            uploadedBy: evidence.uploadedBy.name,
            comments: evidence.evidenceComments.map(comment => ({
              commentor: {
                userId: comment.commentor.userId,
                name: comment.commentor.name,
                email: comment.commentor.email
              },
              comment: comment.comment,
              timestamp: comment.timestamp
            })),
            linkedWorkbooks: detailedEvidence.linkedWorkbooks || [], // Add linked workbooks
            mappings: detailedEvidence.mappings || [] // ✅ CRITICAL FIX: Add mappings!
          };
        } catch (err) {
          console.warn(`Failed to fetch linked workbooks for evidence ${evidence._id}:`, err);
          // Return evidence without linked workbooks if fetch fails
          return {
            id: evidence._id,
            fileName: evidence.evidenceUrl.split('/').pop() || 'Unknown File',
            fileUrl: evidence.evidenceUrl,
            fileType: evidence.evidenceUrl.split('.').pop() || 'unknown',
            fileSize: 0,
            uploadedAt: evidence.createdAt,
            uploadedBy: evidence.uploadedBy.name,
            comments: evidence.evidenceComments.map(comment => ({
              commentor: {
                userId: comment.commentor.userId,
                name: comment.commentor.name,
                email: comment.commentor.email
              },
              comment: comment.comment,
              timestamp: comment.timestamp
            })),
            linkedWorkbooks: [],
            mappings: [] // ✅ Add mappings to error fallback
          };
        }
      });

      const evidenceFiles: EvidenceFile[] = await Promise.all(evidenceFilesPromises);

      setEvidenceFiles(evidenceFiles);

      console.log(`Loaded ${evidenceFiles.length} evidence files (ALL classifications) with linked workbooks:`, {
        filesWithLinkedWorkbooks: evidenceFiles.filter(f => f.linkedWorkbooks && f.linkedWorkbooks.length > 0).length
      });
    } catch (error: any) {
      console.error('Error loading evidence files:', error);
      toast(error.message || 'Failed to load evidence files', { variant: 'destructive' });
      setEvidenceFiles([]);
    }
  }, [engagement.id]);

  // Helper function to format date for linked files
  const formatDateForLinkedFiles = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Handle viewing a linked workbook (open in new tab)
  const handleViewWorkbookFromEvidence = (workbook: any) => {
    if (workbook.webUrl) {
      window.open(workbook.webUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Workbook URL not available');
    }
  };

  // Handle removing a workbook from evidence
  const handleRemoveWorkbookFromEvidence = async (evidenceId: string, workbookId: string, workbookName: string) => {
    try {
      await unlinkWorkbookFromEvidence(evidenceId, workbookId);

      // Update local state immediately
      setEvidenceFiles(prev =>
        prev.map(file =>
          file.id === evidenceId
            ? {
              ...file,
              linkedWorkbooks: file.linkedWorkbooks?.filter(
                (wb: any) => String(wb._id || wb.id || wb) !== String(workbookId)
              ) || []
            }
            : file
        )
      );

      // Reload evidence files to get updated data from backend
      await loadEvidenceFiles();

      toast.success(`Workbook "${workbookName}" removed from evidence successfully.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove workbook from evidence';
      console.error('Error removing workbook from evidence:', err);
      toast.error(errorMessage);
    }
  };

  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);

  const [filePreviewOpen, setFilePreviewOpen] = useState(false);

  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [newComment, setNewComment] = useState("");



  // File management state

  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  const [editingFileName, setEditingFileName] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [fileToDelete, setFileToDelete] = useState<EvidenceFile | null>(null);

  const [isDeletingFile, setIsDeletingFile] = useState(false);



  // Review-related state

  const [reviewWorkflow, setReviewWorkflow] = useState<ReviewWorkflow | null>(null);

  const [reviewHistoryOpen, setReviewHistoryOpen] = useState(false);

  const [confirmSignoffOpen, setConfirmSignoffOpen] = useState(false);

  const [confirmReverseSignoffOpen, setConfirmReverseSignoffOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [isReversingSignoff, setIsReversingSignoff] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: '', name: '' });

  const [userLoading, setUserLoading] = useState(true);
  const [isReviewDone, setIsReviewDone] = useState(false);



  // ⬇️ NEW: Fetch Tabs state

  const [fetchTabsDialog, setFetchTabsDialog] = useState(false);

  const [availableTabs, setAvailableTabs] = useState<string[]>([]);

  const [selectedTab, setSelectedTab] = useState<string | null>(null);



  // ⬇️ NEW: View full-sheet dialog state

  const [viewSheetDialog, setViewSheetDialog] = useState(false);

  const [viewSheetData, setViewSheetData] = useState<ViewSheetData | null>(

    null

  );

  const [viewSheetLoading, setViewSheetLoading] = useState(false);



  // 🔖 keep the tab stable across refresh / navigation

  const [activeTab, setActiveTab] = useState<"lead-sheet" | "working-papers" | "evidence" | "procedures">(

    () => getTabFromSearch()

  );

  // ⬇️ NEW: Grouping mode state
  const [isGroupingMode, setIsGroupingMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [grouping4Value, setGrouping4Value] = useState<string>("");
  const [leadSheetRefreshTrigger, setLeadSheetRefreshTrigger] = useState(0);
  const [workbookRefreshTrigger, setWorkbookRefreshTrigger] = useState(0);
  useEffect(() => {
    const handleWorkbookLinked = async (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail) return;
      const eventEngagementId = detail.engagementId;
      const eventClassification = detail.classification;

      const currentEngagementId = engagement.id || (engagement as any)?._id;

      if (eventEngagementId === currentEngagementId) {
        // ✅ Refresh lead sheet if it's for the current classification
        // WorkBookApp will automatically refresh its workbooks list via refreshTrigger
        if (eventClassification === classification ||
          eventClassification?.startsWith(`${classification} >`)) {
          setWorkbookRefreshTrigger((prev) => prev + 1);
          await refreshLeadSheetData();
        }
      }
    };

    window.addEventListener('workbook-linked', handleWorkbookLinked as EventListener);
    return () => {
      window.removeEventListener('workbook-linked', handleWorkbookLinked as EventListener);
    };
  }, [engagement?.id, (engagement as any)?._id, classification, refreshLeadSheetData]);

  // Debug: Log when sectionData changes
  useEffect(() => {
    console.log('💡 sectionData state changed:', {
      rowCount: sectionData.length,
      rowsWithLinkedFiles: sectionData.filter(r => r.linkedExcelFiles?.length > 0).length,
      allRows: sectionData.map(r => ({
        code: r.code,
        name: r.accountName,
        linkedCount: r.linkedExcelFiles?.length || 0
      }))
    });
    // Show stack trace to see who called setSectionData
    console.trace('💡 sectionData change - Stack trace:');
  }, [sectionData]);

  // Debug log for workingPaperData changes
  useEffect(() => {
    console.log('💡 workingPaperData state changed:', {
      rowCount: workingPaperData.length,
      rowsWithLinkedFiles: workingPaperData.filter(r => r.linkedExcelFiles?.length > 0).length,
      allRows: workingPaperData.map(r => ({
        code: r.code,
        name: r.accountName,
        linkedCount: r.linkedExcelFiles?.length || 0
      }))
    });
  }, [workingPaperData]);

  // Listen for workbook-linked events from MainDashboard (Workbooks tab)
  useEffect(() => {
    const handleWorkbookLinked = async (event: CustomEvent) => {
      console.log('📣 ClassificationSection: Received workbook-linked event from MainDashboard:', event.detail);

      const { classification: eventClassification, engagementId: eventEngagementId, rowType: eventRowType, evidence: eventEvidence, rowCode } = event.detail;

      // Check if this event is for Evidence tab
      if (eventRowType === 'evidence' && eventEvidence) {
        console.log('📣 ClassificationSection: Evidence workbook linked event received');

        // Update evidenceFiles state IMMEDIATELY with the evidence data from the event
        // The eventEvidence contains the updated evidence with linkedWorkbooks populated
        setEvidenceFiles(prev =>
          prev.map(file =>
            file.id === rowCode
              ? {
                ...file,
                linkedWorkbooks: eventEvidence.linkedWorkbooks || file.linkedWorkbooks,
                mappings: eventEvidence.mappings || file.mappings,
              }
              : file
          )
        );

        console.log('✅ ClassificationSection: Evidence files state updated immediately with linked workbook');

        return; // Return early for evidence - UI is already updated
      }

      // For Lead Sheet/Working Papers, check if this event is relevant to the current classification
      // If the linked workbook's classification starts with our classification, it might be relevant
      // e.g., our classification is "Assets > Non-current > Property, plant and equipment"
      // and the event classification is "Assets > Non-current > Property, plant and equipment > Property, plant and equipment - Cost"
      if (eventEngagementId === engagement._id &&
        (eventClassification === classification || eventClassification?.startsWith(classification + ' >'))) {
        console.log('📣 Event is relevant to current classification - refreshing Lead Sheet data');
        await refreshLeadSheetData();
      } else {
        console.log('📣 Event is not relevant to current classification - ignoring');
      }
    };

    // Add event listener
    window.addEventListener('workbook-linked', handleWorkbookLinked as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('workbook-linked', handleWorkbookLinked as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagement._id, engagement.id, classification]); // Removed loadEvidenceFiles - it's not accessible here

  // ✅ NEW: Listen for evidence-uploaded events from ExcelViewer (when evidence files are uploaded to workbooks)
  useEffect(() => {
    const handleEvidenceUploaded = async (event: CustomEvent) => {
      console.log('📣 ClassificationSection: Received evidence-uploaded event:', event.detail);

      const { engagementId: eventEngagementId } = event.detail;
      const currentEngagementId = engagement.id || (engagement as any)?._id;

      // Only refresh if the event is for the current engagement
      if (eventEngagementId === currentEngagementId) {
        console.log('📣 ClassificationSection: Refreshing evidence files list in background');
        // Refresh evidence files list without switching tabs
        await loadEvidenceFiles();
        console.log('✅ ClassificationSection: Evidence files list refreshed in background');
      } else {
        console.log('📣 ClassificationSection: Event is for different engagement - ignoring');
      }
    };

    // Add event listener
    window.addEventListener('evidence-uploaded', handleEvidenceUploaded as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('evidence-uploaded', handleEvidenceUploaded as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagement.id, (engagement as any)?._id, loadEvidenceFiles]);


  const groupBySubCategory = (data) => {
    const grouped = {};

    data.forEach((item) => {
      const parts = item.classification.split(">").map((p) => p.trim());
      const subCategoryName = parts.length >= 4 ? parts[3] : null; // Group4 else null

      if (!grouped[subCategoryName]) {
        grouped[subCategoryName] = [];
      }
      grouped[subCategoryName].push(item);
    });

    return Object.keys(grouped).map((key) => ({
      subCategoryName: key === "null" ? null : key,
      data: grouped[key],
    }));
  };





  const checkClassificationReview = async () => {

    setreviewLoading(true); // Start loading



    // Early exit if prerequisites are not met

    if (!classification || !engagement) {

      console.warn("Classification or engagement is missing.");

      setreviewLoading(false);

      setIsReviewOpen(true); // Still opening, consider if this is desired behavior on missing data

      return;

    }



    // Set classification state if necessary (reconsider if this is always needed here)

    setReviewClassification(classification);



    try {

      // Fetch all review workflows

      const reviews = await getAllReviewWorkflows();

      const classificationReviewItems = reviews.workflows.filter(

        (item) => item.itemType === "classification-section"

      );



      // Get the section ID for the current classification

      const response = await axiosInstance.get(

        `/api/engagements/${engagement.id

        }/etb/classification/${encodeURIComponent(classification)}`

      );

      const sectionId = response.data.section._id;



      // Check if the section ID already exists in the review items

      const existedInReviews = classificationReviewItems.find(

        (item) => item.itemId === sectionId

      );



      // Update form render state based on existence

      if (existedInReviews) {

        setReviewFormRender(false);

      } else {

        // If it doesn't exist, you might want to explicitly set it to true

        // or ensure its default state is true for rendering

        setReviewFormRender(true); // Example: assuming you want to show the form if it doesn't exist

      }

    } catch (error) {

      console.error("Error checking classification review:", error);

      // Optionally display an error message to the user

    } finally {

      setreviewLoading(false); // Stop loading

      setIsReviewOpen(true); // Always open the review modal, reconsider if conditional

    }

  };





















  useEffect(() => setTabInSearch(activeTab), [activeTab]);





  // 🔒 mounted ref to prevent setting state after unmount

  const mountedRef = useRef(true);

  useEffect(() => {

    mountedRef.current = true;

    return () => {

      mountedRef.current = false;

    };

  }, []);



  // 🔁 AUTO-PULL guard: avoid duplicate pulls for the same classification

  const lastPulledRef = useRef<string | null>(null);



  // NEW: track whether we've already auto-loaded from DB for a given classification

  const wpFirstLoadedRef = useRef<Set<string>>(new Set());



  // 1) On classification change: clear UI immediately, then load fresh data and WP status

  useEffect(() => {

    let cancelled = false;

    const run = async () => {

      if (mountedRef.current) {

        setSectionData([]);

        setWorkingPapersInitialized(false);

        setWorkingPapersUrl("");

        setWorkingPapersId("");

        setAvailableSheets([]);

        setViewRowDialog(false);

        setViewRowData(null);

        // clear new dialogs as well

        setFetchTabsDialog(false);

        setAvailableTabs([]);

        setSelectedTab(null);

        setViewSheetDialog(false);

        setViewSheetData(null);

      }



      const showWpLoader =

        shouldHaveWorkingPapers(classification) &&

        activeTab === "working-papers";

      if (showWpLoader) setWpHydrating(true);

      setLoading(true);



      try {
        // Always show fresh ETB/lead-sheet data first
        await loadSectionData();

        if (shouldHaveWorkingPapers(classification)) {
          // Get WP status so buttons/links are correct
          await checkWorkingPapersStatus();

          // Only hydrate from the Working Papers DB if the user is actually on the WP tab.
          if (activeTab === "working-papers") {
            await loadWorkingPaperFromDB(false); // not silent -> show toast; change to true if you prefer silent
          }
        } else {
          if (!cancelled && mountedRef.current) {
            setWorkingPapersInitialized(false);
            setWorkingPapersUrl("");
            setWorkingPapersId("");
            setAvailableSheets([]);
          }
        }
      } catch (e) {
        // errors already toasted in helpers
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
          setWpHydrating(false);
        }
      }


    };



    run();

    return () => {

      cancelled = true;

    };

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [classification]);



  useEffect(() => {

    const fetchProcedureIfNeeded = async () => {

      if (activeTab !== "procedures") return;

      if (procedure || !engagement?._id) return;



      setProcedureLoading(true);

      try {

        const res = await authFetch(

          `${import.meta.env.VITE_APIURL}/api/procedures/${engagement._id}`

        );

        const json = await res.json();

        setProcedure(json?.procedure ?? json ?? null);

      } catch (err: any) {

        console.error(err);

        setProcedure(null);

        // Gentle toast; it's okay to open the tab even if there's no data yet

        toast.error(`Could not load procedures: ${err?.message || "Please try again."}`);

      } finally {

        setProcedureLoading(false);

      }

    };

    fetchProcedureIfNeeded();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [activeTab, engagement?._id]);

  // Separate load functions for initial loading (matching TrialBalanceTab.tsx exactly)
  const base = import.meta.env.VITE_APIURL;
  const loadFieldworkSimple = async () => {
    try {
      const res = await authFetch(`${base}/api/procedures/${engagement._id}`);
      const data = await res.json();
      // Only set if res.ok AND data.procedure exists AND has questions with content
      if (res.ok && data?.procedure) {
        const procedure = data.procedure;
        // Check if procedure has questions array with content
        if (Array.isArray(procedure.questions) && procedure.questions.length > 0) {
          setFieldworkProcedure(procedure);
        } else {
          // Explicitly set to null if no questions exist (empty array, undefined, or not an array)
          setFieldworkProcedure(null);
        }
      } else {
        // Explicitly set to null if API call failed (404, etc.) or no procedure
        setFieldworkProcedure(null);
      }
    } catch (error) {
      console.error("Error fetching fieldwork procedure:", error);
      // Explicitly set to null on error
      setFieldworkProcedure(null);
    }
  };

  const loadCompletionSimple = async () => {
    try {
      const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}`);
      if (res.ok) {
        const data = await res.json();
        // Only set if data exists and has procedures array with content
        if (data && Array.isArray(data.procedures) && data.procedures.length > 0) {
          setCompletionProcedure(data);
        } else {
          // Explicitly set to null if no procedures exist (empty array, undefined, or not an array)
          setCompletionProcedure(null);
        }
      } else {
        // Explicitly set to null if API call failed (404, etc.)
        setCompletionProcedure(null);
      }
    } catch (error) {
      console.error("Error fetching completion procedure:", error);
      // Explicitly set to null on error
      setCompletionProcedure(null);
    }
  };

  const loadPlanningSimple = async () => {
    try {
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}`);
      if (res.ok) {
        const data = await res.json();
        // Only set if data exists and has procedures array with content
        if (data && Array.isArray(data.procedures) && data.procedures.length > 0) {
          setPlanningProcedure(data);
        } else {
          // Explicitly set to null if no procedures exist (empty array, undefined, or not an array)
          setPlanningProcedure(null);
        }
      } else {
        // Explicitly set to null if API call failed (404, etc.)
        setPlanningProcedure(null);
      }
    } catch (error) {
      console.error("Error fetching planning procedure:", error);
      // Explicitly set to null on error
      setPlanningProcedure(null);
    }
  };

  // Initial load of all procedures when component mounts (matching TrialBalanceTab.tsx exactly)
  useEffect(() => {
    if (!engagement?._id) return;
    loadFieldworkSimple();
    loadPlanningSimple();
    loadCompletionSimple();
  }, [engagement?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load procedures when Procedures tab is opened (additional loading for refresh)
  useEffect(() => {
    if (activeTab === "procedures" && engagement?._id) {
      // Always load all procedures when Procedures tab is active (like TrialBalanceTab.tsx)
      loadFieldworkSimple();
      loadPlanningSimple();
      loadCompletionSimple();
      
      // Set default mode to "hybrid" for fieldwork if not already set
      if (selectedProcedureType === "fieldwork" && !procedureMode) {
        setProcedureMode("hybrid");
        setProcedureStep("0");
      }
    }
  }, [activeTab, engagement?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateAnswersForClassification = async () => {

    if (!procedure || !engagement?._id) return;



    setGeneratingAnswers(true);

    try {

      // Filter questions by classification and remove answers

      const classificationQuestions = procedure.questions

        ?.filter((q: any) => q.classification === classification)

        .map(({ answer, ...rest }) => rest) || []; // This removes the answer property



      const res = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/procedures/ai/classification-answers/separate`,

        {

          method: "POST",

          headers: {

            'Content-Type': 'application/json',

          },

          body: JSON.stringify({

            engagementId: engagement._id,

            questions: classificationQuestions,

            classification: classification,

          }),

        }

      );



      if (!res.ok) throw new Error("Failed to generate answers");



      const data = await res.json();



      let updatedProcedure = { ...procedure };



      if (Array.isArray(data?.aiAnswers)) {

        // Merge just the answers for this classification

        const updatedClassificationQs = mergeAiAnswers(classificationQuestions, data.aiAnswers);

        updatedProcedure.questions = replaceClassificationQuestions(

          procedure.questions,

          classification,

          updatedClassificationQs

        );

      } else if (Array.isArray(data?.questions)) {

        // Some backends return full question payloads

        updatedProcedure.questions = replaceClassificationQuestions(

          procedure.questions,

          classification,

          data.questions

        );

      }



      // Update recommendations if provided

      if (data.recommendations) {

        updatedProcedure.recommendations = data.recommendations;

      }



      setProcedure(updatedProcedure);



      toast.success(`Answers for ${formatClassificationForDisplay(classification)} have been generated.`);

    } catch (error: any) {

      console.error("Generate answers error:", error);

      toast.error(`Generation failed: ${error.message}`);

    } finally {

      setGeneratingAnswers(false);

    }

  };



  // ✅ NEW: Check if answers exist for current classification

  const hasAnswersForClassification = useMemo(() => {

    if (!procedure?.questions) return false;

    return procedure.questions.some(

      (q: any) =>

        q.classification === classification &&

        q.answer &&

        q.answer.trim() !== ""

    );

  }, [procedure, classification]);

  // Get filtered questions for current classification
  const classificationQuestions = useMemo(() => {
    if (!procedure?.questions) return [];
    const filtered = procedure.questions.filter((q: any) => q.classification === classification);
    if (questionFilter === "unanswered") {
      return filtered.filter((q: any) => !q.answer || q.answer.trim() === "");
    }
    return filtered;
  }, [procedure, classification, questionFilter]);

  // Get questions with answers
  const questionsWithAnswers = useMemo(() => {
    if (!procedure?.questions) return [];
    return procedure.questions.filter(
      (q: any) => q.classification === classification && q.answer && q.answer.trim() !== ""
    );
  }, [procedure, classification]);

  // Get unanswered questions
  const unansweredQuestions = useMemo(() => {
    if (!procedure?.questions) return [];
    return procedure.questions.filter(
      (q: any) => q.classification === classification && (!q.answer || q.answer.trim() === "")
    );
  }, [procedure, classification]);

  // Handle add question
  const handleAddQuestion = () => {
    if (!procedure || !engagement?._id) return;
    const newQuestion = {
      id: `new-${Date.now()}`,
      question: "New question",
      answer: "",
      classification: classification,
      isValid: false
    };
    const updatedQuestions = [...(procedure.questions || []), newQuestion];
    setProcedure({ ...procedure, questions: updatedQuestions });
    setEditingQuestionId(newQuestion.id);
    setEditQuestionText(newQuestion.question);
    setEditAnswerText("");
  };

  // Handle edit question
  const handleEditQuestion = (question: any) => {
    setEditingQuestionId(question.id);
    setEditQuestionText(question.question || "");
    setEditAnswerText(question.answer || "");
  };

  // Handle save question
  const handleSaveQuestion = async () => {
    if (!editingQuestionId || !procedure) return;
    const updatedQuestions = procedure.questions.map((q: any) =>
      q.id === editingQuestionId
        ? { ...q, question: editQuestionText, answer: editAnswerText }
        : q
    );
    setProcedure({ ...procedure, questions: updatedQuestions });
    setEditingQuestionId(null);
    setEditQuestionText("");
    setEditAnswerText("");

    // Save to backend
    try {
      const url = `${import.meta.env.VITE_APIURL}/api/procedures/${engagement._id}/section`;
      await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...procedure,
          questions: updatedQuestions,
        }),
      });
      toast.success("Question saved successfully");
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditQuestionText("");
    setEditAnswerText("");
  };

  // Handle delete question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!procedure) return;
    const updatedQuestions = procedure.questions.filter((q: any) => q.id !== questionId);
    setProcedure({ ...procedure, questions: updatedQuestions });

    // Save to backend
    try {
      const url = `${import.meta.env.VITE_APIURL}/api/procedures/${engagement._id}/section`;
      await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...procedure,
          questions: updatedQuestions,
        }),
      });
      toast.success("Question deleted successfully");
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  // Handle add answer for a specific question
  const handleAddAnswer = async (questionId: string) => {
    if (!procedure || !engagement?._id) return;

    setGeneratingAnswers(true);
    try {
      const question = procedure.questions.find((q: any) => q.id === questionId);
      if (!question) return;

      const res = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/procedures/ai/classification-answers/separate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engagementId: engagement._id,
            questions: [{ ...question, answer: undefined }],
            classification: classification,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to generate answer");

      const data = await res.json();
      const updatedQuestions = procedure.questions.map((q: any) => {
        if (q.id === questionId) {
          const aiAnswer = Array.isArray(data?.aiAnswers)
            ? data.aiAnswers.find((a: any) => a.key === q.key)?.answer
            : null;
          return { ...q, answer: aiAnswer || q.answer || "" };
        }
        return q;
      });

      setProcedure({ ...procedure, questions: updatedQuestions });
      toast.success("Answer generated successfully");
    } catch (error: any) {
      toast.error(`Failed to generate answer: ${error.message}`);
    } finally {
      setGeneratingAnswers(false);
    }
  };

  // Generate/Regenerate questions for classification
  const handleGenerateQuestions = async () => {
    if (!engagement?._id) return;

    setGeneratingQuestions(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const res = await authFetch(`${base}/api/procedures/${engagement._id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ai",
          materiality: procedure?.materiality || engagement?.materiality,
          selectedClassifications: [classification],
          validitySelections: {},
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        let errorMessage = "Failed to generate questions"
        try {
          const errorData = errorText ? (errorText.startsWith("{") ? JSON.parse(errorText) : { message: errorText }) : {}
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = errorText?.slice(0, 200) || errorMessage
        }
        if (res.status === 429 || errorMessage.toLowerCase().includes("quota")) {
          errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing and quota limits."
        }
        throw new Error(errorMessage)
      }

      const result = await res.json();
      const generatedQuestions = result?.procedure?.questions || result?.questions || [];

      // Normalize and merge with existing questions
      const normalizedQuestions = normalize(generatedQuestions);

      // Replace questions for this classification
      let updatedQuestions = procedure?.questions || [];
      const otherQuestions = updatedQuestions.filter((q: any) => q.classification !== classification);
      const newQuestions = normalizedQuestions.map((q: any) => ({
        ...q,
        classification: classification,
      }));

      updatedQuestions = [...otherQuestions, ...newQuestions];

      setProcedure({
        ...procedure,
        questions: updatedQuestions,
        materiality: procedure?.materiality || engagement?.materiality,
      });

      toast.success(`Generated ${newQuestions.length} questions for ${formatClassificationForDisplay(classification)}`);
    } catch (error: any) {
      toast.error(`Failed to generate questions: ${error.message}`);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Save answers for classification
  const handleSaveAnswers = async () => {
    if (!procedure || !engagement?._id) return;

    setIsSaving(true);
    try {
      const url = `${import.meta.env.VITE_APIURL}/api/procedures/${engagement._id}/section`;

      // Preserve existing status or use "draft" (valid enum values: "draft" or "completed")
      const currentStatus = procedure.status === "completed" ? "completed" : "draft";

      const response = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...procedure,
          questions: procedure.questions,
          status: currentStatus,
        }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        const updatedProcedure = updatedData.procedure || updatedData;
        setProcedure(updatedProcedure);
        toast.success("Answers saved successfully");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save answers");
      }
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate/Regenerate procedures (questions + answers + recommendations)
  const handleGenerateProcedures = async () => {
    if (!procedure || !engagement?._id) return;

    setGeneratingProcedures(true);
    try {
      const base = import.meta.env.VITE_APIURL;

      // First ensure we have questions
      const classificationQuestions = procedure.questions?.filter(
        (q: any) => q.classification === classification
      ) || [];

      if (classificationQuestions.length === 0) {
        toast.error("Please generate questions first");
        setGeneratingProcedures(false);
        return;
      }

      // Generate answers if not already present
      const questionsWithoutAnswers = classificationQuestions.filter(
        (q: any) => !q.answer || q.answer.trim() === ""
      );

      let updatedQuestions = procedure.questions;

      if (questionsWithoutAnswers.length > 0) {
        // Generate answers first
        const res = await authFetch(
          `${base}/api/procedures/ai/classification-answers/separate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              engagementId: engagement._id,
              questions: questionsWithoutAnswers.map(({ answer, ...rest }) => rest),
              classification: classification,
            }),
          }
        );

        if (!res.ok) throw new Error("Failed to generate answers");
        const answerData = await res.json();

        // Merge answers
        const updatedClassificationQs = mergeAiAnswers(questionsWithoutAnswers, answerData.aiAnswers || []);
        updatedQuestions = replaceClassificationQuestions(
          procedure.questions,
          classification,
          updatedClassificationQs
        );
      }

      // Get questions with answers for recommendations
      const questionsWithAnswers = updatedQuestions.filter(
        (q: any) => q.classification === classification && q.answer && q.answer.trim() !== ""
      );

      // Recommendations are typically generated along with answers
      // If the answer generation returned recommendations, use them
      let finalRecommendations = procedure?.recommendations || [];

      // Update procedure with new questions
      const updatedProcedure = {
        ...procedure,
        questions: updatedQuestions,
        recommendations: finalRecommendations,
        status: "completed",
      };

      setProcedure(updatedProcedure);

      // Save everything
      const saveUrl = `${base}/api/procedures/${engagement._id}/section`;
      await authFetch(saveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProcedure),
      });

      toast.success("Procedures generated and saved successfully");
    } catch (error: any) {
      toast.error(`Failed to generate procedures: ${error.message}`);
    } finally {
      setGeneratingProcedures(false);
    }
  };

  // Get recommendations for current classification
  const recommendationsForClass = useMemo(() => {
    if (!procedure?.recommendations) return [];

    // If recommendations is already an array of checklist items, use it directly
    if (Array.isArray(procedure.recommendations)) {
      return procedure.recommendations.filter((item: any) =>
        item.classification === classification
      );
    }

    // Handle legacy string format
    const text = typeof procedure.recommendations === "string" ? procedure.recommendations : "";
    const byClassFromServer = splitRecommendationsByClassification(text);

    if (!classification) {
      // If no current classification, return empty array
      return [];
    }

    // Normalize classification for matching
    const normalizeClassification = (s: string) => s.toLowerCase().trim();

    let content = "";

    // 1) Exact match on full classification path
    if (byClassFromServer[classification]) {
      content = byClassFromServer[classification];
    } else {
      // 2) Try matching even with minor variations
      for (const key of Object.keys(byClassFromServer)) {
        if (normalizeClassification(key) === normalizeClassification(classification)) {
          content = byClassFromServer[key];
          break;
        }
      }

      // 3) Last resort: Try suffix match for deeper parts of the classification
      if (!content) {
        const leaf = classification.split(">").pop()?.trim() || "";
        const wantLeaf = normalizeClassification(leaf);
        for (const key of Object.keys(byClassFromServer)) {
          const keyLeaf = normalizeClassification(key.split(">").pop() || key);
          if (keyLeaf === wantLeaf) {
            content = byClassFromServer[key];
            break;
          }
        }
      }
    }

    // Convert content to checklist items
    if (content) {
      return content.split('\n')
        .filter(line => line.trim())
        .map((line, index) => ({
          id: `item-${Date.now()}-${index}`,
          text: line.trim(),
          checked: false,
          classification: classification
        }));
    }

    return [];
  }, [procedure?.recommendations, classification]);

  // Handle save recommendations
  const handleSaveRecommendations = async (content: any) => {
    if (!procedure || !engagement?._id) return;

    let finalRecommendations = content;

    if (Array.isArray(procedure?.recommendations)) {
      const otherClassificationRecommendations = procedure.recommendations.filter(
        (item: any) => item.classification !== classification
      );
      finalRecommendations = [
        ...otherClassificationRecommendations,
        ...(Array.isArray(content) ? content : [])
      ];
    }

    try {
      const url = `${import.meta.env.VITE_APIURL}/api/procedures/${engagement._id}/section`;
      await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...procedure,
          recommendations: finalRecommendations,
        }),
      });

      setProcedure({ ...procedure, recommendations: finalRecommendations });
      toast.success("Recommendations saved successfully");
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  // Procedure type selection handlers (for Procedures tab)
  const updateProcedureParams = useCallback((updates: Record<string, string | null>, replace = false) => {
    // Handle local state updates for procedure params
    if (updates.procedureType !== undefined) {
      setSelectedProcedureType(updates.procedureType as "planning" | "fieldwork" | "completion" | null);
    }
    if (updates.procedureTab !== undefined) {
      setProcedureTab((updates.procedureTab as "generate" | "view") || "view");
    }
    if (updates.mode !== undefined) {
      setProcedureMode(updates.mode as "manual" | "ai" | "hybrid" | null);
    }
    if (updates.step !== undefined) {
      setProcedureStep(updates.step || null);
    }
  }, []);

  const handleProcedureButtonClick = (procedureType: "planning" | "fieldwork" | "completion") => {
    setSelectedProcedureType(procedureType);

    // Determine default tab based on whether procedures exist
    let defaultTab: "generate" | "view" = "generate";

    if (procedureType === "planning") {
      const hasQuestions = planningProcedure?.procedures?.some((sec: any) =>
        sec?.fields && Array.isArray(sec.fields) && sec.fields.length > 0
      );
      defaultTab = hasQuestions ? "view" : "generate";
    } else if (procedureType === "fieldwork") {
      const hasQuestions = fieldworkProcedure?.questions &&
        Array.isArray(fieldworkProcedure.questions) &&
        fieldworkProcedure.questions.length > 0;
      defaultTab = hasQuestions ? "view" : "generate";
    } else if (procedureType === "completion") {
      const hasQuestions = completionProcedure?.procedures?.some((sec: any) =>
        sec?.fields && Array.isArray(sec.fields) && sec.fields.length > 0
      );
      defaultTab = hasQuestions ? "view" : "generate";
    }

    setProcedureTab(defaultTab);
    setProcedureMode(null);
    setProcedureStep(null);
    loadProcedure(procedureType);
  };

  const handleProcedureTypeSelect = (type: "planning" | "fieldwork" | "completion") => {
    // Set procedure type and clear mode/step (will be set by the generation component)
    setSelectedProcedureType(type);
    setProcedureTab("generate");
    setProcedureMode(null);
    setProcedureStep(null);
    loadProcedure(type);
  };

  const handleProcedureTypeBack = () => {
    // Hierarchical back navigation (matching TrialBalanceTab.tsx logic)
    // If in tabs view (step === "tabs"), go back to questions step
    if (selectedProcedureType && procedureStep === "tabs") {
      setProcedureTab("generate");
      setProcedureStep("1"); // Go back to questions step (step 1)
      return;
    }

    // If in a numbered step, go back one step or to mode selection
    if (selectedProcedureType && procedureMode && procedureStep) {
      const stepNum = parseInt(procedureStep, 10);

      if (stepNum > 0) {
        // Go back one step
        setProcedureTab("generate");
        setProcedureStep((stepNum - 1).toString());
      } else {
        // At step 0, go back to mode selection (clear step and mode)
        setProcedureTab("generate");
        setProcedureMode(null);
        setProcedureStep(null);
      }
      return;
    }

    // If at mode selection (mode exists but no step), clear mode
    if (selectedProcedureType && procedureMode && !procedureStep) {
      setProcedureTab("generate");
      setProcedureMode(null);
      return;
    }

    // If at procedure type selection (procedureType exists but no mode), clear procedureType
    if (selectedProcedureType && !procedureMode) {
      setProcedureTab("generate");
      setSelectedProcedureType(null);
      return;
    }

    // Fallback: Clear all procedure params
    setProcedureTab("view");
    setSelectedProcedureType(null);
    setProcedureMode(null);
    setProcedureStep(null);
  };

  // Helper function to check if procedures exist for the selected type
  const hasProcedures = useCallback((procedureType: "planning" | "fieldwork" | "completion" | null) => {
    if (!procedureType) return false
    
    if (procedureType === "planning") {
      return !!(planningProcedure?.procedures && Array.isArray(planningProcedure.procedures) && planningProcedure.procedures.length > 0)
    } else if (procedureType === "fieldwork") {
      return !!(fieldworkProcedure?.questions && Array.isArray(fieldworkProcedure.questions) && fieldworkProcedure.questions.length > 0)
    } else if (procedureType === "completion") {
      return !!(completionProcedure?.procedures && Array.isArray(completionProcedure.procedures) && completionProcedure.procedures.length > 0)
    }
    return false
  }, [planningProcedure, fieldworkProcedure, completionProcedure])

  // Helper function to normalize classification strings for comparison (matching ProcedureView.tsx)
  const normalizeClassification = (classification: string): string => {
    if (!classification) return ""
    return classification
      .trim()
      .replace(/\s*>\s*/g, " > ") // Normalize spaces around ">"
      .trim()
  }

  // Helper function to check if a question/procedure matches a classification (matching ProcedureView.tsx filtering logic)
  const matchesClassification = (itemClassification: string | undefined | null, filterClassification: string): boolean => {
    if (!itemClassification || !filterClassification) return false
    
    const normalizedFilter = normalizeClassification(filterClassification)
    const normalizedItem = normalizeClassification(itemClassification)
    
    // 1. Exact match
    if (normalizedItem === normalizedFilter) return true
    
    // 2. Prefix match - item classification is a child of filterClassification
    if (normalizedItem.startsWith(normalizedFilter + " > ")) return true
    
    // 3. Reverse prefix match - filterClassification is a child of item classification
    if (normalizedFilter.startsWith(normalizedItem + " > ")) return true
    
    return false
  }

  // Compute disabled state for View Procedures tab (reactive to procedure state changes)
  // IMPORTANT: Check filtered procedures by classification, not just whether procedures exist
  const isViewProceduresDisabled = useMemo(() => {
    // If no procedure type selected, disable
    if (!selectedProcedureType) return true
    
    // Check based on selected procedure type, filtering by classification
    if (selectedProcedureType === "planning") {
      // If planningProcedure is null, disable
      if (!planningProcedure) return true
      
      // Check if there are procedures that match the classification
      const procedures = planningProcedure.procedures || []
      if (!Array.isArray(procedures) || procedures.length === 0) return true
      
      // Filter procedures by classification - check if any procedure has fields with matching classification
      const matchingProcedures = procedures.filter((proc: any) => {
        // Planning procedures have sections with fields, check if classification matches
        // For now, check if any procedure exists (planning/completion may not filter by classification in the same way)
        // But we should check if there are any fields/questions in the procedures
        return proc?.fields && Array.isArray(proc.fields) && proc.fields.length > 0
      })
      
      return matchingProcedures.length === 0
    } else if (selectedProcedureType === "fieldwork") {
      // If fieldworkProcedure is null, disable
      if (!fieldworkProcedure) return true
      
      // Check if there are questions that match the classification
      const questions = fieldworkProcedure.questions || []
      if (!Array.isArray(questions) || questions.length === 0) return true
      
      // Filter questions by classification (same logic as ProcedureView.tsx)
      const matchingQuestions = questions.filter((q: any) => {
        return matchesClassification(q.classification, classification)
      })
      
      return matchingQuestions.length === 0
    } else if (selectedProcedureType === "completion") {
      // If completionProcedure is null, disable
      if (!completionProcedure) return true
      
      // Check if there are procedures that match the classification
      const procedures = completionProcedure.procedures || []
      if (!Array.isArray(procedures) || procedures.length === 0) return true
      
      // Filter procedures by classification - check if any procedure has fields with matching classification
      const matchingProcedures = procedures.filter((proc: any) => {
        // Completion procedures have sections with fields, check if classification matches
        return proc?.fields && Array.isArray(proc.fields) && proc.fields.length > 0
      })
      
      return matchingProcedures.length === 0
    }
    return true
  }, [selectedProcedureType, planningProcedure, fieldworkProcedure, completionProcedure, classification])

  const handleProcedureTabChange = (tab: "generate" | "view") => {
    // Prevent switching to view tab if no procedures exist
    if (tab === "view" && !hasProcedures(selectedProcedureType)) {
      return
    }
    setProcedureTab(tab);
  };

  // Force generate tab if no procedures exist and user tries to access view tab
  useEffect(() => {
    if (procedureTab === "view" && selectedProcedureType && !hasProcedures(selectedProcedureType)) {
      setProcedureTab("generate")
    }
  }, [procedureTab, selectedProcedureType, hasProcedures])

  const handleRegenerate = () => {
    // Hierarchical back navigation (matching TrialBalanceTab.tsx logic)
    // If in tabs view (step === "tabs"), go back to questions step
    if (selectedProcedureType && procedureStep === "tabs") {
      setProcedureTab("generate");
      setProcedureStep("1"); // Go back to questions step (step 1)
      return;
    }

    // If in a numbered step, go back one step or to mode selection
    if (selectedProcedureType && procedureMode && procedureStep) {
      const stepNum = parseInt(procedureStep, 10);

      if (stepNum > 0) {
        // Go back one step
        setProcedureTab("generate");
        setProcedureStep((stepNum - 1).toString());
      } else {
        // At step 0, go back to mode selection (clear step and mode)
        setProcedureTab("generate");
        setProcedureMode(null);
        setProcedureStep(null);
      }
      return;
    }

    // If at mode selection (mode exists but no step), reset to step 0 with hybrid mode
    if (selectedProcedureType && procedureMode && !procedureStep) {
      setProcedureTab("generate");
      setProcedureMode("hybrid");
      setProcedureStep("0");
      return;
    }

    // If at mode selection (procedureType exists but no mode), set to hybrid mode
    if (selectedProcedureType && !procedureMode) {
      setProcedureTab("generate");
      setProcedureMode("hybrid");
      setProcedureStep("0");
      return;
    }

    // Fallback: Reset to step 0 with hybrid mode (keep procedureType as "fieldwork")
    setProcedureTab("generate");
    setProcedureMode("hybrid");
    setProcedureStep("0");
  };

  const handleCloseProcedure = () => {
    setSelectedProcedureType(null);
    setProcedureTab("view");
    setProcedureMode(null);
    setProcedureStep(null);
  };

  // Load procedure data
  const loadProcedure = async (procedureType: "planning" | "fieldwork" | "completion") => {
    if (!engagement?._id) return;

    setProcedureTypeLoading(true);

    try {
      const base = import.meta.env.VITE_APIURL;

      if (procedureType === "planning") {
        const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}`);
        if (res.ok) {
          const data = await res.json();
          // Only set if data has procedures array with content
          if (data && Array.isArray(data.procedures) && data.procedures.length > 0) {
            setPlanningProcedure(data);
          } else {
            setPlanningProcedure(null);
          }
        } else {
          setPlanningProcedure(null);
        }
      } else if (procedureType === "fieldwork") {
        const res = await authFetch(`${base}/api/procedures/${engagement._id}`);
        const data = await res.json();
        // Only set if res.ok AND data.procedure exists AND has questions with content
        if (res.ok && data?.procedure) {
          const procedure = data.procedure;
          if (Array.isArray(procedure.questions) && procedure.questions.length > 0) {
            setFieldworkProcedure(procedure);
          } else {
            setFieldworkProcedure(null);
          }
        } else {
          setFieldworkProcedure(null);
        }
      } else if (procedureType === "completion") {
        const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}`);
        if (res.ok) {
          const data = await res.json();
          // Only set if data has procedures array with content
          if (data && Array.isArray(data.procedures) && data.procedures.length > 0) {
            setCompletionProcedure(data);
          } else {
            setCompletionProcedure(null);
          }
        } else {
          setCompletionProcedure(null);
        }
      }
    } catch (error) {
      console.error("Error loading procedure:", error);
      toast.error("Failed to load procedure data");
      // Explicitly set to null on error
      if (procedureType === "planning") {
        setPlanningProcedure(null);
      } else if (procedureType === "fieldwork") {
        setFieldworkProcedure(null);
      } else if (procedureType === "completion") {
        setCompletionProcedure(null);
      }
    } finally {
      setProcedureTypeLoading(false);
    }
  };



  const loadSectionData = async () => {
    console.log('🔄 loadSectionData: START for classification:', classification, 'activeTab:', activeTab);

    try {

      if (isAdjustments(classification) || isReclassifications(classification) || isETB(classification)) {

        const etbResp = await authFetch(

          `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`

        );

        if (!etbResp.ok) throw new Error("Failed to load ETB");

        const etb = await etbResp.json();

        const rows: ETBRow[] = Array.isArray(etb.rows) ? etb.rows : [];

        if (!mountedRef.current) return;

        // Store ETB ID for adjustments
        if (etb._id) {
          setEtbId(etb._id);
        }

        setSectionData(

          isAdjustments(classification)

            ? rows

            : rows

        );

        return;

      }



      const endpoint = isTopCategory(classification)

        ? `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/etb/category/${encodeURIComponent(classification)}`

        : `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/etb/classification/${encodeURIComponent(classification)}`;



      const response = await authFetch(endpoint);

      if (!response.ok) throw new Error("Failed to load section data");

      const data = await response.json();

      if (!mountedRef.current) return;

      let rows = Array.isArray(data.rows) ? data.rows : [];

      // Fetch linked files for each row (same logic as ExtendedTBWithWorkbook)
      console.log('ClassificationSection: Fetching linked files for rows:', rows.length);

      const byCode = new Map<string, any>();
      const byId = new Map<string, any>();

      for (const row of rows) {
        if (row.classification) {
          try {
            console.log(`ClassificationSection: Fetching linked files for row ${row.code} with classification: ${row.classification}`);
            const linkedResp = await getExtendedTBWithLinkedFiles(engagement._id, row.classification);
            console.log(`ClassificationSection: Response for row ${row.code}:`, {
              hasRows: !!linkedResp?.rows,
              rowsCount: linkedResp?.rows?.length || 0
            });

            const linkedRow = linkedResp?.rows?.find((lr: any) => lr.code === row.code);

            if (linkedRow) {
              console.log(`ClassificationSection: ✅ Found linked files for row ${row.code}:`, {
                linkedCount: linkedRow.linkedExcelFiles?.length || 0,
                linkedFiles: linkedRow.linkedExcelFiles?.map((f: any) => f.name || f._id)
              });
              byCode.set(String(row.code), linkedRow);
              if (linkedRow._id) byId.set(String(linkedRow._id), linkedRow);
            } else {
              console.warn(`ClassificationSection: ⚠️ No matching row found for code ${row.code} in linked files response`);
            }
          } catch (err) {
            console.error(`ClassificationSection: ❌ Failed to fetch linked files for row ${row.code}:`, err);
          }
        } else {
          console.warn(`ClassificationSection: ⚠️ Row ${row.code} has no classification, skipping linked files fetch`);
        }
      }

      // Merge linked files info
      const merged = rows.map((r) => {
        const match = (r.code && byCode.get(String(r.code))) || (r._id && byId.get(String(r._id)));
        return {
          ...r,
          _id: match?._id ?? r._id,
          linkedExcelFiles: Array.isArray(match?.linkedExcelFiles) ? match.linkedExcelFiles : [],
        };
      });

      console.log('ClassificationSection: Final merged data:', {
        totalRows: merged.length,
        rowsWithLinkedFiles: merged.filter(r => r.linkedExcelFiles?.length > 0).length,
        detailedRows: merged.map(r => ({
          code: r.code,
          name: r.accountName,
          linkedFilesCount: r.linkedExcelFiles?.length || 0,
          linkedFileNames: r.linkedExcelFiles?.map((f: any) => f.name || f._id) || []
        }))
      });

      console.log('ClassificationSection: Updating sectionData state - this will trigger re-render');
      setSectionData(merged);
      console.log('ClassificationSection: sectionData state updated - new state:', {
        totalRows: merged.length,
        firstRow: merged[0] ? {
          code: merged[0].code,
          linkedCount: merged[0].linkedExcelFiles?.length || 0
        } : null
      });
      console.log('🔄 loadSectionData: COMPLETE ✅');

    } catch (error: any) {

      console.error("🔄 loadSectionData: ERROR ❌", error);

      toast.error(`Load failed: ${error.message}`);

    }

  };



  const reloadDataFromETB = async () => {

    setLoading(true);

    try {

      if (isAdjustments(classification) || isReclassifications(classification) || isETB(classification)) {

        await loadSectionData();

        toast.success("Data reloaded from ETB successfully");

        return;

      }



      const endpoint = isTopCategory(classification)

        ? `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/etb/category/${encodeURIComponent(classification)}`

        : `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/etb/classification/${encodeURIComponent(classification)}/reload`;



      const response = await authFetch(endpoint, {

        method: isTopCategory(classification) ? "GET" : "POST",

      });

      if (!response.ok) throw new Error("Failed to reload data from ETB");



      const data = await response.json();

      if (mountedRef.current)

        setSectionData(Array.isArray(data.rows) ? data.rows : []);

      toast.success("Data reloaded from ETB successfully");

    } catch (error: any) {

      console.error("Reload error:", error);

      toast.error(`Reload failed: ${error.message}`);

    } finally {

      if (mountedRef.current) setLoading(false);

    }

  };



  // one helper to cache-bust a url

  function withVersion(rawUrl: string) {

    if (!rawUrl) return rawUrl;

    try {

      const u = new URL(rawUrl);

      u.searchParams.set("v", String(Date.now()));

      return u.toString();

    } catch {

      const join = rawUrl.includes("?") ? "&" : "?";

      return `${rawUrl}${join}v=${Date.now()}`;

    }

  }



  const createViewSpreadsheet = async () => {

    setLoading(true);

    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(classification)}/view-spreadsheet`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ data: sectionData }),

        }

      );

      if (!response.ok) throw new Error("Failed to create view spreadsheet");



      const result = await response.json();

      const freshUrl = withVersion(result.viewUrl);

      if (mountedRef.current) setViewSpreadsheetUrl(freshUrl);



      toast.success("Spreadsheet Saved in Library");

    } catch (error: any) {

      console.error("Create view spreadsheet error:", error);

      toast.error(`Create failed: ${error.message}`);

    } finally {

      if (mountedRef.current) setLoading(false);

    }

  };



  // ⬇️ RETURN status so the caller can decide to auto-pull

  const checkWorkingPapersStatus = async () => {

    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(classification)}/working-papers/status`

      );

      if (response.ok) {

        const data = await response.json();

        if (!mountedRef.current) return;

        setWorkingPapersInitialized(data.initialized);

        setWorkingPapersUrl(data.url || "");

        setWorkingPapersId(data.spreadsheetId || "");

        setAvailableSheets(data.sheets || []);

        return data as {

          initialized: boolean;

          url?: string;

          spreadsheetId?: string;

          sheets?: string[];

        };

      }

    } catch (error) {

      console.error("Error checking working papers status:", error);

    }

  };



  const initializeWorkingPapers = async () => {

    if (activeTab === "working-papers") setWpHydrating(true);

    setLoading(true);

    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(classification)}/working-papers/init`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ leadSheetData: sectionData }),

        }

      );



      if (!response.ok) throw new Error("Failed to initialize working papers");



      const result = await response.json();

      if (!mountedRef.current) return;



      setWorkingPapersInitialized(true);

      setWorkingPapersUrl(result.url);

      setWorkingPapersId(result.spreadsheetId);

      setAvailableSheets(result.sheets || []);

      lastPulledRef.current = null;



      window.open(result.url, "_blank", "noopener,noreferrer");



      toast.success("Working papers initialized with lead sheet data");

    } catch (error: any) {

      console.error("Initialize working papers error:", error);

      toast.error(`Initialize failed: ${error.message}`);

    } finally {

      if (mountedRef.current) {

        setLoading(false);

        setWpHydrating(false);

      }

    }

  };

  // Save Working Paper (DB)

  // Add optional override param

  const saveWorkingPaperToDB = async (rowsOverride?: ETBRow[]) => {

    const onWpTab = activeTab === "working-papers";

    if (onWpTab) setWpHydrating(true); // or dbBusy('save') if you added it

    else setLoading(true);



    try {

      const payload = Array.isArray(rowsOverride) ? rowsOverride : sectionData;



      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(classification)}/working-papers/db`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ rows: payload }),

        }

      );

      if (!response.ok) throw new Error("Failed to save Working Paper to DB");

      toast.success("Working Paper saved to database.");

    } catch (error: any) {

      console.error("Save WP to DB error:", error);

      toast.error(`Save failed: ${error.message}`);

    } finally {

      if (onWpTab) setWpHydrating(false);

      else if (mountedRef.current) setLoading(false);

    }

  };



  // Load Working Paper (DB) — returns boolean

  const loadWorkingPaperFromDB = async (silent = false): Promise<boolean> => {
    console.log('🔄 loadWorkingPaperFromDB: START for classification:', classification, 'silent:', silent, 'activeTab:', activeTab);
    console.trace('🔄 loadWorkingPaperFromDB: Called from:');
    const onWpTab = activeTab === "working-papers";

    // GUARD: Don't overwrite Lead Sheet data when on Lead Sheet tab!
    if (!onWpTab && activeTab === "lead-sheet") {
      console.log('🔄 loadWorkingPaperFromDB: SKIPPED - on Lead Sheet tab, preventing data overwrite');
      return false;
    }

    if (onWpTab) setDbBusy("load");
    else setLoading(true);

    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/db`
      );
      console.log('🔄 loadWorkingPaperFromDB: API response status:', response.status);

      if (response.ok) {
        const json = await response.json();
        if (!mountedRef.current) return false;

        // ✅ Only replace sectionData if we're actually viewing Working Papers
        if (onWpTab) {
          const rows = Array.isArray(json.rows) ? json.rows : [];

          console.log('ClassificationSection: Fetching linked files for Working Paper rows:', {
            totalRows: rows.length,
            classification
          });

          // Fetch linked files for each row (same as Lead Sheet)
          const rowsWithLinkedFiles = await Promise.all(
            rows.map(async (row: any) => {
              try {
                const rowClassification = row.classification || classification;
                console.log(`ClassificationSection: Fetching linked files for WP row ${row.code}:`, {
                  rowClassification,
                  engagementId: engagement.id || engagement._id
                });

                const linkedFilesData = await getWorkingPaperWithLinkedFiles(
                  engagement.id || engagement._id,
                  rowClassification
                );

                console.log(`ClassificationSection: API returned for row ${row.code}:`, {
                  hasData: !!linkedFilesData,
                  hasRows: !!linkedFilesData?.rows,
                  rowsCount: linkedFilesData?.rows?.length || 0,
                  allRowCodes: linkedFilesData?.rows?.map((r: any) => r.code)
                });

                const linkedRow = linkedFilesData.rows.find((r: any) => r.code === row.code);
                const linkedFiles = linkedRow?.linkedExcelFiles || [];

                console.log(`ClassificationSection: Row ${row.code} has ${linkedFiles.length} linked files:`, {
                  linkedFiles: linkedFiles.map((f: any) => ({ id: f._id, name: f.name }))
                });

                return {
                  ...row,
                  linkedExcelFiles: linkedFiles
                };
              } catch (err) {
                console.error(`Failed to fetch linked files for WP row ${row.code}:`, err);
                return { ...row, linkedExcelFiles: [] };
              }
            })
          );

          console.log('ClassificationSection: Total rows with linked files:', {
            totalRows: rowsWithLinkedFiles.length,
            rowsWithLinkedFiles: rowsWithLinkedFiles.filter(r => r.linkedExcelFiles?.length > 0).length
          });

          setWorkingPaperData(rowsWithLinkedFiles); // ✅ Use separate state for WP
          console.log('🔄 loadWorkingPaperFromDB: workingPaperData updated ✅');
        }

        if (!silent) {
          toast.success("Working Paper loaded from database.");
        }
        console.log('🔄 loadWorkingPaperFromDB: COMPLETE ✅');
        return true;
      } else {
        if (!silent && response.status !== 404) {
          toast.error(`Load failed (${response.status})`);
        }
        return false;
      }
    } catch (error: any) {
      if (!silent) {
        console.error("Load WP from DB error:", error);
        toast.error(`Load failed: ${error.message}`);
      }
      return false;
    } finally {
      if (onWpTab) setDbBusy(null);
      else if (mountedRef.current) setLoading(false);
    }
  };




  const pushToWorkingPapers = async () => {

    if (activeTab === "working-papers") setWpHydrating(true);

    else setLoading(true);

    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(classification)}/working-papers/push`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ data: sectionData }),

        }

      );



      if (!response.ok) throw new Error("Failed to push to working papers");



      toast.success("Changes pushed to working papers successfully");

    } catch (error: any) {

      console.error("Push to working papers error:", error);

      toast.error(`Push failed: ${error.message}`);

    } finally {

      if (mountedRef.current) {

        if (activeTab === "working-papers") setWpHydrating(false);

        else setLoading(false);

      }

    }

  };



  // 🔧 pull now supports an explicit loader mode so WP tab can show its own loader

  const pullFromWorkingPaper = async (

    clas: string,

    opts?: { mode?: "global" | "wp" }

  ) => {

    const mode =

      opts?.mode || (activeTab === "working-papers" ? "wp" : "global");

    if (mode === "wp") setWpHydrating(true);

    else setLoading(true);



    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(clas)}/working-papers/pull`,

        { method: "POST" }

      );



      if (!response.ok) throw new Error("Failed to pull from working papers");



      const result = await response.json();

      if (!mountedRef.current) return;

      setSectionData(result.rows);

      setAvailableSheets(result.sheets || []);



      toast.success("Changes pulled from working papers successfully");

    } catch (error: any) {

      console.error("Pull from working papers error:", error);

      toast.error(`Pull failed: ${error.message}`);

    } finally {

      if (mountedRef.current) {

        if (mode === "wp") setWpHydrating(false);

        else setLoading(false);

      }

    }

  };



  const fetchRowsFromSheets = async (row: ETBRow) => {

    setSelectedRowForFetch(row);

    if (activeTab === "working-papers") setWpHydrating(true);

    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(

          classification

        )}/working-papers/fetch-rows`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ rowId: row.id }),

        }

      );



      if (!response.ok) throw new Error("Failed to fetch rows from sheets");



      const result = await response.json();

      if (!mountedRef.current) return;

      setAvailableRows(result.rows);

      setFetchRowsDialog(true);

    } catch (error: any) {

      console.error("Fetch rows error:", error);

      toast.error(`Fetch failed: ${error.message}`);

    } finally {

      if (mountedRef.current) setWpHydrating(false);

    }

  };



  const selectRowFromSheets = async () => {

    if (!selectedRow || !selectedRowForFetch) return;

    if (activeTab === "working-papers") setWpHydrating(true);



    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(

          classification

        )}/working-papers/select-row`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ rowId: selectedRowForFetch.id, selectedRow }),

        }

      );



      if (!response.ok) throw new Error("Failed to select row");

      const result = await response.json();

      if (!mountedRef.current) return;



      setSectionData(result.rows);

      await saveWorkingPaperToDB(result.rows); // <-- pass fresh rows

      await loadWorkingPaperFromDB(true); // optional silent reload



      setFetchRowsDialog(false);

      setSelectedRow(null);

      setSelectedRowForFetch(null);

      toast.success("Row selected and data updated");

    } catch (error: any) {

      console.error("Select row error:", error);

      toast.error(`Select failed: ${error.message}`);

    } finally {

      if (mountedRef.current) {

        setWpHydrating(false);

        setFetchRowsDialog(false);

      }

    }

  };



  // ⬇️ NEW: Fetch list of worksheet tabs (excluding Sheet1)

  const fetchTabsForRow = async (row: ETBRow) => {

    setSelectedRowForFetch(row);

    if (activeTab === "working-papers") setWpHydrating(true);

    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(

          classification

        )}/working-papers/fetch-tabs`,

        { method: "POST" }

      );

      if (!response.ok) throw new Error("Failed to fetch tabs");

      const result = await response.json();

      if (!mountedRef.current) return;

      setAvailableTabs(Array.isArray(result.tabs) ? result.tabs : []);

      setSelectedTab(null);

      setFetchTabsDialog(true);

    } catch (error: any) {

      console.error("Fetch tabs error:", error);

      toast.error(`Fetch failed: ${error.message}`);

    } finally {

      if (mountedRef.current) setWpHydrating(false);

    }

  };



  const selectTabForRow = async () => {

    if (!selectedTab || !selectedRowForFetch) return;

    if (activeTab === "working-papers") setWpHydrating(true);

    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(

          classification

        )}/working-papers/select-tab`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            rowId: selectedRowForFetch.id,

            sheetName: selectedTab,

          }),

        }

      );

      if (!response.ok) throw new Error("Failed to select sheet");

      const result = await response.json();

      if (!mountedRef.current) return;



      // Update UI and save the exact rows you just got back

      setSectionData(result.rows);

      await saveWorkingPaperToDB(result.rows); // <-- pass fresh rows

      await loadWorkingPaperFromDB(true); // optional silent reload to hydrate referenceData



      setFetchTabsDialog(false);

      setSelectedTab(null);

      setSelectedRowForFetch(null);

      toast.success("Sheet selected. Reference updated.");

    } catch (error: any) {

      console.error("Select tab error:", error);

      toast.error(`Select failed: ${error.message}`);

    } finally {

      if (mountedRef.current) {

        setWpHydrating(false);

        setFetchTabsDialog(false);

      }

    }

  };



  const viewSelectedRow = async (row: ETBRow) => {

    // Prefer DB-hydrated referenceData (no network roundtrip)

    const refData = row.referenceData;



    // Build the lead-sheet row payload once

    const leadSheetRow = {

      code: row.code || "",

      accountName: row.accountName || "",

      currentYear: Number(row.currentYear) || 0,

      priorYear: Number(row.priorYear) || 0,

      adjustments: Number(row.adjustments) || 0,

      finalBalance: Number(row.finalBalance) || 0,

    };



    // 1) If we have a full-sheet reference in DB

    if (

      refData &&

      typeof refData === "object" &&

      (refData as any).type === "sheet"

    ) {

      const payload = refData as ReferenceSheetData;

      setViewSheetData({

        type: "sheet",

        sheet: {

          sheetName: payload.sheet.sheetName,

          data: payload.sheet.data || [],

        },

        leadSheetRow,

      });

      setViewSheetDialog(true);

      return;

    }



    // 2) If we have a row reference in DB

    if (

      refData &&

      typeof refData === "object" &&

      (refData as any).type === "row"

    ) {

      const payload = refData as ReferenceRowData;

      setViewRowData({

        reference: {

          sheetName: payload.reference.sheetName,

          rowIndex: payload.reference.rowIndex,

          data: payload.reference.data || [],

        },

        leadSheetRow,

      });

      setViewRowDialog(true);

      return;

    }



    // 3) Legacy fallback: no referenceData yet -> use existing endpoints (kept unchanged)

    if (!row.reference) {

      toast.error("No reference set for this row.");

      return;

    }



    // If the reference is a full-sheet ref like "Sheet:Summary", use the new endpoint

    if (

      typeof row.reference === "string" &&

      row.reference.startsWith("Sheet:")

    ) {

      if (activeTab === "working-papers") setWpHydrating(true);

      setViewSheetLoading(true);

      try {

        const response = await authFetch(

          `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

          }/sections/${encodeURIComponent(

            classification

          )}/working-papers/view-reference`,

          {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ rowId: row.id }),

          }

        );

        if (!response.ok) throw new Error("Failed to view sheet reference");

        const result = await response.json();

        if (!mountedRef.current) return;

        setViewSheetData(result);

        setViewSheetDialog(true);

      } catch (error: any) {

        console.error("View sheet error:", error);

        toast.error(`View failed: ${error.message}`);

      } finally {

        if (mountedRef.current) {

          setViewSheetLoading(false);

          setWpHydrating(false);

        }

      }

      return;

    }



    // Row-level legacy endpoint

    if (activeTab === "working-papers") setWpHydrating(true);

    setViewRowLoading(true);

    try {

      const response = await authFetch(

        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id

        }/sections/${encodeURIComponent(

          classification

        )}/working-papers/view-row`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ rowId: row.id }),

        }

      );

      if (!response.ok) throw new Error("Failed to view selected row");

      const result = await response.json();

      if (!mountedRef.current) return;

      setViewRowData(result);

      setViewRowDialog(true);

    } catch (error: any) {

      console.error("View row error:", error);

      toast.error(`View failed, Does the Row Exist?: ${error.message}`);

    } finally {

      if (mountedRef.current) {

        setViewRowLoading(false);

        setWpHydrating(false);

      }

    }

  };



  const totals = useMemo(

    () => {
      // ✅ CRITICAL: Sum original values first (preserve precision), then round the final total
      // This prevents rounding errors that occur when rounding each value before summing
      const rawTotals = sectionData.reduce(

        (acc, row) => ({

          currentYear: acc.currentYear + (Number(row.currentYear) || 0),

          priorYear: acc.priorYear + (Number(row.priorYear) || 0),

          adjustments: acc.adjustments + (Number(row.adjustments) || 0),

          reclassification: acc.reclassification + (Number(row.reclassification) || 0),

          finalBalance: acc.finalBalance + (Number(row.finalBalance) || 0),

        }),

        { currentYear: 0, priorYear: 0, adjustments: 0, reclassification: 0, finalBalance: 0 }

      );

      // Round the final totals (not individual values)
      return {
        currentYear: Math.round(rawTotals.currentYear),
        priorYear: Math.round(rawTotals.priorYear),
        adjustments: Math.round(rawTotals.adjustments),
        reclassification: Math.round(rawTotals.reclassification),
        finalBalance: Math.round(rawTotals.finalBalance),
      };
    },

    [sectionData]

  );



  // Grouping for Adjustments view

  const groupedForAdjustments = useMemo(

    () =>

      isAdjustments(classification)

        ? groupByClassification(sectionData, true)

        : {},

    [classification, sectionData]

  );



  // Load current user from Supabase auth

  useEffect(() => {

    const getCurrentUser = async () => {

      try {

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {

          console.error('Error getting current user:', error);

          return;

        }



        if (user) {

          // Get user profile data

          const { data: profile, error: profileError } = await supabase

            .from('profiles')

            .select('*')

            .eq('id', user.id)

            .single();



          if (profileError) {

            console.error('Error getting user profile:', profileError);

            // Fallback to basic user data

            setCurrentUser({

              id: user.id,

              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

            });

          } else {

            setCurrentUser({

              id: user.id,

              name: profile.full_name || profile.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

            });

          }

        }

      } catch (error) {

        console.error('Error loading current user:', error);

        // Fallback to a default user

        setCurrentUser({

          id: 'default-user',

          name: 'Current User'

        });

      } finally {

        setUserLoading(false);

      }

    };



    getCurrentUser();

  }, []);






  // Load evidence files when engagement changes
  useEffect(() => {
    loadEvidenceFiles();
  }, [loadEvidenceFiles]); // ✅ Use loadEvidenceFiles as dependency since it's memoized with useCallback

  // ✅ NEW: Load ALL workbooks for the engagement (not filtered by classification)


  // Load review workflow when classification changes

  useEffect(() => {

    if (!classification) {

      setReviewWorkflow({

        classificationId: classification,

        engagementId: engagement.id,

        reviews: [],

        isSignedOff: false

      });

      return;

    }



    let isMounted = true;



    const loadWorkflow = async () => {

      try {

        console.log('Starting to load review workflow...');

        await loadReviewWorkflow();

      } catch (error: any) {

        console.error('Error loading review workflow:', error);

        if (isMounted) {

          toast(error.message || 'Failed to load review workflow', { variant: 'destructive' });

          setReviewWorkflow({

            classificationId: classification,

            engagementId: engagement.id,

            reviews: [],

            isSignedOff: false

          });

        }

      }

    };



    loadWorkflow();



    return () => {

      isMounted = false;

    };

  }, [classification]);



  // NEW: when switching to the Working Papers tab for the FIRST time on a classification,

  // load rows from DB and show them.

  useEffect(() => {

    const doFirstLoad = async () => {

      if (

        activeTab === "working-papers" &&


        shouldHaveWorkingPapers(classification) &&
        !wpFirstLoadedRef.current.has(classification)

      ) {

        wpFirstLoadedRef.current.add(classification);

        await checkWorkingPapersStatus();

        await loadWorkingPaperFromDB(false);

      }


    };

    doFirstLoad();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [activeTab, classification]);



  // Global loader (covers Lead Sheet / ETB loads and first mount)

  if (loading && activeTab !== "working-papers") {

    return (

      <div className="flex items-center justify-center h-64">

        <EnhancedLoader

          variant="pulse"

          size="lg"

          text="Loading Classifications..."

        />

      </div>

    );

  }



  const headerActions = (

    <div className="flex items-center gap-2 flex-wrap">

      <TooltipProvider delayDuration={200}>

        <Tooltip>

          <TooltipTrigger asChild>

            <Button

              variant="outline"

              size="icon"

              className="h-9 w-9 bg-transparent"

              onClick={() => setIsFullscreen((v) => !v)}
            >

              {isFullscreen ? (

                <Minimize2 className="h-4 w-4" />

              ) : (

                <Maximize2 className="h-4 w-4" />

              )}

            </Button>

          </TooltipTrigger>

          <TooltipContent side="bottom" align="center">

            {isFullscreen ? "Exit full screen" : "Full screen"}

          </TooltipContent>

        </Tooltip>



        <Tooltip>

          <TooltipTrigger asChild>

            <Button onClick={reloadDataFromETB} variant="outline" size="sm" disabled={reviewWorkflow?.isSignedOff}>

              <RefreshCw className="h-4 w-4 mr-2" />

              <span className="hidden sm:inline">Reload Data</span>

              <span className="sm:hidden">Reload</span>

            </Button>

          </TooltipTrigger>

          <TooltipContent side="bottom" align="center">

            Reload rows from ETB

          </TooltipContent>

        </Tooltip>



        <Tooltip>

          <TooltipTrigger asChild>

            <Button

              onClick={createViewSpreadsheet}

              disabled={sectionData.length === 0 || reviewWorkflow?.isSignedOff}

              size="sm"

              variant="outline"

            >

              <ExternalLink className="h-4 w-4 mr-2" />

              <span className="hidden sm:inline">Save As Spreadsheet</span>

              <span className="sm:hidden">Save</span>

            </Button>

          </TooltipTrigger>

          <TooltipContent side="bottom" align="center">

            Save this section as a view-only spreadsheet

          </TooltipContent>

        </Tooltip>

      </TooltipProvider>

    </div>

  );

  const workingPapersActions = (

    <div className="flex items-center gap-2">

      <TooltipProvider delayDuration={200}>

        {!workingPapersInitialized ? (

          <Tooltip>

            <TooltipTrigger asChild>

              <Button

                onClick={initializeWorkingPapers}

                size="sm"

                disabled={wpHydrating}

              >

                <Plus className="h-4 w-4 mr-2" />

                Initialize

              </Button>

            </TooltipTrigger>

            <TooltipContent side="bottom" align="center">

              Initialize working papers with lead sheet data

            </TooltipContent>

          </Tooltip>

        ) : (

          <>

            <Tooltip>

              <TooltipTrigger asChild>

                <Button

                  onClick={pushToWorkingPapers}

                  variant="outline"

                  size="sm"

                  disabled={wpHydrating}

                >

                  <Upload className="h-4 w-4 mr-2" />

                  Push

                </Button>

              </TooltipTrigger>

              <TooltipContent side="bottom" align="center">

                Push changes to working papers

              </TooltipContent>

            </Tooltip>



            <Tooltip>

              <TooltipTrigger asChild>

                <Button

                  onClick={() =>

                    pullFromWorkingPaper(classification, { mode: "wp" })

                  }

                  variant="outline"

                  size="sm"

                  disabled={wpHydrating}

                >

                  <Download className="h-4 w-4 mr-2" />

                  Pull

                </Button>

              </TooltipTrigger>

              <TooltipContent side="bottom" align="center">

                Pull changes from working papers

              </TooltipContent>

            </Tooltip>



            {workingPapersUrl && (

              <Tooltip>

                <TooltipTrigger asChild>

                  <Button

                    onClick={() =>

                      window.open(

                        workingPapersUrl,

                        "_blank",

                        "noopener,noreferrer"

                      )

                    }

                    variant="outline"

                    size="sm"

                    disabled={wpHydrating}

                  >

                    <FileSpreadsheet className="h-4 w-4 mr-2" />

                    Open Excel

                  </Button>

                </TooltipTrigger>

                <TooltipContent side="bottom" align="center">

                  Open working papers in Excel

                </TooltipContent>

              </Tooltip>

            )}



            {/* NEW: Save to DB */}

            <Tooltip>

              <TooltipTrigger asChild>

                <Button

                  onClick={saveWorkingPaperToDB}

                  size="sm"

                  variant="outline"

                  disabled={wpHydrating || sectionData.length === 0}

                >

                  <Save className="h-4 w-4 mr-2" />

                  Save Working Papers

                </Button>

              </TooltipTrigger>

              <TooltipContent side="bottom" align="center">

                Save current Working Paper rows to the database

              </TooltipContent>

            </Tooltip>



            {/* NEW: Load from DB */}

            <Tooltip>

              <TooltipTrigger asChild>

                <Button

                  onClick={() => loadWorkingPaperFromDB(false)}

                  size="sm"

                  variant="outline"

                  disabled={wpHydrating}

                >

                  <RefreshCw className="h-4 w-4 mr-2" />

                  Load from DB

                </Button>

              </TooltipTrigger>

              <TooltipContent side="bottom" align="center">

                Load saved Working Paper rows from the database

              </TooltipContent>

            </Tooltip>

          </>

        )}

      </TooltipProvider>

    </div>

  );



  // Special content for Reclassifications
  if (isReclassifications(classification) && etbId) {
    return (
      <div className="h-full flex flex-col">
        <ReclassificationManager
          engagement={engagement}
          etbRows={sectionData}
          etbId={etbId}
        />
      </div>
    );
  }

  // Special content for Adjustments
  if (isAdjustments(classification) && etbId) {
    return (
      <div className="h-full flex flex-col">
        <AdjustmentManager
          engagement={engagement}
          etbRows={sectionData}
          etbId={etbId}
        />
      </div>
    );
  }

  const content = (

    <Card className="flex-1">

      {reviewWorkflow?.isSignedOff && (

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">

          <div className="flex items-center gap-2">

            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium">

              ✓

            </div>

            <div>

              <div className="font-medium text-green-800">Classification Signed Off</div>

              <div className="text-xs text-green-600">

                By {reviewWorkflow.signedOffBy} on {new Date(reviewWorkflow.signedOffAt!).toLocaleString()}

              </div>

            </div>

          </div>

        </div>

      )}



      <CardHeader>

        <div className="space-y-4">

          {/* Title and Account Count */}

          <div className="flex items-center justify-between">

            <div>

              <CardTitle className="text-lg">

                {formatClassificationForDisplay(classification)}

              </CardTitle>

              <Badge variant="outline" className="mt-1">

                {sectionData.length}{" "}

                {sectionData.length === 1 ? "account" : "accounts"}

              </Badge>

            </div>

          </div>



          {/* Review Buttons Row */}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div className="flex items-center gap-2 flex-wrap">

              {renderReviewButtons()}

            </div>

            <div className="flex items-center gap-2 flex-wrap">

              {headerActions}

            </div>

          </div>

        </div>

      </CardHeader>



      <CardContent className="flex-1 flex flex-col">

        {shouldHaveWorkingPapers(classification) ? (

          <Tabs

            value={activeTab}

            onValueChange={(v) => setActiveTab(v as any)}

            className="flex-1 flex flex-col"

          >

            <TabsList className="grid w-full grid-cols-4">

              <TabsTrigger value="lead-sheet">Lead Sheet</TabsTrigger>

              {/* <TabsTrigger value="working-papers">Working Papers</TabsTrigger> */}

              <TabsTrigger value="evidence">Evidence</TabsTrigger>

              <TabsTrigger value="procedures">Procedures</TabsTrigger>

              <TabsTrigger value="work-book">WorkBook</TabsTrigger>



            </TabsList>



            <TabsContent value="lead-sheet" className="flex-1 flex flex-col">

              {loading ? (

                <div className="flex items-center justify-center h-64">

                  <EnhancedLoader

                    variant="pulse"

                    size="lg"

                    text="Loading Lead Sheet..."

                  />

                </div>

              ) : (

                renderLeadSheetContent()

              )}

            </TabsContent>



            <TabsContent

              value="working-papers"

              className="flex-1 flex flex-col"

            >

              <div className="flex items-center justify-between mb-4">

                <h3 className="text-lg font-medium">Working Papers</h3>

                {workingPapersActions}

              </div>



              {/* WP-specific loader */}

              {wpHydrating || dbBusy ? (

                <div className="flex items-center justify-center h-64">

                  <EnhancedLoader

                    variant={dbBusy ? "pulse" : "glow"}

                    size="lg"

                    text={

                      dbBusy === "save"

                        ? "Saving Working Papers to database..."

                        : dbBusy === "load"

                          ? "Loading Working Papers from database..."

                          : "Syncing Working Papers..."

                    }

                  />

                </div>

              ) : workingPapersInitialized ? (

                renderWorkingPapersContent()

              ) : (

                renderWorkingPapersEmpty()

              )}

            </TabsContent>



            <TabsContent

              value="evidence"

              className="flex-1 flex flex-col"

            >

              <div className="flex items-center justify-between mb-4">

                <h3 className="text-lg font-medium">Evidence</h3>

              </div>

              {renderEvidenceContent()}

            </TabsContent>



            {/* ✅ NEW: Procedures Tab renders only THIS classification */}

            <TabsContent value="procedures" className="flex-1 flex flex-col">
              {/* Procedure Content with Generate/View Tabs - Always show like TrialBalanceTab.tsx */}
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50/80">
                  <div className="flex items-center gap-3">
                    {selectedProcedureType && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl bg-white border border-gray-200 text-brand-body hover:bg-gray-100 hover:text-brand-body shadow-sm"
                        aria-label="Back"
                        onClick={() => {
                          // Hierarchical back navigation (matching TrialBalanceTab.tsx)
                          // If in tabs view (step === "tabs"), go back to questions step
                          if (selectedProcedureType && procedureStep === "tabs") {
                            setProcedureTab("generate");
                            setProcedureStep("1"); // Go back to questions step (step 1)
                            return;
                          }

                          // If in a numbered step, go back one step or to mode selection
                          if (selectedProcedureType && procedureMode && procedureStep) {
                            const stepNum = parseInt(procedureStep, 10);

                            if (stepNum > 0) {
                              // Go back one step
                              setProcedureTab("generate");
                              setProcedureStep((stepNum - 1).toString());
                            } else {
                              // At step 0, go back to mode selection (clear step and mode)
                              setProcedureTab("generate");
                              setProcedureMode(null);
                              setProcedureStep(null);
                            }
                            return;
                          }

                          // If at mode selection (mode exists but no step), reset to step 0 with hybrid mode
                          if (selectedProcedureType && procedureMode && !procedureStep) {
                            setProcedureTab("generate");
                            setProcedureMode("hybrid");
                            setProcedureStep("0");
                            return;
                          }

                          // If at mode selection (procedureType exists but no mode), set to hybrid mode
                          if (selectedProcedureType && !procedureMode) {
                            setProcedureTab("generate");
                            setProcedureMode("hybrid");
                            setProcedureStep("0");
                            return;
                          }

                          // Fallback: Reset to step 0 with hybrid mode (keep procedureType as "fieldwork")
                          setProcedureTab("generate");
                          setProcedureMode("hybrid");
                          setProcedureStep("0");
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <h3 className="font-semibold text-lg">
                      {formatClassificationForDisplay(classification)}
                    </h3>
                    {selectedProcedureType && (
                      <Button
                        variant="outline"
                        onClick={handleRegenerate}
                        className="flex items-center gap-2 bg-transparent"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4" /> Back to Procedure Selection
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseProcedure}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {procedureTypeLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading Procedures...</span>
                  </div>
                ) : (
                  <Tabs value={procedureTab} onValueChange={(value) => handleProcedureTabChange(value as "generate" | "view")} className="flex-1">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="generate" className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Generate Procedures
                      </TabsTrigger>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">
                              <TabsTrigger 
                                value="view" 
                                className="flex items-center justify-center gap-2 w-full"
                                disabled={isViewProceduresDisabled}
                              >
                                <Eye className="h-4 w-4" /> View Procedures
                              </TabsTrigger>
                            </div>
                          </TooltipTrigger>
                          {isViewProceduresDisabled && (
                            <TooltipContent>
                              <p>Generate procedures first</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TabsList>

                    <TabsContent value="generate" className="flex-1 mt-6 px-4">
                      {selectedProcedureType === "planning" ? (
                        <PlanningProcedureGeneration
                          engagement={engagement}
                          existingProcedure={planningProcedure}
                          onComplete={async (procedureData: any) => {
                            // Check if procedureData has actual content before setting
                            if (procedureData && Array.isArray(procedureData.procedures) && procedureData.procedures.length > 0) {
                              setPlanningProcedure(procedureData);
                            } else {
                              setPlanningProcedure(null);
                            }
                            // Reload from API to get latest state
                            await loadProcedure("planning");
                            // Navigate to view tab and clear procedure generation params
                            updateProcedureParams({
                              procedureTab: "view",
                              procedureType: selectedProcedureType,
                              mode: null,
                              step: null
                            }, false);
                          }}
                          onBack={handleProcedureTypeBack}
                          updateProcedureParams={updateProcedureParams}
                          searchParams={procedureSearchParams}
                        />
                      ) : selectedProcedureType === "fieldwork" ? (
                        <ProcedureGeneration
                          engagement={engagement}
                          existingProcedure={fieldworkProcedure}
                          onBack={handleProcedureTypeBack}
                          onComplete={async (procedureData: any) => {
                            // Check if procedureData has actual content before setting
                            if (procedureData && Array.isArray(procedureData.questions) && procedureData.questions.length > 0) {
                              setFieldworkProcedure(procedureData);
                            } else {
                              setFieldworkProcedure(null);
                            }
                            // Reload from API to get latest state
                            await loadProcedure("fieldwork");
                            // Navigate to view tab and clear procedure generation params
                            updateProcedureParams({
                              procedureTab: "view",
                              procedureType: selectedProcedureType,
                              mode: null,
                              step: null
                            }, false);
                          }}
                          updateProcedureParams={updateProcedureParams}
                          searchParams={procedureSearchParams}
                        />
                      ) : selectedProcedureType === "completion" ? (
                        <CompletionProcedureGeneration
                          engagement={engagement}
                          onBack={handleProcedureTypeBack}
                          existingProcedure={completionProcedure}
                          onComplete={async (procedureData: any) => {
                            // Check if procedureData has actual content before setting
                            if (procedureData && Array.isArray(procedureData.procedures) && procedureData.procedures.length > 0) {
                              setCompletionProcedure(procedureData);
                            } else {
                              setCompletionProcedure(null);
                            }
                            // Reload from API to get latest state
                            await loadProcedure("completion");
                            // Navigate to view tab and clear procedure generation params
                            updateProcedureParams({
                              procedureTab: "view",
                              procedureType: selectedProcedureType,
                              mode: null,
                              step: null
                            }, false);
                          }}
                          updateProcedureParams={updateProcedureParams}
                          searchParams={procedureSearchParams}
                        />
                      ) : null}
                    </TabsContent>

                    <TabsContent value="view" className="flex-1 mt-6 px-4 pb-4">
                      {selectedProcedureType === "planning" ? (
                        planningProcedure ? (
                          <PlanningProcedureView procedure={planningProcedure} engagement={engagement} />
                        ) : <div className="text-muted-foreground">No Planning procedures found.</div>
                      ) : selectedProcedureType === "fieldwork" ? (
                        fieldworkProcedure ? (
                          <ProcedureView 
                            procedure={fieldworkProcedure} 
                            engagement={engagement} 
                            onRegenerate={handleRegenerate} 
                            currentClassification={classification}
                          />
                        ) : <div className="text-muted-foreground">No Fieldwork procedures found.</div>
                      ) : completionProcedure ? (
                        <CompletionProcedureView procedure={completionProcedure} engagement={engagement} onRegenerate={handleRegenerate} />
                      ) : <div className="text-muted-foreground">No Completion procedures found.</div>}
                    </TabsContent>
                  </Tabs>
                )}
              </div>

            </TabsContent>

            {/* work book */}
            <TabsContent value="work-book" className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <EnhancedLoader
                    variant="pulse"
                    size="lg"
                    text="Loading Lead Sheet..."
                  />
                </div>
              ) : (
                <>
                  {/* Previous UI: Lead Sheet Content with Sections and WorkBookApp */}
                  {renderLeadSheetContentWithWorkbook()}
                </>
              )}
            </TabsContent>

          </Tabs>

        ) : // ETB / Adjustments live outside WP

          loading ? (

            <div className="flex items-center justify-center h-64">

              <EnhancedLoader variant="pulse" size="lg" text="Loading..." />

            </div>

          ) : (

            renderLeadSheetContent()

          )}



        {/* Fetch Rows Dialog (existing) */}

        <Dialog open={fetchRowsDialog} onOpenChange={setFetchRowsDialog}>

          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto z-[200]">

            <DialogHeader>

              <DialogTitle>Select Row from Other Sheets</DialogTitle>

              <DialogDescription>

                Choose a row from the available sheets to reference for{" "}

                {selectedRowForFetch?.accountName}

              </DialogDescription>

            </DialogHeader>



            <div className="space-y-4">

              {availableRows.length > 0 ? (

                <div className="space-y-2">

                  <Select

                    onValueChange={(value) => {

                      const row = availableRows.find(

                        (r, i) => i.toString() === value

                      );

                      setSelectedRow(row || null);

                    }}

                  >

                    <SelectTrigger>

                      <SelectValue placeholder="Select a row..." />

                    </SelectTrigger>



                    <SelectContent

                      position="popper"

                      sideOffset={8}

                      className="z-[300]"

                    >

                      {availableRows.map((row, index) => (

                        <SelectItem key={index} value={index.toString()}>

                          {row.sheetName} - Row {row.rowIndex}:{" "}

                          {row.data.slice(0, 3).join(" | ")}

                        </SelectItem>

                      ))}

                    </SelectContent>

                  </Select>



                  {selectedRow && (

                    <div className="p-4 border rounded-lg bg-gray-50">

                      <h4 className="font-medium mb-2">

                        Selected Row Preview:

                      </h4>

                      <p>

                        <strong>Sheet:</strong> {selectedRow.sheetName}

                      </p>

                      <p>

                        <strong>Row:</strong> {selectedRow.rowIndex}

                      </p>

                      <p>

                        <strong>Data:</strong> {selectedRow.data.join(" | ")}

                      </p>

                    </div>

                  )}



                  <div className="flex justify-end gap-2">

                    <Button

                      variant="outline"

                      onClick={() => setFetchRowsDialog(false)}

                    >

                      Cancel

                    </Button>

                    <Button

                      onClick={selectRowFromSheets}

                      disabled={!selectedRow || wpHydrating}

                    >

                      {wpHydrating ? (

                        <Loader2 className="h-4 w-4 animate-spin mr-2" />

                      ) : null}

                      Select Row

                    </Button>

                  </div>

                </div>

              ) : (

                <p className="text-center text-gray-500 py-8">

                  No rows found in other sheets

                </p>

              )}

            </div>

          </DialogContent>

        </Dialog>



        {/* ⬇️ NEW: Fetch Tabs Dialog */}

        <Dialog open={fetchTabsDialog} onOpenChange={setFetchTabsDialog}>

          <DialogContent className="max-w-xl z-[200]">

            <DialogHeader>

              <DialogTitle>Select a Worksheet</DialogTitle>

              <DialogDescription>

                Choose a worksheet to reference the <em>entire sheet</em> for{" "}

                {selectedRowForFetch?.accountName}.

              </DialogDescription>

            </DialogHeader>



            <div className="space-y-4">

              {availableTabs.length > 0 ? (

                <>

                  <Select onValueChange={(v) => setSelectedTab(v)}>

                    <SelectTrigger>

                      <SelectValue placeholder="Select a worksheet..." />

                    </SelectTrigger>

                    <SelectContent

                      position="popper"

                      sideOffset={8}

                      className="z-[300]"

                    >

                      {availableTabs.map((name) => (

                        <SelectItem key={name} value={name}>

                          {name}

                        </SelectItem>

                      ))}

                    </SelectContent>

                  </Select>



                  <div className="flex justify-end gap-2">

                    <Button

                      variant="outline"

                      onClick={() => setFetchTabsDialog(false)}

                    >

                      Cancel

                    </Button>

                    <Button

                      onClick={selectTabForRow}

                      disabled={!selectedTab || wpHydrating}

                    >

                      {wpHydrating ? (

                        <Loader2 className="h-4 w-4 animate-spin mr-2" />

                      ) : null}

                      Select Sheet

                    </Button>

                  </div>

                </>

              ) : (

                <p className="text-center text-gray-500 py-8">

                  No extra worksheets found

                </p>

              )}

            </div>

          </DialogContent>

        </Dialog>



        {/* Existing Row View Dialog (unchanged) */}

        <Dialog open={viewRowDialog} onOpenChange={setViewRowDialog}>

          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto z-[200]">

            <DialogHeader>

              <DialogTitle>View Referenced Row</DialogTitle>

              <DialogDescription>

                Viewing the referenced data for the selected account

              </DialogDescription>

            </DialogHeader>



            {viewRowData ? (

              <div className="space-y-6">

                {/* Lead Sheet Row Info */}

                <div className="p-4 border rounded-lg bg-blue-50">

                  <h4 className="font-medium mb-3 text-blue-900">

                    Lead Sheet Account

                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-sm">

                    <div>

                      <span className="font-medium">Code:</span>{" "}

                      {viewRowData.leadSheetRow.code}

                    </div>

                    <div>

                      <span className="font-medium">Account Name:</span>{" "}

                      {viewRowData.leadSheetRow.accountName}

                    </div>

                    <div>

                      <span className="font-medium">Current Year:</span>{" "}

                      {viewRowData.leadSheetRow.currentYear.toLocaleString()}

                    </div>



                    <div>

                      <span className="font-medium">Adjustments:</span>{" "}

                      {viewRowData.leadSheetRow.adjustments.toLocaleString()}

                    </div>

                    <div>

                      <span className="font-medium">Final Balance:</span>{" "}

                      {viewRowData.leadSheetRow.finalBalance.toLocaleString()}

                    </div>

                    <div>

                      <span className="font-medium">Prior Year:</span>{" "}

                      {viewRowData.leadSheetRow.priorYear.toLocaleString()}

                    </div>

                  </div>

                </div>



                {/* Referenced Row Info */}

                <div className="p-4 border rounded-lg bg-green-50">

                  <h4 className="font-medium mb-3 text-green-900">

                    Referenced Working Paper

                  </h4>

                  <div className="space-y-2 text-sm">

                    <div>

                      <span className="font-medium">Sheet:</span>{" "}

                      {viewRowData.reference.sheetName}

                    </div>

                    <div>

                      <span className="font-medium">Row:</span>{" "}

                      {viewRowData.reference.rowIndex}

                    </div>

                    <div>

                      <span className="font-medium">Data:</span>

                      <div className="mt-2 p-3 bg-white border rounded text-xs font-mono">

                        {viewRowData.reference.data.join(" | ")}

                      </div>

                    </div>

                  </div>

                </div>



                <div className="flex justify-end">

                  <Button onClick={() => setViewRowDialog(false)}>Close</Button>

                </div>

              </div>

            ) : (

              <div className="flex items-center justify-center py-8">

                <Loader2 className="h-6 w-6 animate-spin mr-2" />

                <span>Loading reference data...</span>

              </div>

            )}

          </DialogContent>

        </Dialog>



        {/* ⬇️ NEW: View Full-Sheet Dialog */}

        <Dialog open={viewSheetDialog} onOpenChange={setViewSheetDialog}>

          <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto z-[200]">

            <DialogHeader>

              <DialogTitle>Reference Preview (Full Sheet)</DialogTitle>

              <DialogDescription>

                {viewSheetData?.type === "sheet" ? (

                  <>

                    Full sheet: <strong>{viewSheetData.sheet.sheetName}</strong>

                  </>

                ) : (

                  "—"

                )}

              </DialogDescription>

            </DialogHeader>



            {viewSheetLoading ? (

              <div className="flex items-center justify-center h-48">

                <EnhancedLoader

                  variant="pulse"

                  size="lg"

                  text="Loading preview..."

                />

              </div>

            ) : viewSheetData?.type === "sheet" ? (

              renderSheetTable(viewSheetData.sheet.data)

            ) : (

              <p className="text-muted-foreground">No reference to preview.</p>

            )}

          </DialogContent>

        </Dialog>

      </CardContent>



      {/* ReviewDialog */}



      {/* //############################################################################################################### */}

      {/* Create New Review Workflow Modal */}

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>

        <DialogContent className="max-h-[90vh] min-w-[90vw] overflow-y-auto">

          {/* Dialog Header */}

          <DialogHeader>

            <DialogTitle>Review Engagement: {engagement.id}</DialogTitle>

            <DialogDescription>

              Review the classification details and make necessary changes.

            </DialogDescription>

          </DialogHeader>



          {/* Content */}

          <div className="flex-grow">

            <ClassificationReviewPanel

              engagementId={engagement.id}

              reviewClassification={reviewClassification}

              reviewFormRender={reviewFormRender}

            />

          </div>



          {/* Dialog Footer */}

          <DialogFooter className="mt-4">

            <Button onClick={() => setIsReviewOpen(false)}>Close</Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      {/* Confirmation Dialog */}

      <Dialog open={confirmSignoffOpen} onOpenChange={setConfirmSignoffOpen}>

        <DialogContent className="max-w-md">

          <DialogHeader>

            <DialogTitle>Confirm Sign-off</DialogTitle>

            <DialogDescription>

              Are you sure you want to sign off this classification? This action cannot be undone and will lock the section for editing.

            </DialogDescription>

          </DialogHeader>



          <div className="space-y-4">

            <div className="flex items-center gap-2 text-sm text-gray-600">

              <Save className="h-4 w-4" />

              <span>Signing off as: {currentUser.name || 'Loading...'}</span>

            </div>

          </div>



          <DialogFooter className="gap-2">

            <Button variant="outline" onClick={() => setConfirmSignoffOpen(false)}>

              Cancel

            </Button>

            <Button

              onClick={performSignOff}

              disabled={isSubmittingReview}

              variant="default"

            >

              {isSubmittingReview ? (

                <Loader2 className="h-4 w-4 mr-2 animate-spin" />

              ) : (

                <Save className="h-4 w-4 mr-2" />

              )}

              Yes, Sign Off

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      {/* Reverse Sign-off Confirmation Dialog */}
      <Dialog open={confirmReverseSignoffOpen} onOpenChange={setConfirmReverseSignoffOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Reverse Sign-off</DialogTitle>
            <DialogDescription>
              Are you sure you want to reverse the sign-off for this classification? This will reopen the section for review and editing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <RotateCcw className="h-4 w-4" />
              <span>Reversing sign-off as: {currentUser.name || 'Loading...'}</span>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-700">
                <strong>Note:</strong> This action will create a new review record with "Sign-off reversed" comment and change the status back to "in-review".
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmReverseSignoffOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={performReverseSignOff}
              disabled={isReversingSignoff}
              variant="destructive"
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isReversingSignoff ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Yes, Reverse Sign-off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Review History Dialog */}

      <Dialog open={reviewHistoryOpen} onOpenChange={setReviewHistoryOpen}>

        <DialogContent className="min-w-[70vw] max-w-[90vw] h-[70vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
            <DialogTitle>Review History</DialogTitle>

            <DialogDescription>

              Audit trail for: <span className="font-semibold">{formatClassificationForDisplay(classification)}</span>

            </DialogDescription>

          </DialogHeader>



          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!reviewWorkflow?.reviews || reviewWorkflow.reviews.length === 0 ? (

              <div className="text-center text-gray-500">No review history found for this classification.</div>
            ) : (

              <div className="relative pl-6">

                {/* Timeline vertical line */}

                <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-gray-200"></div>



                {reviewWorkflow.reviews.map((review, index) => (

                  <div key={review.id} className="relative mb-6 pb-2">

                    {/* Timeline marker */}

                    <div className="absolute left-0 top-0 -ml-2.5 h-5 w-5 rounded-full bg-brand-body0 flex items-center justify-center text-white z-10">

                      <span className="text-xs">

                        {review.status === 'signed-off' ? '🔒' :

                          review.status === 'in-review' ? '👤' : '📝'}

                      </span>

                    </div>



                    <div className="ml-6 flex flex-col">

                      <div className="flex items-baseline justify-between mb-1">

                        <span className="font-semibold text-sm capitalize">

                          {review.status === 'signed-off' ? 'Signed Off' :

                            review.status === 'in-review' ? 'In Review' : 'Review'}

                        </span>

                        <span className="text-xs text-gray-500">

                          {new Date(review.timestamp).toLocaleString()}

                        </span>

                      </div>



                      <p className="text-sm text-gray-600">

                        <strong className="text-gray-900">Performed by:</strong> {review.userName || 'N/A'}

                      </p>



                      {review.comment && (

                        <p className="text-sm text-gray-600 mt-1">

                          <strong className="text-gray-900">Comments:</strong> {review.comment}

                        </p>

                      )}

                      {review.isDone && (

                        <div className="flex items-center gap-2 mt-2">

                          <Check className="h-4 w-4 text-green-600" />

                          <span className="text-sm text-green-600 font-medium">

                            Review marked as completed

                          </span>

                        </div>

                      )}



                      <div className="mt-2">

                        <Badge

                          variant="outline"

                          className={`text-xs ${review.status === 'signed-off' ? 'bg-green-50 text-green-700 border-green-200' :

                            review.status === 'in-review' ? (review.isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200') :

                              'bg-gray-50 text-gray-700 border-gray-200'

                            }`}

                        >

                          {review.status === 'signed-off' ? '✓ Signed Off' :

                            review.status === 'in-review' ? (review.isDone ? '✅ Review Complete' : '⏳ In Review') : '⏳ Pending'}

                        </Badge>

                      </div>

                    </div>

                    {index < reviewWorkflow.reviews.length - 1 && (

                      <div className="ml-6 mt-4 border-t border-gray-100"></div>

                    )}

                  </div>

                ))}

              </div>

            )}

          </div>
        </DialogContent>

      </Dialog>



      {/* Delete File Confirmation Dialog */}

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>

        <DialogContent className="max-w-md">

          <DialogHeader>

            <DialogTitle>Delete File</DialogTitle>

            <DialogDescription>

              Are you sure you want to delete "{fileToDelete?.fileName}"? This action cannot be undone.

            </DialogDescription>

          </DialogHeader>



          <div className="space-y-4">

            <div className="flex items-center gap-2 text-sm text-gray-600">

              <Trash2 className="h-4 w-4 text-red-500" />

              <span>This will permanently remove the file and all its comments</span>

            </div>

          </div>



          <DialogFooter className="gap-2">

            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>

              Cancel

            </Button>

            <Button

              onClick={deleteFile}

              disabled={isDeletingFile}

              variant="destructive"

            >

              {isDeletingFile ? (

                <Loader2 className="h-4 w-4 mr-2 animate-spin" />

              ) : (

                <Trash2 className="h-4 w-4 mr-2" />

              )}

              Delete File

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      {/* Review Points/Comments Dialog */}

      <Dialog open={reviewPointsOpen} onOpenChange={setReviewPointsOpen}>

        <DialogContent className="max-w-2xl">

          <DialogHeader>

            <DialogTitle>Review Points & Comments</DialogTitle>

            <DialogDescription>

              Add your review comments for: <span className="font-semibold">{formatClassificationForDisplay(classification)}</span>

            </DialogDescription>

          </DialogHeader>



          <div className="space-y-4">

            <div className="flex items-center gap-2 text-sm text-gray-600">

              <Eye className="h-4 w-4" />

              <span>Reviewing as: {currentUser.name || 'Loading...'}</span>

            </div>



            <div>

              <Label htmlFor="review-comment">

                Review Comments *

              </Label>

              <Textarea

                id="review-comment"

                placeholder="Enter your review comments, observations, or points to address..."

                value={reviewComment}

                onChange={(e) => setReviewComment(e.target.value)}

                rows={6}

                className="mt-1"

              />

              <p className="text-sm text-gray-500 mt-1">

                * Comments are required for review submission

              </p>

            </div>

            <div className="flex items-center space-x-2">

              <Checkbox

                id="review-done"

                checked={isReviewDone}

                onCheckedChange={(checked) => setIsReviewDone(checked === true)}

              />

              <Label htmlFor="review-done" className="text-sm font-medium">

                Mark this review as completed

              </Label>

            </div>

          </div>



          <DialogFooter className="gap-2">

            <Button variant="outline" onClick={() => setReviewPointsOpen(false)}>

              Cancel

            </Button>

            <Button

              onClick={submitReviewComment}

              disabled={!reviewComment.trim() || isSubmittingReview}

              variant="default"

            >

              {isSubmittingReview ? (

                <Loader2 className="h-4 w-4 mr-2 animate-spin" />

              ) : (

                <MessageSquare className="h-4 w-4 mr-2" />

              )}

              Save Review

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      {/* ReviewDialog */}

    </Card>

  );




  // First, create a helper function to calculate totals for a given data array
  function calculateTotals(data: ETBRow[]) {
    return data.reduce(
      (acc, row) => ({
        currentYear: acc.currentYear + (Number(row.currentYear) || 0),
        priorYear: acc.priorYear + (Number(row.priorYear) || 0),
        adjustments: acc.adjustments + (Number(row.adjustments) || 0),
        reclassification: acc.reclassification + (Number(row.reclassification) || 0),
        finalBalance: acc.finalBalance + (Number(row.finalBalance) || 0),
      }),
      { currentYear: 0, priorYear: 0, adjustments: 0, reclassification: 0, finalBalance: 0 }
    );
  }

  // Helper to get unique row identifier
  function getRowId(row: ETBRow): string {
    const id = row.id || `${row.code}-${row.accountName}`;
    return id;
  }

  // Grouping functions - Using function declarations for hoisting
  function toggleRowSelection(rowId: string) {
    console.log('toggleRowSelection called with rowId:', rowId);
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      console.log('Previous selection:', Array.from(prev));
      if (newSet.has(rowId)) {
        console.log('Removing rowId:', rowId);
        newSet.delete(rowId);
      } else {
        console.log('Adding rowId:', rowId);
        newSet.add(rowId);
      }
      console.log('New selection:', Array.from(newSet));
      return newSet;
    });
  }

  function startGroupingMode() {
    setIsGroupingMode(true);
    // Don't clear selection - keep the rows that were already selected
    // setSelectedRowIds(new Set()); // REMOVED: This was clearing the selection
    setGrouping4Value("");
  }

  function cancelGroupingMode() {
    console.log('Exiting grouping mode. Clearing selection and resetting UI.');
    setIsGroupingMode(false);
    setSelectedRowIds(new Set());
    setGrouping4Value("");
  }

  // Update row field (for editable fields like reclassification)
  function updateRowField(rowId: string, field: keyof ETBRow, value: any) {
    setSectionData(prevData => {
      return prevData.map(row => {
        const currentRowId = getRowId(row);
        if (currentRowId !== rowId) return row;

        return {
          ...row,
          [field]: value,
        };
      });
    });
  }

  // Save section data back to ETB (for updates like reclassification)
  async function saveSectionDataToETB() {
    setLoading(true);
    try {
      // First, fetch the entire ETB
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          method: "GET",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch ETB data");

      const etbData = await response.json();
      const allRows = etbData.rows || [];

      // Update the matching rows with the current sectionData
      const updatedRows = allRows.map((row: any) => {
        // Find matching row in sectionData by code and accountName
        const matchingRow = sectionData.find(
          sectionRow =>
            sectionRow.code === row.code &&
            sectionRow.accountName === row.accountName
        );

        if (matchingRow) {
          // Update with all fields from sectionData, including reclassification
          return {
            ...row,
            ...matchingRow,
          };
        }
        return row;
      });

      // Save updated ETB back to backend
      const saveResponse = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: updatedRows }),
        }
      );

      if (!saveResponse.ok) throw new Error("Failed to save ETB");

      toast.success("Changes saved successfully");
      console.log('Section data saved to ETB successfully');
    } catch (error: any) {
      console.error("Error saving section data to ETB:", error);
      toast.error(`Save failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function completeGrouping() {
    if (selectedRowIds.size === 0 || !grouping4Value) {
      toast.error("Please select rows and choose a grouping value");
      return;
    }

    setLoading(true);
    try {
      // Get selected rows from sectionData using getRowId helper
      const selectedRows = sectionData.filter(row => selectedRowIds.has(getRowId(row)));

      // Update ETB with new grouping 4 data
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          method: "GET",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch ETB data");

      const etbData = await response.json();

      // Track skipped rows for user feedback
      const skippedRows: string[] = [];

      const updatedRows = (etbData.rows || []).map((row: any) => {
        // Match by code and accountName to find the corresponding row
        const isSelected = selectedRows.some(
          selectedRow =>
            selectedRow.code === row.code &&
            selectedRow.accountName === row.accountName
        );

        if (isSelected) {
          // Get existing classification parts
          const parts = (row.classification || "").split(" > ").map((p: string) => p.trim());

          // Validate: Ensure row has at least 3 levels before adding Level 4
          if (!parts[0] || !parts[1] || !parts[2]) {
            skippedRows.push(`${row.code} - ${row.accountName}`);
            console.warn(
              `Row ${row.code} - ${row.accountName} needs complete classification (Levels 1-3) before adding grouping4`
            );
            return row; // Skip this row
          }

          // Update grouping4 (parts[3]) while keeping other levels intact
          const updatedClassification = [
            parts[0],        // Level 1 (already validated)
            parts[1],        // Level 2 (already validated)
            parts[2],        // Level 3 (already validated)
            grouping4Value   // Level 4 - NEW VALUE
          ].join(" > ");

          return {
            ...row,
            // Update classification string
            classification: updatedClassification,
            // Sync ALL grouping fields with classification parts
            // (This ensures consistency even if data was manually edited)
            grouping1: parts[0],
            grouping2: parts[1],
            grouping3: parts[2],
            grouping4: grouping4Value,
          };
        }
        return row;
      });

      // Save updated ETB
      const saveResponse = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: updatedRows }),
        }
      );

      if (!saveResponse.ok) throw new Error("Failed to update ETB");

      // Reload section data to get fresh data with updated grouping
      await loadSectionData();

      // Notify parent to refresh ETB data
      if (loadExistingData) {
        loadExistingData();
      }

      // Reset UI state after successful grouping
      cancelGroupingMode();

      // Show appropriate success message based on whether rows were skipped
      if (skippedRows.length > 0) {
        toast.warning(`Grouping partially completed: ${selectedRowIds.size - skippedRows.length} rows updated. ${skippedRows.length} rows skipped (need complete Level 1-3 classification).`);
      } else {
        toast.success("Grouping updated successfully. ETB data refreshed.");
      }

      console.log('Grouping completed successfully. UI reset.');
    } catch (error: any) {
      console.error("Error completing grouping:", error);
      toast.error(`Grouping failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Refresh function for Lead Sheet (used by WorkBookApp)
  // Using function declaration for hoisting (called in renderLeadSheetContent)
  async function refreshLeadSheetData() {
    const startTime = Date.now();
    console.log('========== REFRESH START ==========');
    console.log('ClassificationSection: refreshLeadSheetData called at', new Date().toISOString());
    console.log('Current activeTab:', activeTab);
    console.log('Current sectionData before refresh:', {
      rowCount: sectionData.length,
      rowsWithLinkedFiles: sectionData.filter(r => r.linkedExcelFiles?.length > 0).length
    });
    console.log('Current workingPaperData before refresh:', {
      rowCount: workingPaperData.length,
      rowsWithLinkedFiles: workingPaperData.filter(r => r.linkedExcelFiles?.length > 0).length
    });

    console.log('Waiting 500ms for backend to persist data...');
    // Increased delay to ensure backend has fully persisted the data
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Now reloading data based on active tab:', activeTab);
    // ✅ FIX: Load the correct data based on active tab
    if (activeTab === 'working-papers') {
      await loadWorkingPaperFromDB(true); // Silent refresh
    } else {
      await loadSectionData();
    }

    console.log('Incrementing refresh trigger to force WorkBookApp remount...');
    setLeadSheetRefreshTrigger(prev => {
      const newValue = prev + 1;
      console.log(`Refresh trigger: ${prev} -> ${newValue}`);
      return newValue;
    });

    const endTime = Date.now();
    console.log(`========== REFRESH COMPLETE (took ${endTime - startTime}ms) ==========`);
  }

  // Handler functions for Linked Files column (same as ExtendedTBWithWorkbook)
  // Using function declarations for hoisting
  function handleViewWorkbook(workbook: any) {
    if (workbook.webUrl) {
      window.open(workbook.webUrl, '_blank');
    } else {
      toast.error("Workbook URL not available");
    }
  }

  async function handleRemoveWorkbook(rowId: string, workbookId: string, workbookName: string) {
    if (!engagement?.id && !engagement?._id) {
      toast.error("Engagement ID not available");
      return;
    }

    const engagementId = engagement.id || engagement._id;

    try {
      // Find the row to get its actual classification
      const row = sectionData.find(r => (r.id || r._id || r.code) === rowId);
      const rowClassification = row?.classification || classification;

      console.log('ClassificationSection: Removing workbook:', {
        engagementId,
        rowId,
        workbookId,
        workbookName,
        rowClassification
      });

      // Call API to remove workbook
      await deleteWorkbookFromLinkedFilesInExtendedTB(
        engagementId,
        rowClassification, // Use row's actual classification
        rowId,
        workbookId
      );

      console.log('ClassificationSection: Workbook removed, reloading data...');

      // Reload section data to refresh the table
      await loadSectionData();

      console.log('ClassificationSection: Data reloaded, table should now update');

      toast.success(`"${workbookName}" removed from linked files successfully.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove workbook';
      console.error('ClassificationSection: Error removing workbook:', err);

      toast.error(errorMessage);
    }
  }




  // Helper function to check if classification is Liabilities or Equity
  function isLiabilityOrEquityClassification(classification: string) {
    if (!classification) return false;
    const parts = classification.split(" > ");
    return parts[0] === "Liabilities" || parts[0] === "Equity";
  }

  function isAssetsClassification(classification: string) {
    if (!classification) return false;
    const parts = classification.split(" > ");
    return parts[0] === "Assets";
  }

  // Helper function to format values based on classification type
  function formatValueForDisplay(value: number, classification: string) {
    // Ensure proper number conversion, handling strings and edge cases
    let numValue = 0;
    if (value !== null && value !== undefined && value !== '') {
      const parsed = Number(value);
      if (!isNaN(parsed)) {
        numValue = parsed;
      }
    }
    
    // Handle zero values explicitly - no reverse sign, no parentheses, just return "0"
    if (Math.abs(numValue) < 0.0001) {
      return "0";
    }
    
    // Normalize classification string (trim whitespace)
    const normalizedClassification = classification ? classification.trim() : '';
    const isLiabilityOrEquity = isLiabilityOrEquityClassification(normalizedClassification);
    const isAssets = isAssetsClassification(normalizedClassification);

    // For Liabilities & Equity: reverse the sign
    if (isLiabilityOrEquity) {
      const reversedValue = -numValue;
      // Display negative values in parentheses (no "-" symbol, use parentheses instead)
      if (reversedValue < 0) {
        // Use Math.abs to ensure no negative sign, then format with parentheses
        // Convert to absolute value first to ensure no negative sign in the formatted string
        const absValue = Math.abs(reversedValue);
        // Format the absolute value (which is always positive) and wrap in parentheses
        const formatted = absValue.toLocaleString();
        // Ensure no negative sign in the formatted string (defensive check)
        const cleanFormatted = formatted.replace(/^-/, '');
        return `(${cleanFormatted})`;
      }
      // For positive values, display normally
      return reversedValue.toLocaleString();
    }

    // For Assets: no reverse sign, but display negative values in parentheses
    if (isAssets) {
      if (numValue < 0) {
        // Use Math.abs to ensure no negative sign, then format with parentheses
        const absValue = Math.abs(numValue);
        const formatted = absValue.toLocaleString();
        // Ensure no negative sign in the formatted string (defensive check)
        const cleanFormatted = formatted.replace(/^-/, '');
        return `(${cleanFormatted})`;
      }
      return numValue.toLocaleString();
    }

    // For other classifications: default formatting
    return numValue.toLocaleString();
  }



  // Helper function to get available Grouping 4 values based on selected rows' Level 1-3 classification
  // Only shows Level 4 options that match the selected rows' existing classification
  function getAvailableGrouping4Values(data: ETBRow[]): string[] {
    // Get selected rows
    const selectedRows = data.filter(row => selectedRowIds.has(getRowId(row)));

    // If no rows selected, analyze ALL rows in the current section to find their common Level 1-3
    const rowsToAnalyze = selectedRows.length > 0 ? selectedRows : data;

    if (rowsToAnalyze.length === 0) {
      // Fallback: return all Level 4 values
      const allGrouping4Values = new Set<string>();
      NEW_CLASSIFICATION_OPTIONS.forEach(opt => {
        const parts = opt.split(" > ").map(p => p.trim());
        const level4 = parts[3];
        if (level4) {
          allGrouping4Values.add(level4);
        }
      });
      return Array.from(allGrouping4Values).sort();
    }

    // Get the Level 1-3 classification from the first row to analyze
    const firstRow = rowsToAnalyze[0];
    const parts = (firstRow.classification || "").split(" > ").map(p => p.trim());
    const level1 = parts[0] || "";
    const level2 = parts[1] || "";
    const level3 = parts[2] || "";

    // If Level 1-3 are not complete, return empty array (will show warning)
    if (!level1 || !level2 || !level3) {
      console.warn('Rows need complete Level 1-3 classification before adding Level 4');
      return [];
    }

    // Filter NEW_CLASSIFICATION_OPTIONS to only show Level 4 values that match this Level 1-3
    const matchingGrouping4Values = new Set<string>();
    const prefix = `${level1} > ${level2} > ${level3}`;

    NEW_CLASSIFICATION_OPTIONS.forEach(opt => {
      if (opt.startsWith(prefix)) {
        const parts = opt.split(" > ").map(p => p.trim());
        const level4 = parts[3];
        if (level4) {
          matchingGrouping4Values.add(level4);
        }
      }
    });

    const result = Array.from(matchingGrouping4Values).sort();
    console.log(`Available Grouping 4 values for "${prefix}":`, result.length, 'items', result);

    return result;
  }

  function renderDataTable(sectionData, sectionTotals = null) {
    console.log('renderDataTable called with:', {
      rowCount: sectionData?.length || 0,
      rowsWithLinkedFiles: sectionData?.filter(r => r.linkedExcelFiles?.length > 0).length || 0,
      firstThreeRows: sectionData?.slice(0, 3).map(r => ({
        code: r.code,
        name: r.accountName,
        linkedCount: r.linkedExcelFiles?.length || 0
      })) || []
    });

    // Calculate totals from sectionData if sectionTotals is not provided
    const currentTotals = sectionTotals || calculateTotals(sectionData);
    const isSignedOff = reviewWorkflow?.isSignedOff;

    // Get classification from sectionData for formatting
    const rowClassification = sectionData.length > 0
      ? sectionData[0].classification
      : classification || "";

    // Check if this is a Liabilities or Equity classification
    const isLiabilityOrEquity = isLiabilityOrEquityClassification(rowClassification);
    
    // Check if this is an Assets classification
    const isAssets = isAssetsClassification(rowClassification);

    // Determine if we should show the Liabilities or Equity totals
    const showLiabilitiesOrEquityTotals = isLiabilityOrEquity && !isAdjustments(classification);



    if (isETB(classification)) {

      // ETB view

      return (

        <div className="flex-1 border border-secondary rounded-lg overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-gray-50">

                <tr>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Code</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[12rem] max-w-[12rem] text-xs sm:text-sm">Account Name</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Current Year</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[8rem] text-xs sm:text-sm">Re-Classification</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Adjustments</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Final Balance</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Prior Year</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold w-[8rem] text-xs sm:text-sm">Linked Files</th>

                </tr>

              </thead>

              <tbody>

                {sectionData.map((row, index) => (

                  <tr key={index} className={`border-t ${isSignedOff ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>

                    <td className="px-4 py-2 border-b border-secondary border-r font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-2 border-b border-secondary border-r max-w-[12rem] break-words whitespace-normal">{row.accountName}</td>
                    <td className="px-4 py-2 border-b border-secondary border-r text-right">
                      {formatValueForDisplay(Number(row.currentYear) || 0, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-b border-secondary border-r text-right">
                      {formatValueForDisplay(Number(row.reclassification) || 0, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-b border-secondary border-r text-right">
                      {formatValueForDisplay(Number(row.adjustments) || 0, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-b border-secondary border-r text-right font-medium">
                      {formatValueForDisplay(Number(row.finalBalance) || 0, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-b border-secondary border-r text-right">
                      {formatValueForDisplay(Number(row.priorYear) || 0, rowClassification)}
                    </td>

                    <td className="px-4 py-2 border-b border-secondary text-left">
                      <Drawer>
                        <DrawerTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3"
                            disabled={(row.linkedExcelFiles?.length || 0) === 0}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {(row.linkedExcelFiles?.length || 0)} file{(row.linkedExcelFiles?.length || 0) !== 1 ? 's' : ''}
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>Linked Excel Files</DrawerTitle>
                            <DrawerDescription>
                              Manage linked files for {row.accountName} ({row.code})
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="px-4 pb-4">
                            {(row.linkedExcelFiles?.length || 0) === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                No linked files for this row.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {row.linkedExcelFiles.map((workbook: any) => (
                                  <div
                                    key={workbook._id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                      <div>
                                        <p className="font-medium">{workbook.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          Uploaded: {formatDateForLinkedFiles(workbook.uploadedDate)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewWorkbook(workbook)}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Workbook</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to remove "{workbook.name}" from this ETB row?
                                              This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleRemoveWorkbook(row.id || row._id || row.code, workbook._id, workbook.name)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Remove
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <DrawerFooter>
                            <DrawerClose asChild>
                              <Button variant="outline">Close</Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>
                    </td>

                  </tr>

                ))}

                {sectionData.length > 0 && (
                  <tr className="bg-muted/50 font-medium">
                    <td className="px-4 py-2 border-r-secondary border font-bold" colSpan={2}>
                      TOTALS
                    </td>
                    <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                      {formatValueForDisplay(currentTotals.currentYear, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                      {formatValueForDisplay(currentTotals.reclassification || 0, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                      {formatValueForDisplay(currentTotals.adjustments, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                      {formatValueForDisplay(currentTotals.finalBalance, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                      {formatValueForDisplay(currentTotals.priorYear, rowClassification)}
                    </td>
                    <td className="px-4 py-2 border-r-secondary border"></td>
                  </tr>
                )}

                {sectionData.length === 0 && (

                  <tr>

                    <td

                      colSpan={8}

                      className="px-4 py-8 text-center text-gray-500"

                    >

                      No ETB rows found

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      );

    } else if (isAdjustments(classification)) {

      // Adjustments view: grouped by top categories

      return (

        <div className="overflow-x-auto space-y-6">

          {Object.entries(groupedForAdjustments).map(([cls, items]) => {

            const subtotal = items.reduce(

              (acc, r) => ({

                currentYear: acc.currentYear + (Number(r.currentYear) || 0),

                priorYear: acc.priorYear + (Number(r.priorYear) || 0),

                adjustments: acc.adjustments + (Number(r.adjustments) || 0),

                reclassification: acc.reclassification + (Number(r.reclassification) || 0),

                finalBalance: acc.finalBalance + (Number(r.finalBalance) || 0),

              }),

              { currentYear: 0, priorYear: 0, adjustments: 0, reclassification: 0, finalBalance: 0 }

            );

            // Get classification from items for formatting
            const itemClassification = items.length > 0
              ? items[0].classification
              : "";
            
            // Check if this is a Liabilities or Equity classification
            const isLiabilityOrEquity = isLiabilityOrEquityClassification(itemClassification);
            
            // Check if this is an Assets classification
            const isAssets = isAssetsClassification(itemClassification);

            return (

              <div key={cls} className="border border-secondary rounded-lg ">

                <div className="px-4 py-2 border-b border-secondary font-medium">

                  {formatClassificationForDisplay(cls) || "Unclassified"}

                </div>

                <div className="">

                  <table className="w-full text-sm">

                    <thead>

                      <tr>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-left">Code</th>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-left w-[12rem] max-w-[12rem]">Account Name</th>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-right">Current Year</th>

                        <th className="px-4 py-2 font-bold border-secondary border-b border-r text-left">Re-Classification</th>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-right">Adjustments</th>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-right">Final Balance</th>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-right">Prior Year</th>

                        <th className="px-4 py-2 font-bold border-secondary border-b text-left">Linked Files</th>



                      </tr>

                    </thead>

                    <tbody>

                      {items.map((row) => (

                        <tr key={row.id} className={`border-t ${isSignedOff ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>

                          <td className="px-4 py-2 border-r border-secondary border-b font-mono text-xs">
                            {row.code}
                          </td>
                          <td className="px-4 py-2 border-r border-secondary border-b max-w-[12rem] break-words whitespace-normal">{row.accountName}</td>
                          <td className="px-4 py-2 border-r border-secondary border-b text-right">
                            {formatValueForDisplay(Number(row.currentYear) || 0, row.classification || itemClassification)}
                          </td>
                          <td className="px-4 py-2 border-secondary border-b border-r text-right">
                            {formatValueForDisplay(Number(row.reclassification) || 0, row.classification || itemClassification)}
                          </td>
                          <td className="px-4 py-2 border-r border-secondary border-b text-right font-medium">
                            {formatValueForDisplay(Number(row.adjustments) || 0, row.classification || itemClassification)}
                          </td>
                          <td className="px-4 py-2 border-r border-secondary border-b text-right">
                            {formatValueForDisplay(Number(row.finalBalance) || 0, row.classification || itemClassification)}
                          </td>
                          <td className="px-4 py-2 border-r border-secondary border-b text-right">
                            {formatValueForDisplay(Number(row.priorYear) || 0, row.classification || itemClassification)}
                          </td>

                          <td className="px-4 py-2 border-secondary border-b text-left">
                            <Drawer>
                              <DrawerTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3"
                                  disabled={(row.linkedExcelFiles?.length || 0) === 0}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {(row.linkedExcelFiles?.length || 0)} file{(row.linkedExcelFiles?.length || 0) !== 1 ? 's' : ''}
                                </Button>
                              </DrawerTrigger>
                              <DrawerContent>
                                <DrawerHeader>
                                  <DrawerTitle>Linked Excel Files</DrawerTitle>
                                  <DrawerDescription>
                                    Manage linked files for {row.accountName} ({row.code})
                                  </DrawerDescription>
                                </DrawerHeader>
                                <div className="px-4 pb-4">
                                  {(row.linkedExcelFiles?.length || 0) === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                      No linked files for this row.
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {row.linkedExcelFiles.map((workbook: any) => (
                                        <div
                                          key={workbook._id}
                                          className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                          <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                            <div>
                                              <p className="font-medium">{workbook.name}</p>
                                              <p className="text-sm text-muted-foreground">
                                                Uploaded: {formatDateForLinkedFiles(workbook.uploadedDate)}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleViewWorkbook(workbook)}
                                            >
                                              <ExternalLink className="h-4 w-4 mr-2" />
                                              View
                                            </Button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button
                                                  variant="destructive"
                                                  size="sm"
                                                >
                                                  <Trash2 className="h-4 w-4 mr-2" />
                                                  Remove
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Remove Workbook</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Are you sure you want to remove "{workbook.name}" from this ETB row?
                                                    This action cannot be undone.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() => handleRemoveWorkbook(row.id || row._id || row.code, workbook._id, workbook.name)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  >
                                                    Remove
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <DrawerFooter>
                                  <DrawerClose asChild>
                                    <Button variant="outline">Close</Button>
                                  </DrawerClose>
                                </DrawerFooter>
                              </DrawerContent>
                            </Drawer>
                          </td>



                        </tr>

                      ))}

                      <tr className="bg-muted/50 font-bold border-t">

                        <td className="px-4 py-2 border-r border-secondary" colSpan={2}>

                          Subtotal

                        </td>

                        <td className="px-4 py-2 border-r border-secondary text-right">
                          {formatValueForDisplay(subtotal.currentYear, itemClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary text-right">
                          {formatValueForDisplay(subtotal.reclassification, itemClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary text-right">
                          {formatValueForDisplay(subtotal.adjustments, itemClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary text-right">
                          {formatValueForDisplay(subtotal.finalBalance, itemClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary text-right">
                          {formatValueForDisplay(subtotal.priorYear, itemClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary"></td>

                      </tr>

                    </tbody>

                  </table>

                </div>

              </div>

            );

          })}



          {/* Grand Totals for Adjustments */}
          {/* Note: Grand Totals are mixed from all classifications, so we use default formatting */}
          <div className="border rounded-lg border-secondary overflow-hidden">

            <div className="px-4 py-2 border-b bg-gray-50 border-secondary font-medium">

              Adjustments — Grand Total

            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <tbody>

                  <tr>

                    <td className="px-4 py-2 border-r border-secondary border-b font-bold">Current Year</td>

                    <td className="px-4 py-2 border-secondary border-b text-right">

                      {totals.currentYear.toLocaleString()}

                    </td>

                  </tr>

                  <tr>

                    <td className="px-4 py-2 border-r border-secondary border-b font-bold">Prior Year</td>

                    <td className="px-4 py-2 border-secondary border-b text-right">

                      {totals.priorYear.toLocaleString()}

                    </td>

                  </tr>

                  <tr>

                    <td className="px-4 py-2 border-r border-secondary border-b font-bold">Adjustments</td>

                    <td className="px-4 py-2 border-secondary border-b text-right">

                      {totals.adjustments.toLocaleString()}

                    </td>

                  </tr>

                  <tr>

                    <td className="px-4 py-2 border-r border-secondary font-bold">Final Balance</td>

                    <td className="px-4 py-2 border-secondary text-right">

                      {totals.finalBalance.toLocaleString()}

                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </div>

        </div>

      );

    } else {
      // Normal classification/category table
      // Separate rows by grouping4 status
      const groupedRows = sectionData.filter(row => row.grouping4 && row.grouping4.trim() !== '');
      const ungroupedRows = sectionData.filter(row => !row.grouping4 || row.grouping4.trim() === '');

      // Get all available Grouping 4 values from NEW_CLASSIFICATION_OPTIONS
      // based on the classifications present in sectionData
      // For "Change Grouping" mode, pass ALL sectionData (both grouped and ungrouped)
      // so it can analyze the common Level 1-3 classification
      const availableGrouping4Values = getAvailableGrouping4Values(sectionData);

      // Also include any existing grouping4 values from the data (for backwards compatibility)
      const existingGrouping4Values = [
        ...new Set(
          sectionData
            .map(row => row.grouping4)
            .filter(g4 => g4 && g4.trim() !== '')
        )
      ];

      // Combine both lists and remove duplicates
      const uniqueGrouping4Values = [
        ...new Set([...availableGrouping4Values, ...existingGrouping4Values])
      ].sort();

      // Log for debugging
      console.log('Grouping Mode:', {
        isGroupingMode,
        selectedRowsCount: selectedRowIds.size,
        availableOptionsCount: availableGrouping4Values.length,
        existingValuesCount: existingGrouping4Values.length,
        totalUniqueCount: uniqueGrouping4Values.length,
        values: uniqueGrouping4Values
      });

      return (
        <div className="space-y-6">
          {/* Grouping Controls */}
          {isGroupingMode && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Grouping Mode Active
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {selectedRowIds.size} row{selectedRowIds.size !== 1 ? 's' : ''} selected
                    </Badge>
                  </div>

                  {/* Show message if no rows selected */}
                  {selectedRowIds.size === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-yellow-700" />
                        <span className="text-sm font-medium text-yellow-800">
                          No rows selected
                        </span>
                      </div>
                      <p className="text-xs text-yellow-700">
                        Please select one or more rows from the table below using the checkboxes, then choose a Grouping 4 value.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="grouping4-select" className="text-xs text-gray-600">
                        Select Grouping 4 value:
                      </Label>
                      {uniqueGrouping4Values.length === 0 ? (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                          ⚠️ Selected rows need complete Level 1-3 classification before adding Level 4.
                        </div>
                      ) : (
                        <Select value={grouping4Value} onValueChange={setGrouping4Value}>
                          <SelectTrigger className="max-w-xs">
                            <SelectValue placeholder="Choose grouping value" />
                          </SelectTrigger>
                          <SelectContent>
                            {uniqueGrouping4Values.map((value, index) => (
                              <SelectItem key={index} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                            {/* Option to add custom value */}
                            <div className="p-2 border-t">
                              <Input
                                placeholder="Or type new value..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const newValue = e.currentTarget.value.trim();
                                    if (newValue) {
                                      setGrouping4Value(newValue);
                                      e.currentTarget.value = '';
                                    }
                                  }
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedRowIds.size > 0 && grouping4Value && (
                    <Button
                      onClick={completeGrouping}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Complete Grouping
                    </Button>
                  )}
                  <Button
                    onClick={cancelGroupingMode}
                    size="sm"
                    variant="outline"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Already Grouped 4 Section */}
          {groupedRows.length > 0 && (
            <div className="border border-secondary rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Already Grouped (Grouping 4)
                </h4>
                {!isGroupingMode && (
                  <Button
                    onClick={startGroupingMode}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    disabled={isSignedOff}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Change Grouping
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {isGroupingMode && (
                        <th
                          className="px-4 py-2 border-r border-secondary border-b text-center w-[3rem]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={groupedRows.length > 0 && groupedRows.every(row => selectedRowIds.has(getRowId(row)))}
                              onCheckedChange={(checked) => {
                                console.log('Select all grouped rows:', checked);
                                if (checked) {
                                  setSelectedRowIds(new Set([...selectedRowIds, ...groupedRows.map(r => getRowId(r))]));
                                } else {
                                  const newSet = new Set(selectedRowIds);
                                  groupedRows.forEach(r => newSet.delete(getRowId(r)));
                                  setSelectedRowIds(newSet);
                                }
                              }}
                              aria-label="Select all grouped rows"
                              disabled={isSignedOff}
                            />
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-2 border-r border-secondary border-b text-left">Code</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-left w-[12rem] max-w-[12rem]">Account Name</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-right">Current Year</th>
                      <th className="px-4 py-2 border-secondary border-b text-left border-r">Re-Classification</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-right">Adjustments</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-right">Final Balance</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-right">Prior Year</th>
                      <th className="px-4 py-2 border-secondary border-b text-left">Linked Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRows.map((row, index) => (
                      <tr
                        key={index}
                        className={`border-t ${isSignedOff ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'} ${selectedRowIds.has(getRowId(row)) ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                      >
                        {isGroupingMode && (
                          <td
                            className="px-4 py-2 border-r border-secondary border-b text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={selectedRowIds.has(getRowId(row))}
                                onCheckedChange={(checked) => {
                                  console.log('Grouped row checkbox clicked:', row.accountName, 'checked:', checked);
                                  toggleRowSelection(getRowId(row));
                                }}
                                aria-label={`Select ${row.accountName}`}
                                disabled={isSignedOff}
                              />
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-2 border-r border-secondary border-b font-mono text-xs">{row.code}</td>
                        <td className="px-4 py-2 border-r border-secondary border-b max-w-[12rem] break-words whitespace-normal">{row.accountName}</td>
                        <td className="px-4 py-2 border-r border-secondary border-b text-right">
                          {formatValueForDisplay(Number(row.currentYear) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-secondary border-b border-r text-right">
                          {formatValueForDisplay(Number(row.reclassification) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary border-b text-right">
                          {formatValueForDisplay(Number(row.adjustments) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary border-b text-right font-medium">
                          {formatValueForDisplay(Number(row.finalBalance) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary border-b text-right">
                          {formatValueForDisplay(Number(row.priorYear) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-secondary border-b text-left">
                          <Drawer>
                            <DrawerTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                                disabled={(row.linkedExcelFiles?.length || 0) === 0}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {(row.linkedExcelFiles?.length || 0)} file{(row.linkedExcelFiles?.length || 0) !== 1 ? 's' : ''}
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                              <DrawerHeader>
                                <DrawerTitle>Linked Excel Files</DrawerTitle>
                                <DrawerDescription>
                                  Manage linked files for {row.accountName} ({row.code})
                                </DrawerDescription>
                              </DrawerHeader>
                              <div className="px-4 pb-4">
                                {(row.linkedExcelFiles?.length || 0) === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No linked files for this row.
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {row.linkedExcelFiles.map((workbook: any) => (
                                      <div
                                        key={workbook._id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                      >
                                        <div className="flex items-center gap-3">
                                          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                          <div>
                                            <p className="font-medium">{workbook.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                              Uploaded: {formatDateForLinkedFiles(workbook.uploadedDate)}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewWorkbook(workbook)}
                                          >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            View
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Remove Workbook</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Are you sure you want to remove "{workbook.name}" from this ETB row?
                                                  This action cannot be undone.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => handleRemoveWorkbook(row.id || row._id || row.code, workbook._id, workbook.name)}
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                  Remove
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <DrawerFooter>
                                <DrawerClose asChild>
                                  <Button variant="outline">Close</Button>
                                </DrawerClose>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        </td>

                      </tr>
                    ))}
                    {/* Totals row for grouped section */}
                    {groupedRows.length > 0 && (
                      <tr className="bg-muted/50 font-medium">
                        {isGroupingMode && <td className="px-4 py-2 border-r-secondary border"></td>}
                        <td className="px-4 py-2 border-r-secondary border font-bold" colSpan={2}>
                          TOTALS
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            groupedRows.reduce((acc, r) => acc + (Number(r.currentYear) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            groupedRows.reduce((acc, r) => acc + (Number(r.reclassification) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            groupedRows.reduce((acc, r) => acc + (Number(r.adjustments) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            groupedRows.reduce((acc, r) => acc + (Number(r.finalBalance) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            groupedRows.reduce((acc, r) => acc + (Number(r.priorYear) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Not Grouped Section */}
          {ungroupedRows.length > 0 && (
            <div className="flex-1 border border-secondary rounded-lg overflow-hidden">
              {/* Action Buttons */}
              {!isGroupingMode && selectedRowIds.size > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border-b border-green-200 flex justify-end">
                  <Button
                    onClick={startGroupingMode}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Grouping
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto -mr-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th
                        className="px-4 py-2 border-r border-secondary border-b text-center w-[3rem]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={ungroupedRows.length > 0 && ungroupedRows.every(row => selectedRowIds.has(getRowId(row)))}
                            onCheckedChange={(checked) => {
                              console.log('Select all ungrouped rows:', checked);
                              if (checked) {
                                setSelectedRowIds(new Set([...selectedRowIds, ...ungroupedRows.map(r => getRowId(r))]));
                              } else {
                                const newSet = new Set(selectedRowIds);
                                ungroupedRows.forEach(r => newSet.delete(getRowId(r)));
                                setSelectedRowIds(newSet);
                              }
                            }}
                            aria-label="Select all ungrouped rows"
                            disabled={isSignedOff}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-left">Code</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-left w-[12rem] max-w-[12rem]">Account Name</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-right">Current Year</th>
                      <th className="px-4 py-2 border-secondary border-b text-left border-r">Re-Classification</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-right">Adjustments</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-right">Final Balance</th>
                      <th className="px-4 py-2 border-r border-secondary border-b text-right">Prior Year</th>
                      <th className="px-4 py-2 border-secondary border-b text-left">Linked Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ungroupedRows.map((row, index) => (
                      <tr
                        key={index}
                        className={`border-t ${isSignedOff ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'} ${selectedRowIds.has(getRowId(row)) ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                      >
                        <td
                          className="px-4 py-2 border-r border-secondary border-b text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedRowIds.has(getRowId(row))}
                              onCheckedChange={(checked) => {
                                console.log('Checkbox clicked for row:', row.accountName, 'checked:', checked);
                                toggleRowSelection(getRowId(row));
                              }}
                              aria-label={`Select ${row.accountName}`}
                              disabled={isSignedOff}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-secondary border-b font-mono text-xs">{row.code}</td>
                        <td className="px-4 py-2 border-r border-secondary border-b max-w-[12rem] break-words whitespace-normal">{row.accountName}</td>
                        <td className="px-4 py-2 border-r border-secondary border-b text-right">
                          {formatValueForDisplay(Number(row.currentYear) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-secondary border-b border-r text-right">
                          {formatValueForDisplay(Number(row.reclassification) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary border-b text-right">
                          {formatValueForDisplay(Number(row.adjustments) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary border-b text-right font-medium">
                          {formatValueForDisplay(Number(row.finalBalance) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-r border-secondary border-b text-right">
                          {formatValueForDisplay(Number(row.priorYear) || 0, row.classification || rowClassification)}
                        </td>
                        <td className="px-4 py-2 border-secondary border-b text-left">
                          <Drawer>
                            <DrawerTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                                disabled={(row.linkedExcelFiles?.length || 0) === 0}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {(row.linkedExcelFiles?.length || 0)} file{(row.linkedExcelFiles?.length || 0) !== 1 ? 's' : ''}
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                              <DrawerHeader>
                                <DrawerTitle>Linked Excel Files</DrawerTitle>
                                <DrawerDescription>
                                  Manage linked files for {row.accountName} ({row.code})
                                </DrawerDescription>
                              </DrawerHeader>
                              <div className="px-4 pb-4">
                                {(row.linkedExcelFiles?.length || 0) === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No linked files for this row.
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {row.linkedExcelFiles.map((workbook: any) => (
                                      <div
                                        key={workbook._id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                      >
                                        <div className="flex items-center gap-3">
                                          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                          <div>
                                            <p className="font-medium">{workbook.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                              Uploaded: {formatDateForLinkedFiles(workbook.uploadedDate)}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewWorkbook(workbook)}
                                          >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            View
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Remove Workbook</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Are you sure you want to remove "{workbook.name}" from this ETB row?
                                                  This action cannot be undone.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => handleRemoveWorkbook(row.id || row._id || row.code, workbook._id, workbook.name)}
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                  Remove
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <DrawerFooter>
                                <DrawerClose asChild>
                                  <Button variant="outline">Close</Button>
                                </DrawerClose>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        </td>

                      </tr>
                    ))}
                    {ungroupedRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          All rows are grouped
                        </td>
                      </tr>
                    )}
                    {ungroupedRows.length > 0 && (
                      <tr className="bg-muted/50 font-medium">
                        <td className="px-4 py-2 border-r-secondary border"></td>
                        <td className="px-4 py-2 border-r-secondary border font-bold" colSpan={2}>
                          TOTALS
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            ungroupedRows.reduce((acc, r) => acc + (Number(r.currentYear) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            ungroupedRows.reduce((acc, r) => acc + (Number(r.reclassification) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            ungroupedRows.reduce((acc, r) => acc + (Number(r.adjustments) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            ungroupedRows.reduce((acc, r) => acc + (Number(r.finalBalance) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td className="px-4 py-2 border-r-secondary border font-bold text-right">
                          {formatValueForDisplay(
                            ungroupedRows.reduce((acc, r) => acc + (Number(r.priorYear) || 0), 0),
                            rowClassification
                          )}
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }
  }







  function renderLeadSheetContent() {
    console.log('🎨 renderLeadSheetContent called with sectionData:', {
      rowCount: sectionData.length,
      rowsWithLinkedFiles: sectionData.filter(r => r.linkedExcelFiles?.length > 0).length,
      allRows: sectionData.map(r => ({
        code: r.code,
        name: r.accountName,
        linkedCount: r.linkedExcelFiles?.length || 0
      }))
    });

    const subSections = groupBySubCategory(sectionData);

    console.log('🎨 After groupBySubCategory:', {
      sectionCount: subSections.length,
      sections: subSections.map(s => ({
        subCategoryName: s.subCategoryName,
        rowCount: s.data.length,
        rowsWithLinkedFiles: s.data.filter(r => r.linkedExcelFiles?.length > 0).length
      }))
    });

    return (

      <>
        {/* Summary Cards - Keep the global totals here */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-3">
            <div className="text-xs text-gray-500">Current Year</div>
            <div className="text-lg font-semibold">
              {totals.currentYear.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Prior Year</div>
            <div className="text-lg font-semibold">
              {totals.priorYear.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Adjustments</div>
            <div className="text-lg font-semibold">
              {totals.adjustments.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Final Balance</div>
            <div className="text-lg font-semibold">
              {totals.finalBalance.toLocaleString()}
            </div>
          </Card>
        </div>

        {/* Render each subcategory with its own totals */}
        {/* Sort: sections without subCategoryName first, then sections with subCategoryName */}
        {[...subSections]
          .sort((a, b) => {
            // Sections without subCategoryName (null) should come first
            if (!a.subCategoryName && b.subCategoryName) return -1;
            if (a.subCategoryName && !b.subCategoryName) return 1;
            return 0;
          })
          .map((section, index) => {
            // Round numeric values in section.data
            const roundedData = section.data.map(row => ({
              ...row,
              currentYear: Math.round(row.currentYear),
              priorYear: Math.round(row.priorYear),
              adjustments: Math.round(row.adjustments),
              reclassification: row.reclassification ? Math.round(row.reclassification) : row.reclassification,
              finalBalance: Math.round(row.finalBalance),
            }));

            const sectionTotals = calculateTotals(roundedData);
            return (
              <div key={index}>
                {/* Show badge before table if subCategoryName exists */}
                {section.subCategoryName && (
                  <Badge className="my-5">{section.subCategoryName}</Badge>
                )}
                {/* Render table once per section */}
                {renderDataTable(roundedData, sectionTotals)}
              </div>
            );
          })}

        {/* NEW: WorkBook Section at the bottom */}
        {/* <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Linked Workbooks
          </h3>
          <WorkBookApp 
            key={`workbook-app-${leadSheetRefreshTrigger}`}
            engagement={engagement} 
            engagementId={engagement.id || engagement._id} 
            classification={classification}
            etbRows={sectionData}
            onRefreshData={refreshLeadSheetData}
            rowType="etb"
            refreshTrigger={workbookRefreshTrigger}
          />
        </div> */}
      </>

    );

  }


  function renderLeadSheetContentWithWorkbook() {
    console.log('🎨 renderLeadSheetContent called with sectionData:', {
      rowCount: sectionData.length,
      rowsWithLinkedFiles: sectionData.filter(r => r.linkedExcelFiles?.length > 0).length,
      allRows: sectionData.map(r => ({
        code: r.code,
        name: r.accountName,
        linkedCount: r.linkedExcelFiles?.length || 0
      }))
    });

    const subSections = groupBySubCategory(sectionData);

    console.log('🎨 After groupBySubCategory:', {
      sectionCount: subSections.length,
      sections: subSections.map(s => ({
        subCategoryName: s.subCategoryName,
        rowCount: s.data.length,
        rowsWithLinkedFiles: s.data.filter(r => r.linkedExcelFiles?.length > 0).length
      }))
    });

    return (

      <>
        {/* Summary Cards - Keep the global totals here */}
        {/* <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-3">
            <div className="text-xs text-gray-500">Current Year</div>
            <div className="text-lg font-semibold">
              {totals.currentYear.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Prior Year</div>
            <div className="text-lg font-semibold">
              {totals.priorYear.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Adjustments</div>
            <div className="text-lg font-semibold">
              {totals.adjustments.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Final Balance</div>
            <div className="text-lg font-semibold">
              {totals.finalBalance.toLocaleString()}
            </div>
          </Card>
        </div> */}

        {/* Render each subcategory with its own totals */}
        {/* Sort: sections without subCategoryName first, then sections with subCategoryName */}
        {[...subSections]
          .sort((a, b) => {
            // Sections without subCategoryName (null) should come first
            if (!a.subCategoryName && b.subCategoryName) return -1;
            if (a.subCategoryName && !b.subCategoryName) return 1;
            return 0;
          })
          .map((section, index) => {
            // Round numeric values in section.data
            const roundedData = section.data.map(row => ({
              ...row,
              currentYear: Math.round(row.currentYear),
              priorYear: Math.round(row.priorYear),
              adjustments: Math.round(row.adjustments),
              reclassification: row.reclassification ? Math.round(row.reclassification) : row.reclassification,
              finalBalance: Math.round(row.finalBalance),
            }));

            const sectionTotals = calculateTotals(roundedData);
            return (
              <div key={index}>
                {/* Show badge before table if subCategoryName exists */}
                {section.subCategoryName && (
                  <Badge className="my-5">{section.subCategoryName}</Badge>
                )}
                {/* Render table once per section */}
                {renderDataTable(roundedData, sectionTotals)}
              </div>
            );
          })}

        {/* NEW: WorkBook Section at the bottom */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Linked Workbooks
          </h3>
          <WorkBookApp
            key={`workbook-app-${leadSheetRefreshTrigger}`}
            engagement={engagement}
            engagementId={engagement.id || engagement._id}
            classification={classification}
            etbRows={sectionData}
            onRefreshData={refreshLeadSheetData}
            rowType="etb"
            refreshTrigger={workbookRefreshTrigger}
            allClassifications={allClassifications}
          />
        </div>
      </>

    );

  }


  function renderWorkingPapersContent() {

    return (

      <>

        <div className="grid grid-cols-4 gap-4 mb-6">

          <Card className="p-3">

            <div className="text-xs text-gray-500">Available Sheets</div>

            <div className="text-lg font-semibold">

              {availableSheets.length}

            </div>

          </Card>

          <Card className="p-3">

            <div className="text-xs text-gray-500">Current Year</div>

            <div className="text-lg font-semibold">

              {totals.currentYear.toLocaleString()}

            </div>

          </Card>

          <Card className="p-3">

            <div className="text-xs text-gray-500">Adjustments</div>

            <div className="text-lg font-semibold">

              {totals.adjustments.toLocaleString()}

            </div>

          </Card>

          <Card className="p-3">

            <div className="text-xs text-gray-500">Final Balance</div>

            <div className="text-lg font-semibold">

              {totals.finalBalance.toLocaleString()}

            </div>

          </Card>

        </div>



        {renderWorkingPapersTable()}

        {/* NEW: WorkBook Section at the bottom of Working Papers tab */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Linked Workbooks
          </h3>
          <WorkBookApp
            key={`workbook-app-wp-${leadSheetRefreshTrigger}`}
            engagement={engagement}
            engagementId={engagement.id || engagement._id}
            classification={classification}
            etbRows={workingPaperData}
            onRefreshData={refreshLeadSheetData}
            rowType="working-paper"
            refreshTrigger={workbookRefreshTrigger}
            allClassifications={allClassifications}
          />
        </div>

      </>

    );

  }



  function renderWorkingPapersEmpty() {

    return (

      <div className="flex-1 flex items-center justify-center">

        <div className="text-center space-y-4">

          <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto" />

          <div>

            <h3 className="text-lg font-medium text-gray-900">

              Working Papers Not Initialized

            </h3>

            <p className="text-gray-500 mt-1">

              Click the Initialize button to create working papers with lead

              sheet data

            </p>

          </div>

          <Button

            onClick={initializeWorkingPapers}

            size="lg"

            disabled={wpHydrating}

          >

            <Plus className="h-5 w-5 mr-2" />

            Initialize Working Papers

          </Button>

        </div>

      </div>

    );

  }



  function renderWorkingPapersTable() {

    const isSignedOff = reviewWorkflow?.isSignedOff;



    return (

      <div className="flex-1 border border-secondary rounded-lg overflow-hidden">

        <div className="overflow-x-auto max-h-96">

          <table className="w-full text-sm">


            <tr>

              <th className="px-4 py-2 border-r border-secondary border-b text-left">Code</th>

              <th className="px-4 py-2 border-r border-secondary border-b text-left">Account Name</th>

              <th className="px-4 py-2 border-r border-secondary border-b text-right">Current Year</th>

              <th className="px-4 py-2 border-r border-secondary border-b text-right">Prior Year</th>

              <th className="px-4 py-2 border-r border-secondary border-b text-right">Adjustments</th>

              <th className="px-4 py-2 border-secondary border-b border-r text-right">Final Balance</th>

              <th className="px-4 py-2 border-secondary border-b border-r text-left">Linked Files</th>

              <th className="px-4 py-2 border-secondary border-b text-right">Reference</th>

            </tr>


            <tbody>

              {workingPaperData.map((row) => (

                <tr key={row.id} className={`border-t ${isSignedOff ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>

                  <td className="px-4 py-2 border border-b-secondary border-r-secondary font-mono text-xs">{row.code}</td>

                  <td className="px-4 py-2 border border-b-secondary border-r-secondary">{row.accountName}</td>

                  <td className="px-4 py-2 border border-b-secondary border-r-secondary text-right">

                    {row.currentYear.toLocaleString()}

                  </td>

                  <td className="px-4 py-2 border border-b-secondary border-r-secondary text-right">

                    {row.priorYear.toLocaleString()}

                  </td>

                  <td className="px-4 py-2 border border-b-secondary border-r-secondary text-right">

                    {row.adjustments.toLocaleString()}

                  </td>

                  <td className="px-4 py-2 border border-b-secondary border-r-secondary text-right font-medium">

                    {row.finalBalance.toLocaleString()}

                  </td>

                  <td className="px-4 py-2 border border-b-secondary border-r-secondary text-left">
                    <Drawer>
                      <DrawerTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3"
                          disabled={(row.linkedExcelFiles?.length || 0) === 0}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {(row.linkedExcelFiles?.length || 0)} file{(row.linkedExcelFiles?.length || 0) !== 1 ? 's' : ''}
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>Linked Excel Files</DrawerTitle>
                          <DrawerDescription>
                            Manage linked files for {row.accountName} ({row.code})
                          </DrawerDescription>
                        </DrawerHeader>
                        <div className="px-4 pb-4">
                          {(row.linkedExcelFiles?.length || 0) === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No linked files for this row.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {row.linkedExcelFiles.map((workbook: any) => (
                                <div
                                  key={workbook._id}
                                  className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                    <div>
                                      <p className="font-medium">{workbook.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Uploaded: {formatDateForLinkedFiles(workbook.uploadedDate)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewWorkbook(workbook)}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Remove
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remove Workbook</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to remove "{workbook.name}" from this Working Paper row?
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleRemoveWorkbook(row.id || row._id || row.code, workbook._id, workbook.name)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Remove
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <DrawerFooter>
                          <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                          </DrawerClose>
                        </DrawerFooter>
                      </DrawerContent>
                    </Drawer>
                  </td>

                  <td className="px-4 py-2 border border-b-secondary text-center">

                    <div className="flex flex-col items-center gap-1 justify-center">

                      <Button

                        size="sm"

                        variant="outline"

                        onClick={() => viewSelectedRow(row)}

                        disabled={

                          (!row.reference && !row.referenceData) ||

                          viewRowLoading ||

                          wpHydrating

                        }

                      >

                        <Eye className="h-3 w-3 mr-1" />

                        View Ref

                      </Button>



                      <Button

                        size="sm"

                        variant="outline"

                        onClick={() => fetchRowsFromSheets(row)}

                        disabled={availableSheets.length <= 1 || wpHydrating}

                      >

                        <Search className="h-3 w-3 mr-1" />

                        Fetch Rows

                      </Button>

                      {/* ⬇️ NEW: Fetch Tabs button */}

                      <Button

                        size="sm"

                        variant="outline"

                        onClick={() => fetchTabsForRow(row)}

                        disabled={availableSheets.length <= 1 || wpHydrating}

                      >

                        <TableOfContents className="h-3 w-3 mr-1" />

                        Fetch Tabs

                      </Button>

                    </div>

                  </td>

                </tr>

              ))}

              {sectionData.length === 0 && (

                <tr>

                  <td

                    colSpan={9}

                    className="px-4 py-8 text-center text-gray-500"

                  >

                    No data available for working papers

                  </td>

                </tr>

              )}

              {sectionData.length > 0 && (

                <tr className="bg-muted/50 font-bold">

                  <td className="px-4 py-2 border border-r-secondary" colSpan={2}>

                    TOTALS

                  </td>

                  <td className="px-4 py-2 border border-r-secondary text-right">

                    {totals.currentYear.toLocaleString()}

                  </td>

                  <td className="px-4 py-2 border border-r-secondary text-right">

                    {totals.priorYear.toLocaleString()}

                  </td>

                  <td className="px-4 py-2 border border-r-secondary text-right">

                    {totals.adjustments.toLocaleString()}

                  </td>

                  <td className="px-4 py-2 text-right">

                    {totals.finalBalance.toLocaleString()}

                  </td>

                  <td className="px-4 py-2"></td>

                  <td className="px-4 py-2"></td>


                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    );

  }



  // ⬇️ NEW: pretty table renderer for full-sheet preview

  function renderSheetTable(data: any[][]) {

    if (!data?.length)

      return (

        <p className="text-center text-muted-foreground py-6">Empty sheet</p>

      );

    const hdr = data[0] || [];

    const rows = data.slice(1);

    return (

      <div className="overflow-hidden border-secondary rounded-xl border">

        <table className="w-full text-sm">

          <thead className="bg-muted/40">

            <tr>

              {hdr.map((h: any, i: number) => (

                // <th key={i} className="px-3 py-2 text-left">{String(h ?? "")}</th>

                <td key={i} className={`border-t-0 border-r-0 border-b border-b-secondary ${i !== 0 ? "border-l border-l-secondary" : ""} px-3 py-2 font-bold`}>

                  {String(h ?? "")}

                </td>

              ))}

            </tr>

          </thead>

          <tbody>

            {rows.map((r: any[], ri: number) => (

              <tr key={ri} className="border-t">

                {r.map((c: any, ci: number) => (

                  <td key={ci} className={`border-t-0 border-r-0 ${ri !== rows.length - 1 ? "border-b border-b-secondary" : ""} ${ci !== 0 ? "border-l border-l-secondary" : ""} px-3 py-2`}>

                    {String(c ?? "")}

                  </td>

                ))}

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    );

  }



  // Evidence content renderer

  function renderEvidenceContent() {

    return (

      <div className="space-y-6">

        {/* File Upload Section */}

        <Card>

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <Upload className="h-5 w-5" />

              Upload Evidence Files

            </CardTitle>

            <CardDescription>

              Upload supporting documents, images, and other evidence files

            </CardDescription>

          </CardHeader>

          <CardContent>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">

              <input

                type="file"

                multiple

                accept="*/*"

                onChange={handleFileUpload}

                className="hidden"

                id="evidence-file-upload"

                disabled={uploadingFiles}

              />

              <label

                htmlFor="evidence-file-upload"

                className="cursor-pointer flex flex-col items-center gap-2"

              >

                <Upload className="h-8 w-8 text-gray-400" />

                <div className="text-sm text-gray-600">

                  <span className="font-medium text-blue-600 hover:text-blue-500">

                    Click to upload

                  </span>{" "}

                  or drag and drop

                </div>

                <div className="text-xs text-gray-500">

                  All file types supported

                </div>

              </label>

            </div>

            {uploadingFiles && (

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">

                <Loader2 className="h-4 w-4 animate-spin" />

                Uploading files...

              </div>

            )}

          </CardContent>

        </Card>



        {/* Files List Section */}

        <Card>

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <FileText className="h-5 w-5" />

              Evidence Files ({evidenceFiles.length})

            </CardTitle>

          </CardHeader>

          <CardContent>

            {evidenceFiles.length === 0 ? (

              <div className="text-center py-8 text-gray-500">

                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />

                <p>No evidence files uploaded yet</p>

                <p className="text-sm">Upload files to get started</p>

              </div>

            ) : (

              <div className="space-y-3">

                {evidenceFiles.map((file) => (

                  <div

                    key={file.id}

                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 min-w-0"

                  >

                    <div className="flex items-center gap-3 flex-1 min-w-0">

                      {getFileIcon(file.fileType)}

                      <div className="flex-1 min-w-0">

                        {editingFileId === file.id ? (

                          <div className="flex items-center gap-2">

                            <Input

                              value={editingFileName}

                              onChange={(e) => setEditingFileName(e.target.value)}

                              className="text-sm h-7"

                              onKeyDown={(e) => {

                                if (e.key === 'Enter') saveRenameFile();

                                if (e.key === 'Escape') cancelRenameFile();

                              }}

                              autoFocus

                            />

                            <Button

                              size="sm"

                              variant="ghost"

                              onClick={saveRenameFile}

                              className="h-7 w-7 p-0"

                            >

                              <Check className="h-3 w-3 text-green-600" />

                            </Button>

                            <Button

                              size="sm"

                              variant="ghost"

                              onClick={cancelRenameFile}

                              className="h-7 w-7 p-0"

                            >

                              <X className="h-3 w-3 text-red-600" />

                            </Button>

                          </div>

                        ) : (

                          <div

                            className="font-medium text-sm truncate cursor-pointer"

                            title={file.fileName}

                            onClick={() => openFilePreview(file)}

                          >

                            {file.fileName}

                          </div>

                        )}

                        <div className="text-xs text-gray-500">

                          {formatFileSize(file.fileSize)} • {formatDate(file.uploadedAt)} • {file.comments.length} comments

                        </div>

                      </div>

                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">

                      <Badge variant="secondary" className="text-xs">

                        {file.fileType.toUpperCase()}

                      </Badge>

                      {/* Linked Files Button */}
                      <Drawer>
                        <DrawerTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3"
                            disabled={!file.linkedWorkbooks || file.linkedWorkbooks.length === 0}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {file.linkedWorkbooks?.length || 0} file{file.linkedWorkbooks?.length !== 1 ? 's' : ''}
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>Linked Workbooks</DrawerTitle>
                            <DrawerDescription>
                              Manage linked workbooks for {file.fileName}
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="px-4 pb-4">
                            {!file.linkedWorkbooks || file.linkedWorkbooks.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                No linked workbooks for this evidence file.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {file.linkedWorkbooks.map((workbook: any) => (
                                  <div
                                    key={workbook._id || workbook.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                      <div>
                                        <p className="font-medium">{workbook.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          Uploaded: {formatDateForLinkedFiles(workbook.uploadedDate)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewWorkbookFromEvidence(workbook)}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Workbook</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to remove "{workbook.name}" from this evidence file?
                                              This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleRemoveWorkbookFromEvidence(
                                                file.id,
                                                workbook._id || workbook.id,
                                                workbook.name
                                              )}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Remove
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <DrawerFooter>
                            <DrawerClose asChild>
                              <Button variant="outline">Close</Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>

                      <div className="flex items-center gap-1">

                        <Button

                          size="sm"

                          variant="ghost"

                          onClick={() => openFilePreview(file)}

                          className="h-7 w-7 p-0"

                        >

                          <Eye className="h-3 w-3 text-gray-400" />

                        </Button>

                        {editingFileId !== file.id && (

                          <>

                            <Button

                              size="sm"

                              variant="ghost"

                              onClick={(e) => {

                                e.stopPropagation();

                                startRenameFile(file);

                              }}

                              className="h-7 w-7 p-0"

                            >

                              <Edit2 className="h-3 w-3 text-blue-400" />

                            </Button>

                            <Button

                              size="sm"

                              variant="ghost"

                              onClick={(e) => {

                                e.stopPropagation();

                                confirmDeleteFile(file);

                              }}

                              className="h-7 w-7 p-0"

                            >

                              <Trash2 className="h-3 w-3 text-red-400" />

                            </Button>

                          </>

                        )}

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </CardContent>

        </Card>



        {/* File Preview Dialog */}

        <Dialog open={filePreviewOpen} onOpenChange={setFilePreviewOpen}>

          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">

            <DialogHeader>

              <DialogTitle className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  {selectedFile && getFileIcon(selectedFile.fileType)}

                  {selectedFile?.fileName}

                </div>

                <div className="text-sm text-gray-500 font-normal">

                  Uploaded by: <span className="font-medium text-gray-700">{selectedFile?.uploadedBy}</span>

                </div>

              </DialogTitle>

            </DialogHeader>



            <div className="flex flex-col h-[75vh]">

              {/* File Preview */}

              <div className="flex-1 border rounded-lg overflow-hidden mb-4 bg-gray-50">

                {selectedFile && renderFilePreview(selectedFile)}

              </div>



              {/* Comments Section */}

              <div className="border-t pt-4">

                <h4 className="font-medium mb-3 flex items-center gap-2">

                  <MessageSquare className="h-4 w-4" />

                  Comments ({selectedFile?.comments.length || 0})

                </h4>



                {/* Comments List */}

                <ScrollArea className="h-32 mb-4">

                  <div className="space-y-3">

                    {selectedFile?.comments.map((comment, index) => (

                      <div key={index} className="flex gap-3 p-2 bg-gray-50 rounded">

                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">

                          {comment.commentor.name.charAt(0).toUpperCase()}

                        </div>

                        <div className="flex-1">

                          <div className="flex items-center gap-2 mb-1">

                            <span className="font-medium text-sm">{comment.commentor.name}</span>

                            <span className="text-xs text-gray-500">{formatDate(comment.timestamp)}</span>

                          </div>

                          <p className="text-sm text-gray-700">{comment.comment}</p>

                        </div>

                      </div>

                    ))}

                    {selectedFile?.comments.length === 0 && (

                      <p className="text-center text-gray-500 text-sm py-4">No comments yet</p>

                    )}

                  </div>

                </ScrollArea>



                {/* Add Comment */}

                <div className="flex gap-2">

                  <Textarea

                    placeholder="Add a comment..."

                    value={newComment}

                    onChange={(e) => setNewComment(e.target.value)}

                    className="flex-1"

                    rows={2}

                  />

                  <Button

                    onClick={addComment}

                    disabled={!newComment.trim()}

                    size="sm"

                  >

                    <MessageSquare className="h-4 w-4" />

                  </Button>

                </div>

              </div>

            </div>

          </DialogContent>

        </Dialog>

        {/* NEW: WorkBook Section at the bottom of Evidence tab */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Linked Workbooks
          </h3>
          <WorkBookApp
            key={`workbook-app-evidence-${leadSheetRefreshTrigger}`}
            engagement={engagement}
            engagementId={engagement.id || engagement._id}
            classification={classification}
            etbRows={evidenceFiles.map(file => ({
              _id: file.id,
              code: file.id,
              accountName: file.fileName,
              classification: classification,
              currentYear: 0,
              priorYear: 0,
              adjustments: 0,
              finalBalance: 0,
              reclassifications: 0,
              grouping1: '',
              grouping2: '',
              grouping3: '',
              grouping4: '',
              additionalColumns: {},
              linkedExcelFiles: file.linkedWorkbooks || [],
              mappings: file.mappings || [] // ✅ CRITICAL FIX: Use actual evidence mappings!
            }))}
            onRefreshData={async () => {
              console.log('Evidence: Refreshing data after workbook linking');
              await loadEvidenceFiles();
              setLeadSheetRefreshTrigger(prev => prev + 1);
            }}
            rowType="evidence"
            refreshTrigger={workbookRefreshTrigger}
            onEvidenceMappingUpdated={handleEvidenceMappingUpdated}
            allClassifications={allClassifications}
          />
        </div>

      </div>

    );

  }



  // Helper functions for Evidence

  function getFileIcon(fileType: string) {

    const type = fileType.toLowerCase();

    if (type.includes('image')) return <Image className="h-5 w-5 text-green-500" />;

    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;

    if (type.includes('word') || type.includes('doc')) return <FileText className="h-5 w-5 text-blue-500" />;

    if (type.includes('excel') || type.includes('sheet')) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;

    return <File className="h-5 w-5 text-gray-500" />;

  }



  function formatFileSize(bytes: number) {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

  }



  function formatDate(dateString: string) {

    return new Date(dateString).toLocaleDateString();

  }



  function renderFilePreview(file: EvidenceFile) {

    const type = file.fileType.toLowerCase();



    if (type.includes('image')) {

      return (

        <div className="flex items-center justify-center h-full bg-gray-50">

          <img

            src={file.fileUrl}

            alt={file.fileName}

            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"

            style={{ maxHeight: '70vh' }}

          />

        </div>

      );

    }



    if (type.includes('pdf')) {

      return (

        <div className="flex items-center justify-center h-full bg-gray-50">

          <iframe

            src={file.fileUrl}

            className="w-full h-full border-0 rounded-lg shadow-sm"

            title={file.fileName}

            style={{ minHeight: '70vh' }}

          />

        </div>

      );

    }



    // For text files, try to display content

    if (type.includes('text') || type.includes('csv') || file.fileName.endsWith('.txt') || file.fileName.endsWith('.csv')) {

      return (

        <div className="flex items-center justify-center h-full bg-gray-50">

          <iframe

            src={file.fileUrl}

            className="w-full h-full border-0 rounded-lg shadow-sm"

            title={file.fileName}

            style={{ minHeight: '70vh' }}

          />

        </div>

      );

    }



    // For Office documents (Word, Excel, PowerPoint), try to preview

    if (type.includes('word') || type.includes('excel') || type.includes('powerpoint') ||

      type.includes('officedocument') || file.fileName.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) {

      return (

        <div className="flex items-center justify-center h-full bg-gray-50">

          <iframe

            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.fileUrl)}`}

            className="w-full h-full border-0 rounded-lg shadow-sm"

            title={file.fileName}

            style={{ minHeight: '70vh' }}

          />

        </div>

      );

    }



    // For other file types, show file info and preview attempt

    return (

      <div className="flex items-center justify-center h-full bg-gray-50">

        <div className="text-center p-8">

          <div className="mb-4">

            {getFileIcon(file.fileType)}

          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">{file.fileName}</h3>

          <p className="text-sm text-gray-600 mb-4">

            {formatFileSize(file.fileSize)} • {file.fileType}

          </p>

          <div className="bg-white rounded-lg p-4 shadow-sm border">

            <p className="text-sm text-gray-500 mb-2">Preview not available for this file type</p>

            <p className="text-xs text-gray-400">

              File uploaded on {formatDate(file.uploadedAt)}

            </p>

          </div>

        </div>

      </div>

    );

  }



  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {

    const files = event.target.files;

    if (!files || files.length === 0) return;



    setUploadingFiles(true);



    try {

      const classificationId = await getClassificationId(classification, engagement.id);

      console.log(`Uploading files for classification: ${classification} -> ${classificationId}`);



      const uploadPromises = Array.from(files).map(async (file) => {

        // Validate file

        const validation = validateFile(file);

        if (!validation.isValid) {

          throw new Error(validation.error || 'Invalid file');

        }



        // Upload file to storage

        const uploadResult = await uploadFileToStorage(file);



        // Create evidence record via API

        const evidenceData = {

          engagementId: engagement.id,

          classificationId: classificationId,

          evidenceUrl: uploadResult.url

        };



        const response = await createClassificationEvidence(evidenceData);



        // Convert API response to EvidenceFile format

        return {

          id: response.evidence._id,

          fileName: uploadResult.fileName,

          fileUrl: uploadResult.url,

          fileType: uploadResult.fileType,

          fileSize: uploadResult.fileSize,

          uploadedAt: uploadResult.uploadedAt,

          uploadedBy: response.evidence.uploadedBy.name,

          comments: []

        };

      });



      const uploadedFiles = await Promise.all(uploadPromises);

      setEvidenceFiles(prev => [...prev, ...uploadedFiles]);



      toast.success(`${files.length} file(s) uploaded successfully`);

    } catch (error: any) {

      console.error('Error uploading files:', error);

      toast(error.message || 'Failed to upload files', { variant: 'destructive' });

    } finally {

      setUploadingFiles(false);

    }

  }



  function openFilePreview(file: EvidenceFile) {

    setSelectedFile(file);

    setFilePreviewOpen(true);

    setNewComment('');

  }



  async function addComment() {

    if (!selectedFile || !newComment.trim()) return;



    try {

      const response = await addCommentToEvidence(selectedFile.id, {

        comment: newComment.trim()

      });



      // Update the local state with the new comment

      const newCommentObj: EvidenceComment = {

        commentor: {

          userId: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].commentor.userId,

          name: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].commentor.name,

          email: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].commentor.email

        },

        comment: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].comment,

        timestamp: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].timestamp

      };



      setEvidenceFiles(prev => prev.map(file =>

        file.id === selectedFile.id

          ? { ...file, comments: [...file.comments, newCommentObj] }

          : file

      ));



      setSelectedFile(prev => prev ? {

        ...prev,

        comments: [...prev.comments, newCommentObj]

      } : null);



      setNewComment('');

      toast.success('Comment added successfully');

    } catch (error: any) {

      console.error('Error adding comment:', error);

      toast(error.message || 'Failed to add comment', { variant: 'destructive' });

    }

  }



  // File Management Functions

  function startRenameFile(file: EvidenceFile) {

    setEditingFileId(file.id);

    setEditingFileName(file.fileName);

  }



  function cancelRenameFile() {

    setEditingFileId(null);

    setEditingFileName("");

  }



  async function saveRenameFile() {

    if (!editingFileId || !editingFileName.trim()) return;



    try {

      // Find the current file to get its URL

      const currentFile = evidenceFiles.find(file => file.id === editingFileId);

      if (!currentFile) {

        toast.error('File not found');

        return;

      }



      // Extract the file extension from the original filename

      const fileExtension = currentFile.fileName.split('.').pop();

      const newFileName = editingFileName.trim();

      const newFileNameWithExt = newFileName.includes('.') ? newFileName : `${newFileName}.${fileExtension}`;



      // Create new URL by replacing the filename in the existing URL

      const urlParts = currentFile.fileUrl.split('/');

      urlParts[urlParts.length - 1] = newFileNameWithExt;

      const newUrl = urlParts.join('/');



      // Call the backend API to update the evidence URL

      await updateEvidenceUrl(editingFileId, { evidenceUrl: newUrl });



      // Update the local state with the new filename and URL

      setEvidenceFiles(prev => prev.map(file =>

        file.id === editingFileId

          ? { ...file, fileName: newFileNameWithExt, fileUrl: newUrl }

          : file

      ));



      // Update selected file if it's the one being renamed

      if (selectedFile?.id === editingFileId) {

        setSelectedFile(prev => prev ? { ...prev, fileName: newFileNameWithExt, fileUrl: newUrl } : null);

      }



      setEditingFileId(null);

      setEditingFileName("");

      toast.success('File renamed successfully');

    } catch (error: any) {

      console.error('Error renaming file:', error);

      toast.error(`Failed to rename file: ${error.message}`);

    }

  }



  function confirmDeleteFile(file: EvidenceFile) {

    setFileToDelete(file);

    setDeleteConfirmOpen(true);

  }



  async function deleteFile() {

    if (!fileToDelete) return;



    setIsDeletingFile(true);

    try {

      // Call the delete API

      await deleteClassificationEvidence(fileToDelete.id);



      // Update local state

      setEvidenceFiles(prev => prev.filter(file => file.id !== fileToDelete.id));



      // Close preview if the deleted file was being viewed

      if (selectedFile?.id === fileToDelete.id) {

        setFilePreviewOpen(false);

        setSelectedFile(null);

      }



      setDeleteConfirmOpen(false);

      setFileToDelete(null);

      toast.success('File deleted successfully');

    } catch (error: any) {

      console.error('Error deleting file:', error);

      toast.error(`Failed to delete file: ${error.message}`);

    } finally {

      setIsDeletingFile(false);

    }

  }



  // Review Workflow Functions - Using localStorage for persistence

  async function loadReviewWorkflow() {

    try {

      const classificationId = await getClassificationId(classification, engagement.id);

      console.log(`Loading reviews for classification: ${classification} -> ${classificationId}`);



      const response = await getReviewsByClassification(classificationId);



      // Convert API response to ReviewWorkflow format

      const reviews: ReviewRecord[] = response.reviews.map(review => ({

        id: review._id,

        classificationId: classification,

        userId: review.reviewedBy.userId,

        userName: review.reviewedBy.name,

        timestamp: review.reviewedOn,

        comment: review.comment,

        reviewed: review.status === 'signed-off',

        status: review.status

      }));


      // Sort reviews by timestamp to get the latest review
      const sortedReviews = reviews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const latestReview = sortedReviews[0];


      const workflow: ReviewWorkflow = {

        classificationId: classification,

        engagementId: engagement.id,

        reviews: reviews,

        isSignedOff: latestReview?.status === 'signed-off',
        signedOffBy: latestReview?.status === 'signed-off' ? latestReview.userName : undefined,
        signedOffAt: latestReview?.status === 'signed-off' ? latestReview.timestamp : undefined
      };

      // Always trust the backend data for the current state
      // Clear any cached data that conflicts with backend truth
      const cacheKey = `review-workflow-${engagement.id}-${classification}`;

      const cachedWorkflow = localStorage.getItem(cacheKey);



      if (cachedWorkflow) {

        const cached = JSON.parse(cachedWorkflow);


        // If backend shows not signed-off but cache shows signed-off, clear the cache
        if (!workflow.isSignedOff && cached.isSignedOff) {
          console.log('Backend shows not signed-off, clearing cached signed-off status');
          localStorage.removeItem(cacheKey);
        }
        // If backend shows signed-off but cache doesn't, update the cache
        else if (workflow.isSignedOff && !cached.isSignedOff) {
          console.log('Backend shows signed-off, updating cache');
        }
        // If both show signed-off, preserve additional cache data
        else if (workflow.isSignedOff && cached.isSignedOff) {
          workflow.signedOffBy = cached.signedOffBy || workflow.signedOffBy;

          workflow.signedOffAt = cached.signedOffAt || workflow.signedOffAt;

          console.log('Preserved signed-off details from cache');
        }

      }



      setReviewWorkflow(workflow);



      // Cache the workflow state

      localStorage.setItem(cacheKey, JSON.stringify(workflow));



      console.log(`Loaded ${reviews.length} reviews, signed-off: ${workflow.isSignedOff}`);

    } catch (error: any) {

      console.error('Error loading review workflow:', error);

      toast(error.message || 'Failed to load review workflow', { variant: 'destructive' });



      // Try to load from cache if API fails

      const cacheKey = `review-workflow-${engagement.id}-${classification}`;

      const cachedWorkflow = localStorage.getItem(cacheKey);



      if (cachedWorkflow) {

        const cached = JSON.parse(cachedWorkflow);

        setReviewWorkflow(cached);

        console.log('Loaded review workflow from cache due to API error');

      } else {

        setReviewWorkflow({

          classificationId: classification,

          engagementId: engagement.id,

          reviews: [],

          isSignedOff: false

        });

      }

    }

  }





  async function confirmSignOff() {

    // Directly perform sign-off without requiring comments

    await performSignOff();

  }



  async function performSignOff() {

    setIsSubmittingReview(true);

    try {

      const classificationId = await getClassificationId(classification, engagement.id);

      console.log(`Signing off review for classification: ${classification} -> ${classificationId}`);



      // Get real user context

      const userContext = await getUserContext();



      // Create a new review with sign-off status (no comment required)

      const reviewData = {

        engagementId: engagement.id,

        classificationId: classificationId,

        comment: 'Classification signed off',

        location: userContext.location,

        ipAddress: userContext.ipAddress,

        sessionId: userContext.sessionId,

        systemVersion: userContext.systemVersion

      };



      const response = await createClassificationReview(reviewData);



      // Update the status to signed-off

      await updateReviewStatus(response.review._id, { status: 'signed-off' });



      // Immediately update the local state to show signed-off status

      const updatedWorkflow: ReviewWorkflow = {

        classificationId: classification,

        engagementId: engagement.id,

        reviews: [

          ...(reviewWorkflow?.reviews || []),

          {

            id: response.review._id,

            classificationId: classification,

            userId: currentUser.id,

            userName: currentUser.name,

            timestamp: new Date().toISOString(),

            comment: 'Classification signed off',

            reviewed: true,

            status: 'signed-off'

          }

        ],

        isSignedOff: true,

        signedOffBy: currentUser.name,

        signedOffAt: new Date().toISOString()

      };



      setReviewWorkflow(updatedWorkflow);



      // Cache the signed-off status immediately

      const cacheKey = `review-workflow-${engagement.id}-${classification}`;

      localStorage.setItem(cacheKey, JSON.stringify(updatedWorkflow));



      setConfirmSignoffOpen(false);

      toast.success('Classification signed off successfully');


      // Notify parent to refresh notification counts
      if (onReviewStatusChange) {
        onReviewStatusChange();
      }
    } catch (error: any) {

      console.error('Error signing off review:', error);

      toast(error.message || 'Failed to sign off review', { variant: 'destructive' });

    } finally {

      setIsSubmittingReview(false);

    }

  }


  async function performReverseSignOff() {
    setIsReversingSignoff(true);
    try {
      const classificationId = await getClassificationId(classification, engagement.id);
      console.log(`Reversing sign-off for classification: ${classification} -> ${classificationId}`);

      // Get real user context
      const userContext = await getUserContext();

      // Create a new review with reverse sign-off status
      const reviewData = {
        engagementId: engagement.id,
        classificationId: classificationId,
        comment: 'Sign-off reversed',
        location: userContext.location,
        ipAddress: userContext.ipAddress,
        sessionId: userContext.sessionId,
        systemVersion: userContext.systemVersion
      };

      const response = await createClassificationReview(reviewData);

      // Update the status to in-review (reversing the sign-off)
      await updateReviewStatus(response.review._id, { status: 'in-review' });

      // Immediately update the local state to remove signed-off status
      const updatedWorkflow: ReviewWorkflow = {
        classificationId: classification,
        engagementId: engagement.id,
        reviews: [
          ...(reviewWorkflow?.reviews || []),
          {
            id: response.review._id,
            classificationId: classification,
            userId: currentUser.id,
            userName: currentUser.name,
            timestamp: new Date().toISOString(),
            comment: 'Sign-off reversed',
            reviewed: true,
            status: 'in-review'
          }
        ],
        isSignedOff: false,
        signedOffBy: undefined,
        signedOffAt: undefined
      };

      setReviewWorkflow(updatedWorkflow);

      // Cache the updated status immediately
      const cacheKey = `review-workflow-${engagement.id}-${classification}`;
      localStorage.setItem(cacheKey, JSON.stringify(updatedWorkflow));

      setConfirmReverseSignoffOpen(false);
      toast.success('Sign-off reversed successfully');

      // Notify parent to refresh notification counts
      if (onReviewStatusChange) {
        onReviewStatusChange();
      }
    } catch (error: any) {
      console.error('Error reversing sign-off:', error);
      toast(error.message || 'Failed to reverse sign-off', { variant: 'destructive' });
    } finally {
      setIsReversingSignoff(false);
    }
  }


  async function submitReview() {

    if (!reviewWorkflow) return;



    // Show confirmation dialog instead of comment dialog

    setConfirmSignoffOpen(true);

  }



  async function submitReviewComment() {

    if (!reviewComment.trim()) {

      toast.error("Comment Required: Please add review comments before submitting");

      return;

    }



    setIsSubmittingReview(true);

    try {

      const classificationId = await getClassificationId(classification, engagement.id);

      console.log(`Submitting review comment for classification: ${classification} -> ${classificationId}`);



      // Get real user context

      const userContext = await getUserContext();



      // Create a new review with 'in-review' status

      const reviewData = {

        engagementId: engagement.id,

        classificationId: classificationId,

        comment: reviewComment.trim(),

        location: userContext.location,

        ipAddress: userContext.ipAddress,

        sessionId: userContext.sessionId,

        systemVersion: userContext.systemVersion,

        isDone: isReviewDone

      };



      const response = await createClassificationReview(reviewData);



      // Update the status to 'in-review'

      await updateReviewStatus(response.review._id, { status: 'in-review' });



      // Update the local state

      const updatedWorkflow: ReviewWorkflow = {

        classificationId: classification,

        engagementId: engagement.id,

        reviews: [

          ...(reviewWorkflow?.reviews || []),

          {

            id: response.review._id,

            classificationId: classification,

            userId: currentUser.id,

            userName: currentUser.name,

            timestamp: new Date().toISOString(),

            comment: reviewComment.trim(),

            reviewed: false,

            status: 'in-review',

            isDone: response.review.isDone || false

          }

        ],

        isSignedOff: false // Review doesn't sign off

      };



      setReviewWorkflow(updatedWorkflow);



      // Cache the workflow state

      const cacheKey = `review-workflow-${engagement.id}-${classification}`;

      localStorage.setItem(cacheKey, JSON.stringify(updatedWorkflow));



      setReviewPointsOpen(false);

      setReviewComment('');

      setIsReviewDone(false);

      toast.success('Review comments saved successfully');

    } catch (error: any) {

      console.error('Error submitting review comment:', error);

      toast(error.message || 'Failed to save review comments', { variant: 'destructive' });

    } finally {

      setIsSubmittingReview(false);

    }

  }







  function renderReviewButtons() {

    // Find the latest review for the current user

    const userReview = reviewWorkflow?.reviews.find(r => r.userId === currentUser.id);

    const userStatus = userReview?.status || 'pending';

    const isSignedOff = reviewWorkflow?.isSignedOff;



    const isReviewDisabled = isSignedOff || !currentUser.id || userLoading;

    const isSignOffDisabled = isSignedOff || userStatus === 'signed-off' || !currentUser.id || userLoading;



    return (

      <div className="flex items-center gap-2 flex-wrap">

        {/* Review Button - Opens Review Points/Comments */}

        <Button

          variant="outline"

          size="sm"

          onClick={() => setReviewPointsOpen(true)}

          disabled={isReviewDisabled}

          className="rounded-full"

        >

          {userLoading ? (

            <Loader2 className="h-4 w-4 mr-2 animate-spin" />

          ) : (

            <Eye className="h-4 w-4 mr-2" />

          )}

          <span className="hidden sm:inline">

            {userLoading ? 'Loading...' : 'Review'}

          </span>

          <span className="sm:hidden">

            {userLoading ? 'Loading' : 'Review'}

          </span>

        </Button>

        {/* Show when user's review is marked as done */}
        {userReview?.isDone && (
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
            <Check className="h-3 w-3 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Review Done</span>
          </div>
        )}

        {/* Sign-off Button - Separate from Review */}

        <Button

          variant="outline"

          size="sm"

          onClick={() => setConfirmSignoffOpen(true)}

          disabled={isSignOffDisabled}

          className="rounded-full"

        >

          <Save className="h-4 w-4 mr-2" />

          <span className="hidden sm:inline">Sign-off</span>

          <span className="sm:hidden">Sign-off</span>

        </Button>



        {/* Review History Button */}

        <Button

          variant="outline"

          size="sm"

          onClick={() => setReviewHistoryOpen(true)}

          className="rounded-full"

        >

          <MessageSquare className="h-4 w-4 mr-2" />

          <span className="hidden sm:inline">Review History</span>

          <span className="sm:hidden">History</span>

        </Button>



        {isSignedOff && (

          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReverseSignoffOpen(true)}
              disabled={isReversingSignoff}
              className="rounded-full bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
            >
              {isReversingSignoff ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">
                {isReversingSignoff ? 'Reversing...' : 'Reverse Sign-off'}
              </span>
              <span className="sm:hidden">
                {isReversingSignoff ? 'Reversing' : 'Reverse'}
              </span>
            </Button>
            <div className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full shadow-sm">
              <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
                <Check className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-green-700">
                ✓ Signed Off
              </span>
            </div>

          </>
        )}

      </div>

    );

  }






  // Evidence content renderer

  function renderEvidenceContent() {

    return (

      <div className="space-y-6">

        {/* File Upload Section */}

        <Card>

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <Upload className="h-5 w-5" />

              Upload Evidence Files

            </CardTitle>

            <CardDescription>

              Upload supporting documents, images, and other evidence files

            </CardDescription>

          </CardHeader>

          <CardContent>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">

              <input

                type="file"

                multiple

                accept="*/*"

                onChange={handleFileUpload}

                className="hidden"

                id="evidence-file-upload"

                disabled={uploadingFiles}

              />

              <label

                htmlFor="evidence-file-upload"

                className="cursor-pointer flex flex-col items-center gap-2"

              >

                <Upload className="h-8 w-8 text-gray-400" />

                <div className="text-sm text-gray-600">

                  <span className="font-medium text-blue-600 hover:text-blue-500">

                    Click to upload

                  </span>{" "}

                  or drag and drop

                </div>

                <div className="text-xs text-gray-500">

                  All file types supported

                </div>

              </label>

            </div>

            {uploadingFiles && (

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">

                <Loader2 className="h-4 w-4 animate-spin" />

                Uploading files...

              </div>

            )}

          </CardContent>

        </Card>



        {/* Files List Section */}

        <Card>

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <FileText className="h-5 w-5" />

              Evidence Files ({evidenceFiles.length})

            </CardTitle>

          </CardHeader>

          <CardContent>

            {evidenceFiles.length === 0 ? (

              <div className="text-center py-8 text-gray-500">

                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />

                <p>No evidence files uploaded yet</p>

                <p className="text-sm">Upload files to get started</p>

              </div>

            ) : (

              <div className="space-y-3">

                {evidenceFiles.map((file) => (

                  <div

                    key={file.id}

                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 min-w-0"

                  >

                    <div className="flex items-center gap-3 flex-1 min-w-0">

                      {getFileIcon(file.fileType)}

                      <div className="flex-1 min-w-0">

                        {editingFileId === file.id ? (

                          <div className="flex items-center gap-2">

                            <Input

                              value={editingFileName}

                              onChange={(e) => setEditingFileName(e.target.value)}

                              className="text-sm h-7"

                              onKeyDown={(e) => {

                                if (e.key === 'Enter') saveRenameFile();

                                if (e.key === 'Escape') cancelRenameFile();

                              }}

                              autoFocus

                            />

                            <Button

                              size="sm"

                              variant="ghost"

                              onClick={saveRenameFile}

                              className="h-7 w-7 p-0"

                            >

                              <Check className="h-3 w-3 text-green-600" />

                            </Button>

                            <Button

                              size="sm"

                              variant="ghost"

                              onClick={cancelRenameFile}

                              className="h-7 w-7 p-0"

                            >

                              <X className="h-3 w-3 text-red-600" />

                            </Button>

                          </div>

                        ) : (

                          <div

                            className="font-medium text-sm truncate cursor-pointer"

                            title={file.fileName}

                            onClick={() => openFilePreview(file)}

                          >

                            {file.fileName}

                          </div>

                        )}

                        <div className="text-xs text-gray-500">

                          {formatFileSize(file.fileSize)} • {formatDate(file.uploadedAt)} • {file.comments.length} comments

                        </div>

                      </div>

                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">

                      <Badge variant="secondary" className="text-xs">

                        {file.fileType.toUpperCase()}

                      </Badge>

                      {/* Linked Files Button */}
                      <Drawer>
                        <DrawerTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3"
                            disabled={!file.linkedWorkbooks || file.linkedWorkbooks.length === 0}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {file.linkedWorkbooks?.length || 0} file{file.linkedWorkbooks?.length !== 1 ? 's' : ''}
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>Linked Workbooks</DrawerTitle>
                            <DrawerDescription>
                              Manage linked workbooks for {file.fileName}
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="px-4 pb-4">
                            {!file.linkedWorkbooks || file.linkedWorkbooks.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                No linked workbooks for this evidence file.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {file.linkedWorkbooks.map((workbook: any) => (
                                  <div
                                    key={workbook._id || workbook.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                      <div>
                                        <p className="font-medium">{workbook.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          Uploaded: {formatDateForLinkedFiles(workbook.uploadedDate)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewWorkbookFromEvidence(workbook)}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Workbook</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to remove "{workbook.name}" from this evidence file?
                                              This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleRemoveWorkbookFromEvidence(
                                                file.id,
                                                workbook._id || workbook.id,
                                                workbook.name
                                              )}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Remove
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <DrawerFooter>
                            <DrawerClose asChild>
                              <Button variant="outline">Close</Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>

                      <div className="flex items-center gap-2">

                        <Button

                          size="sm"

                          variant="ghost"

                          onClick={() => openFilePreview(file)}

                          className="h-7 w-7 p-0"

                        >

                          {/* <Eye className="h-3 w-3 text-gray-400" /> */}
                          <span className="px-2 text-xs">View</span>

                        </Button>

                        {editingFileId !== file.id && (

                          <>

                            <Button

                              size="sm"

                              variant="ghost"

                              onClick={(e) => {

                                e.stopPropagation();

                                startRenameFile(file);

                              }}

                              className="h-7 w-7 p-0"

                            >

                              <Edit2 className="h-3 w-3 text-blue-400" />

                            </Button>

                            <Button

                              size="sm"

                              variant="ghost"

                              onClick={(e) => {

                                e.stopPropagation();

                                confirmDeleteFile(file);

                              }}

                              className="h-7 w-7 p-0"

                            >

                              <Trash2 className="h-3 w-3 text-red-400" />

                            </Button>

                          </>

                        )}

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </CardContent>

        </Card>



        {/* File Preview Dialog */}

        <Dialog open={filePreviewOpen} onOpenChange={setFilePreviewOpen}>

          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">

            <DialogHeader>

              <DialogTitle className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  {selectedFile && getFileIcon(selectedFile.fileType)}

                  {selectedFile?.fileName}

                </div>

                <div className="text-sm text-gray-500 font-normal">

                  Uploaded by: <span className="font-medium text-gray-700">{selectedFile?.uploadedBy}</span>

                </div>

              </DialogTitle>

            </DialogHeader>



            <div className="flex flex-col h-[75vh]">

              {/* File Preview */}

              <div className="flex-1 border rounded-lg overflow-hidden mb-4 bg-gray-50">

                {selectedFile && renderFilePreview(selectedFile)}

              </div>



              {/* Comments Section */}

              <div className="border-t pt-4">

                <h4 className="font-medium mb-3 flex items-center gap-2">

                  <MessageSquare className="h-4 w-4" />

                  Comments ({selectedFile?.comments.length || 0})

                </h4>



                {/* Comments List */}

                <ScrollArea className="h-32 mb-4">

                  <div className="space-y-3">

                    {selectedFile?.comments.map((comment, index) => (

                      <div key={index} className="flex gap-3 p-2 bg-gray-50 rounded">

                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">

                          {comment.commentor.name.charAt(0).toUpperCase()}

                        </div>

                        <div className="flex-1">

                          <div className="flex items-center gap-2 mb-1">

                            <span className="font-medium text-sm">{comment.commentor.name}</span>

                            <span className="text-xs text-gray-500">{formatDate(comment.timestamp)}</span>

                          </div>

                          <p className="text-sm text-gray-700">{comment.comment}</p>

                        </div>

                      </div>

                    ))}

                    {selectedFile?.comments.length === 0 && (

                      <p className="text-center text-gray-500 text-sm py-4">No comments yet</p>

                    )}

                  </div>

                </ScrollArea>



                {/* Add Comment */}

                <div className="flex gap-2">

                  <Textarea

                    placeholder="Add a comment..."

                    value={newComment}

                    onChange={(e) => setNewComment(e.target.value)}

                    className="flex-1"

                    rows={2}

                  />

                  <Button

                    onClick={addComment}

                    disabled={!newComment.trim()}

                    size="sm"

                  >

                    <MessageSquare className="h-4 w-4" />

                  </Button>

                </div>

              </div>

            </div>

          </DialogContent>

        </Dialog>

        {/* NEW: WorkBook Section at the bottom of Evidence tab */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Linked Workbooks
          </h3>
          <WorkBookApp
            key={`workbook-app-evidence-${leadSheetRefreshTrigger}`}
            engagement={engagement}
            engagementId={engagement.id || engagement._id}
            classification={classification}
            etbRows={evidenceFiles.map(file => ({
              _id: file.id,
              code: file.id,
              accountName: file.fileName,
              classification: classification,
              currentYear: 0,
              priorYear: 0,
              adjustments: 0,
              finalBalance: 0,
              reclassifications: 0,
              grouping1: '',
              grouping2: '',
              grouping3: '',
              grouping4: '',
              additionalColumns: {},
              linkedExcelFiles: file.linkedWorkbooks || [],
              mappings: file.mappings || [] // ✅ CRITICAL FIX: Use actual evidence mappings!
            }))}
            onRefreshData={async () => {
              console.log('Evidence: Refreshing data after workbook linking');
              await loadEvidenceFiles();
              setLeadSheetRefreshTrigger(prev => prev + 1);
            }}
            rowType="evidence"
            refreshTrigger={workbookRefreshTrigger}
            onEvidenceMappingUpdated={handleEvidenceMappingUpdated}
            allClassifications={allClassifications}
          />
        </div>

      </div>

    );

  }



  // Helper functions for Evidence

  function getFileIcon(fileType: string) {

    const type = fileType.toLowerCase();

    if (type.includes('image')) return <Image className="h-5 w-5 text-green-500" />;

    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;

    if (type.includes('word') || type.includes('doc')) return <FileText className="h-5 w-5 text-blue-500" />;

    if (type.includes('excel') || type.includes('sheet')) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;

    return <File className="h-5 w-5 text-gray-500" />;

  }



  function formatFileSize(bytes: number) {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

  }



  function formatDate(dateString: string) {

    return new Date(dateString).toLocaleDateString();

  }



  function renderFilePreview(file: EvidenceFile) {

    const type = file.fileType.toLowerCase();



    if (type.includes('image')) {

      return (

        <div className="flex items-center justify-center h-full bg-gray-50">

          <img

            src={file.fileUrl}

            alt={file.fileName}

            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"

            style={{ maxHeight: '70vh' }}

          />

        </div>

      );

    }



    if (type.includes('pdf')) {

      return (

        <div className="flex items-center justify-center h-full bg-gray-50">

          <iframe

            src={file.fileUrl}

            className="w-full h-full border-0 rounded-lg shadow-sm"

            title={file.fileName}

            style={{ minHeight: '70vh' }}

          />

        </div>

      );

    }



    // For text files, try to display content

    if (type.includes('text') || type.includes('csv') || file.fileName.endsWith('.txt') || file.fileName.endsWith('.csv')) {

      return (

        <div className="flex items-center justify-center h-full bg-gray-50">

          <iframe

            src={file.fileUrl}

            className="w-full h-full border-0 rounded-lg shadow-sm"

            title={file.fileName}

            style={{ minHeight: '70vh' }}

          />

        </div>

      );

    }



    // For Office documents (Word, Excel, PowerPoint), try to preview

    if (type.includes('word') || type.includes('excel') || type.includes('powerpoint') ||

      type.includes('officedocument') || file.fileName.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) {

      return (

        <div className="flex items-center justify-center h-full bg-gray-50">

          <iframe

            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.fileUrl)}`}

            className="w-full h-full border-0 rounded-lg shadow-sm"

            title={file.fileName}

            style={{ minHeight: '70vh' }}

          />

        </div>

      );

    }



    // For other file types, show file info and preview attempt

    return (

      <div className="flex items-center justify-center h-full bg-gray-50">

        <div className="text-center p-8">

          <div className="mb-4">

            {getFileIcon(file.fileType)}

          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">{file.fileName}</h3>

          <p className="text-sm text-gray-600 mb-4">

            {formatFileSize(file.fileSize)} • {file.fileType}

          </p>

          <div className="bg-white rounded-lg p-4 shadow-sm border">

            <p className="text-sm text-gray-500 mb-2">Preview not available for this file type</p>

            <p className="text-xs text-gray-400">

              File uploaded on {formatDate(file.uploadedAt)}

            </p>

          </div>

        </div>

      </div>

    );

  }



  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {

    const files = event.target.files;

    if (!files || files.length === 0) return;



    setUploadingFiles(true);



    try {

      const classificationId = await getClassificationId(classification, engagement.id);

      console.log(`Uploading files for classification: ${classification} -> ${classificationId}`);



      const uploadPromises = Array.from(files).map(async (file) => {

        // Validate file

        const validation = validateFile(file);

        if (!validation.isValid) {

          throw new Error(validation.error || 'Invalid file');

        }



        // Upload file to storage

        const uploadResult = await uploadFileToStorage(file);



        // Create evidence record via API

        const evidenceData = {

          engagementId: engagement.id,

          classificationId: classificationId,

          evidenceUrl: uploadResult.url

        };



        const response = await createClassificationEvidence(evidenceData);



        // Convert API response to EvidenceFile format

        return {

          id: response.evidence._id,

          fileName: uploadResult.fileName,

          fileUrl: uploadResult.url,

          fileType: uploadResult.fileType,

          fileSize: uploadResult.fileSize,

          uploadedAt: uploadResult.uploadedAt,

          uploadedBy: response.evidence.uploadedBy.name,

          comments: []

        };

      });



      const uploadedFiles = await Promise.all(uploadPromises);

      setEvidenceFiles(prev => [...prev, ...uploadedFiles]);



      toast.success(`${files.length} file(s) uploaded successfully`);

    } catch (error: any) {

      console.error('Error uploading files:', error);

      toast(error.message || 'Failed to upload files', { variant: 'destructive' });

    } finally {

      setUploadingFiles(false);

    }

  }



  function openFilePreview(file: EvidenceFile) {

    setSelectedFile(file);

    setFilePreviewOpen(true);

    setNewComment('');

  }



  async function addComment() {

    if (!selectedFile || !newComment.trim()) return;



    try {

      const response = await addCommentToEvidence(selectedFile.id, {

        comment: newComment.trim()

      });



      // Update the local state with the new comment

      const newCommentObj: EvidenceComment = {

        commentor: {

          userId: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].commentor.userId,

          name: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].commentor.name,

          email: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].commentor.email

        },

        comment: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].comment,

        timestamp: response.evidence.evidenceComments[response.evidence.evidenceComments.length - 1].timestamp

      };



      setEvidenceFiles(prev => prev.map(file =>

        file.id === selectedFile.id

          ? { ...file, comments: [...file.comments, newCommentObj] }

          : file

      ));



      setSelectedFile(prev => prev ? {

        ...prev,

        comments: [...prev.comments, newCommentObj]

      } : null);



      setNewComment('');

      toast.success('Comment added successfully');

    } catch (error: any) {

      console.error('Error adding comment:', error);

      toast(error.message || 'Failed to add comment', { variant: 'destructive' });

    }

  }



  // Inline (normal) vs fullscreen (portal)

  if (!isFullscreen) {

    console.log("reviewClassification", reviewClassification)

    return <div className="h-full flex flex-col">{content}</div>;

  }

  console.log("reviewClassification", reviewClassification)

  return (



    <FullscreenOverlay onExit={() => setIsFullscreen(false)}>

      <div className="absolute right-4 top-4 z-10">

        {/* Exit button handled by FullscreenOverlay */}

      </div>

      <div className="h-full w-full overflow-auto">{content}</div>

    </FullscreenOverlay>

  );

  // ✅ NEW: ExcelViewer for All Workbooks
  const allWorkbookViewer = isAllWorkbookViewerOpen && selectedAllWorkbook ? (
    <ExcelViewer
      workbook={selectedAllWorkbook}
      mappingsRefreshKey={allWorkbookMappingsRefreshKey}
      setSelectedWorkbook={setSelectedAllWorkbook}
      mappings={allWorkbookMappings}
      namedRanges={allWorkbookNamedRanges}
      onBack={() => {
        setIsAllWorkbookViewerOpen(false);
        setSelectedAllWorkbook(null);
        setAllWorkbookMappings([]);
        setAllWorkbookNamedRanges([]);
      }}
      onLinkField={(selection) => {
        // Open link dialog
        handleLinkAllWorkbookToField(selectedAllWorkbook);
      }}
      onLinkSheet={() => {
        toast.info("Link sheet functionality not available from All Workbooks view");
      }}
      onLinkWorkbook={() => {
        toast.info("Link workbook functionality not available from All Workbooks view");
      }}
      onReupload={handleAllWorkbookReupload}
      onViewAuditLog={() => {
        toast.info("Audit log functionality not available from All Workbooks view");
      }}
      onCreateMapping={handleAllWorkbookCreateMapping}
      onUpdateMapping={handleAllWorkbookUpdateMapping}
      onDeleteMapping={handleAllWorkbookDeleteMapping}
      onCreateNamedRange={handleAllWorkbookCreateNamedRange}
      onUpdateNamedRange={handleAllWorkbookUpdateNamedRange}
      onDeleteNamedRange={handleAllWorkbookDeleteNamedRange}
      isLoadingWorkbookData={isLoadingAllWorkbookData}
      workingPaperCloudInfo={null}
      updateSheetsInWorkbook={handleAllWorkbookUpdateSheets}
      engagementId={engagement.id || engagement._id}
      classification={selectedAllWorkbook.classification || classification}
      rowType="etb"
      parentEtbData={sectionData ? { rows: sectionData } as any : null}
      onRefreshETBData={refreshLeadSheetData}
      onRefreshMappings={refreshAllWorkbookMappings}
      onRefreshParentData={refreshLeadSheetData}
      onEvidenceMappingUpdated={handleEvidenceMappingUpdated}
    />
  ) : null;

  // ✅ NEW: Link Dialog for All Workbooks (similar to MainDashboard)
  const allWorkbookLinkDialog = isAllWorkbookLinkDialogOpen && selectedAllWorkbookForLink ? (
    <Dialog open={isAllWorkbookLinkDialogOpen} onOpenChange={setIsAllWorkbookLinkDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Workbook to Field</DialogTitle>
          <DialogDescription>
            Select a field to link the workbook "{selectedAllWorkbookForLink.name}" to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="field-select" className="text-right">Field</Label>
            <div className="col-span-3">
              {!sectionData || sectionData.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2 border rounded-md">
                  Loading fields for "{classification}"...
                </div>
              ) : (
                <select
                  id="field-select"
                  value={selectedRowIdForLink}
                  onChange={(e) => setSelectedRowIdForLink(e.target.value)}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select a field</option>
                  {sectionData.map((row) => (
                    <option key={row.code} value={row.code}>
                      {row.code} - {row.accountName}
                      {row.classification && ` (${row.classification})`}
                    </option>
                  ))}
                </select>
              )}
              {sectionData && sectionData.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {sectionData.length} field{sectionData.length !== 1 ? 's' : ''} available in this classification
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsAllWorkbookLinkDialogOpen(false);
              setSelectedAllWorkbookForLink(null);
              setSelectedRowIdForLink("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAllWorkbookLink}
            disabled={!selectedRowIdForLink || isLinkingAllWorkbook}
          >
            {isLinkingAllWorkbook ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking...
              </>
            ) : (
              "Link Workbook"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  return (
    <>
      {content}
    </>
  );

};

