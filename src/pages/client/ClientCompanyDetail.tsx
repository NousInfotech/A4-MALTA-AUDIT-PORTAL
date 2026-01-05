import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  ExternalLink,
  Globe,
  PieChart,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCompanyById, getCompanyHierarchy } from "@/lib/api/company";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {PersonList} from "@/components/client/PersonList";
import SharePieChart from "@/components/client/SharePieChart";
import CompanyHierarchy from "@/components/client/CompanyHierarchy";
import { EngagementKYC } from "../employee/EngagementKYC";

const VALID_COMPANY_TABS = ["details", "persons", "pie-chart", "company-hierarchy", "kyc"] as const;

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

interface PerShareValue {
  value: number;
  currency?: string; // defaults to "EUR"
}

interface Company {
  _id: string;
  name: string;
  registrationNumber?: string;
  address?: string;
  industry?: string;
  status: "active" | "record";
  issuedShares?: number;
  authorizedShares?: number;
  perShareValue?: PerShareValue;
  totalShares?: Array<{
    totalShares: number;
    class: string;
    type: string;
  }>;
  description?: string;
  companyStartedAt?: string;
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
    sharesData?: Array<{
      totalShares: number;
      class: string;
      type: string;
    }>;
    companyName?: string;
  }>;
  representative?: (Person & { type?: string }) | (Person & { type?: string })[] | null;
  shareHolders?: Array<{
    personId?: { _id: string; name: string } | string;
    companyId?: { _id: string; name: string } | string;
    sharePercentage: number;
    sharesData?: Array<{
      totalShares: number;
      class: string;
      type: string;
    }>;
  }>;
  createdAt?: string;
}

// Helper function to calculate total shares from array
const calculateTotalSharesSum = (totalSharesArray?: Array<{ totalShares: number; class: string; type: string }>): number => {
  if (!Array.isArray(totalSharesArray)) return 0;
  return totalSharesArray.reduce((sum, item) => sum + (Number(item.totalShares) || 0), 0);
};

