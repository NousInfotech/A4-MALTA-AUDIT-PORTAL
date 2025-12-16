import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  X,
  CheckCircle,
  FileEdit,
  FileUp,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { kycApi, documentRequestApi } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { DefaultDocumentRequestPreview } from './DefaultDocumentRequestPreview';
import { DocumentRequestTemplate } from '@/lib/api/documentRequestTemplate';
import { SingleDocumentForm } from '@/components/document-request/AddDocumentDialog/SingleDocumentForm';
import { MultipleDocumentForm } from '@/components/document-request/AddDocumentDialog/MultipleDocumentForm';

interface Document {
  name: string;
  type: 'direct' | 'template';
  description?: string;
  template?: {
    url?: string;
    instruction?: string;
  };
  templateFile?: File; // Store the file temporarily before upload
  status: 'pending';
}

interface MultipleDocumentItem {
  label: string;
  status: "pending";
  template?: {
    url?: string;
    instruction?: string;
  };
  templateFile?: File;
}

interface MultipleDocument {
  name: string;
  type: "direct" | "template";
  instruction?: string;
  multiple: MultipleDocumentItem[];
  template?: {
    url?: string;
    instruction?: string;
  };
  templateFile?: File;
}

interface AddDocumentRequestModalProps {
  kycId: string;
  engagementId?: string;
  companyId?: string;
  clientId: string;
  company?: any;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  workflowType?: "Shareholder" | "Representative";
}

