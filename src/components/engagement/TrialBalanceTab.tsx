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
  ArrowLeftRight,
} from "lucide-react";
import { TrialBalanceUpload } from "./TrialBalanceUpload";
import { ExtendedTrialBalance } from "./ExtendedTrialBalance";
import { ClassificationSection } from "./ClassificationSection";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import WorkBookApp from "../audit-workbooks/TrialBalanceWorkbookApp";

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

const formatClassificationForDisplay = (classification: string) => {
  if (!classification) return "—";
  const parts = classification.split(" > ");
  return parts.length >= 3 ? parts[2] : parts[parts.length - 1];
};

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({
  engagement,
  setEngagement,
}) => {
  console.log(
    "formatClassificationForDisplay",
    formatClassificationForDisplay("Equity > Equity > Share Capital")
  );

  const [activeTab, setActiveTab] = useState("upload");
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [selectedClassification, setSelectedClassification] =
    useState<string>("");
  const [loading, setLoading] = useState(false);

  // counts for special sections
  const [etbCount, setEtbCount] = useState(0);
  const [adjustmentsCount, setAdjustmentsCount] = useState(0);
  const [reclassificationsCount, setReclassificationsCount] = useState(0);

  // notification counts for classifications
  const [
    classificationNotificationCounts,
    setClassificationNotificationCounts,
  ] = useState<{ [key: string]: number }>({});

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
        const rclsCount = rows.filter(
          (r: any) => Number(r?.reclassification) !== 0
        ).length;
        setAdjustmentsCount(adjCount);
        setReclassificationsCount(rclsCount);

        const uniqueClassifications = [
          ...new Set(rows.map((r: any) => r.classification).filter(Boolean)),
        ];
        setClassifications(uniqueClassifications);

        // Load notification counts immediately after classifications are set
        if (uniqueClassifications.length > 0) {
          // Use a small timeout to ensure state is updated
          setTimeout(() => {
            loadNotificationCountsForClassifications(uniqueClassifications);
          }, 100);
        }

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

  // 🔧 fetch notification counts for classifications (with direct classifications parameter)
  const loadNotificationCountsForClassifications = useCallback(
    async (classificationsList: string[]) => {
      if (!engagement?._id || classificationsList.length === 0) {
        console.log(
          "loadNotificationCountsForClassifications: Skipping - no engagement ID or classifications"
        );
        return;
      }

      console.log(
        "loadNotificationCountsForClassifications: Loading for classifications:",
        classificationsList
      );

      try {
        const base = import.meta.env.VITE_APIURL;
        if (!base) {
          console.log("loadNotificationCountsForClassifications: No API URL");
          return;
        }

        // Fetch all reviews at once instead of per classification
        const response = await authFetch(
          `${base}/api/classification-reviews?engagementId=${engagement._id}`
        );

        if (response.ok) {
          const data = await response.json();
          const reviews = data.reviews || [];

          console.log(
            "loadNotificationCountsForClassifications: Found",
            reviews.length,
            "total reviews"
          );

          const counts: { [key: string]: number } = {};

          // Process all classifications at once
          for (const classification of classificationsList) {
            // Filter reviews for this classification that are not signed off
            const classificationReviews = reviews.filter((review: any) => {
              const reviewClassification =
                typeof review.classificationId === "string"
                  ? review.classificationId
                  : review.classificationId?.classification || "";
              return (
                reviewClassification === classification &&
                review.status !== "signed-off"
              );
            });

            // Count unique review points (reviews with comments)
            const reviewPointsCount = classificationReviews.filter(
              (review: any) => review.comment && review.comment.trim() !== ""
            ).length;

            counts[classification] = reviewPointsCount;
            console.log(
              `loadNotificationCountsForClassifications: ${classification} = ${reviewPointsCount} notifications`
            );
          }

          console.log(
            "loadNotificationCountsForClassifications: Final counts:",
            counts
          );
          setClassificationNotificationCounts(counts);
        } else {
          console.log(
            "loadNotificationCountsForClassifications: API response not OK:",
            response.status
          );
        }
      } catch (error) {
        console.error("Failed to load notification counts:", error);
      }
    },
    [engagement?._id]
  );

  // 🔧 fetch notification counts for classifications (using state)
  const loadNotificationCounts = useCallback(async () => {
    if (!engagement?._id || classifications.length === 0) {
      console.log(
        "loadNotificationCounts: Skipping - no engagement ID or classifications"
      );
      return;
    }

    console.log(
      "loadNotificationCounts: Loading counts for",
      classifications.length,
      "classifications"
    );
    await loadNotificationCountsForClassifications(classifications);
  }, [
    engagement?._id,
    classifications,
    loadNotificationCountsForClassifications,
  ]);

  // 🔧 call the memoized loader when _id becomes available/changes
  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // 🔧 load notification counts when classifications change
  useEffect(() => {
    loadNotificationCounts();
  }, [loadNotificationCounts]);

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
    return (
      category === "Assets" ||
      category === "Liabilities" ||
      category === "Equity"
    );
  };

  // const groupClassifications = () => {
  //   const grouped: { [key: string]: string[] } = {};
  //   classifications.forEach((classification) => {
  //     if (shouldCreateSeparateTab(classification)) {
  //       grouped[classification] = [classification];
  //     } else {
  //       const category = getClassificationCategory(classification);
  //       if (!grouped[category]) grouped[category] = [];
  //       grouped[category].push(classification);
  //     }
  //   });
  //   return grouped;
  // };

  const groupClassifications = () => {
  const grouped: { [key: string]: string[] } = {};
  console.log(classifications);
  classifications.forEach((classification) => {
    const parts = classification.split(" > ");
    if (parts.length < 3) return; // ignore level 1–2

    // Group by first 3 levels (the parent)
    const groupKey = parts.slice(0, 3).join(" > ");
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(classification);
  });

  return grouped;
};


  const groupedClassifications = groupClassifications();
  console.log(groupedClassifications);

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
  console.log("selectedClassification", selectedClassification);
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
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg rounded-lg"
                >
                  <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Upload TB</span>
                  <span className="sm:hidden">Upload</span>
                </TabsTrigger>
                <TabsTrigger
                  value="etb"
                  disabled={!trialBalanceData}
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg disabled:opacity-50 rounded-lg"
                >
                  <Calculator className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Extended TB</span>
                  <span className="sm:hidden">ETB</span>
                </TabsTrigger>

                {/* <TabsTrigger
                  value="tb-excel"
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg rounded-lg"
                >
                  <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">TB Excel</span>
                  <span className="sm:hidden">Excel</span>
                </TabsTrigger> */}

                <TabsTrigger
                  value="sections"
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg rounded-lg"
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

          <TabsContent value="tb-excel" className="flex-1 overflow-hidden">
            <WorkBookApp
              engagement={engagement}
              engagementId={engagement.id}
              classification="ETB"
            />
          </TabsContent>

          <TabsContent value="sections" className="flex-1 overflow-hidden">
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
                        className="w-full justify-between h-auto p-3  bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
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

                    <Button
                      variant={
                        selectedClassification === "Adjustments"
                          ? "default"
                          : "outline"
                      }
                      className="w-full justify-between h-auto p-3  bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => setSelectedClassification("Adjustments")}
                    >
                      <span className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Adjustments
                      </span>
                      <Badge variant="secondary">{adjustmentsCount === 0 ? "" : adjustmentsCount}</Badge>
                    </Button>

                    <Button
                      variant={
                        selectedClassification === "Reclassifications"
                          ? "default"
                          : "outline"
                      }
                      className="w-full justify-between h-auto p-3  bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => setSelectedClassification("Reclassifications")}
                    >
                      <span className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Reclassifications
                      </span>
                      <Badge variant="secondary">{reclassificationsCount === 0 ? "" : reclassificationsCount}</Badge>
                    </Button>

                    {(etbCount > 0 || adjustmentsCount > 0 || reclassificationsCount > 0) && (
                      <div className="text-xs uppercase text-gray-500 px-3 pt-3">
                        Classifications
                      </div>
                    )}

                    <div className="mt-1" />
                    {(() => {
                      // Group classifications by main title and subtitle (2 levels only)
                      const groupedByTitle: {
                        [mainTitle: string]: {
                          [subtitle: string]: Array<[string, string[]]>;
                        };
                      } = {};

                      Object.entries(groupedClassifications).forEach(
                        ([key, classificationList]) => {
                          if (key === "Adjustments" || key === "Reclassifications") return;

                          const parts = key.split(" > ");
                          if (parts.length < 3) return;
                          const mainTitle = parts[0] || "";
                          // Always use parts[1] as subtitle, no special case
                          const subtitle = parts[1] || "";

                          if (!groupedByTitle[mainTitle])
                            groupedByTitle[mainTitle] = {};
                          if (!groupedByTitle[mainTitle][subtitle])
                            groupedByTitle[mainTitle][subtitle] = [];

                          groupedByTitle[mainTitle][subtitle].push([
                            key,
                            classificationList,
                          ]);
                        }
                      );

                      // Define title order
                      const titleOrder = ["Assets", "Liabilities", "Equity"];
                      const sortedMainTitles = Object.keys(groupedByTitle).sort(
                        (a, b) => {
                          const aIndex = titleOrder.indexOf(a);
                          const bIndex = titleOrder.indexOf(b);
                          if (aIndex === -1 && bIndex === -1)
                            return a.localeCompare(b);
                          if (aIndex === -1) return 1;
                          if (bIndex === -1) return -1;
                          return aIndex - bIndex;
                        }
                      );

                      return sortedMainTitles.map((mainTitle) => {
                        const subtitles = Object.keys(
                          groupedByTitle[mainTitle]
                        ).sort();

                        return (
                          <div key={mainTitle}>
                            {/* Main Title Header */}
                            <div className="text-xs uppercase text-gray-700 px-3 pt-4 pb-2 font-bold">
                              {mainTitle}
                            </div>

                            {/* Subtitles within this main title */}
                            {subtitles.map((subtitle) => {
                              const items = groupedByTitle[mainTitle][subtitle];
                              console.log(`Items for ${mainTitle} ${subtitle}:`, items);
                              return (
                                <div key={`${mainTitle}-${subtitle}`}>
                                  {/* Subtitle Header */}
                                  <div className="text-xs uppercase text-gray-500 px-3 pt-2 pb-1 font-semibold">
                                    {subtitle}
                                  </div>

                                  {/* Items for this subtitle */}
                                  {items
                                    .filter(([key]) => {
                                      // Get all classification keys to check for children
                                      const allKeys = Object.keys(groupedClassifications);
                                      // Check if this classification has any children
                                      const hasChildren = allKeys.some(
                                        (otherKey) =>
                                          otherKey !== key &&
                                          otherKey.startsWith(key + " > ")
                                      );
                                      // Only show if it has no children (it's a leaf node)
                                      return !hasChildren;
                                    })
                                    .map(([key, classificationList]) => {
                                      const notificationCount =
                                        classificationNotificationCounts[key] ||
                                        0;

                                      return (
                                        <div key={key} className="px-2 mb-2">
                                          <Button
                                            variant={
                                              selectedClassification === key
                                                ? "default"
                                                : "outline"
                                            }
                                            className="w-full justify-between text-left h-auto p-3 bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl flex flex-row flex-wrap items-start gap-2 overflow-hidden whitespace-normal break-words"
                                            onClick={() =>
                                              setSelectedClassification(key)
                                            }
                                          >
                                            <div className="flex flex-col items-start flex-1 min-w-0">
                                              <div className="font-medium whitespace-normal break-words">
                                                {formatClassificationForDisplay(
                                                  key
                                                )}
                                              </div>
                                            </div>
                                            {notificationCount > 0 && (
                                              <Badge
                                                variant="destructive"
                                                className="ml-2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 flex-shrink-0"
                                              >
                                                {notificationCount}
                                              </Badge>
                                            )}
                                          </Button>
                                        </div>
                                      );
                                    })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}

                    {etbCount === 0 &&
                      adjustmentsCount === 0 &&
                      reclassificationsCount === 0 &&
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
                    onReviewStatusChange={loadNotificationCounts}
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
                        <strong>Adjustments</strong>, <strong>Reclassifications</strong>, or any classification from
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
