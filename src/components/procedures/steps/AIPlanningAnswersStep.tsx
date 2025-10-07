// @ts-nocheck
import React, { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { EnhancedLoader } from "@/components/ui/enhanced-loader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronUp, ChevronDown } from "lucide-react"

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data?.session?.access_token
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
}

function normalizeType(t?: string) {
  const v = String(t || "").toLowerCase()
  if (v === "textfield") return "text"
  if (v === "selection") return "select"
  return v
}

function MultiSelectEditor({ field, onChange }: { field: any; onChange: (v: any) => void }) {
  const valueArray = Array.isArray(field.answer) ? field.answer : []
  const opts = Array.isArray(field.options) ? field.options : []
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((opt) => {
        const checked = valueArray.includes(opt)
        return (
          <label key={opt} className="flex items-center gap-2 border rounded px-2 py-1">
            <Checkbox checked={checked} onCheckedChange={(ck) => {
              if (ck) onChange([...valueArray, opt])
              else onChange(valueArray.filter((x: string) => x !== opt))
            }} />
            <span className="text-sm">{opt}</span>
          </label>
        )
      })}
    </div>
  )
}

function SelectEditor({ field, onChange }: { field: any; onChange: (v: any) => void }) {
  const opts = Array.isArray(field.options) ? field.options : []
  const value = typeof field.answer === "string" ? field.answer : ""
  return (
    <select
      className="w-full border rounded px-3 py-2 bg-background"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>Select…</option>
      {opts.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

/** Read-only pretty table (if you ever want to use just for display) */
function TableDisplay({ columns, rows }: { columns?: string[]; rows?: any[] }) {
  const cols = Array.isArray(columns) && columns.length ? columns : []
  const data = Array.isArray(rows) ? rows : []
  if (!cols.length) {
    return <div className="text-sm text-muted-foreground">No columns defined.</div>
  }
  if (!data.length) {
    return <div className="text-sm text-muted-foreground">No rows.</div>
  }
  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, idx: number) => (
            <tr key={idx} className="border-t">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2">{String(row?.[c] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Editable table with Add/Remove row controls */
function TableEditor({
  columns,
  value,
  onChange,
}: {
  columns?: string[]
  value?: any[]
  onChange: (rows: any[]) => void
}) {
  const cols = Array.isArray(columns) ? columns : []
  const rows = Array.isArray(value) ? value : []

  const addRow = () => {
    const empty: any = {}
    cols.forEach((c) => { empty[c] = "" })
    onChange([...(rows || []), empty])
  }

  const removeRow = (idx: number) => {
    const next = [...rows]
    next.splice(idx, 1)
    onChange(next)
  }

  const updateCell = (idx: number, col: string, cellVal: string) => {
    const next = [...rows]
    const r = { ...(next[idx] || {}) }
    r[col] = cellVal
    next[idx] = r
    onChange(next)
  }

  if (!cols.length) {
    return <div className="text-sm text-muted-foreground">No columns defined for this table.</div>
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
              ))}
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-t">
                <td className="px-3 py-2 text-muted-foreground" colSpan={cols.length + 1}>No rows. Click "Add row".</td>
              </tr>
            ) : rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-t">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-2">
                    <Input
                      value={String(row?.[c] ?? "")}
                      onChange={(e) => updateCell(rIdx, c, e.target.value)}
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Button size="sm" variant="ghost" onClick={() => removeRow(rIdx)}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="outline" onClick={addRow}>+ Add row</Button>
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

const AIPlanningAnswersStep: React.FC<{
  engagement: any
  mode: "ai" | "hybrid"
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}> = ({ engagement, mode, stepData, onComplete, onBack }) => {
  const [procedures, setProcedures] = useState<any[]>(stepData.procedures || [])
  const [loading, setLoading] = useState(false)
  const [generatingSections, setGeneratingSections] = useState<Set<string>>(new Set())
  const fileInput = useRef<HTMLInputElement>(null)
  // Change this line to store checklist items instead of strings
  const [sectionRecommendations, setSectionRecommendations] = useState<Record<string, any[]>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const { toast } = useToast()

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

  const fillAnswersForSection = async (sectionId: string) => {
    setLoading(true)
    setGeneratingSections(prev => {
      const newSet = new Set(prev)
      newSet.add(sectionId)
      return newSet
    })

    try {
      const base = import.meta.env.VITE_APIURL
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/section-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId }),
      })
      if (!res.ok) throw new Error("Failed to generate answers for section")
      const data = await res.json()

      const extractAnswers = (responseData: any) => {
        const answers: Record<string, any> = {};

        if (responseData.fields && Array.isArray(responseData.fields)) {
          responseData.fields.forEach((fieldItem: any) => {
            const fieldData = fieldItem._doc || fieldItem;
            const key = fieldData.key;

            if (!key) return;

            const answer =
              fieldItem.answer !== undefined ? fieldItem.answer :
                fieldData.answer !== undefined ? fieldData.answer :
                  fieldData.content !== undefined ? fieldData.content : null;

            answers[key] = answer;
          });
        }

        // Store the section recommendations as an array (not string)
        const sectionRec = data.sectionRecommendations || [];
        setSectionRecommendations(prev => ({ ...prev, [sectionId]: sectionRec }));

        return answers;
      };

      const answers = extractAnswers(data);

      setProcedures(prev => prev.map(sec =>
        sec.sectionId === data.sectionId
          ? {
            ...sec,
            fields: (sec.fields || []).map((existingField: any) => {
              const key = existingField?.key;
              if (!key) return existingField;

              const answerFromResponse = answers[key] !== undefined ? answers[key] : existingField.answer;

              return {
                ...existingField,
                answer: answerFromResponse
              };
            })
          }
          : sec
      ));

      toast({ title: "Answers Generated", description: `Answers for section generated successfully.` })
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

  const handleSave = async () => {
    try {
      setLoading(true)

      const form = new FormData();

      // Collect all recommendations from all sections into one array
      const allRecommendations: any[] = [];
      Object.values(sectionRecommendations).forEach(sectionRecs => {
        if (Array.isArray(sectionRecs)) {
          allRecommendations.push(...sectionRecs);
        }
      });

      const payload = {
        ...stepData,
        procedures: procedures,
        recommendations: allRecommendations, // Pass as array of checklist items
        status: "in-progress",
        procedureType: "planning",
        mode: mode,
        sectionRecommendations: sectionRecommendations, // Also keep them organized by section
      };

      form.append("data", JSON.stringify(payload));

      // Add files from the file input
      if (fileInput.current?.files?.length) {
        Array.from(fileInput.current.files).forEach((f) => {
          const sanitizedFileName = f.name.replace(/\s+/g, "_");
          form.append("files", f, sanitizedFileName);
        });
      }

      const engagementId = engagement._id;
      const res = await authFetch(`${import.meta.env.VITE_APIURL}/api/planning-procedures/${engagementId}/save`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Save failed");

      const saved = await res.json();

      // Pass the recommendations as checklist items to the next step
      onComplete({
        saved,
        procedures: procedures,
        engagement: engagement,
        recommendations: allRecommendations, // This will be passed as checklist items
        sectionRecommendations: sectionRecommendations
      });
    } catch (e: any) {
      toast({ title: "Failed to Proceed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false)
    }
  };
  // basic editors
  const setFieldAnswer = (sectionId: string, key: string, value: any) => {
    setProcedures(prev => prev.map(sec =>
      sec.sectionId === sectionId
        ? {
          ...sec,
          fields: sec.fields.map(f => f.key === key ? { ...f, answer: value } : f)
        }
        : sec
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Step-2: Generate answers for each planning section separately, then edit as needed. You can also upload files to store in the engagement library (Planning).
      </div>

      <div className="space-y-4">
        {PLANNING_SECTIONS.map((section, index) => {
          const sectionData = procedures.find(s => s.sectionId === section.sectionId);
          const hasQuestions = sectionData?.fields?.length > 0;

          return (
            <Card
              key={section.sectionId}
              className="border rounded-md p-4 space-y-3"
              ref={el => sectionRefs.current[section.sectionId] = el}
              data-section-id={section.sectionId}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-heading text-lg">{section.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {sectionData?.standards?.length ? `Standards: ${sectionData.standards.join(", ")}` : ""}
                  </div>
                </div>
                <Button
                  onClick={() => fillAnswersForSection(section.sectionId)}
                  disabled={loading || generatingSections.has(section.sectionId) || !hasQuestions}
                  className="flex items-center justify-center"
                >
                  {generatingSections.has(section.sectionId) ? (
                    <EnhancedLoader variant="pulse" size="sm" className="mr-2" />
                  ) : null}
                  Generate Answers
                </Button>
                {/* Navigation buttons */}
                <div className="flex justify-between pt-4 border-t">
                  {index > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => scrollToSection(PLANNING_SECTIONS[index - 1].sectionId)}
                      className="flex items-center gap-2"
                    >
                      <ChevronUp className="h-4 w-4" />
                      Previous Section
                    </Button>
                  )}
                  {index < PLANNING_SECTIONS.length - 1 && (
                    <Button
                      onClick={() => scrollToSection(PLANNING_SECTIONS[index + 1].sectionId)}
                      className="flex items-center gap-2 ml-auto"
                    >
                      Next Section
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {hasQuestions ? (
                <div className="space-y-3">
                  {(sectionData.fields || []).map((f: any) => {
                    const t = normalizeType(f.type)
                    const isTable = t === "table"
                    return (
                      <div key={f.key} className="border rounded p-3 space-y-2">
                        <div className="text-sm font-medium">{f.label} {f.required ? <span className="text-red-500">*</span> : null}</div>
                        {f.help ? <div className="text-xs text-muted-foreground">{f.help}</div> : null}

                        {t === "textarea" ? (
                          <Textarea
                            value={f.answer ?? ""}
                            onChange={(e) => setFieldAnswer(section.sectionId, f.key, e.target.value)}
                            placeholder="Enter your answer..."
                          />
                        ) : t === "text" ? (
                          <Input
                            value={f.answer ?? ""}
                            onChange={(e) => setFieldAnswer(section.sectionId, f.key, e.target.value)}
                            placeholder="Enter your answer..."
                          />
                        ) : t === "number" || t === "currency" ? (
                          <Input
                            type="number"
                            value={f.answer ?? ""}
                            onChange={(e) => setFieldAnswer(section.sectionId, f.key, e.target.valueAsNumber)}
                            placeholder="Enter a number..."
                          />
                        ) : t === "checkbox" ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={!!f.answer}
                              onCheckedChange={(ck) => setFieldAnswer(section.sectionId, f.key, !!ck)}
                            />
                            <span className="text-sm">Yes</span>
                          </div>
                        ) : t === "select" ? (
                          <SelectEditor
                            field={f}
                            onChange={(v) => setFieldAnswer(section.sectionId, f.key, v)}
                          />
                        ) : t === "multiselect" ? (
                          <MultiSelectEditor
                            field={f}
                            onChange={(v) => setFieldAnswer(section.sectionId, f.key, v)}
                          />
                        ) : isTable ? (
                          <TableEditor
                            columns={f.columns}
                            value={Array.isArray(f.answer) ? f.answer : []}
                            onChange={(rows) => setFieldAnswer(section.sectionId, f.key, rows)}
                          />
                        ) : t === "group" ? (
                          <Textarea
                            className="font-mono"
                            value={(() => {
                              try {
                                return JSON.stringify(f.answer ?? {}, null, 2)
                              } catch {
                                return "{}"
                              }
                            })()}
                            onChange={(e) => {
                              try {
                                setFieldAnswer(section.sectionId, f.key, JSON.parse(e.target.value || "{}"))
                              } catch {
                                /* ignore */
                              }
                            }}
                            placeholder='{"childKey": true}'
                          />
                        ) : (
                          <Input
                            value={String(f.answer ?? "")}
                            onChange={(e) => setFieldAnswer(section.sectionId, f.key, e.target.value)}
                            placeholder="Enter your answer..."
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-muted-foreground py-4 text-center">
                  No questions available for this section. Please generate questions first.
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Upload supporting files (optional)</div>
        <input ref={fileInput} type="file" multiple />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => handleSave()}>Save Draft</Button>
        <Button onClick={() => handleSave()}>Proceed to Recommendations</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    </div>
  )
}
export default AIPlanningAnswersStep