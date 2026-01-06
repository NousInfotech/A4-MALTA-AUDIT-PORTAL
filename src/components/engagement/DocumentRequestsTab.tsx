// @ts-nocheck
import { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Send,
  ChevronsUpDown,
  Check,
  FileText,
  Shield,
  Upload,
  X,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  Plus,
  FileEdit,
  FileUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  RotateCcw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KYCSetupModal } from "@/components/kyc/KYCSetupModal";
import { useToast } from "@/hooks/use-toast";
import { documentRequestApi, engagementApi } from "@/services/api";
import { format } from "date-fns";
import { DefaultDocumentRequestPreview } from "@/components/kyc/DefaultDocumentRequestPreview";
import { DocumentRequestTemplate } from '@/lib/api/documentRequestTemplate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import DocumentRequest from "../document-request/DocumentRequest";

const categories = [
  "Planning",
  "Capital & Reserves",
  "Property, plant and equipment",
  "Intangible Assets",
  "Investment Property",
  "Investment in Subsidiaries & Associates investments",
  "Receivables",
  "Payables",     
  "Inventory",
  "Bank & Cash",
  "Borrowings & loans",
  "Taxation",
  "Going Concern",
  "Others",
];

const mockSingleAndMultipleRequest: DocumentRequest = {
  _id: "req_1", 
  engagement: "eng_123",
  clientId: "client_456",

  name: "Planning documents Q1",
  category: "Planning",
  description: "Please provide the following planning documents for Q1 FY 2025.",
  comment: "Use latest available versions.",
  status: "pending",

  requestedAt: new Date("2025-01-10T09:00:00Z"),
  completedAt: undefined,

  // Single-document requirements (one file per row)
  documents: [
    {
      _id: "doc_single_1",
      name: "Trial Balance PDF",
      type: "direct",
      description: "Latest trial balance as at 31 Dec 2024.",
      url: "https://example.com/files/trial-balance.pdf",
      uploadedFileName: "TB_2024-12-31.pdf",
      uploadedAt: new Date("2025-01-11T10:30:00Z"),
      status: "submitted",
      comment: "Uploaded by client on 11 Jan.",
    },
    {
      _id: "doc_single_2",
      name: "Bank Statements",
      type: "template",
      template: {
        url: "https://example.com/templates/bank-statement-template.xlsx",
        instruction: "Download, fill in per account, and re-upload as PDF/XLSX.",
      },
      description: "Bank statements for all operating accounts for Q4 2024.",
      // not uploaded yet
      status: "pending",
      comment: "Waiting for client upload.",
    },
  ],

  // Multi-document grouped requirement
  multipleDocuments: [
    {
      _id: "multi_1",
      name: "ID & Address Proof Set",
      type: "template",
      instruction: "Upload separate files for each item below.",
      multiple: [
        {
          label: "Director 1 – ID proof",
          url: "https://example.com/files/director1_id.pdf",
          uploadedFileName: "director1_id.pdf",
          uploadedAt: new Date("2025-01-12T08:15:00Z"),
          status: "approved",
          comment: "Verified against client records.",
        },
        {
          label: "Director 1 – Address proof",
          // not uploaded yet
          status: "pending",
          comment: "Awaiting upload.",
        },
        {
          label: "Director 2 – ID proof",
          url: "https://example.com/files/director2_id.pdf",
          uploadedFileName: "director2_id.pdf",
          uploadedAt: new Date("2025-01-13T14:00:00Z"),
          status: "submitted",
          comment: "To be reviewed.",
        },
      ],
    },
  ],
} 

