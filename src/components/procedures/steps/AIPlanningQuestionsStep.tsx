// @ts-nocheck
import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { EnhancedLoader } from "@/components/ui/enhanced-loader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, ChevronUp, ChevronDown } from "lucide-react"
import Lottie from "lottie-react"
import checkMarkAnimation from "@/../public/Check Mark.json"
import fileSearchAnimation from "@/../public/File Search.json"

// --- helpers ---
const uid = () => Math.random().toString(36).slice(2, 9)
const withUids = (procedures: any[]) =>
  (procedures || []).map((sec: any) => ({
    ...sec,
    fields: (sec.fields || []).map((f: any) => ({ __uid: f.__uid || uid(), ...f })),
  }))

function sanitizeKey(s: string) {
  return s.trim().replace(/\s+/g, "_")
}

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

const FIELD_TYPES = [
  "text", "textarea", "checkbox", "number", "currency",
  "select", "multiselect", "table", "group",
  "textfield",  // alias → treated as text
  "selection",  // alias → treated as select
]

function normalizeType(t?: string) {
  const v = String(t || "").toLowerCase()
  if (v === "textfield") return "text"
  if (v === "selection") return "select"
  return v
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-muted-foreground">{children}</div>
}

function OptionsEditor({ value, onChange }: { value?: string[]; onChange: (v: string[]) => void }) {
  const [buf, setBuf] = useState((value || []).join(", "))
  return (
    <div className="space-y-1">
      <SmallLabel>Options (comma-separated)</SmallLabel>
      <Input
        value={buf}
        onChange={(e) => {
          setBuf(e.target.value)
          const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean)
          onChange(arr)
        }}
        placeholder="e.g., Option A, Option B, Option C"
      />
    </div>
  )
}

