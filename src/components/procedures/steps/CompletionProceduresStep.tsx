// File: steps/CompletionProceduresStep.tsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, ArrowLeft, Save, HelpCircle, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"
import clsx from "clsx"

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

function TableEditor({
    field,
    value,
    onChange,
    invalid,
}: {
    field: any
    value: { [key: string]: any }[] | undefined
    onChange: (rows: any[]) => void
    invalid?: boolean
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
        <div className={clsx("border rounded-md overflow-hidden", invalid && "border-destructive/60 ring-1 ring-destructive/40")}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                        <tr>
                            {(field.columns || []).map((c: string) => (
                                <th key={c} className="text-left px-3 py-2 font-medium">{c}</th>
                            ))}
                            <th className="w-14"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-t">
                                {(field.columns || []).map((c: string) => (
                                    <td key={c} className="px-3 py-2">
                                        <Input value={row[c] ?? ""} onChange={(e) => updateCell(rIdx, c, e.target.value)} placeholder={c} />
                                    </td>
                                ))}
                                <td className="px-2 py-2">
                                    <Button type="button" variant="ghost" onClick={() => removeRow(rIdx)}>Remove</Button>
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
                <Button type="button" variant="outline" onClick={addRow}>Add Row</Button>
            </div>
        </div>
    )
}

function GroupField({
    field,
    value,
    onChange,
}: {
    field: any
    value: Record<string, boolean> | undefined
    onChange: (val: Record<string, boolean>) => void
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
                    />
                    <Label htmlFor={`${field.key}_${f.key}`}>{f.label}</Label>
                </div>
            ))}
        </div>
    )
}

const COMPLETION_SECTIONS = [
    { sectionId: "initial_completion", title: "P1: Initial Completion" },
    { sectionId: "audit_highlights_report", title: "P2: Audit Highlights Report" },
    { sectionId: "final_analytical_review", title: "P3: Final Analytical Review" },
    { sectionId: "points_forward_next_year", title: "P4: Points Forward for Next Year" },
    { sectionId: "final_client_meeting_notes", title: "P5: Notes of Final Client Meeting" },
    { sectionId: "summary_unadjusted_errors", title: "P6: Summary of Unadjusted Errors" },
    { sectionId: "reappointment_schedule", title: "P7: Reappointment Schedule" },
];

interface CompletionProceduresStepProps {
    engagement: any
    mode: string
    stepData: any
    onComplete: (data: any) => void
    onBack: () => void
}

