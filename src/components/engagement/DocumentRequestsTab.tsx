

// @ts-nocheck
import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Send, ChevronsUpDown, Check, FileText, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { KYCSetupModal } from "@/components/kyc/KYCSetupModal"

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
]

type ComboOption = { value: string; label?: string }

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  widthClass = "w-full",
  emptyText = "No results.",
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: string[] | ComboOption[]
  placeholder?: string
  widthClass?: string
  emptyText?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const normalized = useMemo<ComboOption[]>(
    () =>
      (options as any[]).map((o) =>
        typeof o === "string" ? { value: o, label: o } : ({ value: o.value, label: o.label ?? o.value } as ComboOption),
      ),
    [options],
  )
  const selectedLabel = normalized.find((o) => o.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between hover:text-sidebar-foreground hover:bg-inherit", widthClass)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selectedLabel || placeholder || "Select"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", widthClass)}>
        <Command filter={(val, search) => (val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder={placeholder || "Search..."} />
          <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-56 overflow-auto">
            {normalized.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.label || opt.value}
                onSelect={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="cursor-pointer"
              >
                <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{opt.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface DocumentRequestsTabProps {
  requests: any[]
  documentRequest: {
    category: string
    description: string
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
  const [kycModalOpen, setKycModalOpen] = useState(false)
  
  const canSend =
    (documentRequest.category?.trim()?.length || 0) > 0 && (documentRequest.description?.trim()?.length || 0) > 0
  const descLen = documentRequest.description?.length || 0
  const DESC_MAX = 800

  const handleKYCComplete = (kycData: any) => {
    console.log('KYC completed:', kycData);
    // You can add additional logic here if needed
  };

  // Debug logging
  console.log('📋 DocumentRequestsTab - requests:', requests);
  console.log('📋 DocumentRequestsTab - requests length:', requests?.length);
  requests?.forEach((request, index) => {
    console.log(`📋 Request ${index}:`, {
      id: request._id,
      status: request.status,
      documents: request.documents,
      documentsLength: request.documents?.length
    });
    
    // Log each document individually
    if (request.documents?.length > 0) {
      request.documents.forEach((doc, docIndex) => {
        console.log(`📄 Document ${docIndex}:`, {
          name: doc.name,
          url: doc.url,
          uploadedAt: doc.uploadedAt,
          status: doc.status,
          fullDoc: doc
        });
      });
    }
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
          <CardTitle className="text-xl font-bold text-gray-900">Send Document Request</CardTitle>
          <CardDescription className="text-gray-700">Request specific documents from the client</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <SearchableSelect
                value={documentRequest.category}
                onChange={(value) => setDocumentRequest((prev: any) => ({ ...prev, category: value }))}
                options={categories}
                placeholder="Search or select category"
                widthClass="w-full"
              />
              <p className="text-xs text-muted-foreground">Start typing to filter categories.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Request Description</Label>
              <span className={cn("text-xs", descLen > DESC_MAX ? "text-destructive" : "text-muted-foreground")}>
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
              className="resize-y"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="cursor-default">
                Tip: include date range
              </Badge>
              <Badge variant="outline" className="cursor-default">
                Specify format (PDF/XLSX)
              </Badge>
              <Badge variant="outline" className="cursor-default">
                Add due date
              </Badge>
            </div>
          </div>

          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setKycModalOpen(true)}
              className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Shield className="h-4 w-4 mr-2" />
              Setup KYC
            </Button>
            <Button 
              onClick={handleSendDocumentRequest} 
              disabled={!canSend}
              className="bg-gray-800 hover:bg-gray-900 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Request
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
          <CardTitle className="text-xl font-bold text-gray-900">Document Requests History</CardTitle>
          <CardDescription className="text-gray-700">Recent requests and uploaded documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-gray-100/80 transition-all duration-300"
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-medium truncate">{request.description}</div>
                  <div className="text-xs text-muted-foreground">
                    Category: <span className="font-medium">{request.category}</span> • Requested:{" "}
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={request.status === "completed" ? "outline" : "secondary"}
                    className={cn("capitalize", request.status === "completed" && "text-green-600 border-green-600")}
                  >
                    {request.status}
                  </Badge>

                  {request.documents?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {request.documents.map((doc: any, docIndex: number) => {
                        console.log(`🎨 Rendering document ${docIndex}:`, doc);
                        return (
                          <div key={`${doc.name}-${docIndex}`} className="inline-block">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl"
                              title={doc.name}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View {doc.name}
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Debug info - remove this after fixing */}
                  {request.documents?.length > 0 && (
                    <div className="text-xs text-red-600 mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      🔍 DEBUG: {request.documents.length} document(s) found - Should be visible above
                    </div>
                  )}
                  
                  {/* Force render test */}
                  {request.documents?.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-sm font-bold text-yellow-800">TEST: Documents should appear below:</div>
                      {request.documents.map((doc: any, docIndex: number) => (
                        <div key={`test-${docIndex}`} className="text-xs text-yellow-700">
                          {docIndex + 1}. {doc.name} - {doc.url ? 'Has URL' : 'NO URL'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No document requests sent yet</p>
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
  )
}
