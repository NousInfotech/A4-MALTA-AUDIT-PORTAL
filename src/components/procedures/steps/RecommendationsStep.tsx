// @ts-nocheck
import React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Lightbulb, Save, Loader2, Sparkles, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import ReactMarkdown from "react-markdown"
import NotebookInterface from "../NotebookInterface"

interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  classification?: string
}

interface RecommendationsStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
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

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/** Circular progress ring (SVG) with sweep animation */
const CircularProgress: React.FC<{
  value: number // 0..100
  size?: number // px
  stroke?: number // px
  label?: string
}> = ({ value, size = 120, stroke = 8, label }) => {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = clamp(value, 0, 100)
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* backdrop ring */}
        <svg width={size} height={size} className="block">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb" /* gray-200 */
            strokeWidth={stroke}
            fill="none"
          />
          {/* gradient stroke for the active arc */}
          <defs>
            <linearGradient id="rec-arc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" /> {/* indigo-500 */}
              <stop offset="50%" stopColor="#0ea5e9" /> {/* sky-500 */}
              <stop offset="100%" stopColor="#06b6d4" /> {/* cyan-500 */}
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#rec-arc)"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 140ms linear" }}
          />
        </svg>

        {/* rotating dot on the circumference */}
        <div
          className="absolute inset-0"
          style={{
            transform: `rotate(${(progress / 100) * 360}deg)`,
            transition: "transform 140ms linear",
          }}
        >
          <div
            className="absolute rounded-full bg-white shadow"
            style={{
              width: stroke + 6,
              height: stroke + 6,
              top: (size - (stroke + 6)) / 2,
              left: -3,
            }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400" />
          </div>
        </div>

        {/* center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm font-semibold text-gray-900">{progress}%</div>
        </div>
      </div>

      {label ? <div className="mt-2 text-xs text-gray-500">{label}</div> : null}
    </div>
  )
}

/** Full-screen-ish overlay inside the Card, blocking interactions until done */
const CircularEntryOverlay: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div
      className="absolute inset-0 z-10 rounded-2xl border border-gray-200/70 bg-white/85 backdrop-blur-sm p-6 shadow-md flex flex-col"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {/* subtle pulsing halo behind the circle to match "alive" feel */}
          <div className="size-6 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 opacity-70 blur-[1px]" />
          <div className="absolute inset-0 m-auto size-6 rounded-full bg-white/50 mix-blend-overlay animate-ping" />
        </div>
        <div>
          <div className="text-base font-medium text-gray-900">Generating recommendations…</div>
          <div className="text-sm text-gray-500">Cross-checking procedures and findings.</div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <CircularProgress value={progress} label="Analyzing context" />
      </div>
    </div>
  )
}

export const RecommendationsStep: React.FC<RecommendationsStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [recommendations, setRecommendations] = useState<any>(stepData.recommendations || [])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showNotebookPreview, setShowNotebookPreview] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const { toast } = useToast()

  /** Entry animation control */
  const [entryAnimating, setEntryAnimating] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const generateAIRecommendations = async () => {
    setIsGenerating(true)
    setEntryAnimating(true)
    setProgress(0)
    
    // Start progress animation
    const durationMs = 15000 + Math.random() * 5000
    const start = performance.now()
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

    const progressInterval = setInterval(() => {
      const now = performance.now()
      const t = clamp((now - start) / durationMs, 0, 1)
      setProgress(Math.floor(ease(t) * 100))
    }, 100)

    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")

      const response = await authFetch(`${base}/api/procedures/recommendations`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement._id,
          procedureId: stepData._id,
          framework: stepData.framework || "IFRS",
          classifications: stepData.selectedClassifications || [],
          questions: stepData.questions || []
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to generate recommendations")
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
      
      toast({
        title: "Recommendations Generated",
        description: "AI has generated recommendations based on your procedures.",
      })
    } catch (error: any) {
      console.error("Error generating AI recommendations:", error)
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate AI recommendations. You can enter them manually.",
        variant: "destructive",
      })
    } finally {
      clearInterval(progressInterval)
      setProgress(100)
      setIsGenerating(false)
      setTimeout(() => setEntryAnimating(false), 500)
    }
  }

  const handleSaveProcedures = async () => {
    setSaving(true)
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")

      const procedureData = {
        ...stepData,
        recommendations,
        status: "completed",
        mode,
      }

      const response = await authFetch(`${base}/api/procedures/${engagement._id}`, {
        method: "POST",
        body: JSON.stringify(procedureData),
      })

      if (!response.ok) throw new Error("Failed to save procedures")

      const savedProcedure = await response.json()

      toast({
        title: "Procedures Saved",
        description: "Your audit procedures and recommendations have been saved successfully.",
      })

      onComplete({ ...procedureData, _id: savedProcedure._id })
    } catch (error: any) {
      console.error("Error saving procedures:", error)
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save procedures.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Recommendations Input */}
      <Card className="relative overflow-hidden">
        {/* CIRCULAR ENTRY OVERLAY */}
        {entryAnimating && <CircularEntryOverlay progress={progress} />}

        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Audit Recommendations</CardTitle>
          <div className="flex gap-2">
            {(mode === "ai" || mode === "hybrid") && (!recommendations || (Array.isArray(recommendations) && recommendations.length === 0)) && !isGenerating && (
              <Button onClick={generateAIRecommendations} className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Recommendations
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsNotesOpen(true)} 
              disabled={entryAnimating}
            >
              Preview Report
            </Button>
          </div>
        </CardHeader>

        <CardContent className={`transition-opacity duration-300 ${entryAnimating ? "opacity-0" : "opacity-100"}`}>
          {(!recommendations || (Array.isArray(recommendations) && recommendations.length === 0)) && (mode === "ai" || mode === "hybrid") && !isGenerating ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Recommendations Yet</h3>
              <p className="text-muted-foreground mb-4">
                Click the button above to generate AI-powered recommendations based on your procedures.
              </p>
              <Button onClick={generateAIRecommendations}>
                Generate Recommendations
              </Button>
            </div>
          ) : Array.isArray(recommendations) ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Recommendations are now managed as interactive checklists. Click "Preview Report" to view and edit them.
              </p>
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>
                    {recommendations.length} checklist item{recommendations.length !== 1 ? 's' : ''} generated
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Enter or review audit recommendations..."
                className="min-h-64 font-body"
                disabled={entryAnimating}
              />
              {(mode === "ai" || mode === "hybrid") && (
                <Alert className="mt-3">
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>AI-Generated:</strong> These recommendations are based on your audit procedures. Please review
                    and adjust them for your client.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleSaveProcedures} disabled={saving || entryAnimating} className="flex items-center gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Procedures
            </>
          )}
        </Button>
      </div>

      {/* Notebook Interface for Editing */}
      <NotebookInterface
        isOpen={isNotesOpen}
        isEditable={true}
        onClose={() => setIsNotesOpen(false)}
        recommendations={recommendations}
        onSave={(content) => setRecommendations(content)}
      />

      {/* Notebook Interface for Preview (Read-only) */}
      <NotebookInterface
        isOpen={showNotebookPreview}
        isEditable={false}
        onClose={() => setShowNotebookPreview(false)}
        recommendations={recommendations}
        isPlanning={false}
      />
    </div>
  )
}