// @ts-nocheck

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, Calculator, FolderOpen, Loader2, Wrench } from "lucide-react"
import { TrialBalanceUpload } from "./TrialBalanceUpload"
import { ExtendedTrialBalance } from "./ExtendedTrialBalance"
import { ClassificationSection } from "./ClassificationSection"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "../../integrations/supabase/client"

interface TrialBalanceTabProps {
  engagement: any,
  setEngagement: any
}

// 🔹 Auth fetch helper
async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${data.session?.access_token}`,
      ...options.headers,
    },
  })
}

// ✅ Same display rule for sidebar chips
const formatClassificationForDisplay = (c: string) => {
  if (!c) return "—"
  const parts = c.split(" > ")
  const top = parts[0]
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  return top
}

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({ engagement,setEngagement }) => {
  const [activeTab, setActiveTab] = useState("upload") // ETB is first/active
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null)
  const [classifications, setClassifications] = useState<string[]>([])
  const [selectedClassification, setSelectedClassification] = useState<string>("")
  const [loading, setLoading] = useState(false)

  // counts for special sections
  const [etbCount, setEtbCount] = useState(0)
  const [adjustmentsCount, setAdjustmentsCount] = useState(0)

  const { toast } = useToast()

  useEffect(() => {
    loadExistingData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagement._id])

  const loadExistingData = async () => {
    setLoading(true)
    try {
      const tbResponse = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/trial-balance`,
      )
      if (tbResponse.ok) {
        const tbData = await tbResponse.json()
        setTrialBalanceData(tbData)

        // Extended Trial Balance (rows + counts)
        const etbResponse = await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`)
        if (etbResponse.ok) {
          const etbData = await etbResponse.json()
          const rows = Array.isArray(etbData.rows) ? etbData.rows : []
          setEtbCount(rows.length)
          const adjCount = rows.filter((r: any) => Number(r?.adjustments) !== 0).length
          setAdjustmentsCount(adjCount)

          const uniqueClassifications = [
            ...new Set(rows.map((row: any) => row.classification).filter(Boolean) || []),
          ]
          setClassifications(uniqueClassifications)

          if (tbData) setActiveTab("etb")
        }
      }
    } catch (error) {
      console.error("Failed to load existing data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (data: any) => {
    setTrialBalanceData(data)
    setActiveTab("etb")
    setEngagement((prev) => ({
        ...prev,
        status: "active",
      }));
    toast({
      title: "Success",
      description: "Trial Balance uploaded successfully. You can now proceed to the Extended Trial Balance.",
    })
  }
   const getClassificationDisplayName = (classification: string) => {
    const parts = classification.split(" > ")
    return parts[parts.length - 1]
  }

  const handleClassificationChange = (newClassifications: string[]) => {
    setClassifications(newClassifications)
    // counts may also change; refresh ETB / counts once after save if you want
  }

  const getClassificationCategory = (classification: string) => {
    const parts = classification.split(" > ")
    return parts[0]
  }

  const shouldCreateSeparateTab = (classification: string) => {
    const category = getClassificationCategory(classification)
    return category === "Assets" || category === "Liabilities"
  }

  const groupClassifications = () => {
    const grouped: { [key: string]: string[] } = {}
    classifications.forEach((classification) => {
      if (shouldCreateSeparateTab(classification)) {
        grouped[classification] = [classification]
      } else {
        const category = getClassificationCategory(classification)
        if (!grouped[category]) {
          grouped[category] = []
        }
        grouped[category].push(classification)
      }
    })
    return grouped
  }

  const groupedClassifications = groupClassifications()

  // From ETB table: jump straight to the section tab for the clicked classification
  const jumpToClassification = (classification: string) => {
    const key = shouldCreateSeparateTab(classification)
      ? classification
      : getClassificationCategory(classification)
    setSelectedClassification(key)
    setActiveTab("sections")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Trial Balance data...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          {/* ETB tab first */}
          <div className="overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-3 min-w-max md:min-w-0">
              <TabsTrigger value="upload" className="flex items-center gap-2 whitespace-nowrap">
                <FileSpreadsheet className="h-4 w-4" />
                Upload TB
              </TabsTrigger>
              <TabsTrigger value="etb" disabled={!trialBalanceData} className="flex items-center gap-2 whitespace-nowrap">
                <Calculator className="h-4 w-4" />
                Extended TB
              </TabsTrigger>
              <TabsTrigger value="sections" className="flex items-center gap-2 whitespace-nowrap">
                <FolderOpen className="h-4 w-4" />
                Sections
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="etb" className="h-full">
            {trialBalanceData && (
              <ExtendedTrialBalance
                engagement={engagement}
                trialBalanceData={trialBalanceData}
                onClassificationChange={handleClassificationChange}
                onClassificationJump={jumpToClassification}
              />
            )}
          </TabsContent>

          <TabsContent value="upload" className="h-full">
            <TrialBalanceUpload engagement={engagement} onUploadSuccess={handleUploadSuccess} />
          </TabsContent>

          <TabsContent value="sections" className="h-full">
            <div className="flex h-full flex-col md:flex-row">
              {/* Sidebar */}
              <div className="w-full md:w-80 border-r bg-gray-50">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Sections</h3>
                  <p className="text-sm text-gray-600 mt-1">Quick views and classifications</p>
                </div>
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">

                    {/* 🔝 Pinned Special Views */}
                    {etbCount > 0 && (
                      <Button
                        variant={selectedClassification === "ETB" ? "default" : "outline"}
                        className="w-full justify-between h-auto p-3"
                        onClick={() => setSelectedClassification("ETB")}
                      >
                        <span className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          Extended Trial Balance
                        </span>
                        <Badge variant="secondary">{etbCount}</Badge>
                      </Button>
                    )}

                    {/* {adjustmentsCount > 0 && (
                      <Button
                        variant={selectedClassification === "Adjustments" ? "default" : "outline"}
                        className="w-full justify-between h-auto p-3"
                        onClick={() => setSelectedClassification("Adjustments")}
                      >
                        <span className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Adjustments
                        </span>
                        <Badge variant="secondary">{adjustmentsCount}</Badge>
                      </Button>
                    )} */}

                    {(etbCount > 0 || adjustmentsCount > 0) && (
                      <div className="text-xs uppercase text-gray-500 px-3 pt-3">Classifications</div>
                    )}

                    {/* Grouped Classifications */}
                    <div className="mt-1" />
                    {Object.entries(groupedClassifications).map(([key, classificationList]) => (
                      <div key={key}>
                        <Button
                          variant={selectedClassification === key ? "default" : "outline"}
                          className="w-full justify-start text-left h-auto p-3"
                          onClick={() => setSelectedClassification(key)}
                        >
                          <div className="flex flex-col items-start">
                            <div className="font-medium">
                              {/* Key is either a whole path (Assets/Liabilities -> show top), or a top category already */}
                              {formatClassificationForDisplay(key)}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {classificationList.map((classification) => (
                                <Badge key={classification} variant="secondary" className="text-xs">
                                  {getClassificationDisplayName(classification)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </Button>
                      </div>
                    ))}

                    {/* Empty state */}
                    {etbCount === 0 && adjustmentsCount === 0 && Object.keys(groupedClassifications).length === 0 && (
                      <div className="text-center text-sm text-gray-500 py-6">
                        No sections available yet.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Content Panel */}
              <div className="flex-1">
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
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Section</h3>
                      <p className="text-gray-500">
                        Pick <strong>Extended Trial Balance</strong>, <strong>Adjustments</strong>, or any classification from the sidebar.
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
  )
}
