// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Sparkles, PlusCircle, Save, Edit3, X, CheckCircle, Trash2, ChevronUp, ChevronDown } from "lucide-react"

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data?.session?.access_token
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
}

/* ---------------- helpers ---------------- */

const mkUid = () => Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36)

function normalize(items?: any[]) {
  if (!Array.isArray(items)) return []
  return items.map((q, i) => {
    const __uid = q.__uid || q.id || q._id || `q_${mkUid()}_${i}`
    return { ...q, __uid, id: q.id ?? __uid, isRequired: !!q.isRequired }
  })
}

function formatClassificationForDisplay(classification?: string) {
  if (!classification) return "General"
  const parts = classification.split(" > ")
  const top = parts[0]
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  return top
}

/* ---------------- classification mapping ---------------- */

// Map hierarchical classifications to procedure keys
const mapClassificationToProcedureKey = (classification: string): string => {
  const mapping: Record<string, string> = {
    // Assets > Current
    "Assets > Current > Cash & Cash Equivalents": "Bank and Cash",
    "Assets > Current > Trade Receivables": "Receivables",
    "Assets > Current > Other Receivables": "Receivables",
    "Assets > Current > Prepayments": "Receivables",
    "Assets > Current > Inventory": "Inventory",
    "Assets > Current > Recoverable VAT/Tax": "Taxation",

    // Assets > Non-current
    "Assets > Non-current > Property, Plant & Equipment": "PPE",
    "Assets > Non-current > Intangible Assets": "Intangible Assets",
    "Assets > Non-current > Investments": "Investments",
    "Assets > Non-current > Deferred Tax Asset": "Taxation",
    "Assets > Non-current > Long-term Receivables/Deposits": "Receivables",

    // Liabilities > Current
    "Liabilities > Current > Trade Payables": "Payables",
    "Liabilities > Current > Accruals": "Payables",
    "Liabilities > Current > Taxes Payable": "Taxation",
    "Liabilities > Current > Short-term Borrowings/Overdraft": "Borrowings and Loans",
    "Liabilities > Current > Other Payables": "Payables",

    // Liabilities > Non-current
    "Liabilities > Non-current > Borrowings (Long-term)": "Borrowings and Loans",
    "Liabilities > Non-current > Provisions": "Payables",
    "Liabilities > Non-current > Deferred Tax Liability": "Taxation",
    "Liabilities > Non-current > Lease Liabilities": "Borrowings and Loans",

    // Equity (root level)
    "Equity > Share Capital": "Equity",
    "Equity > Share Premium": "Equity",
    "Equity > Reserves": "Equity",
    "Equity > Retained Earnings": "Equity",

    // Income (root level)
    "Income > Operating > Revenue (Goods)": "Profit and Loss",
    "Income > Operating > Revenue (Services)": "Profit and Loss",
    "Income > Operating > Other Operating Income": "Profit and Loss",
    "Income > Non-operating > Other Income": "Profit and Loss",
    "Income > Non-operating > FX Gains": "Profit and Loss",

    // Expenses (root level)
    "Expenses > Cost of Sales > Materials/Purchases": "Profit and Loss",
    "Expenses > Cost of Sales > Freight Inwards": "Profit and Loss",
    "Expenses > Cost of Sales > Manufacturing Labour": "Profit and Loss",
    "Expenses > Cost of Sales > Production Overheads": "Profit and Loss",
    "Expenses > Direct Costs": "Profit and Loss",
    "Expenses > Administrative Expenses > Payroll": "Profit and Loss",
    "Expenses > Administrative Expenses > Rent & Utilities": "Profit and Loss",
    "Expenses > Administrative Expenses > Office/Admin": "Profit and Loss",
    "Expenses > Administrative Expenses > Marketing": "Profit and Loss",
    "Expenses > Administrative Expenses > Repairs & Maintenance": "Profit and Loss",
    "Expenses > Administrative Expenses > IT & Software": "Profit and Loss",
    "Expenses > Administrative Expenses > Insurance": "Profit and Loss",
    "Expenses > Administrative Expenses > Professional Fees": "Profit and Loss",
    "Expenses > Administrative Expenses > Depreciation & Amortisation": "Profit and Loss",
    "Expenses > Administrative Expenses > Research & Development": "Profit and Loss",
    "Expenses > Administrative Expenses > Lease Expenses": "Profit and Loss",
    "Expenses > Administrative Expenses > Bank Charges": "Profit and Loss",
    "Expenses > Administrative Expenses > Travel & Entertainment": "Profit and Loss",
    "Expenses > Administrative Expenses > Training & Staff Welfare": "Profit and Loss",
    "Expenses > Administrative Expenses > Telephone & Communication": "Profit and Loss",
    "Expenses > Administrative Expenses > Subscriptions & Memberships": "Profit and Loss",
    "Expenses > Administrative Expenses > Bad Debt Written Off": "Profit and Loss",
    "Expenses > Administrative Expenses > Stationery & Printing": "Profit and Loss",
    "Expenses > Finance Costs": "Profit and Loss",
    "Expenses > Other > FX Losses": "Profit and Loss",
    "Expenses > Other > Exceptional/Impairment": "Profit and Loss",
  }

  return mapping[classification] || "default"
}

