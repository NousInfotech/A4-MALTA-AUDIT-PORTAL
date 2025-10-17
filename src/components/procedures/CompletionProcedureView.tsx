// File: CompletionProcedureView.tsx
import React, { useMemo, useRef, useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import FloatingNotesButton from "./FloatingNotesButton"
import NotebookInterface from "./NotebookInterface"

const uid = () => Math.random().toString(36).slice(2, 9)
const withUids = (procedures: any[]) =>
  (Array.isArray(procedures) ? procedures : []).map((sec: any) => ({
    ...sec,
    fields: (sec?.fields || []).map((f: any) => ({ __uid: f.__uid || uid(), ...f })),
  }))

const normalizeType = (t?: string) => {
  const v = String(t || "").toLowerCase()
  if (v === "textfield") return "text"
  if (v === "selection") return "select"
  return v
}

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

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-muted-foreground">{children}</div>
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
            <Checkbox
              checked={checked}
              onCheckedChange={(ck) => {
                if (!!ck) onChange([...valueArray, opt])
                else onChange(valueArray.filter((x: string) => x !== opt))
              }}
            />
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
      <option value="" disabled>
        Select…
      </option>
      {opts.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

function TableDisplay({ columns, rows }: { columns?: string[]; rows?: any[] }) {
  const cols = Array.isArray(columns) && columns.length ? columns : []
  const data = Array.isArray(rows) ? rows : []
  if (!cols.length) return <div className="text-sm text-muted-foreground">No columns defined.</div>
  if (!data.length) return <div className="text-sm text-muted-foreground">No rows.</div>
  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, idx: number) => (
            <tr key={idx} className="border-t">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2">
                  {String(row?.[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

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
    cols.forEach((c) => {
      empty[c] = ""
    })
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
                <th key={c} className="px-3 py-2 text-left font-medium">
                  {c}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-t">
                <td className="px-3 py-2 text-muted-foreground" colSpan={cols.length + 1}>
                  No rows. Click "Add row".
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-t">
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2">
                      <Input value={String(row?.[c] ?? "")} onChange={(e) => updateCell(rIdx, c, e.target.value)} />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" onClick={() => removeRow(rIdx)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="outline" onClick={addRow}>
        + Add row
      </Button>
    </div>
  )
}

function isNotEmpty(val: any) {
  if (val === null || val === undefined) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === "object") return Object.keys(val).length > 0
  return String(val).trim() !== ""
}

function evaluateCondition(fieldValue: any, cond: { operator?: string; value?: any }) {
  const op = cond?.operator
  const v = cond?.value
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
  const clauses = field.visibleIf as any
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

function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return ''
  const b = Number(bytes || 0)
  if (b === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return `${parseFloat((b / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
}

export const CompletionProcedureView: React.FC<{
  procedure: any
  engagement?: any
}> = ({ procedure: initial, engagement }) => {
  const [editMode, setEditMode] = useState(false)
  const [proc, setProc] = useState<any>(() => {
    const initialWithUids = { ...(initial || {}) }
    initialWithUids.procedures = withUids(initialWithUids.procedures || [])
    return initialWithUids
  })

  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>(() => {
    const recs = initial?.recommendations || [];
    if (Array.isArray(recs)) {
      return recs;
    } else if (typeof recs === 'string') {
      try {
        const parsed = JSON.parse(recs);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (initial) {
      const initialWithUids = { ...(initial || {}) }
      initialWithUids.procedures = withUids(initialWithUids.procedures || [])
      setProc(initialWithUids)
    }
  }, [initial])

  useEffect(() => {
    const recs = initial?.recommendations || [];
    if (Array.isArray(recs)) {
      setRecommendations(recs);
    } else if (typeof recs === 'string') {
      try {
        const parsed = JSON.parse(recs);
        setRecommendations(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecommendations([]);
      }
    } else {
      setRecommendations([]);
    }
  }, [initial?.recommendations])

  const handleSaveRecommendations = async (content: string | any[]) => {
    try {
      let recommendationsToSave: any[];
      
      if (Array.isArray(content)) {
        recommendationsToSave = content;
      } else if (typeof content === 'string') {
        recommendationsToSave = content
          .split('\n')
          .filter(line => line.trim())
          .map((line, index) => ({
            id: `rec-${Date.now()}-${index}`,
            text: line.trim(),
            checked: false,
            section: 'general'
          }));
      } else {
        recommendationsToSave = [];
      }
      
      setRecommendations(recommendationsToSave)
      
      const form = new FormData()
      const cleanedProcedures = (Array.isArray(proc.procedures) ? proc.procedures : []).map((sec) => ({
        ...sec,
        fields: (sec.fields || []).map(({ __uid, ...rest }) => rest),
      }))
      
      const payload = {
        ...proc,
        procedures: cleanedProcedures,
        recommendations: recommendationsToSave,
        status: proc.status || "in-progress",
        procedureType: "completion",
      }
      
      form.append("data", JSON.stringify(payload))
      
      const engagementId = proc.engagement || engagement?._id
      const res = await authFetch(`${base}/api/completion-procedures/${engagement?._id}/save`, {
        method: "POST",
        body: form,
      })
      
      if (!res.ok) throw new Error("Save failed")
      const saved = await res.json()
      
      const savedWithUids = {
        ...saved,
        procedures: withUids(saved?.procedures || []),
      }
      setProc(savedWithUids)
      setRecommendations(Array.isArray(saved?.recommendations) ? saved.recommendations : [])
      
      toast({ 
        title: "Notes Saved", 
        description: "Your completion recommendations have been updated and saved to the database." 
      })
    } catch (e: any) {
      toast({ 
        title: "Save failed", 
        description: e.message, 
        variant: "destructive" 
      })
      setRecommendations(proc?.recommendations || [])
    }
  }

  const fileInput = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const base = import.meta.env.VITE_APIURL

  const statusBadge = useMemo(() => {
    const status = proc?.status || "draft"
    const map: any = {
      draft: { variant: "secondary", label: "Draft" },
      "in-progress": { variant: "default", label: "In Progress" },
      completed: { variant: "default", label: "Completed" },
    }
    return <Badge variant={map[status]?.variant || "secondary"}>{map[status]?.label || "Draft"}</Badge>
  }, [proc?.status])

  const setField = (sIdx: number, fieldUid: string, patch: any) => {
    setProc((prev: any) => {
      const next = { ...prev }
      const sections = [...(next.procedures || [])]
      const sec = { ...sections[sIdx] }
      sec.fields = (sec.fields || []).map((f: any) => (f.__uid === fieldUid ? { ...f, ...patch } : f))
      sections[sIdx] = sec
      next.procedures = sections
      return next
    })
  }

  const changeKey = (sIdx: number, fieldUid: string, newKey: string) => {
    const cleaned = (newKey || "").trim().replace(/\s+/g, "_")
    setProc((prev: any) => {
      const next = { ...prev }
      const sections = [...(next.procedures || [])]
      const sec = { ...sections[sIdx] }
      const fields = [...(sec.fields || [])]
      const self = fields.find((f: any) => f.__uid === fieldUid)
      if (!self) return prev
      if (!cleaned) return prev
      const dup = fields.some((f: any) => f.__uid !== fieldUid && f.key === cleaned)
      if (dup) return prev
      self.key = cleaned
      sec.fields = fields
      sections[sIdx] = sec
      next.procedures = sections
      return next
    })
  }

  const addQuestion = (sIdx: number) => {
    setProc((prev: any) => {
      const next = { ...prev }
      const sections = [...(next.procedures || [])]
      const sec = { ...sections[sIdx] }
      const fields = [...(sec.fields || [])]
      const baseKey = "new_question"
      const existing = new Set(fields.map((f) => f.key))
      let k = baseKey,
        i = 1
      while (existing.has(k)) k = `${baseKey}_${i++}`
      fields.push({ __uid: uid(), key: k, type: "text", label: "New Question", required: false, help: "" })
      sec.fields = fields
      sections[sIdx] = sec
      next.procedures = sections
      return next
    })
  }

  const removeQuestion = (sIdx: number, fieldUid: string) => {
    setProc((prev: any) => {
      const next = { ...prev }
      const sections = [...(next.procedures || [])]
      const sec = { ...sections[sIdx] }
      sec.fields = (sec.fields || []).filter((f: any) => f.__uid !== fieldUid)
      sections[sIdx] = sec
      next.procedures = sections
      return next
    })
  }

  const save = async (asCompleted = false) => {
    try {
      const form = new FormData()
      const cleanedProcedures = (Array.isArray(proc.procedures) ? proc.procedures : []).map((sec) => ({
        ...sec,
        fields: (sec.fields || []).map(({ __uid, ...rest }) => rest),
      }))
      
      const payload = {
        ...proc,
        procedures: cleanedProcedures,
        recommendations: Array.isArray(recommendations) ? recommendations : [],
        status: asCompleted ? "completed" : proc.status || "in-progress",
        procedureType: "completion",
      }
      
      form.append("data", JSON.stringify(payload))
      if (fileInput.current?.files?.length) {
        Array.from(fileInput.current.files).forEach((f) => form.append("files", f))
      }
      
      const engagementId = proc.engagement || engagement?._id
      const res = await authFetch(`${base}/api/completion-procedures/${engagement?._id}/save`, {
        method: "POST",
        body: form,
      })
      
      if (!res.ok) throw new Error("Save failed")
      const saved = await res.json()
      
      const savedWithUids = {
        ...saved,
        procedures: withUids(saved?.procedures || []),
      }
      setProc(savedWithUids)
      setRecommendations(Array.isArray(saved?.recommendations) ? saved.recommendations : [])
      toast({ title: "Saved", description: asCompleted ? "Marked completed." : "Changes saved." })
      setEditMode(false)
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    }
  }

  const makeAnswers = (sec: any) =>
    (sec.fields || []).reduce((acc: any, f: any) => {
      acc[f.key] = f.answer
      return acc
    }, {})

  if (!proc) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-xl">Completion Procedures</CardTitle>
            <div className="flex items-center gap-2">
              {statusBadge}
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-purple-500" /> Completion
              </Badge>
            </div>
          </div>
          <div className="text-sm text-muted-foreground font-body">Mode: {proc.mode?.toUpperCase() || "MANUAL"}</div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex gap-2">
            {!editMode ? (
              <Button onClick={() => setEditMode(true)}>Edit</Button>
            ) : (
              <>
                <Button onClick={() => save(false)}>Save</Button>
                <Button variant="outline" onClick={() => save(true)}>
                  Save & Complete
                </Button>
                <Button variant="ghost" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Attach files (optional)</div>
            <input ref={fileInput} type="file" multiple disabled={!editMode} />
          </div>

          {Array.isArray(proc.files) && proc.files.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-sm font-medium">Uploaded files</div>
              <ul className="space-y-2">
                {proc.files.map((f: any) => (
                  <li key={f.id || f.url} className="flex items-center justify-between">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {f.name}
                    </a>
                    <div className="text-xs text-muted-foreground ml-4">{formatBytes(f.size)} • {f.mimetype}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(proc.procedures) && proc.procedures.length > 0 ? (
            proc.procedures.map((sec: any, sIdx: number) => {
              const answers = makeAnswers(sec)
              return (
                <div key={sec.id || sIdx} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading text-lg">{sec.title}</div>
                      {sec.standards?.length ? (
                        <div className="text-xs text-muted-foreground">Standards: {sec.standards.join(", ")}</div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{sec.currency || "EUR"}</Badge>
                      {editMode && (
                        <Button size="sm" variant="outline" onClick={() => addQuestion(sIdx)}>
                          + Add Question
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(sec.fields || []).map((f: any) => {
                      const t = normalizeType(f.type)
                      const isTable = t === "table"
                      if (!isFieldVisible(f, answers)) return null
                      if (f.key !== "documentation_reminder")
                        return (
                          <div key={f.__uid} className="border rounded p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">{f.label || f.key}</div>
                              {editMode && (
                                <Button size="sm" variant="ghost" onClick={() => removeQuestion(sIdx, f.__uid)}>
                                  Remove
                                </Button>
                              )}
                            </div>

                            {editMode && (
                              <div className="grid md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <SmallLabel>Key</SmallLabel>
                                  <Input value={f.key} onChange={(e) => changeKey(sIdx, f.__uid, e.target.value)} />
                                  <SmallLabel>Label</SmallLabel>
                                  <Input value={f.label ?? ""} onChange={(e) => setField(sIdx, f.__uid, { label: e.target.value })} />
                                  <div className="flex items-center gap-2 mt-2">
                                    <Checkbox checked={!!f.required} onCheckedChange={(ck) => setField(sIdx, f.__uid, { required: !!ck })} />
                                    <SmallLabel>Required</SmallLabel>
                                  </div>
                                  <SmallLabel >Help</SmallLabel>
                                  <Textarea value={f.help ?? ""} onChange={(e) => setField(sIdx, f.__uid, { help: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                  <SmallLabel>Type</SmallLabel>
                                  <select
                                    className="w-full border rounded px-3 py-2 bg-background"
                                    value={f.type}
                                    onChange={(e) => setField(sIdx, f.__uid, { type: e.target.value })}
                                  >
                                    {[
                                      "text",
                                      "textarea",
                                      "checkbox",
                                      "number",
                                      "currency",
                                      "select",
                                      "multiselect",
                                      "table",
                                      "group",
                                      "textfield",
                                      "selection",
                                    ].map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>

                                  {(t === "select" || t === "multiselect") && (
                                    <>
                                      <SmallLabel>Options (comma-separated)</SmallLabel>
                                      <Input
                                        value={(f.options || []).join(", ")}
                                        onChange={(e) =>
                                          setField(sIdx, f.__uid, {
                                            options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                                          })
                                        }
                                        placeholder="Option A, Option B"
                                      />
                                    </>
                                  )}

                                  {isTable && (
                                    <>
                                      <SmallLabel>Columns (comma-separated)</SmallLabel>
                                      <Input
                                        value={(f.columns || []).join(", ")}
                                        onChange={(e) =>
                                          setField(sIdx, f.__uid, {
                                            columns: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                                          })
                                        }
                                        placeholder="Col1, Col2"
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {!editMode ? (
                              <>
                                {t === "multiselect" && (
                                  <div className="mt-1 text-sm">
                                    {(Array.isArray(f.answer) ? f.answer : []).join(", ") || "—"}
                                  </div>
                                )}

                                {isTable && (
                                  <TableDisplay columns={f.columns} rows={Array.isArray(f.answer) ? f.answer : []} />
                                )}

                                {t === "group" && !isTable && (
                                  <div className="mt-1 text-sm">
                                    {(() => {
                                      const val = f.answer && typeof f.answer === "object" ? f.answer : {}
                                      const keys = Object.keys(val).filter((k) => !!val[k])
                                      if (!keys.length) return "—"
                                      const labels =
                                        (f.fields || [])
                                          .filter((ff: any) => keys.includes(ff.key))
                                          .map((ff: any) => ff.label || ff.key)
                                      return labels.length ? labels.join(", ") : keys.join(", ")
                                    })()}
                                  </div>
                                )}

                                {!isTable && t !== "multiselect" && t !== "group" && (
                                  <div className="mt-1 text-sm">{String(f.answer ?? "—")}</div>
                                )}
                              </>
                            ) : (
                              <>
                                  <SmallLabel>Answer</SmallLabel>

                                {t === "textarea" ? (
                                  <Textarea value={f.answer ?? ""} onChange={(e) => setField(sIdx, f.__uid, { answer: e.target.value })} />
                                ) : t === "text" ? (
                                  <Input value={f.answer ?? ""} onChange={(e) => setField(sIdx, f.__uid, { answer: e.target.value })} />
                                ) : t === "number" || t === "currency" ? (
                                  <Input
                                    type="number"
                                    value={f.answer ?? ""}
                                    onChange={(e) => setField(sIdx, f.__uid, { answer: e.target.value === "" ? "" : e.target.valueAsNumber })}
                                  />
                                ) : t === "checkbox" ? (
                                  <div className="flex items-center gap-2">
                                    <Checkbox checked={!!f.answer} onCheckedChange={(ck) => setField(sIdx, f.__uid, { answer: !!ck })} />
                                    <span className="text-sm">Yes</span>
                                  </div>
                                ) : t === "select" ? (
                                  <SelectEditor field={f} onChange={(v) => setField(sIdx, f.__uid, { answer: v })} />
                                ) : t === "multiselect" ? (
                                  <MultiSelectEditor field={f} onChange={(v) => setField(sIdx, f.__uid, { answer: v })} />
                                ) : isTable ? (
                                  <TableEditor
                                    columns={f.columns}
                                    value={Array.isArray(f.answer) ? f.answer : []}
                                    onChange={(rows) => setField(sIdx, f.__uid, { answer: rows })}
                                  />
                                ) : t === "group" ? (
                                  <div className="flex flex-col gap-2">
                                    {(f.fields || []).map((child: any) => {
                                      const val = (f.answer && typeof f.answer === "object" ? f.answer : {}) as any
                                      const checked = !!val[child.key]
                                      return (
                                        <label key={child.key} className="flex items-center gap-2">
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={(ck) => {
                                              const next = { ...(val || {}) }
                                              next[child.key] = !!ck
                                              setField(sIdx, f.__uid, { answer: next })
                                            }}
                                          />
                                          <span className="text-sm">{child.label || child.key}</span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                ) : t === "file" ? (
                                  <Input value={"scajsnasj"} onChange={(e) => setField(sIdx, f.__uid, { answer: e.target.value })} />
                                ) : (
                                  <Input value={String(f.answer ?? "")} onChange={(e) => setField(sIdx, f.__uid, { answer: e.target.value })} />
                                )}
                              </>
                            )}
                          </div>
                        )
                    })}
                  </div>

                  {(() => {
                    const footerText =
                      typeof sec.footer === "string" ? sec.footer : sec.footer?.content ? sec.footer.content : ""
                    return footerText ? (
                      <div className="text-xs text-muted-foreground">{footerText}</div>
                    ) : null
                  })()}
                </div>
              )
            })
          ) : (
            <div className="text-muted-foreground">No sections.</div>
          )}
        </CardContent>
      </Card>

      <FloatingNotesButton onClick={() => setIsNotesOpen(true)} isOpen={isNotesOpen} />

      <NotebookInterface
        isOpen={isNotesOpen}
        isEditable={true}
        onClose={() => setIsNotesOpen(false)}
        recommendations={recommendations}
        onSave={handleSaveRecommendations}
        isPlanning={false}
      />
    </div>
  )
}