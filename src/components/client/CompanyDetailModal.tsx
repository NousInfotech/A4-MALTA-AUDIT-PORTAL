import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calendar,
  MapPin,
  Users,
  Loader2,
  Plus,
  Edit,
  Trash2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PersonList } from "./PersonList";
import { EditCompanyModal } from "./EditCompanyModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Person {
  _id: string;
  name: string;
  roles: string[];
  email?: string;
  phoneNumber?: string;
  sharePercentage?: number;
  nationality?: string;
  type?: string; // 'person' or 'company' for representatives
}

interface Company {
  _id: string;
  name: string;
  registrationNumber?: string;
  address?: string;
  status: "active" | "record";
  persons?: Person[];
  supportingDocuments?: string[];
  timelineStart?: string;
  timelineEnd?: string;
  shareHoldingCompanies?: Array<{
    companyId: string | {
      _id: string;
      name: string;
      registrationNumber?: string;
    };
    sharePercentage: number;
  }>;
  shareHoldingCompanyDetails?: any[];
  representative?: (Person & { type?: string }) | (Person & { type?: string })[] | null;
  createdAt?: string;
}

interface CompanyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  clientId: string;
  onUpdate: () => void;
}

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  isOpen,
  onClose,
  company,
  clientId,
  onUpdate,
}) => {
  const [fullCompanyData, setFullCompanyData] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (company) {
      fetchFullCompanyData();
    }
  }, [company, isOpen]);

  const fetchFullCompanyData = async () => {
    if (!company) return;

    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${company._id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch company details");

      const result = await response.json();
      setFullCompanyData(result.data);
    } catch (error) {
      console.error("Error fetching company details:", error);
      toast({
        title: "Error",
        description: "Failed to load company details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!company) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-hover rounded-xl flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-semibold text-gray-900">
                        {fullCompanyData?.name || company.name}
                      </DialogTitle>
                      {fullCompanyData?.registrationNumber && (
                        <p className="text-sm text-gray-600 mt-1">
                          {fullCompanyData.registrationNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditModalOpen(true)}
                      className="rounded-xl"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="rounded-xl">
                  <TabsTrigger value="details" className="rounded-lg">
                    Company Details
                  </TabsTrigger>
                  <TabsTrigger value="persons" className="rounded-lg">
                    Persons ({fullCompanyData?.persons?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="persons" className="rounded-lg">
                    
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-6">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`rounded-xl px-3 py-1 text-sm font-semibold ${
                        fullCompanyData?.status === "active"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {fullCompanyData?.status}
                    </Badge>
                  </div>

                  {/* Address */}
                  {fullCompanyData?.address && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                      <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Address</p>
                        <p className="text-gray-900">{fullCompanyData.address}</p>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {(fullCompanyData?.timelineStart ||
                    fullCompanyData?.timelineEnd) && (
                    <div className="grid grid-cols-2 gap-4">
                      {fullCompanyData?.timelineStart && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                          <Calendar className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">
                              Timeline Start
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(fullCompanyData.timelineStart).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                      {fullCompanyData?.timelineEnd && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                          <Calendar className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">
                              Timeline End
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(fullCompanyData.timelineEnd).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Representative(s) */}
                  {fullCompanyData?.representative && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-blue-900 font-medium">
                            Representative{Array.isArray(fullCompanyData.representative) ? 's' : ''} (Highest Shareholder{Array.isArray(fullCompanyData.representative) ? 's' : ''})
                          </p>
                          {Array.isArray(fullCompanyData.representative) ? (
                            <div className="space-y-1 mt-2">
                              {fullCompanyData.representative.map((rep: any, idx: number) => (
                                <p key={idx} className="text-blue-700">
                                  {rep.name}
                                  {rep.type && (
                                    <span className="text-xs text-blue-600 ml-1">
                                      ({rep.type === 'company' ? 'Company' : 'Person'})
                                    </span>
                                  )}
                                  {' '}({rep.sharePercentage}%)
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-blue-700 mt-1">
                              {fullCompanyData.representative.name}
                              {fullCompanyData.representative.type && (
                                <span className="text-xs text-blue-600 ml-1">
                                  ({fullCompanyData.representative.type === 'company' ? 'Company' : 'Person'})
                                </span>
                              )}
                              {' '}({fullCompanyData.representative.sharePercentage}%)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Supporting Documents */}
                  {fullCompanyData?.supportingDocuments && fullCompanyData.supportingDocuments.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Supporting Documents
                      </h3>
                      <div className="space-y-2">
                        {fullCompanyData.supportingDocuments.map((doc: string, index: number) => {
                          // Extract filename from URL
                          const getFileName = (url: string) => {
                            try {
                              const urlObj = new URL(url);
                              const pathname = decodeURIComponent(urlObj.pathname);
                              const fileName = pathname.split('/').pop() || '';
                              // Remove timestamp prefix if timeline exists
                              const cleanedFileName = fileName.replace(/^\d+-/, '');
                              return cleanedFileName || `Document ${index + 1}`;
                            } catch {
                              return `Document ${index + 1}`;
                            }
                          };
                          
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                              <FileText className="h-5 w-5 text-gray-600" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {getFileName(doc)}
                                </p>
                              </div>
                              <a
                                href={doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 text-gray-600" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                      {/* Shareholding Companies */}
                  {fullCompanyData?.shareHoldingCompanies &&
                    fullCompanyData.shareHoldingCompanies.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Shareholding Companies
                        </h3>
                        <div className="space-y-2">
                          {fullCompanyData.shareHoldingCompanies.map((share: any, index: number) => {
                            // Get company name from populated companyId or fetch if string ID
                            let companyName = "Unknown";
                            
                            if (share.companyId) {
                              if (typeof share.companyId === 'object' && share.companyId.name) {
                                companyName = share.companyId.name;
                              } else if (typeof share.companyId === 'string') {
                                // If it's just an ID string, the backend should populate it
                                // For now, show "Unknown" if not populated
                                companyName = "Unknown Company";
                              }
                            }
                            
                            return (
                              <div
                                key={index}
                                className="p-4 bg-gray-50 rounded-xl"
                              >
                                <p className="text-sm font-medium text-gray-900">
                                  {companyName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {share.sharePercentage}% owned
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="persons" className="mt-6">
                  <PersonList
                    companyId={company._id}
                    clientId={clientId}
                    company={fullCompanyData || company}
                    onUpdate={fetchFullCompanyData}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Company Modal */}
      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={fullCompanyData || company}
        clientId={clientId}
        onSuccess={() => {
          setIsEditModalOpen(false);
          fetchFullCompanyData();
          onUpdate();
        }}
        existingCompanies={[]}
      />
    </>
  );
};