export function AddDocumentRequestModal({
  kycId,
  engagementId,
  companyId,
  clientId,
  company,
  onSuccess,
  trigger,
  workflowType
}: AddDocumentRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [multipleDocuments, setMultipleDocuments] = useState<MultipleDocument[]>([]);
  const [documentMode, setDocumentMode] = useState<"new" | "new-multiple">("new");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"shareholders" | "involvements">("shareholders");
  const { toast } = useToast();

  // Sync viewMode with workflowType
  useEffect(() => {
    if (workflowType === "Representative") {
      setViewMode("involvements");
    } else if (workflowType === "Shareholder") {
      setViewMode("shareholders");
    }
  }, [workflowType]);

  const togglePersonSelect = (personId: string) => {
    setSelectedPersonIds(prev =>
      prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]
    );
  };

  const handleTemplateUpload = async (file: File) => {
    try {
      console.log('Uploading template file:', file.name);

      const response = await documentRequestApi.uploadTemplate(file);
      console.log('Template upload successful:', response);

      return response.url;
    } catch (error) {
      console.error('Template upload error:', error);
      throw error;
    }
  };

  const mergedPersons = React.useMemo(() => {
    if (!company) return [];

    const personsMap: Record<string, any> = {};

    // STEP 1 — Shareholders
    company?.shareHolders?.forEach((sh: any) => {
      const p = sh.personId;

      if (!personsMap[p._id]) {
        personsMap[p._id] = {
          personId: p._id,
          name: p.name,
          nationality: p.nationality,
          address: p.address ?? "",
          roles: [],
          shareholder: null,
        };
      }

      // sharesData is now an array, calculate percentage from totalShares
      const sharesDataArray = Array.isArray(sh.sharesData) ? sh.sharesData : [];
      console.log(sharesDataArray);
      
      const totalShares = sharesDataArray.reduce((sum: number, item: any) => {
        return sum + (Number(item?.totalShares) || 0);
      }, 0);
      const shareClassRaw = sharesDataArray.length > 0 ? sharesDataArray[0]?.class : undefined;
      const shareClass = typeof shareClassRaw === 'string' ? shareClassRaw : (shareClassRaw ? String(shareClassRaw) : undefined);
       
      // Calculate percentage: (totalShares / company.totalShares) * 100
      const companyTotalShares = company?.totalShares.reduce((sum: number, item: any) => sum + (Number(item?.totalShares) || 0), 0) || 0;
      const percentage = companyTotalShares > 0 
        ? (totalShares / companyTotalShares) * 100 
        : 0;
      
      personsMap[p._id].shareholder = {
        class: shareClass,
        percentage: percentage,
        totalShares: totalShares,
        shareClasses: sharesDataArray,    
      };
 
      if (!personsMap[p._id].roles) personsMap[p._id].roles = [];
      personsMap[p._id].roles.push("Shareholder");
    });

    // STEP 2 — Representational schema
    company?.representationalSchema?.forEach((rep: any) => {
      const p = rep.personId;

      if (!personsMap[p._id]) {
        personsMap[p._id] = {
          personId: p._id,
          name: p.name,
          nationality: p.nationality,
          address: p.address ?? "",
          roles: [],
          shareholder: null,
        };
      }

      personsMap[p._id].roles.push(...rep.role);
    });

    return Object.values(personsMap);
  }, [company]);

  const handleSubmit = async () => {
    if (engagementId && selectedPersonIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one person",
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
      console.log('📤 Processing documents and uploading templates...');
      const processedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // Ensure type is always a string - handle both string and object cases
          const docType: string = typeof doc.type === 'string' 
            ? doc.type 
            : (typeof (doc.type as any)?.type === 'string' ? (doc.type as any).type : 'direct');
          if (docType === 'template' && doc.templateFile) {
            try {
              console.log(`  → Uploading template for "${doc.name}"`);
              const templateUrl = await handleTemplateUpload(doc.templateFile);
              console.log(`  ✅ Template uploaded: ${templateUrl}`);
              return {
                ...doc,
                type: docType,
                template: {
                  ...doc.template,
                  url: templateUrl
                },
                templateFile: undefined // Remove the file from the final object
              };
            } catch (error) {
              console.error(`  ❌ Failed to upload template for document: ${doc.name}`, error);
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
      console.log('✅ All templates uploaded successfully');

      // Process multiple documents with template uploads
      console.log('📤 Processing multiple documents and uploading templates...');
      const processedMultipleDocuments = await Promise.all(
        multipleDocuments.map(async (doc) => {
          const docType = typeof doc.type === 'string' ? doc.type : (doc.type as any)?.type || 'direct';

          // Process each item's template file individually
          const processedMultiple = await Promise.all(
            doc.multiple.map(async (item: any) => {
              // If template-based and item has its own template file, upload it
              if (docType === "template" && item.templateFile) {
                try {
                  console.log(`  → Uploading template for "${item.label}"`);
                  const templateUrl = await handleTemplateUpload(item.templateFile);
                  console.log(`  ✅ Template uploaded: ${templateUrl}`);
                  return {
                    ...item,
                    template: {
                      url: templateUrl,
                      instruction: item.template?.instruction || doc.template?.instruction || "",
                    },
                    templateFile: undefined,
                  };
                } catch (error) {
                  console.error(`  ❌ Failed to upload template for item: ${item.label}`, error);
                  toast({
                    title: "Template Upload Failed",
                    description: `Failed to upload template for "${item.label}". Please try again.`,
                    variant: "destructive",
                  });
                  throw error;
                }
              }
              // If item already has template URL, preserve it
              if (item.template?.url) {
                return {
                  ...item,
                  template: item.template,
                };
              }
              return item;
            })
          );

          return {
            ...doc,
            multiple: processedMultiple,
          };
        })
      );
      console.log('✅ All multiple document templates uploaded successfully');

      // Format document requests for each selected person
      // If no person selected (Company KYC case), create one request with null person
      const targetIds = selectedPersonIds.length > 0 ? selectedPersonIds : [null];
      
      const processedDocumentRequests = targetIds.map((personId: string | null) => {
        const singleDocs = processedDocuments.map((doc: any) => {
          const docType = typeof doc.type === 'string' ? doc.type : (doc.type?.type || 'direct');
          return {
            name: doc.name,
            type: (docType === "template" || docType === "required" ? "required" : "optional") as "required" | "optional",
            description: doc.description || "",
            templateUrl: docType === "template" ? doc.template?.url : undefined,
          };
        });

        const multipleDocs = processedMultipleDocuments.map((doc: any) => {
          const docType = typeof doc.type === 'string' ? doc.type : (doc.type as any)?.type || 'direct';
          return {
            name: doc.name,
            type: docType === "template" ? "template" : "direct", // Send actual type for multipleDocuments
            instruction: doc.instruction || "",
            multiple: doc.multiple.map((m: any) => ({
              label: m.label,
              status: "pending",
              template: docType === "template" && m.template?.url 
                ? { 
                    url: m.template.url, 
                    instruction: m.template.instruction || "" 
                  } 
                : undefined,
            })),
          };
        });

        return {
          documentRequest: singleDocs, // Only single documents here
          multipleDocuments: multipleDocs, // Multiple documents separately
          person: personId
        };
      });

      console.log('📋 Adding document requests to KYC:', JSON.stringify(processedDocumentRequests, null, 2));

      // Add document requests to KYC
      await kycApi.addDocumentRequest(kycId, {
        documentRequests: processedDocumentRequests
      });

      toast({
        title: "Success",
        description: `Document requests added${selectedPersonIds.length > 0 ? ` for ${selectedPersonIds.length} person(s)` : ''}`,
      });

      // Reset form
      setDocuments([]);
      setMultipleDocuments([]);
      setSelectedPersonIds([]);
      setDocumentMode("new");
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding document request to KYC:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add document request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeIcon = (type: string | any) => {
    // Ensure type is a string, handle object case
    const typeStr = typeof type === 'string' ? type : (type?.type || 'direct');
    return typeStr === 'template' ? (
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

  const filteredPersons = mergedPersons.filter(p => {
    if (viewMode === "shareholders") {
      return p.shareholder;
    } else {
      return (p.roles ?? []).some(r => r !== "Shareholder");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Document Request
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add Document Request to KYC
          </DialogTitle>
          <DialogDescription>
            Create a new document request and add it to this KYC workflow. This allows you to request additional documents from the client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Persons List - Only show for Engagement KYC */}
          {(engagementId || companyId) && mergedPersons.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-lg">
                      Select Persons ({filteredPersons.length})
                    </CardTitle>
                    {workflowType ? (
                      <Badge variant="outline" className='text-md'>
                        {workflowType === "Representative" ? "Representatives" : "Shareholders"}
                      </Badge>
                    ) : (
                    <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                      <SelectTrigger className="w-48 border-gray-300 focus:border-gray-500 rounded-xl">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shareholders">Shareholders</SelectItem>
                        <SelectItem value="involvements">Involvements</SelectItem>
                      </SelectContent>
                    </Select>
                    )}
                  </div>

                  {filteredPersons.length > 0 && (
                    <Button
                      variant="default"
                      onClick={() => {
                          // Compare with filteredPersons
                          const allSelected = filteredPersons.every(p => selectedPersonIds.includes(p.personId));
                          
                          if (allSelected) {
                            // Unselect visible only
                            setSelectedPersonIds(prev => prev.filter(id => !filteredPersons.find(p => p.personId === id)));
                          } else {
                            // Select all visible
                            const newIds = [...selectedPersonIds];
                            filteredPersons.forEach(p => {
                              if (!newIds.includes(p.personId)) newIds.push(p.personId);
                            });
                            setSelectedPersonIds(newIds);
                          }
                      }}
                    >
                       {filteredPersons.length > 0 && filteredPersons.every(p => selectedPersonIds.includes(p.personId))
                        ? "Unselect All"
                        : "Select All"}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* SHAREHOLDERS */}
                {viewMode === "shareholders" && (
                  <div className="space-y-3">
                    {filteredPersons.length === 0 ? (
                      <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                        No shareholders found. Please add shareholders in the Company details.
                      </div>
                    ) : (
                      filteredPersons
                        .map(p => (
                          <div
                            key={p.personId}
                            onClick={() => togglePersonSelect(p.personId)}
                            className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{p.name ?? "Unknown"}</p>
                              {p.nationality && (
                                <p className="text-sm text-gray-600">Nationality: {p.nationality}</p>
                              )}
                              {p.address && (
                                <p className="text-sm text-gray-600">Address: {p.address}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                
                              {p.shareholder?.shareClasses.map((item: any) =>(
                                   
                                  <Badge variant="outline">
                                    { item.class.toLowerCase() != "ordinary" ? "Class" : ""} {item.class}: {item.totalShares}
                                  </Badge>
                                ))}

                               {p.shareholder?.totalShares != null && (
                                  <Badge variant="outline">
                                    Shares: {String(Number(p.shareholder.totalShares) || 0)}/{String(Number(company?.totalShares.reduce((sum: number, item: any) => sum + (Number(item?.totalShares) || 0), 0)) || 0)}
                                  </Badge>
                                )}
                                    
                                
                                {typeof p.shareholder?.percentage === "number" && !isNaN(p.shareholder.percentage) && (
                                  <Badge variant="outline">{p.shareholder.percentage.toFixed(2)}%</Badge>
                                )}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-blue-600"
                              checked={selectedPersonIds.includes(p.personId)}
                              onChange={() => { }}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePersonSelect(p.personId);
                              }}
                            />
                          </div>
                        ))
                    )
                    }
                  </div>
                )}

                {/* INVOLVEMENTS */}
                {viewMode === "involvements" && (
                  <div className="space-y-3">
                    {filteredPersons.length === 0 ? (
                      <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                        No representatives or involvements found. Please add them in the Company details.
                      </div>
                    ) : (
                      filteredPersons.map(p => {
                        const roles = (p.roles ?? []).filter(r => r !== "Shareholder");
                        if (roles.length === 0) return null;

                        return (
                          <div
                            key={p.personId}
                            onClick={() => togglePersonSelect(p.personId)}
                            className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{p.name ?? "Unknown"}</p>
                              {p.nationality && (
                                <p className="text-sm text-gray-600">Nationality: {p.nationality}</p>
                              )}
                              {p.address && (
                                <p className="text-sm text-gray-600">Address: {p.address}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {roles.map((role: string, i: number) => (
                                  <Badge key={i} variant="outline">
                                    {typeof role === 'string' ? role : String(role || '')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-blue-600"
                              checked={selectedPersonIds.includes(p.personId)}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePersonSelect(p.personId);
                              }}
                              readOnly
                            />
                          </div>
                        );

                      })
                    )
                    }
                  </div>
                )}


              </CardContent>
            </Card>
          )}
          <DefaultDocumentRequestPreview
                onAddDocuments={(selectedDocuments: DocumentRequestTemplate[]) => {
                  const newDocs: any[] = [];
                  const newMultipleDocs: any[] = [];
                  
                  selectedDocuments.forEach(doc => {
                    // Check if this is a multiple copy template
                    const isMultiple = doc.multiple && doc.multiple.length > 0;
                    const docType = typeof doc.type === 'string' ? doc.type : (doc.type as any)?.type || 'direct';
                    
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
                            template: docType === 'template' && item.template?.url
                              ? {
                                  url: item.template.url,
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
                engagementId={engagementId}
                clientId={clientId}
              />


          {/* Add New Document */}
          {documentMode === "new" && (
            <SingleDocumentForm
              documents={documents}
              setDocuments={setDocuments}
              mode="new"
              setMode={setDocumentMode}
              loading={loading}
              handleClose={() => {}}
              handleSubmit={() => {}}
              showBackButton={false}
              documentResult={false}
            />
          )}

          {documentMode === "new-multiple" && (
            <MultipleDocumentForm
              multipleDocuments={multipleDocuments}
              setMultipleDocuments={setMultipleDocuments}
              mode="new-multiple"
              setMode={setDocumentMode}
              loading={loading}
              handleClose={() => {}}
              handleSubmit={() => {}}
              showBackButton={false}
              documentResult={false}
            />
          )}

          {/* Documents List */}
          {(documents.length > 0 || multipleDocuments.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Documents to Request ({documents.length + multipleDocuments.length})
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
                        {getDocumentTypeIcon(doc.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{doc.name}</span>
                            {getDocumentTypeBadge(doc.type)}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                          )}
                          {(() => {
                            const docType: string = typeof (doc as any).type === 'string' 
                              ? (doc as any).type 
                              : (typeof ((doc as any).type as any)?.type === 'string' ? ((doc as any).type as any).type : 'direct');
                            return docType === 'template' && doc.template?.instruction;
                          })() && (
                            <p className="text-xs text-blue-600 mt-1">
                              Instructions: {doc.template.instruction}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocuments(prev => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {multipleDocuments.map((doc, index) => {
                    const docType = typeof doc.type === 'string' ? doc.type : (doc.type as any)?.type || 'direct';
                    return (
                      <div
                        key={`multiple-${index}`}
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
                                  {docType === 'template' && item.template?.url && (
                                    <p className="text-blue-600 mt-1">Template URL: Available</p>
                                  )}
                                  {docType === 'template' && item.template?.instruction && (
                                    <p className="text-gray-500 mt-1">Instructions: {item.template.instruction}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMultipleDocuments(prev => prev.filter((_, i) => i !== index))}
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
              <div className="p-3 bg-white rounded-lg">
                <p className="text-sm text-gray-700">
                  💡 <strong>Tip:</strong> You can add multiple document requests to the same KYC workflow to organize documents by category (e.g., Financial Documents, Legal Documents, Tax Documents).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (documents.length === 0 && multipleDocuments.length === 0) || ((!!engagementId || !!companyId) && selectedPersonIds.length === 0)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add to KYC Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