type ComboOption = { value: string; label?: string };

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  widthClass = "w-full",
  emptyText = "No results.",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[] | ComboOption[];
  placeholder?: string;
  widthClass?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const normalized = useMemo<ComboOption[]>(
    () =>
      (options as any[]).map((o) =>
        typeof o === "string"
          ? { value: o, label: o }
          : ({ value: o.value, label: o.label ?? o.value } as ComboOption)
      ),
    [options]
  );
  const selectedLabel = normalized.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between hover:text-sidebar-foreground hover:bg-inherit",
            widthClass
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selectedLabel || placeholder || "Select"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", widthClass)}>
        <Command
          filter={(val, search) =>
            val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={placeholder || "Search..."} />
          <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
            {emptyText}
          </CommandEmpty>
          <CommandGroup className="max-h-56 overflow-auto">
            {normalized.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.label || opt.value}
                onSelect={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === opt.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{opt.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface DocumentRequestsTabProps {
  requests: any[];
  documentRequest: {
    category: string;
    description: string;
    comment?: string;
    attachment?: File;
  };
  setDocumentRequest: (request: any) => void;
  handleSendDocumentRequest: () => void;
  engagement?: any;
}

export const DocumentRequestsTab = ({
  requests,
  documentRequest,
  setDocumentRequest,
  handleSendDocumentRequest,
  engagement,
}: DocumentRequestsTabProps) => {
  const { id: engagementId } = useParams<{ id: string }>();
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type?: 'document' | 'multipleItem' | 'multipleGroup' | 'request';
    documentRequestId?: string;
    documentIndex?: number;
    multipleDocumentId?: string;
    itemIndex?: number;
    documentName?: string;
  }>({ open: false });
  const [uploadingDocument, setUploadingDocument] = useState<{
    documentRequestId?: string;
    documentIndex?: number;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadingMultiple, setUploadingMultiple] = useState<{
    documentRequestId?: string;
    multipleDocumentId?: string;
    itemIndex?: number;
  } | null>(null);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [addRequestModalOpen, setAddRequestModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [multipleDocuments, setMultipleDocuments] = useState<any[]>([]);
  const [newDocument, setNewDocument] = useState<Partial<any>>({
    name: '',
    type: 'direct',
    description: '',
    template: {
      instruction: ''
    }
  });
  const [currentTemplateFile, setCurrentTemplateFile] = useState<File | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [notificationEmails, setNotificationEmails] = useState<string>('');
  const [previousYearModalOpen, setPreviousYearModalOpen] = useState(false);
  const [previousYearEngagements, setPreviousYearEngagements] = useState<any[]>([]);
  const [previousYearRequests, setPreviousYearRequests] = useState<any[]>([]);
  const [loadingPreviousYear, setLoadingPreviousYear] = useState(false);
  const [selectedPreviousEngagement, setSelectedPreviousEngagement] = useState<string>('');
  const { toast } = useToast();

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const calculateProgress = (request: any) => {
    const singleDocs = request.documents || [];
    const multipleDocs = request.multipleDocuments?.flatMap((m: any) => m.multiple || []) || [];
    const total = singleDocs.length + multipleDocs.length;
    if (total === 0) return 0;
    
    const completed = singleDocs.filter((d: any) => d.url && d.status !== 'rejected').length +
                    multipleDocs.filter((d: any) => d.url && d.status !== 'rejected').length;
    return (completed / total) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "approved":
        return "bg-green-500 text-green-700";
      case "submitted":
      case "uploaded":
      case "in-review":
        return "bg-blue-500 text-blue-700";
      case "rejected":
        return "bg-red-500 text-red-700";
      default:
        return "bg-yellow-500 text-yellow-700";
    }
  };

  const areActionsDisabled = loading || isUpdating || isActionInProgress || !!uploadingDocument || !!uploadingMultiple;

  useEffect(() => {
    if (engagementId) {
      fetchDocumentRequests();
    }
  }, [engagementId]);

  // Fetch previous year engagements for the same client
  const fetchPreviousYearEngagements = async () => {
    if (!engagement?.clientId) {
      toast({
        title: "Missing Information",
        description: "Client information is required to fetch previous year engagements.",
        variant: "destructive",
      });
      return;
    }

    if (!engagement?.yearEndDate) {
      toast({
        title: "Missing Information",
        description: "Year end date is required to fetch previous year engagements.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoadingPreviousYear(true);
      const allEngagements = await engagementApi.getAll();
      
      // Get current year from yearEndDate
      const currentYear = new Date(engagement.yearEndDate).getFullYear();
      
      // Filter engagements for same client, different year, and earlier years
      const previousEngagements = allEngagements
        .filter((eng: any) => {
          if (!eng.clientId || !eng.yearEndDate) return false;
          if (eng.clientId !== engagement.clientId) return false;
          if (eng._id === engagementId) return false; // Exclude current engagement
          
          try {
            const engYear = new Date(eng.yearEndDate).getFullYear();
            return engYear < currentYear; // Only previous years
          } catch (e) {
            return false; // Skip invalid dates
          }
        })
        .sort((a: any, b: any) => {
          // Sort by year descending (most recent first)
          try {
            const yearA = new Date(a.yearEndDate).getFullYear();
            const yearB = new Date(b.yearEndDate).getFullYear();
            return yearB - yearA;
          } catch (e) {
            return 0;
          }
        });
      
      setPreviousYearEngagements(previousEngagements);
      
      if (previousEngagements.length === 0) {
        toast({
          title: "No Previous Year Found",
          description: "No previous year engagements found for this client. You can still create new document requests manually.",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error('Error fetching previous year engagements:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch previous year engagements",
        variant: "destructive",
      });
    } finally {
      setLoadingPreviousYear(false);
    }
  };

  // Fetch document requests from a previous engagement
  const fetchPreviousYearRequests = async (prevEngagementId: string) => {
    try {
      setLoadingPreviousYear(true);
      const requests = await documentRequestApi.getByEngagement(prevEngagementId);
      setPreviousYearRequests(requests);
      setSelectedPreviousEngagement(prevEngagementId);
    } catch (error: any) {
      console.error('Error fetching previous year document requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch previous year document requests",
        variant: "destructive",
      });
    } finally {
      setLoadingPreviousYear(false);
    }
  };

  // Copy document names from previous year's request
  const handleCopyFromPreviousYear = (previousRequest: any) => {
    const newDocs: any[] = [];
    const newMultipleDocs: any[] = [];

    // Copy single documents (only names, types, descriptions, templates - no uploaded files)
    if (previousRequest.documents && previousRequest.documents.length > 0) {
      previousRequest.documents.forEach((doc: any) => {
        const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
        newDocs.push({
          name: doc.name,
          type: docType,
          description: doc.description || '',
          template: docType === 'template' && doc.template
            ? {
                url: doc.template.url, // Keep template URL if exists
                instruction: doc.template.instruction || doc.template.instructions || ''
              }
            : undefined,
          status: 'pending'
        });
      });
    }

    // Copy multiple documents (only structure - no uploaded files)
    if (previousRequest.multipleDocuments && previousRequest.multipleDocuments.length > 0) {
      previousRequest.multipleDocuments.forEach((multiDoc: any) => {
        const docType = typeof multiDoc.type === 'string' ? multiDoc.type : (multiDoc.type?.type || 'direct');
        newMultipleDocs.push({
          name: multiDoc.name,
          type: docType,
          instruction: multiDoc.instruction || undefined,
          multiple: (multiDoc.multiple || []).map((item: any) => ({
            label: item.label,
            template: item.template?.url || item.template?.instruction
              ? {
                  url: item.template?.url || undefined,
                  instruction: item.template?.instruction || item.template?.instructions || item.instruction || undefined
                }
              : undefined,
            status: 'pending' as const
          }))
        });
      });
    }

    // Add to current documents
    if (newDocs.length > 0) {
      setDocuments(prev => [...prev, ...newDocs]);
    }
    if (newMultipleDocs.length > 0) {
      setMultipleDocuments(prev => [...prev, ...newMultipleDocs]);
    }

    // Also copy category and description if not already set
    if (!documentRequest.category && previousRequest.category) {
      setDocumentRequest((prev: any) => ({
        ...prev,
        category: previousRequest.category
      }));
    }
    if (!documentRequest.description && previousRequest.description) {
      setDocumentRequest((prev: any) => ({
        ...prev,
        description: previousRequest.description
      }));
    }

    toast({
      title: "Documents Copied",
      description: `Copied ${newDocs.length} single document(s) and ${newMultipleDocs.length} multiple document group(s) from previous year.`,
    });

    setPreviousYearModalOpen(false);
  };

  // Also update when requests prop changes (from parent refetch)
  useEffect(() => {
    if (requests && requests.length > 0) {
      setDocumentRequests(requests);
    }
  }, [requests]);

  const fetchDocumentRequests = async () => {
    if (!engagementId) return;
    try {
      setLoading(true);
      const data = await documentRequestApi.getByEngagement(engagementId);
      setDocumentRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching document requests:', error);
      if (!error.message?.includes('404')) {
        toast({
          title: "Error",
          description: "Failed to fetch document requests",
          variant: "destructive",
        });
      }
      setDocumentRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsUpdating(true);
      toast({
          title: "Download Started",
          description: "Preparing your download, this may take a moment...",
      });
      
      const { blob, filename } = await documentRequestApi.downloadAll(engagementId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: "Documents downloaded successfully.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download documents",
        variant: "destructive",
      });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleDownloadRequest = async (requestId: string) => {
    try {
      setIsUpdating(true);
      toast({
          title: "Download Started",
          description: "Preparing your download...",
      });
      
      const { blob, filename } = await documentRequestApi.downloadAll(engagementId, undefined, undefined, requestId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: "Request documents downloaded successfully.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download documents",
        variant: "destructive",
      });
    } finally {
        setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    // Ensure status is a string
    const statusStr = typeof status === 'string' ? status : String(status || 'pending');
    
    switch (statusStr) {
      case 'active':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <Play className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'submitted':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <Upload className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        );
      case 'in-review':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <Eye className="h-3 w-3 mr-1" />
            In Review
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{statusStr}</Badge>;
    }
  };

  const handleStatusUpdate = async (documentRequestId: string, newStatus: string) => {
    try {
      setIsActionInProgress(true);
      await documentRequestApi.update(documentRequestId, {
        status: newStatus
      });
      await fetchDocumentRequests();
      toast({
        title: "Status Updated",
        description: `Document request status updated to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating document request status:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  const calculateDocumentRequestStatus = (docRequest: any): string => {
    if (!docRequest.documents || docRequest.documents.length === 0) {
      return 'pending';
    }
    
    const totalDocuments = docRequest.documents.length;
    const completedDocuments = docRequest.documents.filter((doc: any) => 
      doc.url && (doc.status === 'completed' || doc.status === 'uploaded' || doc.status === 'approved')
    ).length;
    
    if (completedDocuments === 0) {
      return 'pending';
    } else if (completedDocuments === totalDocuments) {
      return 'completed';
    } else {
      return 'submitted';
    }
  };

  const updateDocumentRequestStatus = async (documentRequestId: string) => {
    try {
      const docRequest = documentRequests.find(r => r._id === documentRequestId);
      if (!docRequest) return;

      const newStatus = calculateDocumentRequestStatus(docRequest);
      
      if (docRequest.status !== newStatus) {
        await documentRequestApi.update(documentRequestId, {
          status: newStatus
        });
        await fetchDocumentRequests();
      }
    } catch (error: any) {
      console.error('Error updating document request status:', error);
    }
  };

  const handleDocumentUpload = async (
    documentRequestId: string,
    documentIndex: number,
    file: File
  ) => {
    try {
      setUploadingDocument({ documentRequestId, documentIndex });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentIndex', String(documentIndex));
      
      await documentRequestApi.uploadSingleDocument(documentRequestId, formData);
      
      await fetchDocumentRequests();
      
      setTimeout(async () => {
        try {
          await documentRequestApi.updateDocumentStatus(documentRequestId, documentIndex, 'uploaded');
          await fetchDocumentRequests();
          await updateDocumentRequestStatus(documentRequestId);
        } catch (error) {
          console.error('Error updating document status:', error);
        }
      }, 1000);
      
      toast({
        title: "Document Uploaded",
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(null);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDialog.documentRequestId || deleteDialog.documentIndex === undefined) return;
    
    try {
      setIsActionInProgress(true);
      await documentRequestApi.deleteDocument(
        deleteDialog.documentRequestId,
        deleteDialog.documentIndex
      );
      await fetchDocumentRequests();
      toast({
        title: "Document Deleted",
        description: "Document has been deleted successfully",
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleDeleteFromDialog = async () => {
    if (deleteDialog.type === 'request') {
      if (!deleteDialog.documentRequestId) return;
      await handleDeleteRequest(deleteDialog.documentRequestId);
    } else if (deleteDialog.type === 'multipleItem') {
      await handleDeleteMultipleItem();
    } else if (deleteDialog.type === 'multipleGroup') {
      await handleDeleteMultipleGroup();
    } else {
      await handleDeleteDocument();
    }
  };

  // Clear only the uploaded file for a document using dedicated clear endpoint
  const handleClearDocument = async (
    documentRequestId: string,
    documentIndex: number,
    documentName: string
  ) => {
    try {
      setIsActionInProgress(true);
      await documentRequestApi.clearSingleDocument(documentRequestId, documentIndex);
      await fetchDocumentRequests();
      toast({
        title: "Document Cleared",
        description: `"${documentName}" file has been cleared. Requirement remains pending.`,
      });
    } catch (error: any) {
      console.error("Error clearing document:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to clear document",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Clear only the uploaded file for a multiple document item
  const handleClearMultipleItem = async (
    documentRequestId: string,
    multipleDocumentId: string,
    itemIndex: number,
    itemLabel: string
  ) => {
    try {
      setIsActionInProgress(true);
      await documentRequestApi.clearMultipleDocumentItem(documentRequestId, multipleDocumentId, itemIndex);
      await fetchDocumentRequests();
      toast({
        title: "Document Item Cleared",
        description: `"${itemLabel}" file has been cleared. Requirement remains pending.`,
      });
    } catch (error: any) {
      console.error("Error clearing multiple document item:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to clear document item",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Delete a specific item from a multiple document group
  const handleDeleteMultipleItem = async () => {
    if (!deleteDialog.documentRequestId || !deleteDialog.multipleDocumentId || deleteDialog.itemIndex === undefined) return;
    
    try {
      setIsActionInProgress(true);
      await documentRequestApi.deleteMultipleDocumentItem(
        deleteDialog.documentRequestId,
        deleteDialog.multipleDocumentId,
        deleteDialog.itemIndex
      );
      await fetchDocumentRequests();
      toast({
        title: "Document Item Deleted",
        description: "Document item has been deleted successfully",
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      console.error('Error deleting multiple document item:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete document item",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Delete entire multiple document group
  const handleDeleteMultipleGroup = async () => {
    if (!deleteDialog.documentRequestId || !deleteDialog.multipleDocumentId) return;
    
    try {
      setIsActionInProgress(true);
      await documentRequestApi.deleteMultipleDocumentGroup(
        deleteDialog.documentRequestId,
        deleteDialog.multipleDocumentId
      );
      await fetchDocumentRequests();
      toast({
        title: "Document Group Deleted",
        description: `"${deleteDialog.documentName || 'Group'}" has been deleted successfully`,
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      console.error('Error deleting multiple document group:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete document group",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Clear all files in a multiple document group
  const handleClearMultipleGroup = async (
    documentRequestId: string,
    multipleDocumentId: string,
    groupName: string
  ) => {
    try {
      setIsActionInProgress(true);
      await documentRequestApi.clearMultipleDocumentGroup(documentRequestId, multipleDocumentId);
      await fetchDocumentRequests();
      toast({
        title: "All Files Cleared",
        description: `All uploaded files in "${groupName}" have been cleared. Requirements remain pending.`,
      });
    } catch (error: any) {
      console.error("Error clearing multiple document group:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to clear files",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Download all files from a multiple document group
  const handleDownloadMultipleGroup = async (
    documentRequestId: string,
    multipleDocumentId: string,
    groupName: string,
    items: any[]
  ) => {
    try {
      setIsActionInProgress(true);
      toast({
          title: "Download Started",
          description: `Preparing download for "${groupName}"...`,
      });
      
      const { blob, filename } = await documentRequestApi.downloadAll(engagementId, undefined, undefined, documentRequestId, multipleDocumentId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: `Downloaded "${groupName}" successfully.`,
      });
    } catch (error: any) {
      console.error("Error downloading multiple documents:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to download files",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Handle uploading files to multiple document group
  const handleUploadMultiple = async (
    documentRequestId: string,
    multipleDocumentId: string,
    files: FileList,
    itemIndex?: number
  ) => {
    try {
      setUploadingMultiple({ 
        documentRequestId, 
        multipleDocumentId,
        itemIndex 
      });

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      await documentRequestApi.uploadMultipleDocuments(
        documentRequestId,
        multipleDocumentId,
        formData,
        itemIndex
      );

      await fetchDocumentRequests();
      
      toast({
        title: "Files Uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Error uploading multiple documents:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploadingMultiple(null);
    }
  };

  // Delete entire document request
  const handleDeleteRequest = async (documentRequestId: string) => {
    try {
      setIsActionInProgress(true);
      await documentRequestApi.deleteRequest(documentRequestId);
      await fetchDocumentRequests();
      toast({
        title: "Request Deleted",
        description: "Document request has been deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting document request:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete document request",
        variant: "destructive",
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  const canSend =
    (documentRequest.category?.trim()?.length || 0) > 0 &&
    (documentRequest.description?.trim()?.length || 0) > 0;
  const descLen = documentRequest.description?.length || 0;
  const DESC_MAX = 800;

  const handleKYCComplete = (kycData: any) => {
    console.log("KYC completed:", kycData);
  };

  const handleAddDocument = () => {
    if (!newDocument.name?.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive",
      });
      return;
    }

    if (newDocument.type === 'template' && !currentTemplateFile) {
      toast({
        title: "Template File Required",
        description: "Please upload a template file for template-based documents",
        variant: "destructive",
      });
      return;
    }

    const document: any = {
      name: newDocument.name.trim(),
      type: newDocument.type || 'direct',
      description: newDocument.description?.trim() || '',
      template: newDocument.type === 'template' ? {
        instruction: newDocument.template?.instruction?.trim() || ''
      } : undefined,
      templateFile: newDocument.type === 'template' ? currentTemplateFile || undefined : undefined,
      status: 'pending'
    };

    setDocuments(prev => [...prev, document]);
    setNewDocument({
      name: '',
      type: 'direct',
      description: '',
      template: {
        instruction: ''
      }
    });
    setCurrentTemplateFile(null);

    toast({
      title: "Document Added",
      description: `${newDocument.name} has been added to the request`,
    });
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateUpload = async (file: File) => {
    try {
      const response = await documentRequestApi.uploadTemplate(file);
      return response.url;
    } catch (error) {
      console.error('Template upload error:', error);
      throw error;
    }
  };

  const handleCreateDocumentRequest = async () => {
    if (!documentRequest.category || !documentRequest.description) {
      toast({
        title: "Error",
        description: "Category and description are required",
        variant: "destructive",
      });
      return;
    }

    if (documents.length === 0 && multipleDocuments.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one document",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Process documents with template uploads
      const processedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // Ensure type is always a string
          const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
          if (docType === 'template' && doc.templateFile) {
            try {
              const templateUrl = await handleTemplateUpload(doc.templateFile);
              return {
                ...doc,
                type: docType,
                template: {
                  ...doc.template,
                  url: templateUrl
                },
                templateFile: undefined
              };
            } catch (error) {
              toast({
                title: "Template Upload Failed",
                description: `Failed to upload template for "${doc.name}". Please try again.`,
                variant: "destructive",
              });
              throw error;
            }
          }
          return { ...doc, type: docType };
        })
      );

      // Process multiple documents (they don't need template uploads as templates are already URLs)
      const processedMultipleDocuments = multipleDocuments.map((doc: any) => {
        const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
        return {
          name: doc.name,
          type: docType,
          instruction: doc.instruction || undefined,
          multiple: doc.multiple.map((item: any) => {
            // Backend expects: label, template.url, template.instruction (singular)
            // Combine item.instruction and template.instructions into template.instruction
            // Priority: template.instructions > item.instruction, combine if both exist
            let combinedInstruction = '';
            if (item.instruction) {
              combinedInstruction = item.instruction;
            }
            if (item.template?.instructions) {
              combinedInstruction = combinedInstruction 
                ? `${combinedInstruction}\n\nTemplate Instructions: ${item.template.instructions}`
                : item.template.instructions;
            }
            const templateInstruction = combinedInstruction || undefined;
            
            return {
              label: item.label,
              template: item.template?.url || templateInstruction
                ? {
                    url: item.template?.url || undefined,
                    instruction: templateInstruction, // Backend uses singular 'instruction'
                  }
                : undefined,
              status: 'pending' as const
            };
          })
        };
      });

      // Parse notification emails (comma-separated)
      const notificationEmailsArray = notificationEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0 && email.includes('@'));

      const documentRequestData = {
        engagementId: engagementId!,
        clientId: engagement?.clientId || '',
        category: documentRequest.category,
        description: documentRequest.description,
        comment: documentRequest.comment || '',
        notificationEmails: notificationEmailsArray.length > 0 ? notificationEmailsArray : undefined,
        documents: processedDocuments.map((doc: any) => {
          const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
          return {
            name: doc.name,
            type: docType,
            description: doc.description || "",
            status: 'pending' as const,
            template: docType === 'template' ? doc.template : undefined
          };
        }),
        multipleDocuments: processedMultipleDocuments
      };

      await documentRequestApi.create(documentRequestData);

      toast({
        title: "Success",
        description: "Document request created successfully",
      });

      // Reset form
      setDocuments([]);
      setMultipleDocuments([]);
      setNewDocument({
        name: '',
        type: 'direct',
        description: '',
        template: {
          instruction: ''
        }
      });
      setCurrentTemplateFile(null);
      setNotificationEmails('');
      setDocumentRequest({ category: '', description: '', comment: '' });
      setAddRequestModalOpen(false);
      
      await fetchDocumentRequests();
    } catch (error: any) {
      console.error('Error creating document request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create document request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    return type === 'template' ? (
      <FileEdit className="h-4 w-4 text-blue-600" />
    ) : (
      <FileUp className="h-4 w-4 text-green-600" />
    );
  };

  const getDocumentTypeBadge = (type: string | any) => {
    // Ensure type is a string, handle object case
    const typeStr = typeof type === 'string' ? type : (type?.type || 'direct');
    
    return typeStr === 'template' ? (
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
        <FileEdit className="h-3 w-3 mr-1" />
        Template
      </Badge>
    ) : (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
        <FileUp className="h-3 w-3 mr-1" />
        Direct
      </Badge>
    );
  };

  if (loading && documentRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading document requests...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Document Requests List */}
        {documentRequests.length > 0 ? (
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Document Requests</CardTitle>
                    <CardDescription className="text-gray-700">
                      Manage document requests and track progress
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchDocumentRequests()}
                    disabled={areActionsDisabled}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                  </Button>
                  {(() => {
                    const totalUploadedDocs = documentRequests.reduce((acc, request) => {
                      const singleDocs = request.documents?.filter((d: any) => d.url).length || 0;
                      const multipleDocs = request.multipleDocuments?.reduce((mAcc: number, group: any) => {
                        return mAcc + (group.multiple?.filter((d: any) => d.url).length || 0);
                      }, 0) || 0;
                      return acc + singleDocs + multipleDocs;
                    }, 0);

                    return totalUploadedDocs > 0 && (
                      <Button
                        variant="default"
                        onClick={handleDownloadAll}
                        disabled={areActionsDisabled}  
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                    );
                  })()}
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground"
                    onClick={() => setAddRequestModalOpen(true)}
                    disabled={areActionsDisabled}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Document Request
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {documentRequests.map((request) => {
                const status = calculateDocumentRequestStatus(request);
                const progress = calculateProgress(request);
                const statusColor = getStatusColor(status);

                return (
                  <Card key={request._id} className="overflow-hidden border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl bg-gray-50/50">
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleRow(request._id)}
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div className={`w-1 self-stretch rounded-full ${statusColor}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 truncate uppercase tracking-wider text-[10px]">
                              {request.category}
                            </span>
                            <Badge variant="outline" className={`${statusColor} border-0 bg-opacity-10 text-[10px] h-5 px-1.5`}>
                              {status}
                            </Badge>
                          </div>
                          <h3 className="text-sm font-medium text-gray-700 truncate line-clamp-1">
                            {request.description || request.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="hidden sm:flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${statusColor}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-gray-500 w-8 text-right">
                                {Math.round(progress)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadRequest(request._id);
                              }}
                              disabled={areActionsDisabled || progress === 0}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialog({
                                    open: true,
                                    type: 'request',
                                    documentRequestId: request._id,
                                    documentName: request.category || 'this document request'
                                  });
                              }}
                              disabled={areActionsDisabled}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="h-8 w-8 flex items-center justify-center">
                                <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedRows.has(request._id) ? 'rotate-90' : ''}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {expandedRows.has(request._id) && (
                      <CardContent className="border-t border-gray-100 bg-white/40 p-4">
                        <DocumentRequest
                          request={request}
                          uploadingSingle={uploadingDocument}
                          uploadingMultiple={uploadingMultiple}
                          onUploadSingle={handleDocumentUpload}
                          onUploadMultiple={handleUploadMultiple}
                          onDeleteRequest={handleDeleteRequest}
                          onClearDocument={handleClearDocument}
                          onClearMultipleItem={handleClearMultipleItem}
                          onRequestDeleteDialog={setDeleteDialog}
                          onDocumentsAdded={fetchDocumentRequests}
                          engagementId={engagementId}
                          clientId={engagement?.clientId || ''}
                          onClearMultipleGroup={handleClearMultipleGroup}
                          onDownloadMultipleGroup={handleDownloadMultipleGroup}
                          isDisabled={areActionsDisabled}
                        />
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  No document requests sent yet
                </p>
                <div className="mt-6">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground"
                    onClick={() => setAddRequestModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Document Request
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KYC Setup Modal */}
        <KYCSetupModal
          selectedEngagement={engagement}
          open={kycModalOpen}
          onOpenChange={setKycModalOpen}
          onKYCComplete={handleKYCComplete}
        />

        {/* Create Document Request with Documents Modal */}
        <Dialog open={addRequestModalOpen} onOpenChange={setAddRequestModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Create Document Request with Documents
              </DialogTitle>
              <DialogDescription>
                Create a document request with a list of specific documents needed from the client.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Request Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="modalCategory">Category *</Label>
                    <Select
                      value={documentRequest.category}
                      onValueChange={(value) =>
                        setDocumentRequest((prev: any) => ({
                          ...prev,
                          category: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modalDescription">Description *</Label>
                    <Textarea
                      id="modalDescription"
                      value={documentRequest.description}
                      onChange={(e) =>
                        setDocumentRequest((prev: any) => ({
                          ...prev,
                          description: e.target.value.slice(0, DESC_MAX),
                        }))
                      }
                      placeholder="Describe the documents you need from the client..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="modalComment">Additional Comments (Optional)</Label>
                    <Textarea
                      id="modalComment"
                      value={documentRequest.comment || ""}
                      onChange={(e) =>
                        setDocumentRequest((prev: any) => ({
                          ...prev,
                          comment: e.target.value,
                        }))
                      }
                      placeholder="Add any additional notes or instructions..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notificationEmails">Notification Emails (Optional)</Label>
                    <Input
                      id="notificationEmails"
                      value={notificationEmails}
                      onChange={(e) => setNotificationEmails(e.target.value)}
                      placeholder="Enter email addresses separated by commas (e.g., email1@example.com, email2@example.com)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Send email notifications to these addresses when the document request is created
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Copy from Previous Year */}
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-800 flex items-center gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Copy from Previous Year
                  </CardTitle>
                  <CardDescription className="text-purple-700">
                    Reuse document names from previous year's audit. Documents will be created fresh without uploaded files.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPreviousYearModalOpen(true);
                      fetchPreviousYearEngagements();
                    }}
                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Select Previous Year Documents
                  </Button>
                </CardContent>
              </Card>

              {/* Default Document Request Preview */}
              <DefaultDocumentRequestPreview
                onAddDocuments={(selectedDocuments: DocumentRequestTemplate[]) => {
                  const newDocs: any[] = [];
                  const newMultipleDocs: any[] = [];
                  
                  selectedDocuments.forEach(doc => {
                    // Check if this is a multiple copy template
                    const isMultiple = doc.multiple && doc.multiple.length > 0;
                    const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
                    
                    if (isMultiple) {
                      // Create multiple document entry
                      // Backend schema: MultipleDocumentItemSchema has label, template.url, template.instruction
                      const multipleDoc = {
                        name: doc.name,
                        type: docType,
                        instruction: undefined, // Group-level instruction (optional)
                        multiple: doc.multiple.map((item: any) => {
                          // Combine item.instruction and template.instructions into template.instruction
                          // Backend uses singular 'instruction' in template object
                          // Priority: template.instructions > item.instruction, combine if both exist
                          let combinedInstruction = '';
                          if (item.instruction) {
                            combinedInstruction = item.instruction;
                          }
                          if (item.template?.instructions) {
                            combinedInstruction = combinedInstruction 
                              ? `${combinedInstruction}\n\nTemplate Instructions: ${item.template.instructions}`
                              : item.template.instructions;
                          }
                          const templateInstruction = combinedInstruction || undefined;
                          
                          return {
                            label: item.label,
                            template: item.template?.url || templateInstruction
                              ? {
                                  url: item.template?.url || undefined,
                                  instruction: templateInstruction, // Backend expects singular
                                }
                              : undefined,
                            status: 'pending' as const
                          };
                        })
                      };
                      newMultipleDocs.push(multipleDoc);
                    } else {
                      // Create regular document entry
                      const regularDoc = {
                        name: doc.name,
                        type: docType,
                        description: doc.description,
                        template: docType === 'template'
                          ? { url: doc.template?.url, instruction: doc.template?.instructions }
                          : undefined,
                        status: 'pending' as const
                      };
                      newDocs.push(regularDoc);
                    }
                  });
                  
                  if (newDocs.length > 0) {
                    setDocuments(prev => [...prev, ...newDocs]);
                  }
                  if (newMultipleDocs.length > 0) {
                    setMultipleDocuments(prev => [...prev, ...newMultipleDocs]);
                  }

                  toast({
                    title: "Documents Added",
                    description: `${selectedDocuments.length} document(s) added (${newDocs.length} single, ${newMultipleDocs.length} multiple).`,
                  });
                }}
                engagementId={engagementId!}
                clientId={engagement?.clientId || ''}
              />

              {/* Add Document */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Document</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="documentName">Document Name *</Label>
                      <Input
                        id="documentName"
                        placeholder="e.g., Bank Statements, ID Proof"
                        value={newDocument.name || ''}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="documentType">Request Type *</Label>
                      <Select
                        value={newDocument.type || 'direct'}
                        onValueChange={(value: 'direct' | 'template') =>
                          setNewDocument(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">
                            <div className="flex items-center gap-2">
                              <FileUp className="h-4 w-4 text-green-600" />
                              Direct Upload
                            </div>
                          </SelectItem>
                          <SelectItem value="template">
                            <div className="flex items-center gap-2">
                              <FileEdit className="h-4 w-4 text-blue-600" />
                              Template-based
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="documentDescription">Description</Label>
                    <Textarea
                      id="documentDescription"
                      placeholder="Describe what documents are needed..."
                      value={newDocument.description || ''}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  {newDocument.type === 'template' && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Template-based Workflow</span>
                      </div>

                      <div>
                        <Label htmlFor="templateFile">Template File</Label>
                        <Input
                          id="templateFile"
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setCurrentTemplateFile(file);

                            if (file && !newDocument.name?.trim()) {
                              const fileName = file.name;
                              const cleanName = fileName
                                .replace(/\.[^/.]+$/, "")
                                .replace(/[-_]/g, " ")
                                .replace(/\b\w/g, l => l.toUpperCase());

                              setNewDocument(prev => ({ ...prev, name: cleanName }));
                            }
                          }}
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Upload a template file that clients will download and fill out
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="templateInstructions">Instructions for Client</Label>
                        <Textarea
                          id="templateInstructions"
                          placeholder="Provide clear instructions on how to fill the template..."
                          value={newDocument.template?.instruction || ''}
                          onChange={(e) => setNewDocument(prev => ({
                            ...prev,
                            template: { ...prev.template, instruction: e.target.value }
                          }))}
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleAddDocument}
                    disabled={!newDocument.name?.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                </CardContent>
              </Card>

              {/* Documents List */}
              {(documents.length > 0 || multipleDocuments.length > 0) && (
                <>
                  {documents.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Single Documents ({documents.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {documents.map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                {getDocumentTypeIcon(typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct'))}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{doc.name}</span>
                                    {getDocumentTypeBadge(doc.type)}
                                  </div>
                                  {doc.description && (
                                    <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                                  )}
                                  {doc.type === 'template' && doc.template?.instruction && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      Instructions: {doc.template.instruction}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveDocument(index)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {multipleDocuments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Multiple Copy Documents ({multipleDocuments.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {multipleDocuments.map((doc, index) => {
                            const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
                            return (
                              <div
                                key={index}
                                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border"
                              >
                                <div className="flex items-start gap-3 flex-1">
                                  {getDocumentTypeIcon(docType)}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium">{doc.name}</span>
                                      {getDocumentTypeBadge(docType)}
                                      <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                                        {doc.multiple.length} {doc.multiple.length === 1 ? 'item' : 'items'}
                                      </Badge>
                                    </div>
                                    <div className="space-y-1 mt-2">
                                      {doc.multiple.map((item: any, itemIdx: number) => (
                                        <div key={itemIdx} className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                                          <span className="font-medium">{itemIdx + 1}. {item.label}</span>
                                          {docType === 'template' && item.instruction && (
                                            <p className="text-gray-500 mt-1">Instructions: {item.instruction}</p>
                                          )}
                                          {docType === 'template' && item.template?.instructions && (
                                            <p className="text-gray-500 mt-1">Template Instructions: {item.template.instructions}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setMultipleDocuments(prev => prev.filter((_, i) => i !== index));
                                  }}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Workflow Information */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">About Document Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <FileUp className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Direct Upload</h4>
                        <p className="text-sm text-gray-600">
                          Client uploads documents directly without a template
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <FileEdit className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Template-based</h4>
                        <p className="text-sm text-gray-600">
                          Client downloads template, fills it out, and uploads the completed document
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setAddRequestModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDocumentRequest}
                disabled={loading || (documents.length === 0 && multipleDocuments.length === 0) || !documentRequest.category || !documentRequest.description}
                className="bg-blue-600 hover:bg-blue-700 text-white hover:text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Document Request
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Previous Year Document Requests Modal */}
      <Dialog open={previousYearModalOpen} onOpenChange={setPreviousYearModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Copy Documents from Previous Year
            </DialogTitle>
            <DialogDescription>
              Select a previous year's engagement and document request to copy document names. Uploaded files will not be copied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Select Previous Year Engagement */}
            <div>
              <Label htmlFor="previousEngagement">Select Previous Year Engagement</Label>
              <Select
                value={selectedPreviousEngagement}
                onValueChange={(value) => {
                  setSelectedPreviousEngagement(value);
                  fetchPreviousYearRequests(value);
                }}
                disabled={loadingPreviousYear || previousYearEngagements.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a previous year engagement..." />
                </SelectTrigger>
                <SelectContent>
                  {previousYearEngagements.map((eng: any) => {
                    const year = new Date(eng.yearEndDate).getFullYear();
                    return (
                      <SelectItem key={eng._id} value={eng._id}>
                        {eng.title} - {year} ({format(new Date(eng.yearEndDate), 'MMM dd, yyyy')})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {previousYearEngagements.length === 0 && !loadingPreviousYear && (
                <p className="text-sm text-gray-500 mt-2">
                  No previous year engagements found for this client.
                </p>
              )}
            </div>

            {/* List Previous Year Document Requests */}
            {loadingPreviousYear && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            )}

            {!loadingPreviousYear && selectedPreviousEngagement && previousYearRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No document requests found for this engagement.</p>
              </div>
            )}

            {!loadingPreviousYear && selectedPreviousEngagement && previousYearRequests.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previousYearRequests.map((request: any) => {
                  const singleDocCount = request.documents?.length || 0;
                  const multipleDocCount = request.multipleDocuments?.length || 0;
                  const totalDocs = singleDocCount + multipleDocCount;

                  return (
                    <Card key={request._id} className="border border-gray-200 hover:border-purple-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {request.category}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {totalDocs} document{totalDocs !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">
                              {request.description || request.name}
                            </h4>
                            {request.comment && (
                              <p className="text-sm text-gray-600 line-clamp-2">{request.comment}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                              {singleDocCount > 0 && (
                                <span>{singleDocCount} single document{singleDocCount !== 1 ? 's' : ''}</span>
                              )}
                              {multipleDocCount > 0 && (
                                <span>{multipleDocCount} multiple group{multipleDocCount !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyFromPreviousYear(request)}
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setPreviousYearModalOpen(false);
                setSelectedPreviousEngagement('');
                setPreviousYearRequests([]);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              {deleteDialog.type === 'request' 
                ? 'Delete Document Request' 
                : deleteDialog.type === 'multipleItem'
                ? 'Delete Document Item'
                : deleteDialog.type === 'multipleGroup'
                ? 'Delete Document Group'
                : 'Delete Document'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'request' 
                ? 'Are you sure you want to delete this entire document request? This action cannot be undone.'
                : deleteDialog.type === 'multipleGroup'
                ? `Are you sure you want to delete the entire document group "${deleteDialog.documentName}"? This will delete all items in the group. This action cannot be undone.`
                : `Are you sure you want to delete "${deleteDialog.documentName}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFromDialog}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