export const CompletionProceduresStep: React.FC<CompletionProceduresStepProps> = ({
    engagement,
    mode,
    stepData,
    onComplete,
    onBack,
}) => {
    const [procedures, setProcedures] = useState<any[]>(Array.isArray(stepData.procedures) ? stepData.procedures : [])
    const [saving, setSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const { toast } = useToast()
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const scrollToSection = (sectionId: string) => {
        const sectionElement = sectionRefs.current[sectionId]
        if (sectionElement) {
            sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const getCurrentSectionIndex = (sectionId: string) => {
        return COMPLETION_SECTIONS.findIndex(section => section.sectionId === sectionId)
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
                        scrollToSection(COMPLETION_SECTIONS[currentIndex - 1].sectionId)
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
                    if (currentIndex < COMPLETION_SECTIONS.length - 1) {
                        scrollToSection(COMPLETION_SECTIONS[currentIndex + 1].sectionId)
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
        const ids = [
            "initial_completion"
            , "audit_highlights_report"
            , "final_analytical_review"
            , "points_forward_next_year"
            , "final_client_meeting_notes"
            , "summary_unadjusted_errors"
            , "reappointment_schedule"
        ]
        if (!ids.length) {
            setProcedures([])
            setIsLoading(false)
            return
        }

        const next = ids.map((sectionId: string) => {
            const base = getPredefinedSection(sectionId)
            const prevSec = (procedures || []).find((s: any) => s.sectionId === sectionId)

            const fields = (base.fields || []).map((f: any) => {
                const prev = prevSec?.fields?.find((pf: any) => pf.key === f.key)
                const defaultAnswer =
                    f.type === "checkbox" ? false :
                        f.type === "multiselect" ? [] :
                            f.type === "table" ? [] :
                                f.type === "group" ? {} : ""
                return { ...f, answer: prev?.answer ?? defaultAnswer }
            })

            return {
                id: `completion-${sectionId}`,
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
    }, [JSON.stringify(stepData.selectedSections)])

    const getAnswersMap = (proc: any) =>
        (proc.fields || []).reduce((acc: any, f: any) => ((acc[f.key] = f.answer), acc), {})

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
                            if (!(val instanceof File) && !isNotEmpty(val)) nextErrors[key] = "Please upload a file."
                            break
                        case "markdown":
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
            const input = el.querySelector("input, textarea, select") as HTMLElement | null
            if (input) setTimeout(() => input.focus(), 250)
        }
    }

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
                procedureType: "completion",
                mode: "manual",
            }
            formData.append("data", JSON.stringify(payload))

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

            const response = await authFetch(`${base}/api/completion-procedures/${engagement._id}/save`, {
                method: "POST",
                body: formData,
                headers: {},
            })

            if (!response.ok) {
                const text = await response.text().catch(() => "")
                throw new Error(text || "Failed to save procedures")
            }

            toast({ title: "Saved", description: "Your completion procedures have been saved." })
        } catch (e: any) {
            toast({ title: "Save failed", description: e.message || "Failed to save.", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    const handleProceed = () => {
        const errs = validateAll(procedures)
        if (Object.keys(errs).length > 0) {
            const count = Object.keys(errs).length
            toast({
                title: "Missing required answers",
                description: `Please complete ${count} required ${count === 1 ? "field" : "fields"} before proceeding.`,
                variant: "destructive",
            })
            scrollToFirstError(errs)
            return
        }
        onComplete({ procedures })
    }

    const updateProcedureField = (procedureId: string, fieldKey: string, value: any) => {
        setProcedures((prev) =>
            (prev || []).map((proc) =>
                proc.id === procedureId
                    ? { ...proc, fields: (proc.fields || []).map((f: any) => (f.key === fieldKey ? { ...f, answer: value } : f)) }
                    : proc,
            ),
        )
        setErrors((prev) => {
            const next = { ...prev }
            delete next[`${procedureId}.${fieldKey}`]
            return next
        })
    }

    const totalMissing = useMemo(() => Object.keys(errors).length, [errors])

    return (
        <div className="space-y-6">
            <Card className="relative overflow-hidden">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
                            Completion Procedures (Manual)
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                {saving ? "Saving..." : "Save Progress"}
                            </Button>
                        </div>
                    </div>

                    {(Array.isArray(procedures) ? procedures : []).length > 0 && (
                        <div className="w-auto">
                            <Select onValueChange={(value) => scrollToSection(value)}>
                                <SelectTrigger className="w-auto bg-white text-black border border-black hover:bg-gray-100 focus:bg-gray-100">
                                    <SelectValue placeholder={(Array.isArray(procedures) ? procedures : [])[0]?.title || "Select section"} />
                                </SelectTrigger>
                                <SelectContent className="bg-white text-black border border-gray-200">
                                    {(Array.isArray(procedures) ? procedures : []).map((p) => (
                                        <SelectItem
                                            key={p.sectionId}
                                            value={p.sectionId}
                                            className="bg-white data-[state=checked]:bg-gray-900 data-[state=checked]:text-white [&>svg]:text-white cursor-pointer"
                                        >
                                            {p.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {totalMissing > 0 && (
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

                                                return (
                                                    <div
                                                        key={field.key}
                                                        className={clsx(
                                                            "space-y-3 p-4 rounded-md border bg-card shadow-sm",
                                                            invalid && "border-destructive/60 ring-1 ring-destructive/30 bg-destructive/5"
                                                        )}
                                                        ref={(el) => (fieldRefs.current[fieldKey] = el)}
                                                    >
                                                            <div className="flex items-start gap-2">
                                                            <Label className={clsx("font-body-semibold text-foreground flex-1", invalid && "text-destructive")}>
                                                                {field.label ?? field.key}
                                                                {required && <span className="text-destructive ml-1">*</span>}
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
                                                                        <p className="text-xs text-popover-foreground leading-relaxed whitespace-pre-line">{field.help}</p>
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
                                                                    className={clsx("min-h-24", invalid && "border-destructive focus-visible:ring-destructive")}
                                                                    aria-invalid={invalid || undefined}
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
                                                                            field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value,
                                                                        )
                                                                    }
                                                                    placeholder={`Enter ${field.label?.toLowerCase() || field.key}...`}
                                                                    className={clsx(invalid && "border-destructive focus-visible:ring-destructive")}
                                                                    aria-invalid={invalid || undefined}
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
                                                                        invalid && "border-destructive focus-visible:ring-destructive"
                                                                    )}
                                                                    value={field.answer ?? ""}
                                                                    onChange={(e) => updateProcedureField(procedure.id, field.key, e.target.value)}
                                                                    aria-invalid={invalid || undefined}
                                                                >
                                                                    <option value="" disabled>Select…</option>
                                                                    {(field.options || []).map((opt: string) => (
                                                                        <option key={opt} value={opt}>{opt}</option>
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
                                                                        invalid && "border-destructive focus-visible:ring-destructive"
                                                                    )}
                                                                    value={Array.isArray(field.answer) ? field.answer : []}
                                                                    onChange={(e) => {
                                                                        const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
                                                                        updateProcedureField(procedure.id, field.key, selected)
                                                                    }}
                                                                    aria-invalid={invalid || undefined}
                                                                >
                                                                    {(field.options || []).map((opt: string) => (
                                                                        <option key={opt} value={opt}>{opt}</option>
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
                                                                />
                                                                {invalid && <p className="text-xs text-destructive">{errors[fieldKey]}</p>}
                                                            </>
                                                        )}

                                                        {field.type === "markdown_footer" && (
                                                            <Alert className="mt-4 prose prose-sm max-w-none whitespace-pre-wrap">
                                                                {field.content}
                                                            </Alert>
                                                        )}

                                                        {field.type === "markdown" && field.content && null}
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
                <Button
                    onClick={handleProceed}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                >
                    Proceed to Recommendations
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
function getPredefinedSection(sectionId: string) {
    const sections: Record<string, any> = {
        "initial_completion": {
            title: "P1: Initial Completion",
            standards: ["ISA 220", "ISA 230"],
            fields: [
                {
                    key: "completion_checklist",
                    type: "textarea",
                    label: "Completion Checklist Review",
                    required: true,
                    help: "Review and confirm all completion checklist items have been addressed."
                },
                {
                    key: "documentation_completeness",
                    type: "checkbox",
                    label: "All audit documentation complete and filed",
                    required: true,
                    help: "Confirm all working papers and documentation are complete."
                },
                {
                    key: "management_representation",
                    type: "file",
                    label: "Management Representation Letter",
                    required: true,
                    help: "Upload signed management representation letter."
                },
                {
                    key: "subsequent_events_review",
                    type: "textarea",
                    label: "Subsequent Events Review",
                    required: true,
                    help: "Document review of events occurring after the balance sheet date."
                }
            ],
            footer: {
                type: "markdown",
                content: "**Initial Completion Documentation:** Ensure all completion procedures are properly documented and filed according to ISA 230 requirements."
            }
        },

        "audit_highlights_report": {
            title: "P2: Audit Highlights Report",
            standards: ["ISA 260", "ISA 701"],
            fields: [
                {
                    key: "executive_summary",
                    type: "textarea",
                    label: "Executive Summary",
                    required: true,
                    help: "Provide executive summary of audit findings and key issues."
                },
                {
                    key: "key_findings",
                    type: "table",
                    label: "Key Audit Findings",
                    columns: ["Finding", "Impact", "Recommendation", "Management Response"],
                    required: true,
                    help: "Document key audit findings and management responses."
                },
                {
                    key: "key_audit_matters",
                    type: "textarea",
                    label: "Key Audit Matters (KAMs)",
                    required: true,
                    help: "Describe matters that required significant auditor attention."
                },
                {
                    key: "going_concern_assessment",
                    type: "textarea",
                    label: "Going Concern Assessment",
                    required: true,
                    help: "Document assessment of the entity's ability to continue as a going concern."
                }
            ]
        },

        "final_analytical_review": {
            title: "P3: Final Analytical Review",
            standards: ["ISA 520"],
            fields: [
                {
                    key: "ratio_analysis",
                    type: "table",
                    label: "Final Ratio Analysis",
                    columns: ["Ratio", "Current Year", "Prior Year", "Industry Average", "Variance Analysis"],
                    required: true,
                    help: "Complete final ratio analysis comparing current and prior years."
                },
                {
                    key: "unexpected_relationships",
                    type: "textarea",
                    label: "Unexpected Relationships Investigation",
                    required: true,
                    help: "Document investigation of any unexpected relationships identified."
                },
                {
                    key: "final_analytical_procedures",
                    type: "textarea",
                    label: "Final Analytical Procedures",
                    required: true,
                    help: "Summarize final analytical procedures performed and conclusions."
                }
            ]
        },

        "points_forward_next_year": {
            title: "P4: Points Forward for Next Year",
            standards: ["ISA 220", "ISA 300"],
            fields: [
                {
                    key: "planning_improvements",
                    type: "textarea",
                    label: "Planning Improvements",
                    required: true,
                    help: "Document improvements for next year's audit planning."
                },
                {
                    key: "risk_assessment_updates",
                    type: "textarea",
                    label: "Risk Assessment Updates",
                    required: true,
                    help: "Update risk assessment for next year's audit."
                },
                {
                    key: "staffing_recommendations",
                    type: "textarea",
                    label: "Staffing Recommendations",
                    required: true,
                    help: "Provide staffing recommendations for next year's audit."
                }
            ]
        },

        "final_client_meeting_notes": {
            title: "P5: Notes of Final Client Meeting",
            standards: ["ISA 260"],
            fields: [
                {
                    key: "meeting_attendees",
                    type: "textarea",
                    label: "Meeting Attendees",
                    required: true,
                    help: "List all attendees of the final client meeting."
                },
                {
                    key: "discussion_points",
                    type: "table",
                    label: "Key Discussion Points",
                    columns: ["Topic", "Discussion", "Action Items", "Responsible Party"],
                    required: true,
                    help: "Document key discussion points and action items."
                },
                {
                    key: "management_response_feedback",
                    type: "textarea",
                    label: "Management Response and Feedback",
                    required: true,
                    help: "Document management's response to audit findings and feedback."
                }
            ]
        },

        "summary_unadjusted_errors": {
            title: "P6: Summary of Unadjusted Errors",
            standards: ["ISA 450"],
            fields: [
                {
                    key: "unadjusted_errors_table",
                    type: "table",
                    label: "Unadjusted Errors Summary",
                    columns: ["Error Description", "Financial Statement Impact", "Materiality Assessment", "Rationale for Non-Adjustment"],
                    required: true,
                    help: "Document all unadjusted errors and rationale for non-adjustment."
                },
                {
                    key: "aggregate_impact_assessment",
                    type: "textarea",
                    label: "Aggregate Impact Assessment",
                    required: true,
                    help: "Assess aggregate impact of unadjusted errors on financial statements."
                },
                {
                    key: "communication_tcwg",
                    type: "checkbox",
                    label: "Communicated to Those Charged with Governance",
                    required: true,
                    help: "Confirm unadjusted errors were communicated to TCWG."
                }
            ]
        },

        "reappointment_schedule": {
            title: "P7: Reappointment Schedule",
            standards: ["ISA 220", "ISQM 1"],
            fields: [
                {
                    key: "reappointment_considerations",
                    type: "textarea",
                    label: "Reappointment Considerations",
                    required: true,
                    help: "Document considerations for firm reappointment."
                },
                {
                    key: "independence_confirmation",
                    type: "checkbox",
                    label: "Independence Confirmation for Next Period",
                    required: true,
                    help: "Confirm independence for the next audit period."
                },
                {
                    key: "fee_proposal_next_year",
                    type: "textarea",
                    label: "Fee Proposal for Next Year",
                    required: true,
                    help: "Document fee proposal and basis for next year's audit."
                }
            ]
        }
    }

    return sections[sectionId] || { title: "Unknown Section", fields: [] }
}
