import React, { useMemo, useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Edit3, Save, BookOpenCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface NotebookInterfaceProps {
  isOpen: boolean
  isEditable: boolean
  onClose: () => void
  recommendations: string
  isPlanning: boolean
  onSave?: (content: string) => void
}

function formatClassificationForDisplay(classification?: string): string {
  if (!classification) return 'General'
  const parts = classification.split(' > ')
  return parts[parts.length - 1] || classification
}

function transformRecommendationsForDisplay(input?: string): string {
  if (!input || typeof input !== 'string') return ''

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

function transformPlanningRecommendationsForDisplay(input?: string): string {
  if (!input || typeof input !== 'string') return ''

  const lines = input.split('\n')
  let output = ''
  let currentSection = ''
  let inBulletList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (i === 0 && line.includes('Audit Planning Recommendations')) {
      output += `## ${line}\n\n`
      continue
    }

    const sectionMatch = line.match(/^Section\s+\d+:\s*(.+)/i)
    if (sectionMatch) {
      if (currentSection) output += '\n'
      currentSection = sectionMatch[1].trim()
      output += `### ${currentSection}\n\n`
      inBulletList = false
      continue
    }

    const looksLikeBullet = /^[A-Z][^.!?]*[.!?]$/.test(line) && 
                           line.length > 20 && 
                           !line.includes('Section') &&
                           currentSection

    if (looksLikeBullet) {
      if (!inBulletList) {
        output += '\n'
        inBulletList = true
      }
      output += `- ${line}\n`
    } else if (currentSection) {
      if (inBulletList) {
        output += '\n'
        inBulletList = false
      }
      output += `${line}\n\n`
    } else {
      output += `${line}\n\n`
    }
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
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(recommendations || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Sync editedContent with recommendations when they change
  useEffect(() => {
    setEditedContent(recommendations || '')
  }, [recommendations])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end of text
      textareaRef.current.selectionStart = textareaRef.current.value.length
      textareaRef.current.selectionEnd = textareaRef.current.value.length
    }
  }, [isEditing])

  const handleSave = () => {
    onSave?.(editedContent)
    setIsEditing(false)
    toast({
      title: 'Notes Saved',
      description: 'Your audit recommendations have been updated.',
    })
  }

  const handleCancel = () => {
    setEditedContent(recommendations || '')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow default Enter key behavior (new line)
    if (e.key === 'Enter') {
      // Let the browser handle the Enter key normally
      return
    }
    
    // Save with Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    
    // Cancel with Escape
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const displayRecommendations = useMemo(() => {
    const content = recommendations || ''
    return isPlanning 
      ? transformPlanningRecommendationsForDisplay(content)
      : transformRecommendationsForDisplay(content)
  }, [recommendations, isPlanning])

  const hasContent = displayRecommendations.trim().length > 0

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed inset-4 z-50 max-w-4xl mx-auto',
          'bg-amber-50 border border-amber-200 rounded-2xl shadow-2xl',
          'transform transition-all duration-500 ease-out',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
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
                    <Button
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="bg-inherit text-amber-700 hover:bg-gray-100"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Notes
                    </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-amber-700 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
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
      placeholder="Enter your audit recommendations here..."
      className={cn(
        'min-h-96 bg-transparent border-none resize-none',
        'text-amber-800 placeholder:text-amber-500',
        'font-serif leading-relaxed text-base',
        'focus:ring-0 focus:outline-none'
      )}
      style={{ whiteSpace: 'pre-wrap' }}
    />
  ) : (
    <div className="space-y-3">
      {hasContent ? (
        // Custom rendering that preserves both markdown and newlines
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
            // Check if this line is a markdown heading
            if (line.startsWith('### ')) {
              return (
                <h3 key={index} className="text-xl font-bold text-amber-900 mb-2 mt-6 font-serif">
                  {line.replace('### ', '')}
                </h3>
              )
            }
            
            // Check if this line is a bullet point
            if (line.trim().startsWith('- ')) {
              return (
                <ul key={index} className="my-3 space-y-1">
                  <li className="text-amber-800">{line.replace('- ', '')}</li>
                </ul>
              )
            }
            
            // Check if line is empty
            if (line.trim() === '') {
              return <br key={index} />
            }
            
            // Regular paragraph - preserve newlines within the paragraph
            return (
              <p key={index} className="leading-relaxed my-3 text-amber-800 whitespace-pre-wrap">
                {line}
              </p>
            )
          })}
        </div>
      ) : (
        <p className="text-amber-600 italic font-serif">
          No recommendations have been added yet.
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