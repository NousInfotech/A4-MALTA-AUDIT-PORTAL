import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  ArrowLeftRight,
  Scale,
  FileText,
  Table as TableIcon,
  LayoutGrid,
  TrendingUp,
  Wallet,
  PieChart,
  Search,
  FolderOpen,
  FileCheck,
  Receipt
} from "lucide-react";
import { ClassificationSection } from "@/components/engagement/ClassificationSection";
import { IncomeStatementSection } from "@/components/engagement/IncomeStatementSection";
import { BalanceSheetSection } from "@/components/engagement/BalanceSheetSection";
import { MBRTab } from "@/components/mbr/MBRTab";
import { TaxTab } from "@/components/tax/TaxTab";
import { supabase } from "@/integrations/supabase/client";

interface ClientAuditSectionTabProps {
  engagement: any;
  trialBalanceData?: any;
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

export const ClientAuditSectionTab: React.FC<ClientAuditSectionTabProps> = ({ engagement, trialBalanceData }) => {
  const [activeSubTab, setActiveSubTab] = useState("etb");
  const [etbRows, setEtbRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);

  const fetchEtbData = useCallback(async () => {
    if (!engagement?._id) return;
    setLoading(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const res = await authFetch(`${base}/api/engagements/${engagement._id || engagement.id}/etb`);
      if (res.ok) {
        const data = await res.json();
        setEtbRows(Array.isArray(data?.rows) ? data.rows : []);
      }
    } catch (error) {
      console.error("Failed to fetch ETB data:", error);
    } finally {
      setLoading(false);
    }
  }, [engagement?._id]);

  useEffect(() => {
    fetchEtbData();
  }, [fetchEtbData]);

  const groupClassifications = () => {
    const grouped: { [key: string]: string[] } = {};
    const classifications = Array.from(new Set(etbRows.map(r => r.classification).filter(Boolean)));
    
    classifications.forEach((classification) => {
      const parts = classification.split(" > ");
      if (parts.length < 3) return;
      const groupKey = parts.slice(0, 3).join(" > ");
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(classification);
    });
    return grouped;
  };

  const formatClassificationForDisplay = (c: string) => {
    const parts = c.split(" > ");
    if (parts.length <= 3) return parts[parts.length - 1];
    return parts.slice(3).join(" > ");
  };

  const groupedClassifications = groupClassifications();

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="bg-gray-100/50 border border-gray-200 p-1 rounded-xl mb-6">
          <TabsTrigger value="etb" className="rounded-lg">
            <TableIcon className="h-4 w-4 mr-2" />
            ETB
          </TabsTrigger>
          <TabsTrigger value="MBR" className="rounded-lg">
          <FileCheck className="h-4 w-4 mr-2" />
            MBR
          </TabsTrigger>
          <TabsTrigger value="tax" className="rounded-lg">
            <Receipt className="h-4 w-4 mr-2" />
            Tax
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="rounded-lg">
            <Calculator className="h-4 w-4 mr-2" />
            Adjustments
          </TabsTrigger>
          <TabsTrigger value="reclassifications" className="rounded-lg">
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Reclassifications
          </TabsTrigger>
          <TabsTrigger value="income-statement" className="rounded-lg">
            <FileText className="h-4 w-4 mr-2" />
            Income Statement
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="rounded-lg">
            <Scale className="h-4 w-4 mr-2" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="classifications" className="rounded-lg">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Classifications
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          <TabsContent value="etb">
            <ClassificationSection 
              engagement={engagement} 
              classification="ETB"
              isReadOnly={true} 
            />
          </TabsContent>

          <TabsContent value="MBR">
            <MBRTab engagement={engagement} isReadOnly={true} />
          </TabsContent>

          <TabsContent value="tax">
            <TaxTab engagement={engagement} isReadOnly={true} />
          </TabsContent>

          <TabsContent value="classifications" className="flex-1 overflow-hidden h-[calc(100vh-250px)]">
            <div className="flex h-full flex-col md:flex-row border rounded-2xl bg-white overflow-hidden shadow-sm">
              {/* Sidebar */}
              <div className="w-full md:w-80 border-r bg-gray-50/50 flex-shrink-0 flex flex-col">
                <div className="p-4 border-b bg-white/50 backdrop-blur-sm">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    Sections
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                  Quick views and classifications
                  </p>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-6">
                    {(() => {
                      const isLeafNode = (key: string) => {
                        const allKeys = Object.keys(groupedClassifications);
                        return !allKeys.some(otherKey => otherKey !== key && otherKey.startsWith(key + " > "));
                      };

                      const assetsGroup: { [subtitle: string]: Array<[string, string[]]> } = {};
                      const equityGroup: { [subtitle: string]: Array<[string, string[]]> } = {};
                      const liabilitiesGroup: { [subtitle: string]: Array<[string, string[]]> } = {};

                      Object.entries(groupedClassifications).forEach(([key, classificationList]) => {
                        const parts = key.split(" > ");
                        if (parts.length < 3) return;
                        const level1 = parts[0];
                        const level2 = parts[1];
                        if (level1 === "Assets") {
                          if (!assetsGroup[level2]) assetsGroup[level2] = [];
                          assetsGroup[level2].push([key, classificationList]);
                        } else if (level1 === "Equity") {
                          if (!equityGroup[level2]) equityGroup[level2] = [];
                          equityGroup[level2].push([key, classificationList]);
                        } else if (level1 === "Liabilities") {
                          if (!liabilitiesGroup[level2]) liabilitiesGroup[level2] = [];
                          liabilitiesGroup[level2].push([key, classificationList]);
                        }
                      });

                      const order = ["Non-current", "Current"];
                      const sortSub = (subs: string[]) => subs.sort((a,b) => {
                        const ai = order.indexOf(a), bi = order.indexOf(b);
                        if (ai===-1 && bi===-1) return a.localeCompare(b);
                        if (ai===-1) return 1; if (bi===-1) return -1;
                        return ai - bi;
                      });

                      const renderG = (title: string, group: any) => {
                        const subs = sortSub(Object.keys(group));
                        if (subs.length === 0) return null;
                        return (
                          <div key={title} className="space-y-4 mb-6">
                            <div className="text-[11px] font-bold text-gray-800 uppercase tracking-wider px-3 flex items-center gap-2">
                               <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                               {title}
                            </div>
                            {subs.map(sub => (
                              <div key={sub} className="space-y-1">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">{sub}</div>
                                {group[sub].filter(([k]: any) => isLeafNode(k)).map(([k]: any) => (
                                  <div key={k} className="px-2 mb-2">
                                    <Button
                                      variant={selectedClassification === k ? "default" : "outline"}
                                      className={`w-full justify-between text-left h-auto p-3 transition-all duration-300 rounded-xl border border-amber-200 shadow-sm hover:shadow-md ${
                                        selectedClassification === k 
                                          ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]" 
                                          : "bg-white hover:bg-amber-50 text-gray-700 hover:text-primary"
                                      }`}
                                      onClick={() => setSelectedClassification(k)}
                                    >
                                      <div className="flex flex-col items-start flex-1 min-w-0">
                                        <div className="font-semibold text-xs whitespace-normal break-words">
                                          {formatClassificationForDisplay(k)}
                                        </div>
                                      </div>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      };

                      return (
                        <div className="space-y-2">
                          {renderG("Assets", assetsGroup)}
                          {(Object.keys(equityGroup).length > 0 || Object.keys(liabilitiesGroup).length > 0) && (
                            <div className="space-y-4 pt-4 border-t border-gray-100 mt-4 rounded-xl mx-1 px-1 bg-gray-100/30">
                              <div className="text-[11px] font-bold text-gray-800 uppercase tracking-wider px-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Liabilities & Equity
                              </div>
                              {renderG("Equity", equityGroup)}
                              {renderG("Liabilities", liabilitiesGroup)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </ScrollArea>
              </div>

              {/* Content Panel */}
              <div className="flex-1 bg-gray-50/30 overflow-auto">
                {selectedClassification ? (
                  <div className="p-6">
                    <ClassificationSection 
                      engagement={engagement} 
                      classification={selectedClassification}
                      isReadOnly={true} 
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                    <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                      <Search className="h-12 w-12 text-gray-200" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-600">Select a section</h3>
                    <p className="text-sm max-w-xs mt-2">
                      Choose a classification from the sidebar to view its lead sheet and audit data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="adjustments">
            <ClassificationSection 
              engagement={engagement} 
              classification="Adjustments"
              isReadOnly={true} 
            />
          </TabsContent>

          <TabsContent value="reclassifications">
            <ClassificationSection 
              engagement={engagement} 
              classification="Reclassifications"
              isReadOnly={true} 
            />
          </TabsContent>

          <TabsContent value="income-statement">
            <IncomeStatementSection 
              etbRows={etbRows} 
              engagement={engagement} 
              isReadOnly={true}
            />
          </TabsContent>

          <TabsContent value="balance-sheet">
            <BalanceSheetSection 
              etbRows={etbRows} 
              engagement={engagement} 
              isReadOnly={true}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
