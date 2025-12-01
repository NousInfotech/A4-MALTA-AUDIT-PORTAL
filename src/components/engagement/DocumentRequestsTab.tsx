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
    documentRequestId?: string;
    documentIndex?: number;
    documentName?: string;
  }>({ open: false });
  const [uploadingDocument, setUploadingDocument] = useState<{
    documentRequestId?: string;
    documentIndex?: number;
  } | null>(null);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [addRequestModalOpen, setAddRequestModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [newDocument, setNewDocument] = useState<Partial<any>>({
    name: '',
    type: 'direct',
    description: '',
    template: {
      instruction: ''
    }
  });
  const [currentTemplateFile, setCurrentTemplateFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (engagementId) {
      fetchDocumentRequests();
    }
  }, [engagementId]);

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

    if (documents.length === 0) {
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

      const documentRequestData = {
        engagementId: engagementId!,
        clientId: engagement?.clientId || '',
        category: documentRequest.category,
        description: documentRequest.description,
        comment: documentRequest.comment || '',
        documents: processedDocuments.map((doc: any) => {
          const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
          return {
            name: doc.name,
            type: docType,
            description: doc.description || "",
            status: 'pending' as const,
            template: docType === 'template' ? doc.template : undefined
          };
        })
      };

      await documentRequestApi.create(documentRequestData);

      toast({
        title: "Success",
        description: "Document request created successfully",
      });

      // Reset form
      setDocuments([]);
      setNewDocument({
        name: '',
        type: 'direct',
        description: '',
        template: {
          instruction: ''
        }
      });
      setCurrentTemplateFile(null);
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
        {/* Send Document Request Form */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <CardTitle className="text-xl font-bold text-gray-900">
              Send Document Request
            </CardTitle>
            <CardDescription className="text-gray-700">
              Request specific documents from the client
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category *</Label>
              <SearchableSelect
                value={documentRequest.category}
                onChange={(value) =>
                  setDocumentRequest((prev: any) => ({
                    ...prev,
                    category: value,
                  }))
                }
                options={categories}
                placeholder="Search or select category"
                widthClass="w-full"
              />
              <p className="text-xs text-gray-500">
                Start typing to filter categories.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Request Description *</Label>
                <span className={cn("text-xs font-medium", descLen > DESC_MAX ? "text-red-600" : "text-gray-500")}>
                  {descLen}/{DESC_MAX}
                </span>
              </div>
              <Textarea
                id="description"
                value={documentRequest.description}
                onChange={(e) =>
                  setDocumentRequest((prev: any) => ({
                    ...prev,
                    description: e.target.value.slice(0, DESC_MAX),
                  }))
                }
                placeholder="Describe the documents you need from the client..."
                rows={4}
                className="resize-y border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Tip: include date range
                </Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Specify format (PDF/XLSX)
                </Badge>
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  Add due date
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-medium text-gray-700">Additional Comments (Optional)</Label>
              <Textarea
                id="comment"
                value={documentRequest.comment || ""}
                onChange={(e) =>
                  setDocumentRequest((prev: any) => ({
                    ...prev,
                    comment: e.target.value,
                  }))
                }
                placeholder="Add any additional notes or instructions for the client..."
                rows={3}
                className="resize-y border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {/* <Button
                variant="outline"
                onClick={() => setKycModalOpen(true)}
                className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl"
              >
                <Shield className="h-4 w-4 mr-2" />
                Setup KYC
              </Button> */}
              <Button
                variant="outline"
                onClick={() => setAddRequestModalOpen(true)}
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create with Documents
              </Button>
              <Button
                onClick={handleSendDocumentRequest}
                disabled={!canSend}
                className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground rounded-xl flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Document Requests History - KYC Style */}
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
                    className="border-gray-300 hover:bg-gray-100 hover:text-gray-900 text-gray-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {documentRequests.map((request) => {
                const calculatedStatus = calculateDocumentRequestStatus(request);
                const totalDocs = request.documents?.length || 0;
                const completedDocs = request.documents?.filter((doc: any) => 
                  doc.url && (doc.status === 'completed' || doc.status === 'uploaded' || doc.status === 'approved')
                ).length || 0;
                const progressPercentage = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0;

                return (
                  <div key={request._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    {/* Request Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{request.category}</h3>
                          {getStatusBadge(calculatedStatus)}
                        </div>
                        <p className="text-sm text-gray-600">{request.description}</p>
                        {request.comment && (
                          <p className="text-xs text-gray-500 mt-1">Comment: {request.comment}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Requested: {(() => {
                            const dateStr = request.requestedAt || request.createdAt;
                            if (!dateStr) return 'N/A';
                            const date = new Date(dateStr);
                            return isNaN(date.getTime()) ? 'N/A' : format(date, "MMM dd, yyyy");
                          })()}</span>
                          {request.completedAt && (
                            <span>Completed: {(() => {
                              const date = new Date(request.completedAt);
                              return isNaN(date.getTime()) ? 'N/A' : format(date, "MMM dd, yyyy");
                            })()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Management */}
                    <div className="bg-white rounded-xl p-3 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">Status Management</h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {calculatedStatus !== 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(request._id, 'active')}
                            className="border-gray-300 hover:bg-gray-100 hover:text-gray-900 text-gray-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Set Active
                          </Button>
                        )}
                        {calculatedStatus !== 'in-review' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(request._id, 'in-review')}
                            className="border-gray-300 hover:bg-gray-100 hover:text-gray-900 text-gray-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Set In Review
                          </Button>
                        )}
                        {calculatedStatus !== 'completed' && (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground"
                            onClick={() => handleStatusUpdate(request._id, 'completed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Completed
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {totalDocs > 0 && (
                      <div className="mb-4 space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span className="font-medium">Progress: {completedDocs} / {totalDocs} documents</span>
                          <span className="font-semibold">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all ${
                              progressPercentage === 100 
                                ? 'bg-green-600' 
                                : progressPercentage > 0 
                                ? 'bg-blue-600' 
                                : 'bg-gray-300'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Documents List */}
                    {request.documents && request.documents.length > 0 ? (
                      <div className="space-y-2">
                        {request.documents.map((doc: any, docIndex: number) => (
                          <div key={docIndex} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
                                return docType === 'template' ? (
                                  <FileEdit className="h-5 w-5 text-gray-600" />
                                ) : (
                                  <FileUp className="h-5 w-5 text-gray-600" />
                                );
                              })()}
                              <div>
                                <p className="font-medium text-gray-900">{doc.name}</p>
                                {doc.description && (
                                  <p className="text-xs text-gray-600 mt-0.5">{doc.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {(() => {
                                    const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
                                    return docType === 'template' ? (
                                      <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                                        Template
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                                        Direct
                                      </Badge>
                                    );
                                  })()}
                                  <Badge variant="outline" className="text-gray-600 border-gray-300">
                                    {typeof doc.status === 'string' ? doc.status : String(doc.status || 'pending')}
                                  </Badge>
                                  {doc.uploadedAt && (
                                    <span className="text-xs text-gray-500">
                                      Uploaded: {(() => {
                                        const date = new Date(doc.uploadedAt);
                                        return isNaN(date.getTime()) ? 'N/A' : format(date, "MMM dd, yyyy HH:mm");
                                      })()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!doc.url ? (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleDocumentUpload(request._id, docIndex, file);
                                      }
                                      e.target.value = '';
                                    }}
                                    disabled={uploadingDocument?.documentRequestId === request._id && 
                                             uploadingDocument?.documentIndex === docIndex}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-blue-300 hover:bg-blue-50 hover:text-blue-800 text-blue-700 h-8 px-3"
                                    title="Upload Document"
                                    disabled={uploadingDocument?.documentRequestId === request._id && 
                                             uploadingDocument?.documentIndex === docIndex}
                                    asChild
                                  >
                                    <span>
                                      {uploadingDocument?.documentRequestId === request._id && 
                                       uploadingDocument?.documentIndex === docIndex ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4 mr-1" />
                                          Upload
                                        </>
                                      )}
                                    </span>
                                  </Button>
                                </label>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(doc.url, '_blank')}
                                    className="border-blue-300 hover:bg-blue-50 hover:text-blue-800 text-blue-700 h-8 w-8 p-0"
                                    title="View Document"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(doc.url);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = doc.name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                      } catch (error) {
                                        console.error('Download error:', error);
                                        toast({
                                          title: "Error",
                                          description: "Failed to download document",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="border-green-300 hover:bg-green-50 hover:text-green-800 text-green-700 h-8 w-8 p-0"
                                    title="Download Document"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setDeleteDialog({
                                    open: true,
                                    documentRequestId: request._id,
                                    documentIndex: docIndex,
                                    documentName: doc.name,
                                  });
                                }}
                                className="border-red-300 hover:bg-red-50 hover:text-red-800 text-red-700 h-8 w-8 p-0"
                                title="Delete Document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm bg-white rounded-lg">
                        No documents in this request yet
                      </div>
                    )}
                  </div>
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
                <p className="text-gray-400 text-xs mt-1">
                  Send your first request using the form above
                </p>
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
                    <SearchableSelect
                      value={documentRequest.category}
                      onChange={(value) =>
                        setDocumentRequest((prev: any) => ({
                          ...prev,
                          category: value,
                        }))
                      }
                      options={categories}
                      placeholder="Search or select category"
                      widthClass="w-full"
                    />
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
                </CardContent>
              </Card>

              {/* Default Document Request Preview */}
              <DefaultDocumentRequestPreview
                onAddDocuments={(selectedDocuments: DocumentRequestTemplate[]) => {
              const newDocs: any[] = selectedDocuments.map(doc => {
                // Ensure type is always a string
                const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
                return {
                  name: doc.name,
                  type: docType,
                  description: doc.description,
                  template: docType === 'template'
                    ? { url: doc.template?.url, instruction: doc.template?.instructions }
                    : undefined,
                  status: 'pending' as const
                };
              });
                  
                  setDocuments(prev => [...prev, ...newDocs]);

                  toast({
                    title: "Documents Added",
                    description: `${selectedDocuments.length} documents added.`,
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
              {documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Documents to Request ({documents.length})
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
                disabled={loading || documents.length === 0 || !documentRequest.category || !documentRequest.description}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Delete Document
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.documentName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
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
