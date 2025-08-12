"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, Calculator, FolderOpen, Loader2 } from "lucide-react"
import { TrialBalanceUpload } from "./TrialBalanceUpload"
import { ExtendedTrialBalance } from "./ExtendedTrialBalance"
import { ClassificationSection } from "./ClassificationSection"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "../../integrations/supabase/client" // adjust path if needed

interface TrialBalanceTabProps {
  engagement: any
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

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({ engagement }) => {
  const [activeTab, setActiveTab] = useState("upload")
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null)
  const [classifications, setClassifications] = useState<string[]>([])
  const [selectedClassification, setSelectedClassification] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadExistingData()
  }, [engagement._id])

  const loadExistingData = async () => {
    setLoading(true)
    try {
      // Trial Balance
      const tbResponse = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/trial-balance`,
      )
      if (tbResponse.ok) {
        const tbData = await tbResponse.json()
        setTrialBalanceData(tbData)

        // Extended Trial Balance
        const etbResponse = await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`)
        if (etbResponse.ok) {
          const etbData = await etbResponse.json()
          const uniqueClassifications = [
            ...new Set(etbData.rows?.map((row: any) => row.classification).filter(Boolean) || []),
          ]
          setClassifications(uniqueClassifications)

          if (tbData) {
            setActiveTab("etb")
          }
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
    toast({
      title: "Success",
      description: "Trial Balance uploaded successfully. You can now proceed to the Extended Trial Balance.",
    })
  }

  const handleClassificationChange = (newClassifications: string[]) => {
    setClassifications(newClassifications)
  }

  const getClassificationDisplayName = (classification: string) => {
    const parts = classification.split(" > ")
    return parts[parts.length - 1]
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Upload TB
            </TabsTrigger>
            <TabsTrigger value="etb" disabled={!trialBalanceData} className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Extended TB
            </TabsTrigger>
            <TabsTrigger value="sections" disabled={classifications.length === 0} className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Sections ({classifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="h-full">
            <TrialBalanceUpload engagement={engagement} onUploadSuccess={handleUploadSuccess} />
          </TabsContent>

          <TabsContent value="etb" className="h-full">
            {trialBalanceData && (
              <ExtendedTrialBalance
                engagement={engagement}
                trialBalanceData={trialBalanceData}
                onClassificationChange={handleClassificationChange}
              />
            )}
          </TabsContent>

          <TabsContent value="sections" className="h-full">
            <div className="flex h-full">
              <div className="w-80 border-r bg-gray-50">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Classification Sections</h3>
                  <p className="text-sm text-gray-600 mt-1">Select a classification to view its data</p>
                </div>
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">
                    {Object.entries(groupedClassifications).map(([key, classificationList]) => (
                      <div key={key}>
                        <Button
                          variant={selectedClassification === key ? "default" : "ghost"}
                          className="w-full justify-start text-left h-auto p-3"
                          onClick={() => setSelectedClassification(key)}
                        >
                          <div className="flex flex-col items-start">
                            <div className="font-medium">
                              {shouldCreateSeparateTab(key) ? getClassificationDisplayName(key) : key}
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
                  </div>
                </ScrollArea>
              </div>

              <div className="flex-1">
                {selectedClassification ? (
                  <ClassificationSection
                    engagement={engagement}
                    classification={selectedClassification}
                    onClose={() => setSelectedClassification("")}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Classification</h3>
                      <p className="text-gray-500">
                        Choose a classification from the sidebar to view its data and embedded spreadsheet
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
