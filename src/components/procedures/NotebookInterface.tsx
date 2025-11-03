import React, { useMemo, useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Edit3, Save, BookOpenCheck, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'

interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  section?: string
  classification?: string
}

interface NotebookInterfaceProps {
  isOpen: boolean
  isEditable: boolean
  onClose: () => void
  recommendations: string | ChecklistItem[]
  isPlanning: boolean
  onSave?: (content: string | ChecklistItem[]) => void
  dismissible?: boolean
}

function formatClassificationForDisplay(classification?: string): string {
  if (!classification) return 'General'
  const parts = classification.split(' > ')
  return parts[parts.length - 1] || classification
}

// Helper function to convert checklist items to display format
export function transformChecklistToDisplay(checklist: ChecklistItem[]): string {
  if (!Array.isArray(checklist)) return ''
  
  const bySection = checklist.reduce((acc, item) => {
    const sectionId = item.section || 'general'
    if (!acc[sectionId]) acc[sectionId] = []
    acc[sectionId].push(item)
    return acc
  }, {} as Record<string, ChecklistItem[]>)

  let output = ''
  
  Object.entries(bySection).forEach(([sectionId, items]) => {
    const sectionTitle = getSectionTitle(sectionId)
    output += `### ${sectionTitle}\n\n`
    
    items.forEach(item => {
      const checkbox = item.checked ? '[x]' : '[ ]'
      output += `${checkbox} ${item.text}\n`
    })
    
    output += '\n'
  })
  
  return output
}

function getSectionTitle(sectionId: string): string {
  const sectionTitles: Record<string, string> = {
    "section1": "Engagement Setup, Acceptance & Independence",
    "section2": "Understanding the Entity & Its Environment", 
    "section3": "Materiality & Risk Summary",
    "section4": "Risk Register & Audit Response Planning",
    "section5": "Fraud Risk & Going Concern Planning",
    "section6": "Compliance with Laws & Regulations (ISA 250)",
    "engagement_setup_acceptance_independence": "Engagement Setup, Acceptance & Independence",
    "understanding_entity_environment": "Understanding the Entity & Its Environment",
    "materiality_risk_summary": "Materiality & Risk Summary",
    "risk_response_planning": "Risk Register & Audit Response Planning",
    "fraud_gc_planning": "Fraud Risk & Going Concern Planning",
    "compliance_laws_regulations": "Compliance with Laws & Regulations (ISA 250)",
    "general": "General Recommendations"
  }
  
  return sectionTitles[sectionId] || sectionId
}

// Map slug-style section headers (e.g., initial_completion) to display titles
function mapSlugToTitle(slug: string): string {
  const map: Record<string, string> = {
    "initial_completion": "P1: Initial Completion",
    "audit_highlights_report": "P2: Audit Highlights Report",
    "final_analytical_review": "P3: Final Analytical Review",
    "points_forward_next_year": "P4: Points Forward for Next Year",
    "final_client_meeting_notes": "P5: Notes of Final Client Meeting",
    "summary_unadjusted_errors": "P6: Summary of Unadjusted Errors",
    "reappointment_schedule": "P7: Reappointment Schedule",
  }
  return map[slug] || getSectionTitle(slug)
}

// Helper function to parse display format back to checklist
function parseDisplayToChecklist(content: string): ChecklistItem[] {
  const items: ChecklistItem[] = []
  const lines = content.split('\n')
  let currentSection = 'general'
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    
    // Check for section headers
    // Accept either human titles or slug-style headers (### initial_completion)
    const sectionMatch = trimmed.match(/^###\s+(.+)$/)
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim()
      // If it's a known slug (contains underscore and matches our map), use it
      if (/^[a-z0-9_]+$/.test(sectionName)) {
        const mapped = Object.entries({
          "initial_completion": "initial_completion",
          "audit_highlights_report": "audit_highlights_report",
          "final_analytical_review": "final_analytical_review",
          "points_forward_next_year": "points_forward_next_year",
          "final_client_meeting_notes": "final_client_meeting_notes",
          "summary_unadjusted_errors": "summary_unadjusted_errors",
          "reappointment_schedule": "reappointment_schedule"
        }).find(([k]) => k === sectionName)?.[1]
        currentSection = mapped || 'general'
        return
      }

      // Reverse lookup existing titles
      const sectionId = Object.entries({
        "Engagement Setup, Acceptance & Independence": "section1",
        "Understanding the Entity & Its Environment": "section2",
        "Materiality & Risk Summary": "section3",
        "Risk Register & Audit Response Planning": "section4",
        "Fraud Risk & Going Concern Planning": "section5",
        "Compliance with Laws & Regulations (ISA 250)": "section6"
      }).find(([title]) => title === sectionName)?.[1] || 'general'

      currentSection = sectionId
      return
    }
    
    // Check for checklist items
    const checkboxMatch = trimmed.match(/^(\s*)(\[(x| )\])\s+(.+)$/i)
    if (checkboxMatch) {
      const [, , , checkState, text] = checkboxMatch
      const checked = checkState.toLowerCase() === 'x'
      
      items.push({
        id: `item-${Date.now()}-${index}`,
        text: text.trim(),
        checked,
        section: currentSection
      })
    }
  })
  
  return items
}

