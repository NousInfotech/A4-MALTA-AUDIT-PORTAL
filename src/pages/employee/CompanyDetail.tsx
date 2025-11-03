import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Building2,
  MapPin,
  Users,
  Loader2,
  Edit,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonList } from "@/components/client/PersonList";
import { EditCompanyModal } from "@/components/client/EditCompanyModal";

interface Person {
  _id: string;
  name: string;
  roles: string[];
  email?: string;
  phoneNumber?: string;
  sharePercentage?: number;
  nationality?: string;
  type?: string;
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
  representative?: (Person & { type?: string }) | (Person & { type?: string })[] | null;
  createdAt?: string;
}

export const CompanyDetail: React.FC = () => {
  const { clientId, companyId } = useParams<{ clientId: string; companyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (companyId && clientId) {
      fetchCompanyData();
    }
  }, [companyId, clientId]);

  const fetchCompanyData = async () => {
    if (!companyId || !clientId) return;

    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch company details");

      const result = await response.json();
      setCompany(result.data);
    } catch (error: any) {
      console.error("Error fetching company details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load company details",
        variant: "destructive",
      });
      if (clientId) {
        navigate(`/employee/clients/${clientId}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader size="lg" text="Loading..." />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="icon"
                asChild
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Link to={`/employee/clients/${clientId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-hover rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">
                    {company.name}
                  </h1>
                  {company.registrationNumber && (
                    <p className="text-gray-700">{company.registrationNumber}</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="bg-brand-hover hover:bg-brand-active text-white border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Company
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          <Tabs defaultValue="details" className="mt-6">
            <TabsList className="rounded-xl m-6 mb-0">
              <TabsTrigger value="details" className="rounded-lg">
                Company Details
              </TabsTrigger>
              <TabsTrigger value="persons" className="rounded-lg">
                Persons ({company.persons?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="p-6 space-y-6 mt-6">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`rounded-xl px-3 py-1 text-sm font-semibold ${
                    company.status === "active"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {company.status}
                </Badge>
              </div>

              {/* Address */}
              {company.address && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Address</p>
                    <p className="text-gray-900">{company.address}</p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {(company.timelineStart || company.timelineEnd) && (
                <div className="grid grid-cols-2 gap-4">
                  {company.timelineStart && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Timeline Start
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(company.timelineStart).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {company.timelineEnd && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Timeline End
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(company.timelineEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Representative(s) */}
              {company.representative && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-medium">
                        Representative{Array.isArray(company.representative) ? 's' : ''} (Highest Shareholder{Array.isArray(company.representative) ? 's' : ''})
                      </p>
                      {Array.isArray(company.representative) ? (
                        <div className="space-y-1 mt-2">
                          {company.representative.map((rep: any, idx: number) => (
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
                          {company.representative.name}
                          {company.representative.type && (
                            <span className="text-xs text-blue-600 ml-1">
                              ({company.representative.type === 'company' ? 'Company' : 'Person'})
                            </span>
                          )}
                          {' '}({company.representative.sharePercentage}%)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Supporting Documents */}
              {company.supportingDocuments && company.supportingDocuments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Supporting Documents
                  </h3>
                  <div className="space-y-2">
                    {company.supportingDocuments.map((doc: string, index: number) => {
                      const getFileName = (url: string) => {
                        try {
                          const urlObj = new URL(url);
                          const pathname = decodeURIComponent(urlObj.pathname);
                          const fileName = pathname.split('/').pop() || '';
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
              {company.shareHoldingCompanies &&
                company.shareHoldingCompanies.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Shareholding Companies
                    </h3>
                    <div className="space-y-2">
                      {company.shareHoldingCompanies.map((share: any, index: number) => {
                        let companyName = "Unknown";
                        
                        if (share.companyId) {
                          if (typeof share.companyId === 'object' && share.companyId.name) {
                            companyName = share.companyId.name;
                          } else if (typeof share.companyId === 'string') {
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

            <TabsContent value="persons" className="p-6 mt-6">
              {company && clientId && (
                <PersonList
                  companyId={company._id}
                  clientId={clientId}
                  company={company}
                  onUpdate={fetchCompanyData}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Company Modal */}
      {company && clientId && (
        <EditCompanyModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          company={company}
          clientId={clientId}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchCompanyData();
          }}
          existingCompanies={[]}
        />
      )}
    </div>
  );
};