export const ClientCompanyDetail: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [personsForChart, setPersonsForChart] = useState<Person[]>([]);
  const [hierarchyRoot, setHierarchyRoot] = useState<any>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const hierarchyData = useMemo(() => {
    const convertNode = (node: any | null | undefined): any => {
      if (!node) return null;
      const {
        id,
        name,
        type,
        percentage,
        sharePercentage, // Backend sends sharePercentage
        class: className,
        totalShares,
        shareholders,
        children,
        address,
        nationality,
        roles,
        sharesData, // Backend sends sharesData array
      } = node;

      const nextChildren = (children || shareholders || []).map((child: any) =>
        convertNode(child)
      );

      return {
        id: String(id),
        name,
        type,
        percentage: percentage ?? sharePercentage, // Use sharePercentage if percentage not present
        class: className,
        totalShares,
        address,
        nationality,
        roles,
        sharesData, // Pass through sharesData if needed
        children: nextChildren,
      };
    };

    return convertNode(hierarchyRoot);
  }, [hierarchyRoot]);

  const highestShareholders = useMemo(() => {
    if (!company) return [];

    type Holder = {
      key: string;
      name: string;
      type: "person" | "company";
      percentage: number;
    };

    const resolvePersonName = (personRef: any) => {
      if (personRef && typeof personRef === "object" && "name" in personRef) {
        return personRef.name as string;
      }
      if (typeof personRef === "string" && Array.isArray(company.persons)) {
        const match = company.persons.find((p) => p._id === personRef);
        if (match) return match.name;
      }
      return "Unknown";
    };

    const resolveCompanyName = (companyRef: any) => {
      if (companyRef && typeof companyRef === "object" && "name" in companyRef) {
        return companyRef.name as string;
      }
      if (typeof companyRef === "string") {
        const match =
          Array.isArray(company.shareHoldingCompanies) &&
          company.shareHoldingCompanies.find((c) => {
            if (!c?.companyId) return false;
            if (typeof c.companyId === "string") return c.companyId === companyRef;
            return c.companyId?._id === companyRef;
          });
        if (match && typeof match.companyName === "string") {
          return match.companyName;
        }
      }
      return "Unknown Company";
    };

    const holderMap = new Map<string, Holder>();

    // Process person shareholders (shareHolders array contains person shareholders)
    if (Array.isArray(company.shareHolders)) {
      company.shareHolders.forEach((share, index) => {
        // sharePercentage is now at the shareHolder level, not in sharesData
        const rawPercentage = Number(share?.sharePercentage ?? 0);
        if (!Number.isFinite(rawPercentage) || rawPercentage <= 0) return;

        // shareHolders should only contain person shareholders (personId)
        if (!share.personId) return;

        const idRef =
          typeof share.personId === "object"
            ? share.personId?._id
            : share.personId ?? `person-shareholder-${index}`;

        const key = `person:${idRef}`;
        const name = resolvePersonName(share.personId);

        const holder: Holder = {
          key,
          name,
          type: "person",
          percentage: rawPercentage,
        };

        const existing = holderMap.get(key);
        if (!existing || holder.percentage > existing.percentage) {
          holderMap.set(key, holder);
        }
      });
    }

    // Process company shareholders (shareHoldingCompanies array)
    if (Array.isArray(company.shareHoldingCompanies)) {
      company.shareHoldingCompanies.forEach((share, index) => {
        // sharePercentage is now at the shareHoldingCompany level, not in sharesData
        const rawPercentage = Number(share?.sharePercentage ?? 0);
        if (!Number.isFinite(rawPercentage) || rawPercentage <= 0) return;

        if (!share.companyId) return;

        const companyRef =
          typeof share.companyId === "object" && share.companyId?._id
            ? share.companyId._id
            : typeof share.companyId === "string"
              ? share.companyId
              : `shareholding-company-${index}`;

        const key = `company:${companyRef}`;
        const name =
          resolveCompanyName(share.companyId) ??
          (typeof share.companyName === "string" ? share.companyName : "Unknown Company");

        const holder: Holder = {
          key,
          name,
          type: "company",
          percentage: rawPercentage,
        };

        const existing = holderMap.get(key);
        if (!existing || holder.percentage > existing.percentage) {
          holderMap.set(key, holder);
        }
      });
    }

    const holders = Array.from(holderMap.values()).filter((holder) =>
      Number.isFinite(holder.percentage)
    );

    if (!holders.length) return [];

    const maxPercentage = Math.max(...holders.map((holder) => holder.percentage));
    if (!Number.isFinite(maxPercentage)) return [];

    return holders.filter(
      (holder) => Math.abs(holder.percentage - maxPercentage) < 0.0001
    );
  }, [company]);

  const activeTab = searchParams.get("tab");
  const currentTabFromQuery =
    activeTab && VALID_COMPANY_TABS.includes(activeTab as typeof VALID_COMPANY_TABS[number])
      ? activeTab
      : "details";

  // Ensure the URL always has a valid tab parameter
  useEffect(() => {
    if (!activeTab || !VALID_COMPANY_TABS.includes(activeTab as typeof VALID_COMPANY_TABS[number])) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("tab", "details");
      setSearchParams(newParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    setSearchParams(params, { replace: false });
  };

  const handleBackClick = () => {
    navigate("/client/companies");
  };

  useEffect(() => {
    if (user?.id) {
      setClientId(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (clientId && companyId) {
      fetchCompanyData();
      fetchPersonsForChart();
      fetchCompanyHierarchy();
    }
  }, [clientId, companyId]);

  const fetchCompanyData = async () => {
    if (!companyId || !clientId) return;

    try {
      setIsLoading(true);
      const result = await fetchCompanyById(clientId, companyId);
      if (result.success) {
        setCompany(result.data);
      } else {
        throw new Error(result.message || "Failed to load company details");
      }
    } catch (error: any) {
      console.error("Error fetching company details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load company details",
        variant: "destructive",
      });
      navigate("/client/companies");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPersonsForChart = async () => {
    if (!companyId || !clientId) return;
    try {
      const { data: sessionData } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getSession());
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch persons for chart");

      const result = await response.json();
      setPersonsForChart(Array.isArray(result.data) ? result.data : []);
    } catch (error: any) {
      console.error("Error fetching persons for chart:", error);
    }
  };

  const fetchCompanyHierarchy = async () => {
    if (!companyId || !clientId) return;

    try {
      const result = await getCompanyHierarchy(clientId, companyId);
      if (result?.success && result?.data) {
        setHierarchyRoot(result.data);
      } else if (result) {
        setHierarchyRoot(result);
      } else {
        setHierarchyRoot(null);
      }
    } catch (error: any) {
      console.error("Error fetching hierarchy data:", error);
      setHierarchyRoot(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader size="lg" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-screen bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBackClick}
                className="rounded-xl bg-white border border-gray-200 text-brand-body hover:bg-gray-100 hover:text-brand-body shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-brand-body">
                    {company.name}
                  </h1>
                  {company.registrationNumber && (
                    <p className="text-gray-700">{company.registrationNumber}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          <Tabs value={currentTabFromQuery} onValueChange={handleTabChange} className="mt-6">
            <TabsList className="rounded-xl m-6 mb-0">
              <TabsTrigger value="details" className="rounded-lg">
                Company Details
              </TabsTrigger>
              <TabsTrigger value="persons" className="rounded-lg">
                Involvements
              </TabsTrigger>
              <TabsTrigger value="pie-chart" className="rounded-lg">
                Distribution
              </TabsTrigger>
              <TabsTrigger value="company-hierarchy" className="rounded-lg">
                Company Hierarchy
              </TabsTrigger>
              <TabsTrigger value="kyc" className="rounded-lg">
                KYC
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="p-6 space-y-6 mt-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{company.name}</h1>
                <p className="text-gray-600">
                  {company.registrationNumber}
                </p>
              </div>

              {(
                (company.totalShares && company.totalShares.some(s => Number(s.totalShares) > 0)) || 
                (Number(company.authorizedShares) > 0) || 
                (Number(company.issuedShares) > 0) || 
                (Number(company.perShareValue?.value) > 0)
              ) && (
                <div className="flex items-start gap-3 p-4 bg-[#FFB300]/10 border border-[#FFB300] rounded-xl">
                  <PieChart className="h-5 w-5 mt-0.5" />
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide font-semibold text-gray-600">
                          Authorized Shares
                        </p>
                        <p className="text-lg font-semibold">
                          {company.authorizedShares && company.authorizedShares > 0 
                            ? company.authorizedShares.toLocaleString() 
                            : "-"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide font-semibold text-gray-600">
                          Per Share Value
                        </p>
                        <p className="text-lg font-semibold">
                          {company.perShareValue?.value && company.perShareValue.value > 0 
                            ? `€ ${company.perShareValue.value}` 
                            : "-"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide font-semibold text-gray-600">
                          Issued Shares
                        </p>
                        <p className="text-lg font-semibold">
                          {company.issuedShares && company.issuedShares > 0 
                            ? company.issuedShares.toLocaleString() 
                            : "-"}
                        </p>
                      </div>
                    </div>

                    {company.totalShares && company.totalShares.some((share) => share.totalShares > 0) && (
                      <div className="pt-3 border-t border-gray-100 mt-4">
                        <p className="text-xs font-medium mb-2 text-gray-600">
                          Share Breakdown
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {company.totalShares
                            .filter((share) => share.totalShares > 0)
                            .map((share, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="px-3 py-1.5 rounded-lg border-gray-300 text-gray-700 bg-gray-50"
                              >
                                <span className="font-medium text-xs">
                                  {share.class.toLowerCase() !== "ordinary" ? "Class " : ""}{share.class}:{" "}
                                  {share.totalShares.toLocaleString()} Shares
                                </span>
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {highestShareholders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-medium">
                        Representative{highestShareholders.length > 1 ? "s" : ""} (Highest Shareholder{highestShareholders.length > 1 ? "s" : ""})
                      </p>
                      <div className="space-y-1 mt-2">
                        {highestShareholders.map((rep) => (
                          <p key={rep.key} className="text-blue-700 capitalize">
                            {rep.name}
                            <span className="text-xs text-blue-600 ml-1">
                              ({rep.type === "company" ? "Company" : "Person"})
                            </span>{" "}
                            ({rep.percentage.toFixed(2)}%)
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {company.address && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Address</p>
                    <p className="text-gray-900">{company.address}</p>
                  </div>
                </div>
              )}

              {company.industry && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Globe className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Industry</p>
                    <p className="text-gray-900">{company.industry}</p>
                  </div>
                </div>
              )}

              {company.companyStartedAt && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Incorporation Date</p>
                    <p className="text-gray-900">{new Date(company.companyStartedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {company.description && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                   <div>
                    <p className="text-sm text-gray-500 font-medium">Description</p>
                    <p className="text-gray-900 mt-1">{company.description}</p>
                  </div>
                </div>
              )}

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
                          return fileName.replace(/^\d+-/, '') || `Document ${index + 1}`;
                        } catch {
                          return `Document ${index + 1}`;
                        }
                      };

                      return (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <FileText className="h-5 w-5 text-gray-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {getFileName(doc)}
                            </p>
                          </div>
                          <a href={doc} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                            <ExternalLink className="h-4 w-4 text-gray-600" />
                          </a>
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
                  readOnly={true}
                  onUpdate={() => {
                    fetchCompanyData();
                    fetchCompanyHierarchy();
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="pie-chart" className="p-6 mt-6">
              <SharePieChart
                persons={(company?.shareHolders || []).filter((sh: any) => sh.personId).map((shareHolder: any) => ({
                  _id: typeof shareHolder.personId === 'object' ? shareHolder.personId._id : (shareHolder.personId || 'unknown'),
                  name: typeof shareHolder.personId === 'object' ? shareHolder.personId.name : 'Unknown',
                  sharePercentage: shareHolder.sharePercentage || 0,
                  sharesData: shareHolder.sharesData || [],
                  roles: []
                }))}
                companies={(company?.shareHoldingCompanies || []).map((shareCompany: any) => ({
                  companyId: shareCompany.companyId,
                  sharePercentage: shareCompany.sharePercentage || 0,
                  companyName: shareCompany.companyName || (typeof shareCompany.companyId === 'object' ? shareCompany.companyId.name : 'Unknown Company'),
                  sharesData: shareCompany.sharesData || []
                }))}
                companyTotalSharesArray={company.totalShares}
                authorizedShares={company.authorizedShares}
                issuedShares={company.issuedShares}
              />
            </TabsContent>

            <TabsContent value="company-hierarchy" className="p-6 mt-6">
              {hierarchyData ? (
                <CompanyHierarchy rootData={hierarchyData} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No hierarchy data available
                </div>
              )}
            </TabsContent>

            <TabsContent value="kyc" className="p-6 mt-6">
              <EngagementKYC companyId={company._id} clientId={clientId} company={company} isClientView={true} deleteRequest={false} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
