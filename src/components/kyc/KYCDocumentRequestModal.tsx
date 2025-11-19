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
import { kycApi } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { DefaultDocumentRequestPreview } from "./DefaultDocumentRequestPreview";
import { DefaultDocument } from "@/data/defaultDocumentRequests";
import { DocumentRequestTemplate } from '@/lib/api/documentRequestTemplate';

/* ✅ personsData with address */
// const personsData = [
//   {
//     name: "John Miller",
//     nationality: "Maltese",
//     address: "45 Palm Street, Valletta, Malta",
//     roles: ["Director", "Shareholder"],
//   },
//   {
//     name: "Anna Rossi",
//     nationality: "Italian",
//     address: "22 Rome Via, Rome, Italy",
//     roles: ["Ultimate Beneficial Owner"],
//   },
//   {
//     name: "Wei Zhang",
//     nationality: "Chinese",
//     address: "10 West Shanghai Road, Shanghai, China",
//     roles: ["Shareholder"],
//   },
// ];

interface Document {
  name: string;
  type: 'direct' | 'template';
  description?: string;
  template?: {
    url?: string;
    instruction?: string;
  };
  status: 'pending';
}

interface KYCDocumentRequestModalProps {
  engagementId: string;
  clientId: string;
  engagementName?: string;
  company?: any;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function KYCDocumentRequestModal({
  engagementId,
  clientId,
  engagementName,
  company,
  onSuccess,
  trigger,
}: KYCDocumentRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocument, setNewDocument] = useState<Partial<Document>>({
    name: '',
    type: 'direct',
    description: '',
    template: {
      instruction: ''
    }
  });
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const { toast } = useToast();