function ColumnsEditor({ value, onChange }: { value?: string[]; onChange: (v: string[]) => void }) {
  const [buf, setBuf] = useState((value || []).join(", "))
  return (
    <div className="space-y-1">
      <SmallLabel>Columns (comma-separated)</SmallLabel>
      <Input
        value={buf}
        onChange={(e) => {
          setBuf(e.target.value)
          const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean)
          onChange(arr)
        }}
        placeholder="Risk, Assertion, Likelihood, Impact"
      />
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

export const AIPlanningQuestionsStep: React.FC<{
  engagement: any
  mode: "ai" | "hybrid"
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}> = ({ engagement, mode, stepData, onComplete, onBack }) => {
  const [loading, setLoading] = useState(false)
  const [generatingSections, setGeneratingSections] = useState<Set<string>>(new Set())
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())
  const [celebration, setCelebration] = useState<{
    sectionId: string
    x: number
    y: number
    animate: boolean
  } | null>(null)
  const [procedures, setProcedures] = useState<any[]>(() => {
    // Initialize with empty sections if none exist
    const existingProcedures = withUids(stepData.procedures || []);
    if (existingProcedures.length > 0) return existingProcedures;

    // Create empty sections for each planning section
    return PLANNING_SECTIONS.map(section => ({
      id: section.sectionId,
      sectionId: section.sectionId,
      title: section.title,
      fields: []
    }));
  })
  const { toast } = useToast()
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  const handleGenerateSectionQuestions = async (sectionId: string) => {
    setLoading(true)
    // Clear previous "completed" state for this section while regenerating
    setCompletedSections((prev) => {
      const next = new Set(prev)
      next.delete(sectionId)
      return next
    })
    setGeneratingSections(prev => {
      const newSet = new Set(prev)
      newSet.add(sectionId)
      return newSet
    })

    try {
      const base = import.meta.env.VITE_APIURL
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/section-questions`, {
        method: "POST",
        body: JSON.stringify({ sectionId }),
      })
      if (!res.ok) throw new Error("Failed to generate questions for section")
      const data = await res.json()

      // Update only the selected section with the generated questions
      setProcedures(prev => {
        const updated = prev.map(section =>
          section.sectionId === sectionId ? { ...section, fields: data.fields } : section
        )
        return updated
      })

      // Mark section as successfully generated for celebratory UI
      setCompletedSections((prev) => {
        const next = new Set(prev)
        next.add(sectionId)
        return next
      })

      toast({ title: "Questions Generated", description: `Questions for section generated successfully.` })

      // Trigger Lottie celebration:
      // 1) Play big in the center
      // 2) After animation finishes, move & shrink towards the section
      const container = containerRef.current
      const targetEl = sectionRefs.current[sectionId]
      if (container && targetEl) {
        const containerRect = container.getBoundingClientRect()
        const targetRect = targetEl.getBoundingClientRect()

        const targetX =
          targetRect.left +
          targetRect.width / 2 -
          (containerRect.left + containerRect.width / 2)
        const targetY =
          targetRect.top +
          targetRect.height / 2 -
          (containerRect.top + containerRect.height / 2)

        // Start centered, no movement yet
        setCelebration({ sectionId, x: targetX, y: targetY, animate: false })

        // After the main Lottie animation duration, start the move/shrink
        const centerDurationMs = 2000 // show in center for ~2s
        const flyDurationMs = 700 // matches CSS transition duration

        setTimeout(() => {
          setCelebration((prev) => (prev ? { ...prev, animate: true } : prev))
        }, centerDurationMs)

        // Clear after fly animation
        setTimeout(() => setCelebration(null), centerDurationMs + flyDurationMs)
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
      setGeneratingSections(prev => {
        const newSet = new Set(prev)
        newSet.delete(sectionId)
        return newSet
      })
    }
  }


  const handleSaveDraft = async () => {
    try {
      const base = import.meta.env.VITE_APIURL
      // Strip __uid before saving
      const clean = procedures.map(sec => ({ ...sec, fields: (sec.fields || []).map(({ __uid, ...rest }) => rest) }))
      await authFetch(`${base}/api/planning-procedures/${engagement._id}/save`, {
        method: "POST",
        body: JSON.stringify({
          ...stepData,
          procedures: clean,
          status: "in-progress",
          procedureType: "planning",
          mode,
        }),
      })
      toast({ title: "Saved", description: "Draft saved successfully." })
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    }
  }

  // ---------- EDIT HELPERS ----------
  const addQuestion = (secIdx: number) => {
    setProcedures(prev => {
      const next = [...prev]
      const sec = { ...next[secIdx] }
      const fields = [...(sec.fields || [])]
      const baseKey = "new_question"
      const exists = new Set(fields.map(f => f.key))
      let k = baseKey, i = 1
      while (exists.has(k)) k = `${baseKey}_${i++}`
      fields.push({ __uid: uid(), key: k, type: "text", label: "New Question", required: false, help: "" })
      sec.fields = fields
      next[secIdx] = sec
      return next
    })
  }

  const removeQuestion = (secIdx: number, fieldUid: string) => {
    setProcedures(prev => {
      const next = [...prev]
      const sec = { ...next[secIdx] }
      sec.fields = (sec.fields || []).filter((f: any) => f.__uid !== fieldUid)
      next[secIdx] = sec
      return next
    })
  }

  const updateField = (secIdx: number, fieldUid: string, patch: any) => {
    setProcedures(prev => {
      const next = [...prev]
      const sec = { ...next[secIdx] }
      sec.fields = (sec.fields || []).map((f: any) => f.__uid === fieldUid ? { ...f, ...patch } : f)
      next[secIdx] = sec
      return next
    })
  }

  // 🔧 FIX: identify by __uid (stable), not by mutable field.key
  const changeKey = (secIdx: number, fieldUid: string, newKey: string) => {
    const cleaned = sanitizeKey(newKey)
    if (!cleaned) {
      updateField(secIdx, fieldUid, { key: "" })
      return
    }
    setProcedures(prev => {
      const next = [...prev]
      const sec = { ...next[secIdx] }
      const fields = [...(sec.fields || [])]
      const self = fields.find((f: any) => f.__uid === fieldUid)
      if (!self) return prev
      const dup = fields.some((f: any) => f.__uid !== fieldUid && f.key === cleaned)
      if (dup) return prev
      self.key = cleaned
      sec.fields = fields
      next[secIdx] = sec
      return next
    })
  }

  const editorForField = (secIdx: number, f: any) => {
    const normType = normalizeType(f.type)
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <SmallLabel>Key</SmallLabel>
          <Input value={f.key} onChange={(e) => changeKey(secIdx, f.__uid, e.target.value)} />
          <SmallLabel>Label</SmallLabel>
          <Input value={f.label ?? ""} onChange={(e) => updateField(secIdx, f.__uid, { label: e.target.value })} />
          <div className="flex items-center gap-2 mt-2">
            <Checkbox checked={!!f.required} onCheckedChange={(ck) => updateField(secIdx, f.__uid, { required: !!ck })} />
            <SmallLabel>Required</SmallLabel>
          </div>
          <SmallLabel className="mt-2">Help</SmallLabel>
          <Textarea value={f.help ?? ""} onChange={(e) => updateField(secIdx, f.__uid, { help: e.target.value })} />
        </div>

        <div className="space-y-2">
          <SmallLabel>Type</SmallLabel>
          <select
            className="w-full border rounded px-3 py-2 bg-background"
            value={f.type}
            onChange={(e) => updateField(secIdx, f.__uid, { type: e.target.value })}
          >
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {(normType === "select" || normType === "multiselect") && (
            <OptionsEditor value={f.options || []} onChange={(arr) => updateField(secIdx, f.__uid, { options: arr })} />
          )}

          {normType === "table" && (
            <ColumnsEditor value={f.columns || []} onChange={(arr) => updateField(secIdx, f.__uid, { columns: arr })} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      <div className="text-sm text-muted-foreground">
        Step-1: Generate questions for each planning section separately. You can freely <b>edit / add / remove</b> questions here before moving to Step-4.
      </div>

      {/* Navigation Dropdown */}
         <div className="w-auto">
          <Select onValueChange={(value) => scrollToSection(value)}>
            <SelectTrigger className="w-auto bg-white text-black border border-black hover:bg-gray-100 focus:bg-gray-100">
               <SelectValue placeholder={PLANNING_SECTIONS[0].title}/>
            </SelectTrigger>

            <SelectContent className="bg-white text-black border border-gray-200">
              {PLANNING_SECTIONS.map((section) => (
                <SelectItem
                  key={section.sectionId}
                  value={section.sectionId}
                  className="
              bg-white 
               
              data-[state=checked]:bg-brand-sidebar
              data-[state=checked]:text-white 
              [&>svg]:text-white
              cursor-pointer
            "
                >
                  {section.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
     




      <Accordion type="multiple" className="space-y-4 h-[60vh] overflow-y-scroll">
        {PLANNING_SECTIONS.map((section, index) => {
          const sectionData = procedures.find(s => s.sectionId === section.sectionId);
          const hasQuestions = sectionData?.fields?.length > 0;

          return (
            <AccordionItem
              key={section.sectionId}
              value={section.sectionId}
              className="border rounded-md px-4"
              ref={el => sectionRefs.current[section.sectionId] = el}
              data-section-id={section.sectionId}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="text-left">
                    <div className="font-heading text-lg">{section.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {sectionData?.standards?.length ? `Standards: ${sectionData.standards.join(", ")}` : ""}
                    </div>
                  </div>
                  {/* Actions / status */}
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {completedSections.has(section.sectionId) && !generatingSections.has(section.sectionId) && (
                      <div className="flex items-center gap-1 text-emerald-600 animate-in fade-in slide-in-from-top-1">
                        <div className="h-6 w-6">
                          <Lottie
                            animationData={checkMarkAnimation}
                            loop
                            autoplay
                          />
                        </div>
                        <span className="text-xs font-semibold">Section ready</span>
                      </div>
                    )}

                    <Button
                      onClick={() => handleGenerateSectionQuestions(section.sectionId)}
                      disabled={loading || generatingSections.has(section.sectionId)}
                      className="flex items-center justify-center"
                    >
                      {generatingSections.has(section.sectionId) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {hasQuestions ? "Regenerate Questions" : "Generate Questions"}
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-4">
                {hasQuestions ? (
                  <div className="space-y-3">
                    {(sectionData.fields || []).map((f: any) => (
                      <div key={f.__uid} className="space-y-3 p-4 rounded-md border bg-card shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">Question</div>
                          <Button size="sm" variant="ghost" onClick={() => {
                            const secIdx = procedures.findIndex(s => s.sectionId === section.sectionId);
                            if (secIdx >= 0) removeQuestion(secIdx, f.__uid);
                          }}>Remove</Button>
                        </div>
                        {editorForField(
                          procedures.findIndex(s => s.sectionId === section.sectionId),
                          f
                        )}
                        <div className="text-xs text-muted-foreground">
                          <code>type:</code> {normalizeType(f.type)}
                          {Array.isArray(f.options) && f.options.length && (
                            <span>
                              {" "}
                              · <code>options:</code> {f.options.join(", ")}
                            </span>
                          )}
                          {Array.isArray(f.columns) && f.columns.length && (
                            <span>
                              {" "}
                              · <code>columns:</code> {f.columns.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const secIdx = procedures.findIndex(s => s.sectionId === section.sectionId);
                        if (secIdx >= 0) addQuestion(secIdx);
                      }}
                    >
                      + Add Question
                    </Button>
                  </div>
                ) : (
                  <div className="text-muted-foreground py-4 text-center">
                    No questions generated yet. Click "Generate Questions" to create questions for this section.
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="flex gap-2">
        <Button
          disabled={!procedures?.length || procedures.every(p => !p.fields?.length)}
          onClick={() => {
            // strip __uid before passing to next step
            const clean = procedures.map(sec => ({ ...sec, fields: (sec.fields || []).map(({ __uid, ...rest }) => rest) }))
            onComplete({ procedures: clean })
          }}
        >
          Continue to Step-4 (Answers)
        </Button>
        <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
        {/* <Button variant="ghost" onClick={onBack}>Back</Button> */}
      </div>

        {/* Full-screen blurred overlay with File Search animation during procedure generation */}
      {generatingSections.size > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center">
            <div className="w-[150px] h-[150px] rounded-full bg-primary flex items-center justify-center p-4">
              <div className="w-full h-full">
                <Lottie animationData={fileSearchAnimation} loop autoplay />
              </div>
            </div>
            <span className="mt-4 text-sm text-white font-medium">
              Generating questions...
            </span>
          </div>
        </div>
      )}

      {/* Celebration Lottie overlay – centered with subtle backdrop, then moves to target section */}
      {celebration && (
        <div
          className={
            "pointer-events-none fixed inset-0 z-50 flex items-center justify-center" +
            (celebration.animate ? "" : " bg-black/40 backdrop-blur-sm")
          }
        >
          <div
            className="transition-transform duration-700 ease-out"
            style={{
              transform: celebration.animate
                ? `translate(${celebration.x}px, ${celebration.y}px) scale(0.25)`
                : "translate(0, 0) scale(1)",
            }}
          >
            <div className="w-48 h-48">
              <Lottie animationData={checkMarkAnimation} loop={false} autoplay />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}