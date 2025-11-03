// @ts-nocheck
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, ArrowLeft, Save, HelpCircle, AlertTriangle, Bot, Sparkles, PlusCircle, Loader2, ChevronUp, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"
import { EnhancedLoader } from "@/components/ui/enhanced-loader"
import clsx from "clsx"

/** ---------- auth fetch ---------- **/
async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data?.session?.access_token

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData

  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  })
}

/** ---------- visibility helpers ---------- **/
type VisibleIfRule =
  | { [key: string]: any[] }
  | { [key: string]: { operator: string; value?: any }[] }
  | { [key: string]: { operator: "any"; value: string[] }[] }

function isNotEmpty(val: any) {
  if (val === null || val === undefined) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === "object") return Object.keys(val).length > 0
  return String(val).trim() !== ""
}

function evaluateCondition(fieldValue: any, cond: { operator?: string; value?: any }) {
  const op = cond.operator
  const v = cond.value
  if (!op) return Array.isArray(v) ? v.includes(fieldValue) : fieldValue === v

  switch (op) {
    case "not_empty":
      return isNotEmpty(fieldValue)
    case ">=":
      return Number(fieldValue ?? 0) >= Number(v)
    case "<=":
      return Number(fieldValue ?? 0) <= Number(v)
    case ">":
      return Number(fieldValue ?? 0) > Number(v)
    case "<":
      return Number(fieldValue ?? 0) < Number(v)
    case "any":
      if (Array.isArray(fieldValue)) return fieldValue.some((x) => (v as string[]).includes(x))
      if (typeof fieldValue === "object" && fieldValue !== null)
        return Object.keys(fieldValue).some((k) => fieldValue[k] && (v as string[]).includes(k))
      return false
    default:
      return Array.isArray(v) ? v.includes(fieldValue) : fieldValue === v
  }
}

function isFieldVisible(field: any, answersMap: Record<string, any>) {
  if (!field.visibleIf) return true
  const clauses = field.visibleIf as VisibleIfRule
  return Object.entries(clauses).every(([depKey, requirement]) => {
    const depVal = answersMap[depKey]
    if (Array.isArray(requirement)) {
      if (requirement.length > 0 && typeof requirement[0] === "object" && "operator" in requirement[0]) {
        return (requirement as any[]).every((cond) => evaluateCondition(depVal, cond))
      }
      return (requirement as any[]).includes(depVal)
    }
    return requirement === depVal
  })
}

