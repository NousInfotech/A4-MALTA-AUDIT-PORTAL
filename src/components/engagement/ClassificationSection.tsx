// @ts-nocheck



import type React from "react";

import { useState, useEffect, useMemo, useRef } from "react";

import { Toaster } from "@/components/ui/toaster"

import { useToast } from "@/components/ui/use-toast"

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

  Image,

  File,

  MessageSquare,

  X,

  Edit2,

  Trash2,

  Check,

  RotateCcw,
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

import ProcedureView from "../procedures/ProcedureView";
import WorkBookApp from "../audit-workbooks/WorkBookApp";



interface ClassificationSectionProps {

  engagement: any;

  classification: string;

  onClose?: () => void;

  onClassificationJump?: (classification: string) => void;

  onReviewStatusChange?: () => void; // Callback to refresh notification counts
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

}



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

const isETB = (c: string) => c === "ETB";



const TOP_CATEGORIES = ["Equity", "Income", "Expenses"];



const shouldHaveWorkingPapers = (classification: string) => {

  return !isETB(classification) && !isAdjustments(classification);

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

  if (isETB(c)) return "Extended Trial Balance";

  const parts = c.split(" > ");

  const top = parts[0];

  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1];

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

export const ClassificationSection: React.FC<ClassificationSectionProps> = ({

  engagement,

  classification,

  onClose,

  onClassificationJump,

  onReviewStatusChange,
}) => {





  const { toast } = useToast();



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



  const [loading, setLoading] = useState(true); // global loader (ETB / lead-sheet)

  const [wpHydrating, setWpHydrating] = useState(false); // dedicated loader for WP tab pulls

  const [sectionData, setSectionData] = useState<ETBRow[]>([]);

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

        toast({

          title: "Could not load procedures",

          description: err?.message || "Please try again.",

          variant: "destructive",

        });

      } finally {

        setProcedureLoading(false);

      }

    };

    fetchProcedureIfNeeded();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [activeTab, engagement?._id]);

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



      toast({

        title: "Answers Generated",

        description: `Answers for ${formatClassificationForDisplay(classification)} have been generated.`,

      });

    } catch (error: any) {

      console.error("Generate answers error:", error);

      toast({

        title: "Generation failed",

        description: error.message,

        variant: "destructive",

      });

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



  const loadSectionData = async () => {

    try {

      if (isAdjustments(classification) || isETB(classification)) {

        const etbResp = await authFetch(

          `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`

        );

        if (!etbResp.ok) throw new Error("Failed to load ETB");

        const etb = await etbResp.json();

        const rows: ETBRow[] = Array.isArray(etb.rows) ? etb.rows : [];

        if (!mountedRef.current) return;

        setSectionData(

          isAdjustments(classification)

            ? rows.filter((r) => Number(r.adjustments) !== 0)

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

      setSectionData(Array.isArray(data.rows) ? data.rows : []);

    } catch (error: any) {

      console.error("Load error:", error);

      toast.error(`Load failed: ${error.message}`);

    }

  };



  const reloadDataFromETB = async () => {

    setLoading(true);

    try {

      if (isAdjustments(classification) || isETB(classification)) {

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
  const onWpTab = activeTab === "working-papers";
  if (onWpTab) setDbBusy("load");
  else setLoading(true);

  try {
    const response = await authFetch(
      `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/db`
    );

    if (response.ok) {
      const json = await response.json();
      if (!mountedRef.current) return false;

      // ✅ Only replace sectionData if we're actually viewing Working Papers
      if (onWpTab) {
        setSectionData(Array.isArray(json.rows) ? json.rows : []);
      }

      if (!silent) {
        toast.success("Working Paper loaded from database.");
      }
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

    () =>

      sectionData.reduce(

        (acc, row) => ({

          currentYear: acc.currentYear + (Number(row.currentYear) || 0),

          priorYear: acc.priorYear + (Number(row.priorYear) || 0),

          adjustments: acc.adjustments + (Number(row.adjustments) || 0),

          finalBalance: acc.finalBalance + (Number(row.finalBalance) || 0),

        }),

        { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 }

      ),

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





  // Load evidence files when classification changes

  useEffect(() => {

    if (!engagement.id || !classification) {

      setEvidenceFiles([]);

      return;

    }



    let isMounted = true;



    const loadEvidenceFiles = async () => {

      try {

        console.log('Starting to load evidence files...');

        const classificationId = await getClassificationId(classification, engagement.id);

        console.log(`Loading evidence for classification: ${classification} -> ${classificationId}`);



        const response = await getAllClassificationEvidence(engagement.id, classificationId);



        if (!isMounted) return; // Component unmounted, don't update state



        // Convert API response to EvidenceFile format

        const evidenceFiles: EvidenceFile[] = response.evidence.map(evidence => ({

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

          }))

        }));



        setEvidenceFiles(evidenceFiles);

        console.log(`Loaded ${evidenceFiles.length} evidence files`);

      } catch (error: any) {

        console.error('Error loading evidence files:', error);

        if (isMounted) {

          toast(error.message || 'Failed to load evidence files', { variant: 'destructive' });

          setEvidenceFiles([]);

        }

      }

    };



    loadEvidenceFiles();



    return () => {

      isMounted = false;

    };

  }, [engagement.id, classification]);



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

            <TabsList className="grid w-full grid-cols-5">

              <TabsTrigger value="lead-sheet">Lead Sheet</TabsTrigger>

              <TabsTrigger value="working-papers">Working Papers</TabsTrigger>

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

              {procedureLoading ? (

                <div className="flex items-center justify-center h-64">

                  <EnhancedLoader variant="pulse" size="lg" text="Loading Procedures..." />

                </div>

              ) : (

                <>

                  {/* ✅ NEW: Generate Answers button for current classification */}



                  <ProcedureView

                    procedure={procedure}

                    engagement={engagement}

                    currentClassification={classification}

                    onProcedureUpdate={setProcedure} // Pass your state setter here

                  />

                  {procedure && procedure.questions && procedure.questions.some((q: any) => q.classification === classification) && (

                    <div className="my-4 flex justify-end">

                      <Button

                        onClick={generateAnswersForClassification}

                        disabled={generatingAnswers}

                        className="flex items-center gap-2"

                      >

                        {generatingAnswers ? (

                          <Loader2 className="h-4 w-4 animate-spin" />

                        ) : (

                          <FileText className="h-4 w-4" />

                        )}

                        {hasAnswersForClassification ? 'Regenerate Answers' : 'Generate Answers'}

                      </Button>

                    </div>

                  )}

                </>

              )}

            </TabsContent>

            {/* work book */}
            <TabsContent

              value="work-book"

              className="flex-1 flex flex-col"

            >
              <>
              {/* <div className="my-5">
                {renderDataTable()}
              </div> */}
              <WorkBookApp engagement={engagement} engagementId={engagement.id} classification={classification}/>
              </>
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

                    <div className="absolute left-0 top-0 -ml-2.5 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center text-white z-10">

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



  function renderLeadSheetContent() {

    return (

      <>

        {/* Summary Cards */}

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



        {renderDataTable()}

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

                  <th className="px-4 py-2 border-secondary border-b text-right">Reference</th>

                </tr>


            <tbody>

              {sectionData.map((row) => (

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

                    colSpan={8}

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

                <td key={i} className={`border-t-0 border-r-0 border-b border-b-secondary ${i!==0?"border-l border-l-secondary":""} px-3 py-2 font-bold`}>

                  {String(h ?? "")}

                </td>

              ))}

            </tr>

          </thead>

          <tbody>

            {rows.map((r: any[], ri: number) => (

              <tr key={ri} className="border-t">

                {r.map((c: any, ci: number) => (

                  <td key={ci} className={`border-t-0 border-r-0 ${ri !== rows.length - 1 ? "border-b border-b-secondary" : ""} ${ci!==0?"border-l border-l-secondary":""} px-3 py-2`}>

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

      toast({

        title: "Comment Required",

        description: "Please add review comments before submitting",

        variant: "destructive",

      });

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



  function renderDataTable() {

    const isSignedOff = reviewWorkflow?.isSignedOff;



    if (isETB(classification)) {

      // ETB view

      return (

        <div className="flex-1 border border-secondary rounded-lg overflow-hidden">

          <div className="overflow-x-auto max-h-96">

            <table className="w-full text-sm">

              <thead className="bg-gray-50">

                <tr>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Code</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Account Name</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Current Year</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Prior Year</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Adjustments</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold border-r w-[4rem] text-xs sm:text-sm">Final Balance</th>

                  <th className="px-4 py-2 border-b border-secondary font-bold w-[4rem] text-xs sm:text-sm">Classification</th>

                </tr>

              </thead>

              <tbody>

                {sectionData.map((row) => (

                  <tr key={row.id} className={`border-t ${isSignedOff ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>

                    <td className="px-4 py-2 border-b border-secondary border-r font-mono text-xs">{row.code}</td>

                    <td className="px-4 py-2 border-b border-secondary border-r">{row.accountName}</td>

                    <td className="px-4 py-2 border-b border-secondary border-r text-right">

                      {row.currentYear.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-b border-secondary border-r text-right">

                      {row.priorYear.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-b border-secondary border-r text-right">

                      {row.adjustments.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-b border-secondary border-r text-right font-medium">

                      {row.finalBalance.toLocaleString()}

                    </td>

                    <td className="border-b border-secondary">

                      <button

                        onClick={() =>

                          onClassificationJump?.(row.classification)

                        }

                        className="flex items-center gap-2"

                      >

                        <Badge variant="outline">

                          {formatClassificationForDisplay(row.classification)}

                        </Badge>

                      </button>

                    </td>

                  </tr>

                ))}

                {sectionData.length > 0 && (

                  <tr className="bg-muted/50 font-bold">

                    <td className="px-4 py-2 border-r border-secondary" colSpan={2}>

                      TOTALS

                    </td>

                    <td className="px-4 py-2 border-r border-secondary text-right">

                      {totals.currentYear.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-r border-secondary text-right">

                      {totals.priorYear.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-r border-secondary text-right">

                      {totals.adjustments.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-r border-secondary text-right">

                      {totals.finalBalance.toLocaleString()}

                    </td>

                  </tr>

                )}

                {sectionData.length === 0 && (

                  <tr>

                    <td

                      colSpan={7}

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

        <div className="overflow-auto max-h-96 space-y-6">

          {Object.entries(groupedForAdjustments).map(([cls, items]) => {

            const subtotal = items.reduce(

              (acc, r) => ({

                currentYear: acc.currentYear + (Number(r.currentYear) || 0),

                priorYear: acc.priorYear + (Number(r.priorYear) || 0),

                adjustments: acc.adjustments + (Number(r.adjustments) || 0),

                finalBalance: acc.finalBalance + (Number(r.finalBalance) || 0),

              }),

              { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 }

            );

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

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-left">Account Name</th>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-right">Current Year</th>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-right">Prior Year</th>

                        <th className="px-4 py-2 font-bold border-r border-secondary border-b text-right">Adjustments</th>

                        <th className="px-4 py-2 font-bold border-secondary border-b text-right">Final Balance</th>

                      </tr>

                    </thead>

                    <tbody>

                      {items.map((row) => (

                        <tr key={row.id} className={`border-t ${isSignedOff ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>

                          <td className="px-4 py-2 border-r border-secondary border-b font-mono text-xs">

                            {row.code}

                          </td>

                          <td className="px-4 py-2 border-r border-secondary border-b">{row.accountName}</td>

                          <td className="px-4 py-2 border-r border-secondary border-b text-right">

                            {row.currentYear.toLocaleString()}

                          </td>

                          <td className="px-4 py-2 border-r border-secondary border-b text-right">

                            {row.priorYear.toLocaleString()}

                          </td>

                          <td className="px-4 py-2 border-r border-secondary border-b text-right font-medium">

                            {row.adjustments.toLocaleString()}

                          </td>

                          <td className="px-4 py-2 border-secondary border-b text-right">

                            {row.finalBalance.toLocaleString()}

                          </td>

                        </tr>

                      ))}

                      <tr className="bg-muted/50 font-bold border-t">

                        <td className="px-4 py-2 border-r border-secondary" colSpan={2}>

                          Subtotal

                        </td>

                        <td className="px-4 py-2 border-r border-secondary text-right">

                          {subtotal.currentYear.toLocaleString()}

                        </td>

                        <td className="px-4 py-2 border-r border-secondary text-right">

                          {subtotal.priorYear.toLocaleString()}

                        </td>

                        <td className="px-4 py-2 border-r border-secondary text-right">

                          {subtotal.adjustments.toLocaleString()}

                        </td>

                        <td className="px-4 py-2 border-secondary text-right">

                          {subtotal.finalBalance.toLocaleString()}

                        </td>

                      </tr>

                    </tbody>

                  </table>

                </div>

              </div>

            );

          })}



          {/* Grand Totals for Adjustments */}

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

      return (

        <div className="flex-1 border border-secondary rounded-lg overflow-hidden">

          <div className="overflow-x-auto max-h-96">

            <table className="w-full text-sm">

              <thead className="bg-gray-50 sticky top-0">

                <tr>

                  <th className="px-4 py-2 border-r border-secondary border-b text-left">Code</th>

                  <th className="px-4 py-2 border-r border-secondary border-b text-left">Account Name</th>

                  <th className="px-4 py-2 border-r border-secondary border-b text-right">Current Year</th>

                  <th className="px-4 py-2 border-r border-secondary border-b text-right">Prior Year</th>

                  <th className="px-4 py-2 border-r border-secondary border-b text-right">Adjustments</th>

                  <th className="px-4 py-2 border-secondary border-b text-right">Final Balance</th>

                </tr>

              </thead>

              <tbody>

                {sectionData.map((row) => (

                  <tr key={row.id} className={`border-t ${isSignedOff ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>

                    <td className="px-4 py-2 border-r border-secondary border-b font-mono text-xs">{row.code}</td>

                    <td className="px-4 py-2 border-r border-secondary border-b">{row.accountName}</td>

                    <td className="px-4 py-2 border-r border-secondary border-b text-right">

                      {row.currentYear.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-r border-secondary border-b text-right">

                      {row.priorYear.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-r border-secondary border-b text-right">

                      {row.adjustments.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-secondary border-b text-right font-medium">

                      {row.finalBalance.toLocaleString()}

                    </td>

                  </tr>

                ))}

                {sectionData.length === 0 && (

                  <tr>

                    <td

                      colSpan={6}

                      className="px-4 py-8 text-center text-gray-500"

                    >

                      No data available for this classification

                    </td>

                  </tr>

                )}

                {sectionData.length > 0 && (

                  <tr className="bg-muted/50 font-medium">

                    <td className="px-4 py-2 border-r-secondary border font-bold" colSpan={2}>

                      TOTALS

                    </td>

                    <td className="px-4 py-2 border-r-secondary border font-bold text-right">

                      {totals.currentYear.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-r-secondary border font-bold text-right">

                      {totals.priorYear.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 border-r-secondary border font-bold text-right">

                      {totals.adjustments.toLocaleString()}

                    </td>

                    <td className="px-4 py-2 font-bold text-right">

                      {totals.finalBalance.toLocaleString()}

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      );

    }

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

};