function transformRecommendationsForDisplay(input?: string | ChecklistItem[]): string {
  if (!input) return ''
  
  // If it's already a checklist, convert to display format
  if (Array.isArray(input)) {
    return transformChecklistToDisplay(input)
  }
  
  // Legacy string format handling
  if (typeof input !== 'string') return ''
  
  return input
    .split('\n')
    .map((line) => {
      const raw = line
      let body = raw.replace(/^\s*(?:[-+*]\s+|\d+\.\s+)/, '').trim()
      if (!body) return raw

      body = body
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .trim()

      body = body.replace(/\*+(?=[^\w]|$)/g, '')

      const looksHierarchical = body.includes(' > ')
      const knownTopLevels = new Set(['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses'])
      
      if (looksHierarchical || knownTopLevels.has(body)) {
        const display = formatClassificationForDisplay(body)
        return `### ${display}`
      }
      const leadingWS = raw.match(/^\s*/)?.[0] ?? ''
      return leadingWS + body
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

function transformPlanningRecommendationsForDisplay(input?: string | ChecklistItem[]): string {
  if (!input) return ''
  
  // If it's already a checklist, convert to display format
  if (Array.isArray(input)) {
    return transformChecklistToDisplay(input)
  }
  
  // Legacy string format handling
  if (typeof input !== 'string') return ''

  const lines = input.split('\n')
  let output = ''
  let currentSection = ''
  let inBulletList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // match your headings like "### Section: Engagement Setup..."
    const sectionMatch = line.match(/^#{1,3}\s*Section:\s*(.+)/i)
    if (sectionMatch) {
      if (currentSection) output += '\n'
      currentSection = sectionMatch[1].trim()
      output += `### ${currentSection}\n\n`
      inBulletList = false
      continue
    }

    // turn inline numbered recommendations into bullets
    // e.g. "1) Conduct substantive testing..."
    const numberedBullets = line.match(/\d+\)\s+[^)]+/g)
    if (numberedBullets && currentSection) {
      numberedBullets.forEach((item) => {
        output += `- ${item.replace(/^\d+\)\s*/, '')}\n`
      })
      continue
    }

    // fallback plain text
    output += `${line}\n\n`
  }

  return output
}

const NotebookInterface: React.FC<NotebookInterfaceProps> = ({
  isOpen,
  isEditable,
  onClose,
  recommendations,
  onSave,
  isPlanning,
  dismissible = true,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Initialize content based on recommendations type
  useEffect(() => {
    if (Array.isArray(recommendations)) {
      setChecklistItems(recommendations)
      setEditedContent(transformChecklistToDisplay(recommendations))
    } else {
      setEditedContent(recommendations || '')
      // Convert legacy string to checklist if needed
      if (recommendations && typeof recommendations === 'string') {
        const parsed = parseDisplayToChecklist(recommendations)
        if (parsed.length > 0) {
          setChecklistItems(parsed)
        }
      }
    }
  }, [recommendations])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
      textareaRef.current.selectionEnd = textareaRef.current.value.length
    }
  }, [isEditing])

  const handleSave = () => {
    let contentToSave: string | ChecklistItem[]
    
    if (isEditing) {
      // If editing text, parse back to checklist
      const parsedChecklist = parseDisplayToChecklist(editedContent)
      contentToSave = parsedChecklist
      setChecklistItems(parsedChecklist)
    } else {
      // If using checklist interface, use the checklist items
      contentToSave = checklistItems
    }
    
    onSave?.(contentToSave)
    setIsEditing(false)
    toast({
      title: 'Notes Saved',
      description: 'Your audit recommendations have been updated.',
    })
  }

  const handleCancel = () => {
    if (Array.isArray(recommendations)) {
      setChecklistItems(recommendations)
      setEditedContent(transformChecklistToDisplay(recommendations))
    } else {
      setEditedContent(recommendations || '')
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      return
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleCheckboxToggle = (itemId: string) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    )
  }

  const handleCheckboxSave = () => {
    onSave?.(checklistItems)
    toast({
      title: 'Checklist Updated',
      description: 'Your checklist has been saved.',
    })
  }

  const displayRecommendations = useMemo(() => {
    const content = recommendations || ''
    return isPlanning 
      ? transformPlanningRecommendationsForDisplay(content)
      : transformRecommendationsForDisplay(content)
  }, [recommendations, isPlanning])

  const hasContent = Array.isArray(recommendations) 
    ? recommendations.length > 0
    : displayRecommendations.trim().length > 0

  if (!isOpen) return null

  return (
    <>
      {dismissible && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'fixed inset-4 z-50 max-w-4xl mx-auto',
          ' bg-brand-body border border-amber-200 rounded-2xl shadow-2xl',
          'transform transition-all duration-500 ease-out',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
          !dismissible && 'relative inset-0 max-w-none mx-0 shadow-none'
        )}
      >
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-red-800 rounded-l-2xl">
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-amber-100/60" />
            ))}
          </div>
        </div>

        <div className="absolute inset-0 ml-12 opacity-30 pointer-events-none">
          <div
            className="h-full bg-repeat-y bg-[length:100%_24px]"
            style={{
              backgroundImage:
                'linear-gradient(transparent 23px, #d1d5db 23px, #d1d5db 24px, transparent 24px)',
            }}
          />
        </div>

        <div className="relative ml-12 p-8 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BookOpenCheck className="h-6 w-6 text-amber-800" />
              <h2 className="text-2xl font-bold text-amber-900 font-serif">
                Audit Recommendations
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {isEditable && (
                <>
                  {!isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="bg-inherit text-amber-700 hover:bg-gray-100"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Notes
                      </Button>
                      {Array.isArray(recommendations) && (
                        <Button
                          size="sm"
                          onClick={handleCheckboxSave}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Checklist
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={handleCancel}
                        className="bg-inherit text-amber-700 hover:bg-gray-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </>
                  )}
                </>
              )}
              {dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-amber-700 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="mb-4 pb-2 border-b border-gray-300">
            <p className="text-sm text-muted-foreground font-serif italic">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <ScrollArea className="flex-1">
            {isEditing ? (
              <Textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your audit recommendations here... Use ### for sections and [ ] or [x] for checklist items"
                className={cn(
                  'min-h-96 bg-transparent border-none resize-none',
                  'text-amber-800 placeholder:text-amber-500',
                  'font-serif leading-relaxed text-base',
                  'focus:ring-0 focus:outline-none'
                )}
                style={{ whiteSpace: 'pre-wrap' }}
              />
            ) : Array.isArray(recommendations) ? (
              // Checklist View
              <div className="space-y-6">
                {checklistItems.length > 0 ? (
                  Object.entries(
                    checklistItems.reduce((acc, item) => {
                      // Group by classification if it exists, otherwise by section
                      const groupKey = item.classification 
                        ? `classification_${item.classification}` 
                        : `section_${item.section || 'general'}`
                      
                      if (!acc[groupKey]) acc[groupKey] = []
                      acc[groupKey].push(item)
                      return acc
                    }, {} as Record<string, ChecklistItem[]>)
                  ).map(([groupKey, items]) => {
                    // Determine the display title based on the group key
                    let displayTitle = ''
                    if (groupKey.startsWith('classification_')) {
                      const classification = groupKey.replace('classification_', '')
                      displayTitle = formatClassificationForDisplay(classification)
                    } else if (groupKey.startsWith('section_')) {
                      const sectionId = groupKey.replace('section_', '')
                      displayTitle = getSectionTitle(sectionId)
                    }
                    
                    return (
                      <div key={groupKey} className="space-y-3">
                        <h3 className="text-xl font-semibold text-amber-800 font-serif">
                          {displayTitle}
                        </h3>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-start space-x-3 p-2 rounded hover:bg-amber-100/50">
                              <Checkbox
                                checked={item.checked}
                                onCheckedChange={() => handleCheckboxToggle(item.id)}
                                className="mt-1 text-amber-600"
                              />
                              <span className={cn(
                                "text-amber-800 leading-relaxed flex-1",
                                item.checked && "line-through text-amber-600"
                              )}>
                                {item.text}
                              </span>
                              {item.classification && (
                                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                  {formatClassificationForDisplay(item.classification)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-amber-600 italic font-serif">
                    No checklist items have been added yet.
                  </p>
                )}
              </div>
            ) : (
              // Legacy Text View
              <div className="space-y-3">
                {hasContent ? (
                  <div className={cn(
                    'prose prose-lg max-w-none font-serif',
                    'prose-headings:text-amber-900 prose-headings:font-serif',
                    'prose-p:text-amber-800 prose-p:leading-relaxed',
                    'prose-li:text-amber-800 prose-li:my-1',
                    'prose-ul:my-3 prose-ul:space-y-1',
                    'prose-strong:text-amber-900 prose-em:italic',
                    'prose-code:bg-gray-200 prose-code:px-2 prose-code:py-1 prose-code:rounded',
                    'prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-6',
                    'prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4'
                  )}>
                    {displayRecommendations.split('\n').map((line, index) => {
                      if (line.startsWith('### ')) {
                        return (
                          <h3 key={index} className="text-xl font-bold text-amber-900 mb-2 mt-6 font-serif">
                            {line.replace('### ', '')}
                          </h3>
                        )
                      }
                      if (line.trim().startsWith('- ')) {
                        return (
                          <ul key={index} className="my-3 space-y-1">
                            <li className="text-amber-800">{line.replace('- ', '')}</li>
                          </ul>
                        )
                      }
                      
                      if (line.trim() === '') {
                        return <br key={index} />
                      }
                      
                      return (
                        <p key={index} className="leading-relaxed my-3 text-amber-800 whitespace-pre-wrap">
                          {line}
                        </p>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-amber-600 italic font-serif">
                    No recommendations have been added or generated yet.
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  )
}

export default NotebookInterface