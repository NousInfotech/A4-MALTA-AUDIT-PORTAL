// @ts-nocheck
import React, { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

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
                <td className="px-3 py-2 text-muted-foreground" colSpan={cols.length + 1}>No rows. Click “Add row”.</td>
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

export const AIPlanningAnswersStep: React.FC<{
  engagement: any
  mode: "ai" | "hybrid"
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}> = ({ engagement, mode, stepData, onComplete, onBack }) => {
  const [procedures, setProcedures] = useState<any[]>(stepData.procedures || [])
  const [loading, setLoading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fillAnswers = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedures }),
      })
      if (!res.ok) throw new Error("Failed to generate answers")
      const data = await res.json()
      setProcedures(data.procedures || [])
      toast({ title: "Answers Generated", description: "Review & edit before saving." })
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (asCompleted = true) => {
    try {
      const base = import.meta.env.VITE_APIURL
      const form = new FormData()
      form.append("data", JSON.stringify({
        ...stepData,
        procedures,
        status: asCompleted ? "completed" : "in-progress",
        procedureType: "planning",
        mode,
      }))

      if (fileInput.current?.files?.length) {
        Array.from(fileInput.current.files).forEach((f) => form.append("files", f))
      }

      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/save`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) throw new Error("Save failed")
      const saved = await res.json()
      toast({ title: "Saved", description: asCompleted ? "Planning procedures completed." : "Draft saved." })
      onComplete(saved)
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    }
  }

  // basic editors
  const setFieldAnswer = (secIdx: number, key: string, value: any) => {
    setProcedures((prev) => {
      const next = [...prev]
      const sec = { ...next[secIdx] }
      sec.fields = (sec.fields || []).map((f: any) => f.key === key ? { ...f, answer: value } : f)
      next[secIdx] = sec
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Step-2: Ask AI to fill answers, then edit as needed. You can also upload files to store in the engagement library (Planning).
      </div>
      <div className="flex gap-2">
        <Button disabled={loading} onClick={fillAnswers}>AI: Generate Answers</Button>
        <Button variant="outline" onClick={() => handleSave(false)}>Save Draft</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>

      <div className="space-y-4">
        {procedures.map((sec: any, sIdx: number) => (
          <div key={sec.id} className="border rounded p-4 space-y-3">
            <div className="font-heading">{sec.title}</div>
            {(sec.fields || []).map((f: any) => {
              const t = normalizeType(f.type)
              const isTable = t === "table"
              return (
                <div key={f.key} className="border rounded p-3 space-y-2">
                  <div className="text-sm font-medium">{f.label} {f.required ? <span className="text-red-500">*</span> : null}</div>
                  {f.help ? <div className="text-xs text-muted-foreground">{f.help}</div> : null}

                  {t === "textarea" ? (
                    <Textarea value={f.answer ?? ""} onChange={(e) => setFieldAnswer(sIdx, f.key, e.target.value)} />
                  ) : t === "text" ? (
                    <Input value={f.answer ?? ""} onChange={(e) => setFieldAnswer(sIdx, f.key, e.target.value)} />
                  ) : t === "number" || t === "currency" ? (
                    <Input type="number" value={f.answer ?? ""} onChange={(e) => setFieldAnswer(sIdx, f.key, e.target.valueAsNumber)} />
                  ) : t === "checkbox" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox checked={!!f.answer} onCheckedChange={(ck) => setFieldAnswer(sIdx, f.key, !!ck)} />
                      <span className="text-sm">Yes</span>
                    </div>
                  ) : t === "select" ? (
                    <SelectEditor field={f} onChange={(v) => setFieldAnswer(sIdx, f.key, v)} />
                  ) : t === "multiselect" ? (
                    <MultiSelectEditor field={f} onChange={(v) => setFieldAnswer(sIdx, f.key, v)} />
                  ) : isTable ? (
                    <TableEditor
                      columns={f.columns}
                      value={Array.isArray(f.answer) ? f.answer : []}
                      onChange={(rows) => setFieldAnswer(sIdx, f.key, rows)}
                    />
                  ) : t === "group" ? (
                    <Textarea
                      className="font-mono"
                      value={(() => { try { return JSON.stringify(f.answer ?? {}, null, 2) } catch { return "{}" } })()}
                      onChange={(e) => {
                        try { setFieldAnswer(sIdx, f.key, JSON.parse(e.target.value || "{}")) }
                        catch { /* ignore */ }
                      }}
                      placeholder='{"childKey": true}'
                    />
                  ) : (
                    <Input value={String(f.answer ?? "")} onChange={(e) => setFieldAnswer(sIdx, f.key, e.target.value)} />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Upload supporting files (optional)</div>
        <input ref={fileInput} type="file" multiple />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => handleSave(false)}>Save Draft</Button>
        <Button onClick={() => handleSave(true)}>Save & Finish</Button>
      </div>
    </div>
  )
}
