// @ts-nocheck
import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Calculator,
  FolderOpen,
  Loader2,
  Wrench,
} from "lucide-react";
import { TrialBalanceUpload } from "./TrialBalanceUpload";
import { ExtendedTrialBalance } from "./ExtendedTrialBalance";
import { ClassificationSection } from "./ClassificationSection";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";

interface TrialBalanceTabProps {
  engagement: any;
  setEngagement: any;
}

// 🔧 safer auth fetch (don’t throw if no session yet)
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

const formatClassificationForDisplay = (c: string) => {
  if (!c) return "—";
  const parts = c.split(" > ");
  const top = parts[0];
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1];
  return top;
};

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({
  engagement,
  setEngagement,
}) => {
  const [activeTab, setActiveTab] = useState("upload");
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [selectedClassification, setSelectedClassification] =
    useState<string>("");
  const [loading, setLoading] = useState(false);

  // counts for special sections
  const [etbCount, setEtbCount] = useState(0);
  const [adjustmentsCount, setAdjustmentsCount] = useState(0);

  const { toast } = useToast();

  // 🔧 define AFTER hooks so closures capture the setters
  const loadExistingData = useCallback(async () => {
    if (!engagement?._id) return;
    setLoading(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      if (!base) {
        console.warn("VITE_APIURL is not set");
        setLoading(false);
        return;
      }

      // Trial Balance
      const tbResponse = await authFetch(
        `${base}/api/engagements/${engagement._id}/trial-balance`
      );
      if (tbResponse.ok) {
        const tbData = await tbResponse.json();
        setTrialBalanceData(tbData);
      } else {
        // Not fatal; continue to ETB
        console.warn("TB response not OK:", tbResponse.status);
      }

      // Extended Trial Balance + counts
      const etbResponse = await authFetch(
        `${base}/api/engagements/${engagement._id}/etb`
      );
      if (etbResponse.ok) {
        const etbData = await etbResponse.json();
        const rows = Array.isArray(etbData?.rows) ? etbData.rows : [];

        setEtbCount(rows.length);
        const adjCount = rows.filter(
          (r: any) => Number(r?.adjustments) !== 0
        ).length;
        setAdjustmentsCount(adjCount);

        const uniqueClassifications = [
          ...new Set(rows.map((r: any) => r.classification).filter(Boolean)),
        ];
        setClassifications(uniqueClassifications);

        if (trialBalanceData || tbResponse.ok) setActiveTab("etb");
      } else {
        console.warn("ETB response not OK:", etbResponse.status);
      }
    } catch (error) {
      console.error("Failed to load existing data:", error);
    } finally {
      setLoading(false);
    }
  }, [engagement?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔧 call the memoized loader when _id becomes available/changes
  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  const handleUploadSuccess = (data: any) => {
    setTrialBalanceData(data);
    setActiveTab("etb");
    setEngagement((prev: any) => ({ ...prev, status: "active" }));
    toast({
      title: "Success",
      description:
        "Trial Balance uploaded successfully. You can now proceed to the Extended Trial Balance.",
    });
  };

  const getClassificationDisplayName = (classification: string) => {
    const parts = classification.split(" > ");
    return parts[parts.length - 1];
  };

  const handleClassificationChange = (newClassifications: string[]) => {
    setClassifications(newClassifications);
  };

  const getClassificationCategory = (classification: string) =>
    classification.split(" > ")[0];

  const shouldCreateSeparateTab = (classification: string) => {
    const category = getClassificationCategory(classification);
    return category === "Assets" || category === "Liabilities";
  };

  const groupClassifications = () => {
    const grouped: { [key: string]: string[] } = {};
    classifications.forEach((classification) => {
      if (shouldCreateSeparateTab(classification)) {
        grouped[classification] = [classification];
      } else {
        const category = getClassificationCategory(classification);
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(classification);
      }
    });
    return grouped;
  };

  const groupedClassifications = groupClassifications();

  const jumpToClassification = (classification: string) => {
    const key = shouldCreateSeparateTab(classification)
      ? classification
      : getClassificationCategory(classification);

    setSelectedClassification(key);

    setActiveTab("sections");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Trial Balance data...</span>
      </div>
    );
  }
  console.log("selectedClassification",selectedClassification)
  return (
    <div className="h-full flex flex-col bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
      <div className="flex-1">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          {/* Fixed tabs container outside of any table constraints */}
          <div className="flex-shrink-0 border-b bg-gray-50/80 backdrop-blur-sm">
            <div className="px-4 py-2">
              <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-white/30 p-1 rounded-xl">
                <TabsTrigger
                  value="upload"
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
                >
                  <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Upload TB</span>
                  <span className="sm:hidden">Upload</span>
                </TabsTrigger>
                <TabsTrigger
                  value="etb"
                  disabled={!trialBalanceData}
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg disabled:opacity-50 rounded-lg"
                >
                  <Calculator className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Extended TB</span>
                  <span className="sm:hidden">ETB</span>
                </TabsTrigger>
                <TabsTrigger
                  value="sections"
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
                >
                  <FolderOpen className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Sections</span>
                  <span className="sm:hidden">Sections</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="etb" className="flex-1 overflow-hidden">
            {trialBalanceData && (
              <ExtendedTrialBalance
                engagement={engagement}
                trialBalanceData={trialBalanceData}
                onClassificationChange={handleClassificationChange}
                onClassificationJump={jumpToClassification}
                loadExistingData={loadExistingData}
              />
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-hidden">
            <TrialBalanceUpload
              engagement={engagement}
              onUploadSuccess={handleUploadSuccess}
            />
          </TabsContent>

          <TabsContent
            value="sections"
            className="flex-1 overflow-hidden"
          >
            <div className="flex h-full flex-col md:flex-row">
              {/* Sidebar */}
              <div className="w-full md:w-80 border-r bg-gray-50/80 backdrop-blur-sm flex-shrink-0">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Sections</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Quick views and classifications
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {etbCount > 0 && (
                      <Button
                        variant={
                          selectedClassification === "ETB"
                            ? "default"
                            : "outline"
                        }
                        className="w-full justify-between h-auto p-3 bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                        onClick={() => setSelectedClassification("ETB")}
                      >
                        <span className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            Extended Trial Balance
                          </span>
                          <span className="sm:hidden">ETB</span>
                        </span>
                        <Badge variant="secondary">{etbCount}</Badge>
                      </Button>
                    )}

                    {adjustmentsCount > 0 && (
                      <Button
                        variant={
                          selectedClassification === "Adjustments"
                            ? "default"
                            : "outline"
                        }
                        className="w-full justify-between h-auto p-3 bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                        onClick={() => setSelectedClassification("Adjustments")}
                      >
                        <span className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Adjustments
                        </span>
                        <Badge variant="secondary">{adjustmentsCount}</Badge>
                      </Button>
                    )}

                    {(etbCount > 0 || adjustmentsCount > 0) && (
                      <div className="text-xs uppercase text-gray-500 px-3 pt-3">
                        Classifications
                      </div>
                    )}

                    <div className="mt-1" />
                    {Object.entries(groupedClassifications).map(
                      ([key, classificationList]) => (
                        <div key={key}>
                          {key !== "Adjustments" && (
                            <Button
                              variant={
                                selectedClassification === key
                                  ? "default"
                                  : "outline"
                              }
                              className="w-full justify-start text-left h-auto p-3 bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                              onClick={() => setSelectedClassification(key)}
                            >
                              <div className="flex flex-col items-start">
                                <div className="font-medium">
                                  {formatClassificationForDisplay(key)}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {classificationList.map((classification) => (
                                    <Badge
                                      key={classification}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {getClassificationDisplayName(
                                        classification
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </Button>
                          )}
                        </div>
                      )
                    )}

                    {etbCount === 0 &&
                      adjustmentsCount === 0 &&
                      Object.keys(groupedClassifications).length === 0 && (
                        <div className="text-center text-sm text-gray-500 py-6">
                          No sections available yet.
                        </div>
                      )}
                  </div>
                </ScrollArea>
              </div>

              {/* Content Panel */}
              <div className="flex-1 min-w-0">
                {selectedClassification ? (
                  <ClassificationSection
                    engagement={engagement}
                    classification={selectedClassification}
                    onClose={() => setSelectedClassification("")}
                    onClassificationJump={jumpToClassification}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center">
                      <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Select a Section
                      </h3>
                      <p className="text-gray-500">
                        Pick <strong>Extended Trial Balance</strong>,{" "}
                        <strong>Adjustments</strong>, or any classification from
                        the sidebar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