/* ---------------- component ---------------- */

export const HybridProceduresStep: React.FC<{
  engagement: any
  mode: "hybrid"
  stepData: any
  onComplete: (patch: any) => void
  onBack: () => void
}> = ({ engagement, stepData, onComplete, onBack }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [generatingClassifications, setGeneratingClassifications] = useState<Set<string>>(new Set())
  const [questions, setQuestions] = useState<any[]>([])
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [editedQ, setEditedQ] = useState("")
  const [editedA, setEditedA] = useState("")
  const [recommendationsStr, setRecommendationsStr] = useState<string>(
    typeof stepData.recommendations === "string" ? stepData.recommendations : ""
  )

  const grouped = useMemo(() => {
    const by: Record<string, any[]> = {}
    for (const q of questions) {
      const key = q.classification || "General"
      if (!by[key]) by[key] = []
      by[key].push(q)
    }
    return by
  }, [questions])

  // Section navigation
  const sectionIds = useMemo(() => Object.keys(grouped).map((key, index) => `section-${index}`), [grouped]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const currentSection = document.elementFromPoint(window.innerWidth / 2, 100)?.closest('[id^="section-"]');
      if (currentSection) {
        const currentIndex = sectionIds.indexOf(currentSection.id);
        if (event.key === 'ArrowUp' && currentIndex > 0) {
          scrollToSection(sectionIds[currentIndex - 1]);
        } else if (event.key === 'ArrowDown' && currentIndex < sectionIds.length - 1) {
          scrollToSection(sectionIds[currentIndex + 1]);
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sectionIds]);

  // 1) Load MANUAL procedures from local templates (no API)
  useEffect(() => {
    const loadManual = async () => {
      setLoading(true)
      try {
        const module = await import("@/static/procedures")
        const staticProcedures = module.default || {}

        const selected: string[] = Array.isArray(stepData?.selectedClassifications)
          ? stepData.selectedClassifications
          : []

        const all: any[] = []

        selected.forEach((hierarchicalClassification) => {
          // Map the hierarchical classification to a procedure key
          const procedureKey = mapClassificationToProcedureKey(hierarchicalClassification)
          const arr = staticProcedures[procedureKey] || staticProcedures.default || []

          arr.forEach((p: any) =>
            all.push({
              id: p.id || `man_${mkUid()}`,
              classification: hierarchicalClassification, // Keep original hierarchical classification for grouping
              question: p.question || p.title || "",
              answer: p.answer || "",
              isRequired: !!p.isRequired,
              origin: "manual",
            })
          )
        })

        setQuestions(normalize(all))

        // Debug logging
        console.log('Selected classifications:', selected)
        console.log('Loaded questions count:', all.length)
        console.log('Questions:', all)

        if (all.length === 0) {
          toast({
            title: "No Templates Found",
            description: "Add entries in src/static/procedures.ts for your selected classifications.",
          })
        } else {
          toast({
            title: "Manual Procedures Loaded",
            description: `Loaded ${all.length} procedures for ${selected.length} classifications.`,
          })
        }
      } catch (e: any) {
        console.error('Load manual procedures error:', e)
        toast({ title: "Load failed", description: e.message, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    loadManual()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagement?._id, JSON.stringify(stepData?.selectedClassifications || []), stepData?.materiality])

  /* ---------------- AI append ---------------- */

  const generateMoreWithAI = async (classification: string) => {
    setLoading(true)
    setGeneratingClassifications(prev => {
      const newSet = new Set(prev)
      newSet.add(classification)
      return newSet
    })

    try {
      const base = import.meta.env.VITE_APIURL
      const res = await authFetch(`${base}/api/procedures/hybrid/questions`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement?._id,
          materiality: stepData.materiality,
          classification: classification,
          manualQuestions: questions.map(({ __uid, id, ...rest }) => rest),
        }),
      })

      const contentType = res.headers.get("content-type") || ""
      const raw = await res.text()
      if (!res.ok) {
        throw new Error(
          contentType.includes("application/json")
            ? JSON.parse(raw)?.message || "Failed to generate AI additions"
            : raw?.slice(0, 200) || `HTTP ${res.status}`
        )
      }
      const data = contentType.includes("application/json") ? JSON.parse(raw) : {}

      const extra = Array.isArray(data?.aiQuestions)
        ? data.aiQuestions
        : Array.isArray(data?.aiQuestions)
          ? data.aiQuestions
          : []

      const normalized = normalize(extra.map((q: any, i: number) => ({
        id: q.id || `ai_${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
        classification: classification,
        question: q.question || q.title || "",
        answer: q.answer || "",
        framework: q.framework || "",
        reference: q.reference || "",
        isRequired: !!q.isRequired,
        origin: "ai",
      })))

      setQuestions((prev) => [...prev, ...normalized])
      toast({ title: "AI Added", description: `Appended ${normalized.length} AI questions for ${formatClassificationForDisplay(classification)}.` })
    } catch (e: any) {
      toast({ title: "AI append failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
      setGeneratingClassifications(prev => {
        const newSet = new Set(prev)
        newSet.delete(classification)
        return newSet
      })
    }
  }

  /* ---------------- per-row handlers ---------------- */

  const startEdit = (uid: string) => {
    const q = questions.find((x) => x.__uid === uid)
    if (!q) return
    setEditingUid(uid)
    setEditedQ(q.question || "")
    setEditedA(q.answer || "")
  }

  const saveEdit = (uid: string) => {
    setQuestions((prev) => prev.map((q) => (q.__uid === uid ? { ...q, question: editedQ, answer: editedA } : q)))
    setEditingUid(null)
    setEditedQ("")
    setEditedA("")
  }

  const cancelEdit = () => {
    setEditingUid(null)
    setEditedQ("")
    setEditedA("")
  }

  const setAnswer = (uid: string, val: string) => {
    setQuestions((prev) => prev.map((q) => (q.__uid === uid ? { ...q, answer: val } : q)))
  }

  const toggleRequired = (uid: string) => {
    setQuestions((prev) => prev.map((q) => (q.__uid === uid ? { ...q, isRequired: !q.isRequired } : q)))
  }

  const removeItem = (uid: string) => {
    setQuestions((prev) => prev.filter((q) => q.__uid !== uid))
  }

  const addCustom = (classification: string) => {
    const __uid = `custom_${mkUid()}`
    const item = {
      __uid,
      id: __uid,
      classification,
      question: "New custom procedure item",
      answer: "",
      isRequired: false,
      origin: "manual",
    }
    setQuestions((prev) => [...prev, item])
    setEditingUid(__uid)
    setEditedQ(item.question)
    setEditedA("")
  }

  /* ---------------- save / continue ---------------- */

  const saveDraft = async () => {
    try {
      const base = import.meta.env.VITE_APIURL
      await authFetch(`${base}/api/procedures/${engagement?._id}`, {
        method: "POST",
        body: JSON.stringify({
          ...stepData,
          questions: questions.map(({ __uid, ...rest }) => rest),
          recommendations: recommendationsStr,
          procedureType: "procedures",
          status: "in-progress",
          mode: "hybrid",
        }),
      })
      toast({ title: "Draft Saved", description: "Your hybrid draft was saved." })
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    }
  }

  const handleProceed = () => {
    onComplete({
      questions: questions.map(({ __uid, ...rest }) => rest),
      recommendations: recommendationsStr,
      selectedClassifications: stepData?.selectedClassifications || [],
    })
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Hybrid — Start with Manual, then Add AI</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={saveDraft} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>

          {Object.keys(grouped).length > 0 && (
            <div className="w-auto">
              <Select onValueChange={(value) => scrollToSection(value)}>
                <SelectTrigger className="w-auto bg-white text-black border border-black hover:bg-gray-100 focus:bg-gray-100">
                  <SelectValue placeholder={formatClassificationForDisplay(Object.keys(grouped)[0])} />
                </SelectTrigger>
                <SelectContent className="bg-white text-black border border-gray-200">
                  {Object.keys(grouped).map((bucket, index) => (
                    <SelectItem
                      key={bucket}
                      value={`section-${index}`}
                      className="bg-white data-[state=checked]:bg-brand-sidebar data-[state=checked]:text-white [&>svg]:text-white cursor-pointer"
                    >
                      {formatClassificationForDisplay(bucket)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

          {Object.keys(grouped).length === 0 ? (
            <Alert>
              <AlertDescription>
                No manual questions loaded yet. If this persists, ensure <code>src/static/procedures.ts</code> has
                templates for your selected classifications.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="h-[60vh] overflow-y-scroll space-y-5">
              {Object.entries(grouped).map(([bucket, items], index) => (
                <Card key={bucket} id={`section-${index}`} className="border-2 border-primary/10 relative">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{formatClassificationForDisplay(bucket)}</Badge>
                        <Badge variant="secondary">
                          {items.length} item{items.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => generateMoreWithAI(bucket)}
                        disabled={loading || generatingClassifications.has(bucket)}
                      >
                        {generatingClassifications.has(bucket) ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Add AI Questions
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => addCustom(bucket)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Custom
                      </Button>
                      {/* Section Navigation Buttons */}
                      {/* {index > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => scrollToSection(sectionIds[index - 1])}
                          className="flex items-center gap-2"
                        >
                          <ChevronUp className="h-4 w-4" />
                          Previous Section
                        </Button>
                      )}
                      {index < sectionIds.length - 1 && (
                        <Button
                          variant="outline"
                          onClick={() => scrollToSection(sectionIds[index + 1])}
                          className="flex items-center gap-2 ml-auto"
                        >
                          Next Section
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      )} */}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {items.map((q) => {
                      const isEditing = editingUid === q.__uid
                      const badge = formatClassificationForDisplay(q.classification)
                      return (
                        <div key={q.__uid} className="space-y-3 p-4 rounded-md border bg-card shadow-sm">
                          {q.framework &&
                            <Badge className="mr-2" variant="default">{q.framework}</Badge>
                          }
                          {q.reference &&
                            <Badge variant="outline">{q.reference}</Badge>
                          }
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{badge}</Badge>
                              <Badge variant={q.origin === "ai" ? "default" : "secondary"}>
                                {q.origin === "ai" ? "AI" : "Manual"}
                              </Badge>
                              {q.isRequired ? (
                                <Badge variant="default">Required</Badge>
                              ) : (
                                <Badge variant="secondary">Optional</Badge>
                              )}
                            </div>
                            <div className="flex gap-2">

                              {/* Section Navigation Buttons */}
                              {/* {index > 0 && (
                                <Button
                                  variant="outline"
                                  onClick={() => scrollToSection(sectionIds[index - 1])}
                                  className="flex items-center gap-2"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                  Previous Section
                                </Button>
                              )}
                              {index < sectionIds.length - 1 && (
                                <Button
                                  variant="outline"
                                  onClick={() => scrollToSection(sectionIds[index + 1])}
                                  className="flex items-center gap-2 ml-auto"
                                >
                                  Next Section
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              )} */}
                              <Button size="sm" variant="outline" onClick={() => toggleRequired(q.__uid)}>
                                {q.isRequired ? "Mark Optional" : "Mark Required"}
                              </Button>
                              {isEditing ? (
                                <>
                                  <Button size="sm" onClick={() => saveEdit(q.__uid)}>
                                    <CheckCircle className="h-4 w-4 mr-1" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                    <X className="h-4 w-4 mr-1" /> Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => startEdit(q.__uid)}>
                                    <Edit3 className="h-4 w-4 mr-1" /> Edit
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => removeItem(q.__uid)}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Question</div>
                            {isEditing ? (
                              <Textarea
                                value={editedQ}
                                onChange={(e) => setEditedQ(e.target.value)}
                                placeholder="Edit the question"
                              />
                            ) : (
                              <div className="text-sm">{q.question || <span className="text-muted-foreground italic">Untitled</span>}</div>
                            )}

                            <div className="text-sm font-medium mt-2">Answer</div>
                            {isEditing ? (
                              <Textarea
                                value={editedA}
                                onChange={(e) => setEditedA(e.target.value)}
                                placeholder="Add/Refine the answer"
                              />
                            ) : (
                              <Textarea
                                value={String(q.answer ?? "")}
                                onChange={(e) => setAnswer(q.__uid, e.target.value)}
                                placeholder="Add/Refine the answer"
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {/* <Button variant="ghost" onClick={onBack}>Back</Button> */}
            <Button onClick={handleProceed} disabled={Object.keys(grouped).length === 0}>Continue</Button>
          </div>
        </CardContent>  
      </Card>
    </div>
  )
}