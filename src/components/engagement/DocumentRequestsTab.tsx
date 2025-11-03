// @ts-nocheck
import { useMemo, useState } from "react";
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
import { Send, ChevronsUpDown, Check, FileText, Shield, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KYCSetupModal } from "@/components/kyc/KYCSetupModal";
import { PbcDocuments } from "../pbc/PbcDocuments";

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
    category: string
    description: string
    comment?: string
    attachment?: File
  }
  setDocumentRequest: (request: any) => void
  handleSendDocumentRequest: () => void
  engagement?: any
}

export const DocumentRequestsTab = ({
  requests,
  documentRequest,
  setDocumentRequest,
  handleSendDocumentRequest,
  engagement,
}: DocumentRequestsTabProps) => {
  const [isPbcDocumentsOpen, setIsPbcDocumentsOpen] = useState(false);

  const [kycModalOpen, setKycModalOpen] = useState(false);

  const canSend =
    (documentRequest.category?.trim()?.length || 0) > 0 &&
    (documentRequest.description?.trim()?.length || 0) > 0;
  const descLen = documentRequest.description?.length || 0;
  const DESC_MAX = 800;

  const handleKYCComplete = (kycData: any) => {
    console.log("KYC completed:", kycData);
    // You can add additional logic here if needed
  };

  // Debug logging
  console.log("📋 DocumentRequestsTab - requests:", requests);
  console.log("📋 DocumentRequestsTab - requests length:", requests?.length);
  requests?.forEach((request, index) => {
    console.log(`📋 Request ${index}:`, {
      id: request._id,
      status: request.status,
      documents: request.documents,
      documentsLength: request.documents?.length,
    });

    // Log each document individually
    if (request.documents?.length > 0) {
      request.documents.forEach((doc, docIndex) => {
        console.log(`📄 Document ${docIndex}:`, {
          name: doc.name,
          url: doc.url,
          uploadedAt: doc.uploadedAt,
          status: doc.status,
          fullDoc: doc,
        });
      });
    }
  });
  console.log("engagement", engagement);
  return (
    <>
      {/* ######################################################################################### */}
      {/* Do not Change the PBC component */}

      {/* <div className="flex justify-end">
        <Button
          onClick={() => setIsPbcDocumentsOpen(true)}
          variant="default"
          className=""
        >
          PBC&nbsp;Documents
        </Button>
      </div> */}

      {/* Do not Change the PBC component */}
      {/* ######################################################################################### */}

      <div className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50 p-6">
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
              <div className="text-xs text-gray-500">
                Optional: Add any specific instructions, deadlines, or additional context for the client.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment" className="text-sm font-medium text-gray-700">Attachment (Optional)</Label>
              <div className="space-y-3">
                {!documentRequest.attachment ? (
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="attachment"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-300"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">Excel, PDF, Word documents (MAX. 10MB)</p>
                      </div>
                      <input
                        id="attachment"
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDocumentRequest((prev: any) => ({
                              ...prev,
                              attachment: file,
                            }));
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">{documentRequest.attachment.name}</p>
                        <p className="text-xs text-green-600">
                          {(documentRequest.attachment.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDocumentRequest((prev: any) => ({
                          ...prev,
                          attachment: undefined,
                        }))
                      }
                      className="text-green-600 hover:text-green-700 hover:bg-green-100"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Optional: Upload templates, forms, or reference documents for the client to use.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setKycModalOpen(true)}
                className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex-1 sm:flex-none"
              >
                <Shield className="h-4 w-4 mr-2" />
                Setup KYC
              </Button>
              <Button
                onClick={handleSendDocumentRequest}
                disabled={!canSend}
                className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50 p-6">
            <CardTitle className="text-xl font-bold text-gray-900">
              Document Requests History
            </CardTitle>
            <CardDescription className="text-gray-700">
              Recent requests and uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-gray-100/80 transition-all duration-300"
                >
                  <div className="space-y-3">
                    {/* Request Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm leading-relaxed">
                          {request.description}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Category:</span>
                            {request.category}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Requested:</span>
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <Badge
                          variant={request.status === "completed" ? "outline" : "secondary"}
                          className={cn(
                            "capitalize text-xs px-2 py-1",
                            request.status === "completed" &&
                              "text-green-600 border-green-600 bg-green-50"
                          )}
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Documents Section */}
                    {request.documents?.length > 0 && (
                      <div className="border-t border-gray-200/50 pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">
                            Uploaded Documents ({request.documents.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {request.documents.map((doc: any, docIndex: number) => (
                            <a
                              key={`${doc.name}-${docIndex}`}
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-brand-hover text-white rounded-lg hover:bg-brand-sidebar transition-all duration-300 shadow-sm hover:shadow-md text-sm"
                              title={`View ${doc.name}`}
                            >
                              <FileText className="h-4 w-4" />
                              <span className="truncate max-w-[200px]">{doc.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {requests.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">
                    No document requests sent yet
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Send your first request using the form above
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KYC Setup Modal */}
        <KYCSetupModal
          selectedEngagement={engagement}
          open={kycModalOpen}
          onOpenChange={setKycModalOpen}
          onKYCComplete={handleKYCComplete}
        />
      </div>

      {/* PBC DOCUMENT MODAL */}
      <PbcDocuments
        open={isPbcDocumentsOpen}
        onOpenChange={setIsPbcDocumentsOpen}
        selectedEngagement={engagement}
      />
    </>
  );
};