  /* ✅ checkbox state */
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const togglePersonSelect = (personId: string) => {
    setSelectedPersonIds(prev =>
      prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]
    );
  };
  
  console.log(company);
  
  
  
  const [viewMode, setViewMode] =
  useState<"shareholders" | "involvements">("shareholders");


  const handleAddDocument = () => {
    if (!newDocument.name?.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive",
      });
      return;
    }

    const document: Document = {
      name: newDocument.name.trim(),
      type: newDocument.type || 'direct',
      description: newDocument.description?.trim() || '',
      template: newDocument.type === 'template' ? {
        instruction: newDocument.template?.instruction?.trim() || ''
      } : undefined,
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
    setTemplateFile(null);
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateUpload = async (file: File) => {
    try {
      setLoading(true);
      // Upload template file to get URL
      const formData = new FormData();
      formData.append('file', file);
            // Get auth token
      const { data } = await supabase.auth.getSession();
      const API_URL = import.meta.env.VITE_APIURL || 'http://localhost:8000';


      const uploadResponse = await fetch(`${API_URL}/api/document-requests/template/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.session?.access_token}`
        },
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload template');

      const { url } = await uploadResponse.json();
      return url;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!engagementId?.trim()) {
      toast({
        title: "Error",
        description: "Engagement ID missing",
        variant: "destructive"
      });
      return;
    }

    if (!clientId?.trim()) {
      toast({
        title: "Error",
        description: "Client ID missing",
        variant: "destructive"
      });
      return;
    }

    if (documents.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one document",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const processedDocuments = await Promise.all(
        documents.map(async (doc) => {
          if (doc.type === 'template' && templateFile) {
            const url = await handleTemplateUpload(templateFile);
            return {
              ...doc,
              template: { ...doc.template, url }
            };
          }
          return doc;
        })
      );

      const processedDocumentRequests = selectedPersonIds.map((personId:string) => ({
        documentRequest: processedDocuments.map((doc:any) => ({
          name: doc.name,
          type: (doc.type === "template" || doc.type === "required" ? "required" : "optional") as "required" | "optional",
          description: doc.description || "",
          templateUrl: doc.type === "template" ? doc.template?.url : undefined,
        })),
        person: personId
      }));

      const kycData = {
        engagementId,
        clientId,
        documentRequests:processedDocumentRequests
      };

      console.log("KYC Data: ", kycData);
      await kycApi.create(kycData);
      

      toast({
        title: "Success",
        description: "KYC workflow created successfully",
      });

      setDocuments([]);
      setNewDocument({
        name: '',
        type: 'direct',
        description: '',
        template: { instruction: '' }
      });
      setTemplateFile(null);
      setOpen(false);

      setTimeout(() => onSuccess?.(), 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create workflow",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeIcon = (type: string) =>
    type === 'template'
      ? <FileEdit className="h-4 w-4 text-blue-600" />
      : <FileUp className="h-4 w-4 text-green-600" />;

  const getDocumentTypeBadge = (type: string) =>
    type === 'template'
      ? (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          <FileEdit className="h-3 w-3 mr-1" />
          Template
        </Badge>
      )
      : (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          <FileUp className="h-3 w-3 mr-1" />
          Direct
        </Badge>
      );


  const mergedPersons = React.useMemo(() => {
  if (!company) return [];

  const personsMap: Record<string, any> = {};

  // STEP 1 — Shareholders
  company?.shareHolders?.forEach((sh: any) => {
    const p = sh.personId; // now an object

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

    const totalShares = sh.sharesData?.reduce((sum: number, item: any) => sum + (Number(item?.totalShares) || 0), 0);
    const percentage = totalShares > 0 ? (totalShares / company?.totalShares) * 100 : 0;

    personsMap[p._id].shareholder = {
      // class: sh.sharesData?,
      percentage: percentage,
      totalShares: totalShares,
    };

    console.log(p._id, percentage, totalShares);

    // Ensure roles[] exists
    if (!personsMap[p._id].roles) personsMap[p._id].roles = [];
    personsMap[p._id].roles.push("Shareholder");
  });

  // STEP 2 — Representational schema
  company?.representationalSchema?.forEach((rep: any) => {
    const p = rep.personId; // now an object

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

    // Add all roles
    personsMap[p._id].roles.push(...rep.role);
  });

  return Object.values(personsMap);
  }, [company]);
      
      
      

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create KYC Workflow
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create KYC Workflow
          </DialogTitle>

          <DialogDescription>
            Create a KYC workflow for this engagement. Add documents that clients need to provide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">

          {/* ✅ Request Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="engagementDisplay">Engagement</Label>
                <Input
                  id="engagementDisplay"
                  value={engagementName || 'Current Engagement'}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-600 mt-1">
                  KYC documents will be created for this engagement
                </p>

                {(!engagementId || engagementId.trim() === '') && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Engagement ID is missing. Please ensure you're accessing this from an engagement page.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ✅ Persons List */}
          {mergedPersons.length > 0 && (
          <Card>
          <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className='flex flex-col gap-2'>
          <CardTitle className="text-lg">
          Persons Related to this Engagement ({mergedPersons.length})
          </CardTitle>

          <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
          <SelectTrigger className='w-48 border-gray-300 focus:border-gray-500 rounded-xl'>
          <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
          <SelectItem value="shareholders">Shareholders</SelectItem>
          <SelectItem value="involvements">Involvements</SelectItem>
          </SelectContent>
          </Select>
          </div>
           
           <Button
            variant="default"
            onClick={() => {
            // If all selected → unselect all
            if (selectedPersonIds.length === mergedPersons.length) {
            setSelectedPersonIds([]);
            } else {
            // Else → select all
            setSelectedPersonIds(mergedPersons.map(p => p.personId));
            }
            }}
            >
            {selectedPersonIds.length === mergedPersons.length
            ? "Unselect All"
            : "Select All"}
            </Button>
          
          </div>
          </CardHeader>

          <CardContent>

          {/* ✅ SHAREHOLDERS */}
          {viewMode === "shareholders" && (
          <div className="space-y-3">
          {mergedPersons
          .filter(p => p.shareholder)
          .map(p => (
          <div
          key={p.personId}
          onClick={() => togglePersonSelect(p.personId)}
          className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border cursor-pointer"
          >
          <div>
            <p className="font-medium text-gray-900">{p.name ?? "Unknown"}</p>
            {p.nationality && (
              <p className="text-sm text-gray-600">
                Nationality: {p.nationality}
              </p>
            )}
            {p.address && (
              <p className="text-sm text-gray-600">
                Address: {p.address}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {/* {p.shareholder?.class && (
                <Badge variant="outline">Class: {p.shareholder.class}</Badge>
              )} */}
              {typeof p.shareholder?.percentage === "number" && (
                <Badge variant="outline">
                  {p.shareholder.percentage}%
                </Badge>
              )}
              {typeof p.shareholder?.percentage === "number" && (
                <Badge variant="outline">
                  {p.shareholder.totalShares}/{company.totalShares} shares
                </Badge>
              )}
            </div>
          </div>

              <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={selectedPersonIds.includes(p.personId)}
              onChange={() => {}}
              onClick={(e) => {
              e.stopPropagation(); // prevent duplicate toggle
              togglePersonSelect(p.personId);
              }}
              />

          </div>
          ))}
          </div>
          )}

          {/* ✅ INVOLVEMENTS */}
          {viewMode === "involvements" && (
          <div className="space-y-3">
          {mergedPersons.map(p => {
          const roles = (p.roles ?? []).filter(r => r !== "Shareholder");
          if (roles.length === 0) return null;

          return (
            <div
            key={p.personId}
            onClick={() => togglePersonSelect(p.personId)}
            className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border cursor-pointer"
          >
            <div>
              <p className="font-medium text-gray-900">{p.name ?? "Unknown"}</p>
          
              {p.nationality && (
                <p className="text-sm text-gray-600">
                  Nationality: {p.nationality}
                </p>
              )}
          
              {p.address && (
                <p className="text-sm text-gray-600">
                  Address: {p.address}
                </p>
              )}
          
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map((role: string, i: number) => (
                  <Badge key={i} variant="outline">
                    {role}
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
          })}
          </div>
          )}
          </CardContent>
          </Card>
          )}


          {/* ✅ Default Document Request Preview */}
          <DefaultDocumentRequestPreview
            onAddDocuments={(selectedDocuments: DocumentRequestTemplate[]) => {
              const newDocs: Document[] = selectedDocuments.map(doc => ({
                name: doc.name,
                type: doc.type,
                description: doc.description,
                template: doc.type === 'template'
                  ? { url: doc.template?.url, instruction: doc.template?.instructions }
                  : undefined,
                status: 'pending' as const
              }));
              
              setDocuments(prev => [...prev, ...newDocs]);

              toast({
                title: "Documents Added",
                description: `${selectedDocuments.length} documents added.`,
              });
            }}
            engagementId={engagementId}
            clientId={clientId}
          />

          {/* ✅ Add Document */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Document</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Document Name *</Label>
                  <Input
                    value={newDocument.name || ''}
                    onChange={(e) =>
                      setNewDocument(prev => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label>Request Type *</Label>
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
                <Label>Description</Label>
                <Textarea
                  value={newDocument.description || ''}
                  onChange={(e) =>
                    setNewDocument(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                />
              </div>

              {newDocument.type === 'template' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Template-based Workflow
                    </span>
                  </div>

                  <Label>Template File</Label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                  />

                  <Label>Instructions for Client</Label>
                  <Textarea
                    value={newDocument.template?.instruction || ''}
                    onChange={(e) =>
                      setNewDocument(prev => ({
                        ...prev,
                        template: { ...prev.template, instruction: e.target.value }
                      }))
                    }
                    rows={3}
                  />
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

          {/* ✅ Documents List */}
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
                        {getDocumentTypeIcon(doc.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{doc.name}</span>
                            {getDocumentTypeBadge(doc.type)}
                          </div>

                          {doc.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {doc.description}
                            </p>
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
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>

                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ Workflow Information */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">
                Workflow Information
              </CardTitle>
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
              disabled={loading || documents.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create KYC Workflow
                </>
              )}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