/** ---------- table editor ---------- **/
function TableEditor({
  field,
  value,
  onChange,
  invalid,
  disabled,
}: {
  field: any
  value: { [key: string]: any }[] | undefined
  onChange: (rows: any[]) => void
  invalid?: boolean
  disabled?: boolean
}) {
  const rows = Array.isArray(value) ? value : []

  const addRow = () => {
    const emptyRow: any = {}
      ; (field.columns || []).forEach((c: string) => (emptyRow[c] = ""))
    onChange([...rows, emptyRow])
  }

  const updateCell = (rIdx: number, col: string, val: string) => {
    const next = rows.map((r, i) => (i === rIdx ? { ...r, [col]: val } : r))
    onChange(next)
  }

  const removeRow = (rIdx: number) => {
    const next = rows.filter((_, i) => i !== rIdx)
    onChange(next)
  }

  return (
    <div
      className={clsx(
        "border rounded-md overflow-hidden",
        invalid && "border-destructive/60 ring-1 ring-destructive/40",
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {(field.columns || []).map((c: string) => (
                <th key={c} className="text-left px-3 py-2 font-medium">
                  {c}
                </th>
              ))}
              <th className="w-14"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-t">
                {(field.columns || []).map((c: string) => (
                  <td key={c} className="px-3 py-2">
                    <Input
                      value={row[c] ?? ""}
                      onChange={(e) => updateCell(rIdx, c, e.target.value)}
                      placeholder={c}
                      disabled={disabled}
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <Button type="button" variant="ghost" onClick={() => removeRow(rIdx)} disabled={disabled}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={(field.columns || []).length + 1}>
                  No rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-2">
        <Button type="button" variant="outline" onClick={addRow} disabled={disabled}>
          Add Row
        </Button>
      </div>
    </div>
  )
}

/** ---------- group (nested checkboxes) ---------- **/
function GroupField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: any
  value: Record<string, boolean> | undefined
  onChange: (val: Record<string, boolean>) => void
  disabled?: boolean
}) {
  const groupVal = value ?? {}
  const toggle = (k: string, checked: boolean) => onChange({ ...groupVal, [k]: checked })
  return (
    <div className="space-y-2">
      {(field.fields || []).map((f: any) => (
        <div key={f.key} className="flex items-center gap-2">
          <Checkbox
            checked={!!groupVal[f.key]}
            onCheckedChange={(ck) => toggle(f.key, !!ck)}
            id={`${field.key}_${f.key}`}
            disabled={disabled}
          />
          <Label htmlFor={`${field.key}_${f.key}`}>{f.label}</Label>
        </div>
      ))
      }
    </div>
  )
}

// Define the 6 standard planning sections
const PLANNING_SECTIONS = [
  { sectionId: "engagement_setup_acceptance_independence", title: "Engagement Setup, Acceptance & Independence" },
  { sectionId: "understanding_entity_environment", title: "Understanding the Entity & Its Environment" },
  { sectionId: "materiality_risk_summary", title: "Materiality & Risk Summary" },
  { sectionId: "risk_response_planning", title: "Risk Register & Audit Response Planning" },
  { sectionId: "fraud_gc_planning", title: "Fraud Risk & Going Concern Planning" },
  { sectionId: "compliance_laws_regulations", title: "Compliance with Laws & Regulations (ISA 250)" }
];

/** ---------- main component ---------- **/
interface HybridPlanningProceduresStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}

export const HybridPlanningProceduresStep: React.FC<HybridPlanningProceduresStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [procedures, setProcedures] = useState<any[]>(Array.isArray(stepData.procedures) ? stepData.procedures : [])
  const [saving, setSaving] = useState(false)
  const [recommendations, setRecommendations] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [anyGenerationInProgress, setAnyGenerationInProgress] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [generatingAnswers, setGeneratingAnswers] = useState(false)
  const [questionsGenerated, setQuestionsGenerated] = useState(false)
  const [generatingQuestionsSections, setGeneratingQuestionsSections] = useState<Set<string>>(new Set())
  const [generatingAnswersSections, setGeneratingAnswersSections] = useState<Set<string>>(new Set())
  const [answersGenerated, setAnswersGenerated] = useState(false)
  const { toast } = useToast()
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [selectedSectionId, setSelectedSectionId] = useState<string>("")

  // for smooth scroll to first invalid field
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({})
  useEffect(() => {
    const inProgress =
      generatingQuestions ||
      generatingAnswers ||
      generatingQuestionsSections.size > 0 ||
      generatingAnswersSections.size > 0;
    setAnyGenerationInProgress(inProgress);
  }, [generatingQuestions, generatingAnswers, generatingQuestionsSections, generatingAnswersSections])

  const scrollToSection = (sectionId: string) => {
    const sectionElement = sectionRefs.current[sectionId]
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const getCurrentSectionIndex = (sectionId: string) => {
    return PLANNING_SECTIONS.findIndex(section => section.sectionId === sectionId)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      const activeElement = document.activeElement
      const currentCard = activeElement?.closest('[data-section-id]') as HTMLElement
      if (currentCard) {
        const currentSectionId = currentCard.dataset.sectionId
        if (currentSectionId) {
          const currentIndex = getCurrentSectionIndex(currentSectionId)
          if (currentIndex > 0) {
            scrollToSection(PLANNING_SECTIONS[currentIndex - 1].sectionId)
          }
        }
      }
    } else if (event.key === 'ArrowDown' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      const activeElement = document.activeElement
      const currentCard = activeElement?.closest('[data-section-id]') as HTMLElement
      if (currentCard) {
        const currentSectionId = currentCard.dataset.sectionId
        if (currentSectionId) {
          const currentIndex = getCurrentSectionIndex(currentSectionId)
          if (currentIndex < PLANNING_SECTIONS.length - 1) {
            scrollToSection(PLANNING_SECTIONS[currentIndex + 1].sectionId)
          }
        }
      }
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const ids = Array.isArray(stepData.selectedSections) ? stepData.selectedSections : []
    if (!ids.length) {
      setProcedures([])
      setIsLoading(false)
      setSelectedSectionId("")
      return
    }

    const next = ids.map((sectionId: string) => {
      const base = getPredefinedSection(sectionId)
      const prevSec = (procedures || []).find(s => s.sectionId === sectionId)

      const fields = (base.fields || []).map((f: any) => {
        const prev = prevSec?.fields?.find((pf: any) => pf.key === f.key)
        const defaultAnswer =
          f.type === "checkbox"
            ? false
            : f.type === "multiselect"
              ? []
              : f.type === "table"
                ? []
                : f.type === "group"
                  ? {}
                  : ""
        return { ...f, answer: prev?.answer ?? defaultAnswer }
      })

      return {
        id: `hybrid-${sectionId}`,
        sectionId,
        title: base.title,
        standards: base.standards,
        currency: base.currency,
        fields,
        footer: base.footer,
      }
    })

    setProcedures(next)
    setIsLoading(false)
    setSelectedSectionId(next[0]?.sectionId || "")
  }, [JSON.stringify(stepData.selectedSections)])
  const handleGenerateSectionQuestions = async (sectionId: string) => {
    setGeneratingQuestionsSections(prev => {
      const newSet = new Set(prev)
      newSet.add(sectionId)
      return newSet
    })

    try {
      const base = import.meta.env.VITE_APIURL
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/hybrid-section-questions`, {
        method: "POST",
        body: JSON.stringify({
          sectionId,
          materiality: stepData.materiality || 0
        }),
      })

      if (!res.ok) throw new Error("Failed to generate questions for section")
      const data = await res.json()

      // Add new fields to the section
      setProcedures(prev =>
        prev.map(section =>
          section.sectionId === sectionId
            ? {
              ...section,
              fields: [
                ...section.fields,
                ...(data.additionalFields || []).map((f: any) => ({
                  ...f,
                  answer: f.type === "checkbox" ? false :
                    f.type === "multiselect" ? [] :
                      f.type === "table" ? [] :
                        f.type === "group" ? {} : ""
                }))
              ]
            }
            : section
        )
      )

      toast({
        title: "Questions Added",
        description: `Additional questions for section generated successfully.`
      })
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" })
    } finally {
      setGeneratingQuestionsSections(prev => {
        const newSet = new Set(prev)
        newSet.delete(sectionId)
        return newSet
      })
    }
  }
  const handleGenerateSectionAnswers = async (sectionId: string) => {
    setGeneratingAnswersSections(prev => {
      const newSet = new Set(prev)
      newSet.add(sectionId)
      return newSet
    })

    try {
      const base = import.meta.env.VITE_APIURL;
      const section = procedures.find(proc => proc.sectionId === sectionId);

      if (!section) {
        throw new Error("Section not found");
      }

      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/hybrid-section-answers`, {
        method: "POST",
        body: JSON.stringify({
          sectionId,
          materiality: stepData.materiality || 0,
          sectionData: section // Send the current section data
        }),
      })

      if (!res.ok) throw new Error("Failed to generate answers for section");
      const data = await res.json();

      // Update only the specific section, not the entire procedures array
      setProcedures(prev =>
        prev.map(proc =>
          proc.sectionId === sectionId
            ? { ...proc, fields: data.fields }
            : proc
        )
      );

      toast({
        title: "Answers Generated",
        description: `Answers for section generated successfully.`
      });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingAnswersSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  }

  // Update the updateProcedureField function to handle user edits
  const updateProcedureField = (procedureId: string, fieldKey: string, value: any) => {
    setProcedures((prev) =>
      (prev || []).map((proc) =>
        proc.id === procedureId
          ? {
            ...proc,
            fields: (proc.fields || []).map((f: any) =>
              f.key === fieldKey ? { ...f, answer: value } : f
            )
          }
          : proc,
      ),
    );
    // clear error for this field if now valid
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${procedureId}.${fieldKey}`];
      return next;
    });
  }


  const getAnswersMap = (proc: any) =>
    (proc.fields || []).reduce((acc: any, f: any) => ((acc[f.key] = f.answer), acc), {})

  /** ---------- validation ---------- **/
  function validateAll(currentProcedures: any[]) {
    const nextErrors: Record<string, string> = {}

    currentProcedures.forEach((proc) => {
      const answersMap = getAnswersMap(proc)
        ; (proc.fields || []).forEach((field: any) => {
          const visible = isFieldVisible(field, answersMap)
          if (!visible) return
          if (!field.required) return

          const key = `${proc.id}.${field.key}`
          const val = field.answer

          switch (field.type) {
            case "text":
            case "textarea":
            case "user":
              if (!isNotEmpty(val)) nextErrors[key] = "This field is required."
              break
            case "number":
              if (val === "" || val === null || val === undefined || Number.isNaN(Number(val)))
                nextErrors[key] = "Please enter a valid number."
              break
            // case "checkbox":
            //   if (!val) nextErrors[key] = "Please confirm this item."
            //   break
            case "select":
              if (!isNotEmpty(val)) nextErrors[key] = "Please select an option."
              break
            case "multiselect":
              if (!Array.isArray(val) || val.length === 0) nextErrors[key] = "Select at least one option."
              break
            case "table":
              if (!Array.isArray(val) || val.length === 0) nextErrors[key] = "Add at least one row."
              break
            case "group":
              if (!val || typeof val !== "object" || Object.values(val).every((v) => !v))
                nextErrors[key] = "Select at least one option."
              break
            case "file":
              // Accept either a File (new upload) or a non-empty string (pre-saved reference)
              if (!(val instanceof File) && !isNotEmpty(val)) nextErrors[key] = "Please upload a file."
              break
            case "markdown":
              // no validation
              break
            default:
              if (!isNotEmpty(val)) nextErrors[key] = "This field is required."
          }
        })
    })

    setErrors(nextErrors)
    return nextErrors
  }

  function scrollToFirstError(errs: Record<string, string>) {
    const firstKey = Object.keys(errs)[0]
    if (!firstKey) return
    const el = fieldRefs.current[firstKey]
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      // subtle focus if there's an input
      const input = el.querySelector("input, textarea, select") as HTMLElement | null
      if (input) setTimeout(() => input.focus(), 250)
    }
  }

  /** ---------- save (partial allowed) ---------- **/
  const handleSave = async () => {
    setSaving(true)
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")

      const formData = new FormData()

      const payload = {
        ...stepData,
        procedures,
        status: "in-progress",
        procedureType: "planning",
        mode: "manual",
      }
      formData.append("data", JSON.stringify(payload))

      // Collect all files & a single fileMap array
      const fileMap: Array<{ sectionId: string; fieldKey: string; originalName: string }> = []
      procedures.forEach((proc) => {
        proc.fields.forEach((field) => {
          if (field.type === "file" && field.answer instanceof File) {
            formData.append("files", field.answer, field.answer.name)
            fileMap.push({ sectionId: proc.sectionId, fieldKey: field.key, originalName: field.answer.name })
          }
        })
      })
      if (fileMap.length) formData.append("fileMap", JSON.stringify(fileMap))

      const response = await authFetch(`${base}/api/planning-procedures/${engagement._id}/save`, {
        method: "POST",
        body: formData,
        headers: {}, // let browser set multipart boundary
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(text || "Failed to save procedures")
      }

      toast({ title: "Saved", description: "Your planning procedures have been saved." })
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message || "Failed to save.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  /** ---------- Helper function ---------- **/
  /**
   * Add spaces and new lines to a single string input.
   * Input: Single-line string with numbered sections.
   * Output: Formatted string with proper new lines and spacing.
   */
  /**
  * Add spaces, new lines, and Markdown-style formatting to a single string input.
  * Input: Single-line string with numbered sections.
  * Output: Formatted string with proper new lines, spacing, and headings.
  */
  function formatAuditString(input: string): string {
    // Split the input into sections based on the pattern 'X. Title: Content'
    const sections = input.split(/\d+\.\s/).filter(Boolean); // Remove empty results after split

    return sections
      .map((section, index) => {
        const num = index + 1;
        const sectionTitle = section.split(':')[0];  // Extract the title before the colon (e.g., "Key Risk Areas")

        // Markdown-style heading for the title
        const heading = `## **${sectionTitle.trim()}**`; // Add '##' for heading and '**' for bold text
        const content = section.split(':').slice(1).join(':').trim(); // Get the content after the title
        return `${num}. ${heading}\n\n${content}`;
      })
      .join(" \n\n");
  }


  /** ---------- proceed (strict) ---------- **/
  const handleProceed = () => {
    // Validate the procedures
    const errs = validateAll(procedures);
    if (Object.keys(errs).length > 0) {
      const count = Object.keys(errs).length;
      toast({
        title: "Missing required answers",
        description: `Please complete ${count} required ${count === 1 ? "field" : "fields"} before proceeding.`,
        variant: "destructive",
      });
      scrollToFirstError(errs);
      return;
    }

    // Proceed with formatted recommendations
    onComplete({ procedures, recommendations: "" });
  };


  const totalMissing = useMemo(() => Object.keys(errors).length, [errors])

  if (generatingQuestions || generatingAnswers) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader
          variant="pulse"
          size="lg"
          text={generatingQuestions ? "Generating additional questions..." : "Generating answers from AI..."}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="relative">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 md:justify-between">
            <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
              Planning Procedures (Hybrid)
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-transparent"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Progress"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            {!questionsGenerated && (
              <Badge variant="outline" className="text-xs">
                Step 1: Review predefined questions, then generate more from AI
              </Badge>
            )}
            {questionsGenerated && !answersGenerated && (
              <Badge variant="secondary" className="text-xs">
                Step 2: Questions enhanced! Now generate answers from AI
              </Badge>
            )}
            {answersGenerated && (
              <Badge variant="default" className="text-xs">
                Step 3: Answers generated! Review and edit as needed
              </Badge>
            )}
          </div>

          {(Array.isArray(procedures) ? procedures : []).length > 0 && (
            <div className="w-auto mt-5">
              <Select value={selectedSectionId} onValueChange={(value) => { setSelectedSectionId(value); scrollToSection(value) }}>
                <SelectTrigger className="w-auto bg-white text-black border border-black hover:bg-gray-100 focus:bg-gray-100">
                  <SelectValue placeholder={(Array.isArray(procedures) ? procedures : [])[0]?.title || "Select section"} />
                </SelectTrigger>
                <SelectContent className="bg-white text-black border border-gray-200">
                  {(Array.isArray(procedures) ? procedures : []).map((p) => (
                    <SelectItem
                      key={p.sectionId}
                      value={p.sectionId}
                      className="bg-white data-[state=checked]:bg-brand-sidebar data-[state=checked]:text-white [&>svg]:text-white cursor-pointer"
                    >
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {totalMissing > 0 && answersGenerated && (
            <Alert className="mt-3 flex items-start gap-3 border-destructive/30">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
              <div>
                <div className="font-medium">Incomplete required fields</div>
                <div className="text-sm text-muted-foreground">
                  Please complete {totalMissing} required {totalMissing === 1 ? "field" : "fields"} highlighted below.
                </div>
              </div>
            </Alert>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-6 h-[60vh] overflow-y-scroll">
            {(Array.isArray(procedures) ? procedures : []).map((procedure, index) => {
              const answersMap = getAnswersMap(procedure)
              return (
                <Card
                  key={procedure.id}
                  className="border-l-4 border-l-primary"
                  ref={el => sectionRefs.current[procedure.sectionId] = el}
                  data-section-id={procedure.sectionId}
                >
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateSectionQuestions(procedure.sectionId)}
                      disabled={anyGenerationInProgress}
                      className="flex items-center gap-2"
                    >
                      {generatingQuestionsSections.has(procedure.sectionId) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="h-4 w-4" />
                      )}
                      Add AI Questions
                    </Button>

                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleGenerateSectionAnswers(procedure.sectionId)}
                      disabled={generatingAnswersSections.has(procedure.sectionId) || anyGenerationInProgress}
                      className="flex items-center gap-2"
                    >
                      {generatingAnswersSections.has(procedure.sectionId) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate Answers
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
                      {procedure.title}
                      <Badge variant="outline">{procedure.sectionId}</Badge>
                          {/* Navigation buttons */}
                          {/* <div className="flex justify-between">
                        {index > 0 && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              const prevSection = procedures[index - 1];
                              if (prevSection) {
                                scrollToSection(prevSection.sectionId);
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            <ChevronUp className="h-4 w-4" />
                            Previous Section
                          </Button>
                        )}
                        {index < procedures.length - 1 && (
                          <Button
                            onClick={() => {
                              const nextSection = procedures[index + 1];
                              if (nextSection) {
                                scrollToSection(nextSection.sectionId);
                              }
                            }}
                            className="flex items-center gap-2 ml-auto"
                          >
                            Next Section
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        )}
                      </div> */}
                    </CardTitle>
                    {procedure.standards?.length ? (
                      <div className="text-xs text-muted-foreground">Standards: {procedure.standards.join(", ")}</div>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(procedure.fields || []).map((field: any) => {
                        if (!isFieldVisible(field, answersMap)) return null
                        const required = !!field.required
                        const fieldKey = `${procedure.id}.${field.key}`
                        const invalid = !!errors[fieldKey]
                        const isFieldDisabled = field.type === "file"

                        return (
                          <div
                            key={field.key}
                            className={clsx(
                              "space-y-3 p-4 rounded-md border border-[hsl(0deg,0%,68.03%)] bg-card shadow-sm",
                              invalid && "border-destructive/60 ring-1 ring-destructive/30 bg-destructive/5",
                              isFieldDisabled && "opacity-60",
                            )}
                            ref={(el) => (fieldRefs.current[fieldKey] = el)}
                          >
                            <div className="flex items-start gap-2">
                              <Label
                                className={clsx(
                                  "font-body-semibold text-foreground flex-1",
                                  invalid && "text-destructive",
                                )}
                              >
                                {field.label ?? field.key}
                                {required && <span className="text-destructive ml-1">*</span>}
                                {isFieldDisabled && field.type !== "file" && (
                                  <span className="text-xs text-muted-foreground ml-2">(Will be filled by AI)</span>
                                )}
                                {field.type === "file" && (
                                  <span className="text-xs text-muted-foreground ml-2">(Manual upload required)</span>
                                )}
                              </Label>
                               {/* Navigation buttons */}
                               {/* <div className="flex items-center justify-between">
                                {index > 0 && (
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      const prevSection = procedures[index - 1];
                                      if (prevSection) {
                                        scrollToSection(prevSection.sectionId);
                                      }
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                    Previous Section
                                  </Button>
                                )}
                                {index < procedures.length - 1 && (
                                  <Button
                                    onClick={() => {
                                      const nextSection = procedures[index + 1];
                                      if (nextSection) {
                                        scrollToSection(nextSection.sectionId);
                                      }
                                    }}
                                    className="flex items-center gap-2 ml-auto"
                                  >
                                    Next Section
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                )}
                              </div> */}
                              {field.help && (
                                <div className="group relative">
                                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                  <div className="absolute right-0 top-6 w-96 p-3 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                    <p className="text-xs text-popover-foreground leading-relaxed whitespace-pre-line">
                                      {field.help}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {field.type === "markdown" && (
                              <Alert className="prose prose-sm max-w-none whitespace-pre-wrap">{field.content}</Alert>
                            )}

                            {field.type === "textarea" && (
                              <>
                                <Textarea
                                  value={field.answer || ""}
                                  onChange={(e) => updateProcedureField(procedure.id, field.key, e.target.value)}
                                  placeholder={`Enter ${field.label?.toLowerCase() || field.key}...`}
                                  className={clsx(
                                    "min-h-24",
                                    invalid && "border-destructive focus-visible:ring-destructive",
                                  )}
                                  aria-invalid={invalid || undefined}
                                  disabled={false}
                                />
                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {(field.type === "text" || field.type === "number") && (
                              <>
                                <Input
                                  type={field.type}
                                  value={field.answer ?? ""}
                                  onChange={(e) =>
                                    updateProcedureField(
                                      procedure.id,
                                      field.key,
                                      field.type === "number"
                                        ? e.target.value === ""
                                          ? ""
                                          : Number(e.target.value)
                                        : e.target.value,
                                    )
                                  }
                                  placeholder={`Enter ${field.label?.toLowerCase() || field.key}...`}
                                  className={clsx(invalid && "border-destructive focus-visible:ring-destructive")}
                                  aria-invalid={invalid || undefined}
                                  disabled={false}
                                />
                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {field.type === "checkbox" && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={!!field.answer}
                                    onCheckedChange={(ck) => updateProcedureField(procedure.id, field.key, !!ck)}
                                    id={`${procedure.id}_${field.key}`}
                                    disabled={false}
                                  />
                                  <Label
                                    htmlFor={`${procedure.id}_${field.key}`}
                                    className={clsx(invalid && "text-destructive")}
                                  >
                                    Mark as true
                                  </Label>
                                </div>
                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {field.type === "select" && (
                              <>
                                <select
                                  className={clsx(
                                    "w-full border rounded-md px-3 py-2 text-sm bg-background",
                                    invalid && "border-destructive focus-visible:ring-destructive",
                                  )}
                                  value={field.answer ?? ""}
                                  onChange={(e) => updateProcedureField(procedure.id, field.key, e.target.value)}
                                  aria-invalid={invalid || undefined}
                                  disabled={false}
                                >
                                  <option value="" disabled>
                                    Select…
                                  </option>
                                  {(field.options || []).map((opt: string) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {field.type === "multiselect" && (
                              <>
                                <select
                                  multiple
                                  className={clsx(
                                    "w-full border rounded-md px-3 py-2 text-sm bg-background min-h-28",
                                    invalid && "border-destructive focus-visible:ring-destructive",
                                  )}
                                  value={Array.isArray(field.answer) ? field.answer : []}
                                  onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
                                    updateProcedureField(procedure.id, field.key, selected)
                                  }}
                                  aria-invalid={invalid || undefined}
                                  disabled={false}
                                >
                                  {(field.options || []).map((opt: string) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {field.type === "table" && (
                              <>
                                <TableEditor
                                  field={field}
                                  value={Array.isArray(field.answer) ? field.answer : []}
                                  onChange={(rows) => updateProcedureField(procedure.id, field.key, rows)}
                                  invalid={invalid}
                                  disabled={false}
                                />
                                {invalid && <p className="text-xs text-destructive mt-1">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {field.type === "file" && (
                              <>
                                <Input
                                  type="file"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    updateProcedureField(procedure.id, field.key, f || "")
                                  }}
                                  className={clsx(invalid && "border-destructive focus-visible:ring-destructive")}
                                  aria-invalid={invalid || undefined}
                                // File fields are never disabled - user must upload manually
                                />
                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {field.type === "user" && (
                              <>
                                <Input
                                  type="text"
                                  value={field.answer ?? ""}
                                  onChange={(e) => updateProcedureField(procedure.id, field.key, e.target.value)}
                                  placeholder="Type or select user (manual entry)"
                                  className={clsx(invalid && "border-destructive focus-visible:ring-destructive")}
                                  aria-invalid={invalid || undefined}
                                  disabled={false}
                                />
                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {field.type === "group" && (
                              <>
                                <GroupField
                                  field={field}
                                  value={field.answer}
                                  onChange={(val) => updateProcedureField(procedure.id, field.key, val)}
                                  disabled={false}
                                />
                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                              </>
                            )}

                            {field.type === "markdown_footer" && (
                              <Alert className="mt-4 prose prose-sm max-w-none whitespace-pre-wrap">
                                {field.content}
                              </Alert>
                            )}

                            {field.type === "markdown" && field.content && null /* already rendered above */}
                          </div>
                        )
                      })}

                      {procedure.footer?.content && (
                        <Alert className="mt-4 prose prose-sm max-w-none whitespace-pre-wrap">
                          {procedure.footer.content}
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-end justify-end">
        {/* <Button variant="outline" onClick={onBack} className="flex items-center gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Back to Sections
        </Button> */}
        <Button onClick={handleProceed} disabled={false} className="flex items-center gap-2">
          Proceed to Recommendations
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/** ---------- Predefined Sections (manual mode, full spec) ---------- **/
function getPredefinedSection(sectionId: string) {
  const sections: Record<string, any> =
  {
    "engagement_setup_acceptance_independence": {
      title: "Section 1: Engagement Setup, Acceptance & Independence",
      standards: ["ISA 200", "ISA 210", "ISA 220 (Revised)", "ISQM 1", "IESBA Code"],
      fields: [
        {
          key: "reporting_framework",
          type: "select",
          label: "Reporting Framework",
          options: ["IFRS", "EU-IFRS", "Local GAAP", "GAPSME", "Other"],
          required: true,
          help: "Choose the framework used for financial statements; ISA 210 requires an acceptable framework (GAPSME included)."
        },
        {
          key: "reporting_framework_other",
          type: "text",
          label: "If 'Other', please specify",
          required: true,
          visibleIf: { reporting_framework: ["Other"] }
        },
        {
          key: "mgmt_responsibility_ack",
          type: "checkbox",
          label: "Management responsibilities acknowledged (FS prep, IC, access to information/personnel)",
          required: true,
          help: "Required by ISA 210 to confirm management understands its responsibilities."
        },
        {
          key: "engagement_letter",
          type: "file",
          label: "Engagement Letter (signed)",
          required: false,
          help: "Documents scope, responsibilities, reporting framework, and limitations per ISA 210."
        },
        {
          key: "engagement_type",
          type: "select",
          label: "Engagement Type",
          options: ["New Acceptance", "Continuation", "Declination"],
          required: true,
          help: "Select appropriate action; ISA 300 emphasizes that planning and acceptance may need revisiting."
        },
        {
          key: "due_diligence_upload",
          type: "file",
          label: "Due Diligence Checklist (new client)",
          required: false,
          visibleIf: { engagement_type: ["New Acceptance"] },
          help: "Attach due diligence, including KYC/UBO/AML, for new client acceptance."
        },
        {
          key: "prior_year_review",
          type: "file",
          label: "Prior-year Reappointment Review",
          required: false,
          visibleIf: { engagement_type: ["Continuation"] },
          help: "Attach documentation of prior issues or changes when continuing client."
        },
        {
          key: "structure_change_notes",
          type: "textarea",
          label: "Changes in corporate structure or UBOs (describe or 'None')",
          required: true,
          visibleIf: { engagement_type: ["Continuation"] },
          help: "Document any changes since last engagement."
        },
        {
          key: "kyc_screening_completed",
          type: "checkbox",
          label: "KYC / UBO / PEP / Sanctions screening completed",
          required: true,
          help: "Confirm screening to mitigate ethical/regulatory risks."
        },
        {
          key: "follow_up_evidence",
          type: "file",
          label: "Follow-up due diligence evidence",
          required: false,
          visibleIf: { kyc_screening_completed: [false] },
          help: "Provide documentation if any screening flags were raised."
        },
        {
          key: "acceptance_decision_memo",
          type: "file",
          label: "Acceptance / Continuance Decision Memo",
          required: false,
          help: "Document decision rationale per ISA 210/ISQM 1."
        },
        {
          key: "independence_declarations",
          type: "table",
          label: "Independence Declarations",
          required: true,
          columns: ["Name", "Role", "Declaration Date", "Exceptions"],
          help: "Record confirmations from all team members per ISA 220 (Revised)."
        },
        {
          key: "audit_fee_percent",
          type: "number",
          label: "Audit Fee as % of Firm Revenue",
          required: true,
          help: "Determine if fee dependency exceeds firm threshold (e.g., ≥15%)."
        },
        {
          key: "fee_dependency_actions",
          type: "multiselect",
          label: "Safeguards triggered by fee dependency",
          options: ["Partner rotation / Cooling-off", "TCWG disclosure", "EQR required", "Disengagement plan"],
          required: true,
          visibleIf: { audit_fee_percent: [{ operator: ">=", value: 15 }] },
          help: "Select safeguards if dependency is high, especially for PIEs."
        },
        {
          key: "overdue_fees_present",
          type: "checkbox",
          label: "Significant overdue fees present (or treated as loan)?",
          required: true,
          help: "Overdue fees may pose a self-interest threat per IESBA Code."
        },
        {
          key: "overdue_fees_details",
          type: "textarea",
          label: "Details and mitigation for overdue fees",
          required: true,
          visibleIf: { overdue_fees_present: [true] },
          help: "Document steps taken to resolve or mitigate self-interest risk."
        },
        {
          key: "ethical_threat_types",
          type: "multiselect",
          label: "Threat types identified",
          options: ["Self-review", "Familiarity", "Advocacy", "Intimidation", "Self-interest", "Other"],
          help: "ISA 220 (Revised) requires documentation of identified threats."
        },
        {
          key: "other_threats_detail",
          type: "textarea",
          label: "Describe other threat(s)",
          required: true,
          visibleIf: { ethical_threat_types: ["Other"] },
          help: "Provide details if 'Other' threats are selected."
        },
        {
          key: "safeguards_implemented",
          type: "textarea",
          label: "Safeguards applied to address threats",
          required: true,
          visibleIf: { ethical_threat_types: [{ operator: "any", value: ["Self-review", "Familiarity", "Advocacy", "Intimidation", "Self-interest", "Other"] }] },
          help: "Document safeguards that reduce threats per ISA 220."
        },
        {
          key: "ethical_additional_checks",
          type: "group",
          label: "Additional Ethical Checks",
          required: true,
          help: "Check all that apply per IESBA Code.",
          fields: [
            { key: "long_tenure", type: "checkbox", label: "Long tenure beyond firm policy?" },
            { key: "client_relationships", type: "checkbox", label: "Staff have relationships/shareholdings/loans with client?" },
            { key: "management_functions", type: "checkbox", label: "Staff performing management functions for client?" },
            { key: "non_audit_services", type: "checkbox", label: "Providing non-audit services creating self-review threat?" }
          ]
        },
        {
          key: "ethical_issues_detail",
          type: "textarea",
          label: "Describe actions taken if any ethical issues flagged",
          required: true,
          visibleIf: {
            ethical_additional_checks: [{ operator: "any", value: ["long_tenure", "client_relationships", "management_functions", "non_audit_services"] }]
          },
          help: "Explain mitigation if any ethical issues are flagged."
        },
        {
          key: "independence_register",
          type: "file",
          label: "Independence & Ethics Summary Register",
          required: false,
          help: "Upload register/documentation of independence compliance."
        },
        {
          key: "engagement_partner",
          type: "user",
          label: "Engagement Partner",
          required: true,
          help: "Select partner responsible for overall engagement quality."
        },
        {
          key: "eqr_required",
          type: "select",
          label: "Is Engagement Quality Reviewer (EQR) required?",
          options: ["No", "Yes – mandated", "Yes – risk-based"],
          required: true,
          help: "Include EQR if required by ISQM 1 or firm policy."
        },
        {
          key: "eqr_reviewer",
          type: "user",
          label: "Assigned EQR Reviewer",
          required: true,
          visibleIf: { eqr_required: ["Yes – mandated", "Yes – risk-based"] },
          help: "Assign a reviewer if EQR is required."
        },
        {
          key: "supervision_schedule",
          type: "textarea",
          label: "Supervision gates / review schedule",
          required: true,
          help: "Plan key supervision points per ISA 220 (Revised)."
        },
        {
          key: "consultation_triggers",
          type: "multiselect",
          label: "Consultation triggers",
          options: ["Fraud", "Going Concern", "IT", "Estimates", "Complex Transactions", "Legal", "Group Consolidation", "Other"],
          required: true,
          help: "Identify areas requiring consultation during planning."
        },
        {
          key: "other_trigger_details",
          type: "textarea",
          label: "Describe other triggers",
          required: true,
          visibleIf: { consultation_triggers: ["Other"] },
          help: "Provide detail if 'Other' is chosen."
        },
        {
          key: "eq_plan",
          type: "file",
          label: "Engagement Quality Plan (document)",
          required: false,
          help: "Upload plan evidencing partner's oversight and quality procedures."
        }
      ],
      footer: {
        type: "markdown",
        content: "**Documentation Reminder:** Under **ISA 230**, audit documentation must be sufficient for an experienced auditor to understand the procedures performed, evidence obtained, and conclusions reached—*oral explanations alone are insufficient.*"
      }
    },

    "understanding_entity_environment": {
      title: "Section 2: Understanding the Entity & Its Environment",
      standards: ["ISA 315 (Revised 2019)"],
      fields: [
        {
          key: "industry_regulatory_factors",
          type: "textarea",
          label: "Industry, Regulatory, and External Factors",
          required: true,
          help: "Document industry trends, regulation, economic conditions, and external factors affecting the entity (ISA 315 ¶11(a))."
        },
        {
          key: "entity_nature_operations",
          type: "textarea",
          label: "Nature of the Entity (operations, structure, governance, financing, business model)",
          required: true,
          help: "Describe operations, governance, structure, financing, investments, and business model including IT integration (ISA 315 ¶11(b), Appendix 1)."
        },
        {
          key: "accounting_policies_changes",
          type: "textarea",
          label: "Accounting Policies and Changes",
          required: true,
          help: "Evaluate policies for appropriateness and consistency with framework; document reasons for any changes (ISA 315 ¶11(c))."
        },
        {
          key: "objectives_strategies_risks",
          type: "textarea",
          label: "Objectives, Strategies, and Related Business Risks",
          required: true,
          help: "Document entity’s objectives, strategies, and related risks that could cause misstatement (ISA 315 ¶11(d))."
        },
        {
          key: "performance_measurement",
          type: "textarea",
          label: "Measurement and Review of Financial Performance (internal & external)",
          required: true,
          help: "Describe how performance is measured internally and externally, and how pressure may create misstatement risk (ISA 315 ¶11(e), A74–A77)."
        },
        {
          key: "control_environment",
          type: "textarea",
          label: "Control Environment",
          required: true,
          help: "Assess tone at the top, ethics culture, governance oversight (ISA 315 ¶14, A77–A87)."
        },
        {
          key: "risk_assessment_process_entity",
          type: "textarea",
          label: "Entity’s Risk Assessment Process",
          required: true,
          help: "Describe how management identifies and responds to business risks relevant to financial reporting (ISA 315 ¶15–¶17)."
        },
        {
          key: "monitoring_controls",
          type: "textarea",
          label: "Monitoring of Controls",
          required: true,
          help: "Document how internal control is monitored and deficiencies are addressed, including any internal audit function (ISA 315 ¶22–¶24)."
        },
        {
          key: "information_system",
          type: "textarea",
          label: "Information System & Communication",
          required: true,
          help: "Describe transaction flows, IT and manual systems, reporting processes, journal entry controls (ISA 315 ¶18–¶19)."
        },
        {
          key: "control_activities",
          type: "textarea",
          label: "Control Activities Relevant to the Audit",
          required: true,
          help: "Identify significant controls addressing risks at assertion level (ISA 315 ¶20–¶21)."
        },
        {
          key: "it_controls_understanding",
          type: "textarea",
          label: "IT & General IT Controls Understanding",
          required: true,
          help: "Understand IT environment and general IT controls relevant to the audit (Appendix 5 & 6 of ISA 315 Revised)."
        },
        {
          key: "risk_assessment_discussion",
          type: "textarea",
          label: "Engagement Team Discussion – Susceptibility to Misstatement (including fraud)",
          required: true,
          help: "Document discussion among team about susceptibility to material misstatement and fraud (ISA 315 ¶10, A21–A24)."
        },
        {
          key: "identified_risks_and_assertions",
          type: "table",
          label: "Identified Risks of Material Misstatement (Financial Statement & Assertion Level)",
          required: true,
          columns: ["Risk Description", "Level (FS / Assertion)", "Assertion Affected", "Inherent Risk Factors", "Controls Related"],
          help: "List identified risks by level, related assertions, IRF tags, and relevant controls (ISA 315 ¶25, ¶26)."
        },
        {
          key: "significant_risk_flag",
          type: "checkbox",
          label: "Is this a Significant Risk?",
          required: true,
          help: "Tick if this risk requires special audit consideration (non-routine, estimation, fraud risk) per ISA 315 ¶32."
        },
        {
          key: "substantive_only_risk",
          type: "checkbox",
          label: "Does this risk require only substantive procedures? (Controls not reliable)",
          required: true,
          help: "Tick if substantive procedures alone are required (control risk high or controls absent) per ISA 315 ¶30."
        },
        {
          key: "documentation_reminder",
          type: "markdown",
          content: "**ISA 230 Reminder:** Document sources of understanding, risk assessment procedures, identified risks and controls, team discussions, and the rationale. Documentation must be sufficient for an experienced auditor to understand the work."
        }
      ]
    },

    "materiality_risk_summary": {
      title: "Section 3: Materiality & Risk Summary",
      standards: ["ISA 320", "ISA 450", "ISA 600 (Group Audits)"],
      currency: "EUR",
      fields: [
        {
          key: "overall_materiality_amount",
          type: "number",
          label: "Overall Materiality (€)",
          required: true,
          help: "Threshold impacting users’ decisions (per ISA 320 ¶10–11)."
        },
        {
          key: "overall_materiality_basis",
          type: "textarea",
          label: "Benchmark & Rationale (e.g. 1 % of turnover)",
          required: true,
          help: "Explain rationale and benchmark used."
        },
        {
          key: "specific_materiality_table",
          type: "table",
          label: "Specific Materiality for Particular Items",
          required: false,
          columns: ["Item", "Materiality (€)", "Rationale"],
          help: "Lower thresholds for sensitive balances."
        },
        {
          key: "performance_materiality_amount",
          type: "number",
          label: "Performance Materiality (€)",
          required: true,
          help: "Lower threshold to control aggregation risk (ISA 320)."
        },
        {
          key: "performance_materiality_percent",
          type: "number",
          label: "Performance Materiality as % of Overall",
          required: true,
          help: "Typically 50 %–75 % based on risk assessment."
        },
        {
          key: "tolerable_misstatement_amount",
          type: "number",
          label: "Tolerable Misstatement (€)",
          required: false,
          help: "Used in sampling—generally at or below performance materiality."
        },
        {
          key: "clearly_trivial_threshold",
          type: "number",
          label: "Clearly Trivial Threshold (€)",
          required: true,
          help: "E.g., 5 % of performance materiality—used to accumulate misstatements."
        },
        {
          key: "tcwg_communicated",
          type: "checkbox",
          label: "TCWG informed of materiality thresholds",
          required: true,
          help: "ISA 320 requires communication of materiality basis to TCWG."
        },
        {
          key: "reassess_materiality",
          type: "checkbox",
          label: "Final materiality reassessed at conclusion?",
          required: true,
          help: "ISA 320 ¶12–13: reassess when new info emerges."
        },
        {
          key: "revised_materiality_amount",
          type: "number",
          label: "Revised Materiality (€)",
          required: false,
          visibleIf: { reassess_materiality: [true] },
          help: "Enter updated figure if materiality was changed."
        },
        {
          key: "group_materiality",
          type: "number",
          label: "Group Overall Materiality (€)",
          required: false,
          help: "Required for group audits under ISA 600."
        },
        {
          key: "component_materiality_table",
          type: "table",
          label: "Component Materiality (€)",
          required: false,
          columns: ["Component", "Materiality (€)", "Rationale"],
          help: "Set lower thresholds for components to address aggregation risk."
        },
        {
          key: "documentation_reminder",
          type: "markdown",
          content: "**ISA 230 Documentation Reminder:** Record all judgments, thresholds, rationales, revisions, and communications with TCWG."
        }
      ]
    },

    "risk_response_planning": {
      title: "Section 4: Risk Register & Audit Response Planning",
      standards: ["ISA 330", "ISA 315 (Revised)"],
      fields: [
        {
          key: "risk_statement",
          type: "textarea",
          label: "Risk Statement (Assertion-level)",
          required: true,
          help: "Describe specific risk of material misstatement at assertion level."
        },
        {
          key: "risk_inherent_factor_tags",
          type: "multiselect",
          label: "Inherent Risk Factors",
          options: ["Complexity", "Subjectivity", "Uncertainty", "Change", "Bias/Fraud Susceptibility"],
          required: true,
          help: "Tag risk factors per ISA 315 revised."
        },
        {
          key: "controls_relied_on",
          type: "textarea",
          label: "Controls to be Tested",
          required: false,
          help: "List controls—only if you plan to rely on them (ISA 330)."
        },
        {
          key: "control_test_type",
          type: "select",
          label: "Type of Control Test",
          options: ["Design & Implementation", "Operating Effectiveness"],
          required: false,
          visibleIf: { controls_relied_on: [{ operator: "not_empty" }] },
          help: "Select control test type (only if controls are relied on)."
        },
        {
          key: "substantive_procedures",
          type: "textarea",
          label: "Substantive Procedures Planned",
          required: true,
          help: "Describe tests of details or analytics planned in response to this risk."
        },
        {
          key: "nature_timing_extent_changes",
          type: "textarea",
          label: "Nature, Timing, and Extent Changes",
          required: true,
          help: "Document how the procedures change due to risk (ISA 330)."
        },
        {
          key: "unpredictability_elements",
          type: "textarea",
          label: "Unpredictability Elements",
          required: true,
          help: "Include unpredictable testing nature as a deterrent (ISA 330 A1)."
        },
        {
          key: "overall_response_actions",
          type: "textarea",
          label: "Overall Response Actions",
          required: true,
          help: "E.g. specialized staff, supervision increase, professional skepticism based on risk."
        },
        {
          key: "documentation_reminder",
          type: "markdown",
          content: "**ISA 330 Documentation Reminder:** Record the risk linkages, procedure rationale, and how responses address assessed risks at assertion level."
        }
      ]
    },

    "fraud_gc_planning": {
      title: "Section 5: Fraud Risk & Going Concern Planning",
      standards: ["ISA 240 (Revised)", "ISA 570 (Revised 2024)"],
      fields: [
        {
          key: "fraud_lens_discussion",
          type: "textarea",
          label: "Engagement Team Discussion – Fraud Lens",
          required: true,
          help: "Discuss where FS may be susceptible to fraud; ISA 240 (Revised) requires a heightened 'fraud lens'."
        },
        {
          key: "whistleblower_program_understanding",
          type: "textarea",
          label: "Understanding of Whistleblower Program",
          required: true,
          help: "ISA 240 (Revised) requires understanding of the entity's whistleblower procedures."
        },
        {
          key: "fraud_inquiries_mgmt_tcwg",
          type: "textarea",
          label: "Inquiries with Management / TCWG about Fraud",
          required: true,
          help: "Includes discussing risks of fraud and any past incidents with management or TCWG."
        },
        {
          key: "fraud_ka_matter_flag",
          type: "checkbox",
          label: "Fraud matter may be a Key Audit Matter (KAM)",
          required: true,
          help: "ISA 240 (Revised) emphasizes considering fraud risks when determining KAMs."
        },
        {
          key: "going_concern_assessment_period",
          type: "number",
          label: "Going Concern Assessment Period (months)",
          required: true,
          help: "ISA 570 (Revised 2024) requires evaluation over at least 12 months from FS approval."
        },
        {
          key: "mgmt_intent_ability_evidence",
          type: "textarea",
          label: "Management’s Intent & Ability – Evidence",
          required: true,
          help: "Assess and corroborate management's plans to address going concern assumptions."
        },
        {
          key: "gc_mgmt_relations_third_parties",
          type: "textarea",
          label: "Going Concern Support from Third Parties",
          required: false,
          help: "Document assurances or support (financial or otherwise) from third parties."
        },
        {
          key: "going_concern_opinion_section_needed",
          type: "select",
          label: "Auditor Report Section: Going Concern or MURGC",
          required: true,
          options: ["Going Concern – No material uncertainty", "Material Uncertainty Related to Going Concern (MURGC)"],
          help: "ISA 570 (Revised) requires a dedicated report section in all cases."
        },
        {
          key: "gc_report_details",
          type: "textarea",
          label: "Report Text Details",
          required: true,
          help: "If no uncertainty: state that GC basis is appropriate, no doubt identified, basis of conclusion. If MURGC: include reference to disclosures, conclusion and opinion unaffected."
        },
        {
          key: "documentation_reminder",
          type: "markdown",
          content: "**ISA 230 Reminder:** Document fraud planning, inquiries, management’s going concern plans, and communications to support your judgments."
        }
      ]
    },

    "compliance_laws_regulations": {
      title: "Section 6: Compliance with Laws & Regulations (ISA 250)",
      standards: ["ISA 250 (Revised)"],
      fields: [
        {
          key: "legal_reg_framework_understanding",
          type: "textarea",
          label: "Understanding of Legal & Regulatory Framework",
          required: true,
          help: "Describe laws/regulations affecting FS and how the entity ensures compliance (ISA 250 ¶13–17)."
        },
        {
          key: "compliance_procedures_specific",
          type: "textarea",
          label: "Procedures for Laws/Regs with Direct FS Effect",
          required: true,
          help: "E.g., checks for tax, pension, licensing compliance — obtain sufficient audit evidence (ISA 250 ¶13)."
        },
        {
          key: "procedures_for_other_regs",
          type: "textarea",
          label: "Procedures for Other Laws/Regs (Indirect FS Effect)",
          required: true,
          help: "E.g., inquiries, regulatory correspondence to identify non-compliance (ISA 250 ¶14)."
        },
        {
          key: "management_written_rep",
          type: "checkbox",
          label: "Management provided written representation on compliance",
          required: true,
          help: "Required: management confirms all known non-compliance disclosed (ISA 250 ¶16)."
        },
        {
          key: "non_compliance_flag",
          type: "checkbox",
          label: "Non-compliance identified or suspected?",
          required: true,
          help: "Indicate if a possible breach of laws or regulations was noted."
        },
        {
          key: "non_compliance_details",
          type: "textarea",
          label: "Details of Non-compliance and Actions",
          required: true,
          visibleIf: { non_compliance_flag: [true] },
          help: "Document nature, circumstances, management/TCWG discussions, legal advice (ISA 250 ¶18–20)."
        },
        {
          key: "notify_tcwg",
          type: "checkbox",
          label: "TCWG informed of non-compliance (if applicable)",
          required: false,
          visibleIf: { non_compliance_flag: [true] },
          help: "Communicate material or intentional non-compliance per ISA 250 ¶22."
        },
        {
          key: "consult_legal",
          type: "checkbox",
          label: "Legal advice obtained (if required)",
          required: false,
          visibleIf: { non_compliance_flag: [true] },
          help: "If management response is unsatisfactory and risk is material, seek legal advice (ISA 250 ¶19)."
        },
        {
          key: "documentation_reminder",
          type: "markdown",
          content: "**ISA 230 Reminder:** Document all compliance understanding, procedures, findings, communications, and legal consultations per audit documentation standards."
        }
      ]
    }
  }

  return sections[sectionId] || { title: "Unknown Section", fields: [] }
}