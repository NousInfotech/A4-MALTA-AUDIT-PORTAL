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
  Edit,
  ExternalLink,
  Globe,
  PieChart,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchCompanyById, getCompanyHierarchy } from "@/lib/api/company";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonList } from "@/components/client/PersonList";
import { EditCompanyModal } from "@/components/client/EditCompanyModal";
import SharePieChart from "@/components/client/SharePieChart";
import CompanyHierarchy from "@/components/client/CompanyHierarchy";

const VALID_COMPANY_TABS = ["details", "persons", "pie-chart", "company-hierarchy"] as const;

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

export const CompanyDetail: React.FC = () => {
  const { clientId, companyId } = useParams<{ clientId: string; companyId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [personsForChart, setPersonsForChart] = useState<Person[]>([]);
  const [hierarchyRoot, setHierarchyRoot] = useState<any>(null);

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
    // Use browser history to go back, same as global back button
    navigate(-1);
  };

  useEffect(() => {
    if (companyId && clientId) {
      fetchCompanyData();
      fetchPersonsForChart();
      fetchCompanyHierarchy();
    }
  }, [companyId, clientId]);

  useEffect(() => {
    const handler = (e: any) => {
      const next = Array.isArray(e?.detail) ? e.detail : [];
      setPersonsForChart(next);
    };
    window.addEventListener('persons-updated', handler as EventListener);
    return () => window.removeEventListener('persons-updated', handler as EventListener);
  }, []);

  const fetchCompanyData = async () => {
    if (!companyId || !clientId) return;

    try {
      setIsLoading(true);
      const result = await fetchCompanyById(clientId, companyId);
      setCompany(result.data || null);
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

  const fetchPersonsForChart = async () => {
    if (!companyId || !clientId) return;
    try {
      // Note: This endpoint might need to be added to the API file
      // For now, keeping the fetch but it should be moved to API file later
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
      // Non-blocking for the page; show a subtle toast only if needed
    }
  };

  const fetchCompanyHierarchy = async () => {
    if (!companyId || !clientId) return;

    try {
      const result = await getCompanyHierarchy(clientId, companyId);
      console.log("hierarchy data",result);
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
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-4 mb-6">
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

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Company
            </Button>
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
            </TabsList>

            <TabsContent value="details" className="p-6 space-y-6 mt-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{company.name}</h1>
                <p className="text-gray-600">
                  {company.registrationNumber}
                </p>

              </div>


               {/* Representative(s) - Highest Shareholder(s) derived from shareHolders & shareHoldingCompanies */}
              {company.totalShares && company.totalShares.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-[#FFB300]/10 border border-[#FFB300] rounded-xl">
                  <PieChart
                    className="h-5 w-5 mt-0.5" />
                  <div>

                  {/* TOP GRID */}
                  <div className="grid grid-cols-3 gap-6">

                  {/* Authorized Shares */}
                  <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide font-semibold">
                  Authorized Shares
                  </p>
                  <p className="text-lg font-semibold">
                  {company.authorizedShares.toLocaleString()}
                  </p>
                  </div>

                  {/* Per Share Value */}
                  <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide font-semibold">
                  Per Share Value
                  </p>
                  <p className="text-lg font-semibold">
                  € {company.perShareValue.value}
                  </p>
                  </div>

                  {/* Issued Shares */}
                  <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide font-semibold">
                  Issued Shares
                  </p>
                  <p className="text-lg font-semibold">
                  {company.issuedShares.toLocaleString()}
                  </p>
                  </div>
                  </div>

                  {/* SHARE BREAKDOWN LIST */}
                  <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium mb-2">
                  Share Breakdown
                  </p>

                  <div className="flex flex-wrap gap-2">
                  {company.totalShares
                  .filter((share) => share.totalShares > 0)
                  .map((share, idx) => {
                  const className =
                  share.class.charAt(0).toUpperCase() + share.class.slice(1).toLowerCase();

                  return (
                  <Badge
                  key={idx}
                  variant="outline"
                  className="px-3 py-1.5 rounded-lg border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100 transition"
                  >
                  <span className="font-medium text-xs">
                  {share.class.toLowerCase() !== "ordinary" ? "Class" : ""} {share.class}:{" "}
                  {share.totalShares.toLocaleString()} Shares
                  </span>
                  </Badge>
                  );
                  })}
                  </div>
                  </div>
                  </div>

                </div>
              )}

              {highestShareholders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-medium">
                        Representative{highestShareholders.length > 1 ? "s" : ""} (Highest
                        Shareholder{highestShareholders.length > 1 ? "s" : ""})
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
                    <p className="text-sm text-gray-500 font-medium">Company Started At</p>
                    <p className="text-gray-900">{new Date(company.companyStartedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {company.description && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                   <div>
                    <p className="text-sm text-gray-500 font-medium">Description</p> <br />
                    <p className="text-gray-900">{company.description}</p>
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
                        let shareCompanyId: string | null = null;
                        const totalShares = share.sharesData?.reduce((sum: number, item: any) => sum + (item.totalShares || 0), 0) || 0;
                        const companyTotalSharesSum = calculateTotalSharesSum(company.totalShares);
                        const totalSharePercentage = companyTotalSharesSum > 0 ? (totalShares / companyTotalSharesSum) * 100 : 0;
                        
                        // Get sharesData with only non-zero values
                        const nonZeroSharesData = (share.sharesData || []).filter((item: any) => (item.totalShares || 0) > 0);
                        
                        // Check if there are share classes (not just Ordinary)
                        const hasShareClasses = nonZeroSharesData.some((item: any) => 
                          item.class && item.class !== "Ordinary"
                        );
                        
                        // Helper to get total shares for a specific class from company
                        const getCompanyTotalForClass = (classValue: string): number => {
                          const classShare = company.totalShares?.find(
                            (ts: any) => ts.class === classValue
                          );
                          return classShare?.totalShares || 0;
                        };
                        
                        if (share.companyId) {
                          if (typeof share.companyId === 'object' && share.companyId.name) {
                            companyName = share.companyId.name;
                            shareCompanyId = share.companyId._id;
                          } else if (typeof share.companyId === 'string') {
                            companyName = "Unknown Company";
                            shareCompanyId = share.companyId;
                          }
                        }

                        const handleViewCompany = () => {
                          if (shareCompanyId && clientId) {
                            navigate(`/employee/clients/${"non-primary"}/company/${shareCompanyId}`);
                          }
                        };

                        return (
                          <div
                            key={index}
                            className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {companyName}
                              </p>

                              {hasShareClasses ? (
                                // Display share classes separately (Class A, B, C, etc.)
                                <div className="mt-1 space-y-1">
                                  {nonZeroSharesData
                                    .sort((a: any, b: any) => {
                                      // Sort: A, B, C first, then Ordinary
                                      if (a.class === "Ordinary") return 1;
                                      if (b.class === "Ordinary") return -1;
                                      return a.class.localeCompare(b.class);
                                    })
                                    .map((item: any, idx: number) => {
                                      const classTotal = getCompanyTotalForClass(item.class);
                                      const className = item.class.charAt(0).toUpperCase() + item.class.slice(1).toLowerCase();
                                      const displayClassName = item.class === "Ordinary" ? "Ordinary" : `Class ${className}`;
                                      return (
                                        <p key={idx} className="text-xs text-gray-600">
                                          {displayClassName}: {item.totalShares.toLocaleString()} / {classTotal.toLocaleString()} shares
                                        </p>
                                      );
                                    })}
                                  {/* Show total at the end */}
                                  <p className="text-xs text-gray-600 font-medium mt-1">
                                    Total: {totalShares.toLocaleString()} / {companyTotalSharesSum.toLocaleString()} shares
                                  </p>
                                </div>
                              ) : (
                                // Display ordinary shares only (current logic)
                                <>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {`${totalShares.toLocaleString()} / ${companyTotalSharesSum.toLocaleString()}`} shares
                                  </p>
                                </>
                              )}

                              <p className="text-xs text-gray-600">
                                {totalSharePercentage.toFixed(2)}% owned
                              </p>
                            </div>
                            {shareCompanyId && (
                              <Button
                                variant="outline"
                                onClick={handleViewCompany}
                                className="ml-4 p-2 rounded-lg transition-colors"
                                title="View Company Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
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
                  onUpdate={() => {
                    fetchCompanyData();
                    fetchCompanyHierarchy();
                  }}
                />
              )}
            </TabsContent>
            <TabsContent value="pie-chart" className="p-6 mt-6">
              <SharePieChart
                persons={(company?.shareHolders || []).map((shareHolder: any) => {
                  const personData = shareHolder.personId || {};
                  return {
                    _id: typeof personData === 'object' ? personData._id : personData,
                    name: typeof personData === 'object' ? personData.name : 'Unknown',
                    sharePercentage: shareHolder.sharePercentage ?? 0,
                    sharesData: shareHolder.sharesData || [],
                  };
                })}
                companies={(company?.shareHoldingCompanies || []).map((share) => ({
                  companyId: share.companyId,
                  sharePercentage: share.sharePercentage ?? 0,
                  sharesData: share.sharesData || [],
                }))}
                companyTotalShares={calculateTotalSharesSum(company?.totalShares)}
                companyTotalSharesArray={company?.totalShares || []}
                authorizedShares={company?.authorizedShares}
                issuedShares={company?.issuedShares}
                title="Distribution"
              />
            </TabsContent>
            <TabsContent value="company-hierarchy" className="p-6 mt-6">
              <CompanyHierarchy rootData={hierarchyData} />
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
            fetchCompanyHierarchy();
          }}
          existingCompanies={[]}
        />
      )}
    </div>
  );
};

