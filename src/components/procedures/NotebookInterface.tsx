import React, { useState } from 'react'
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
  onClose: () => void
  recommendations: string
  onSave?: (content: string) => void
}
const NotebookInterface: React.FC<NotebookInterfaceProps> = ({
  isOpen,
  onClose,
  recommendations,
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(recommendations || "")
  const { toast } = useToast()

  const handleSave = () => {
    onSave?.(editedContent)
    setIsEditing(false)
    toast({ 
      title: "Notes Saved", 
      description: "Your audit recommendations have been updated." 
    })
  }

  const handleCancel = () => {
    setEditedContent(recommendations || "")
    setIsEditing(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Notebook */}
      <div className={cn(
        "fixed inset-4 z-50 max-w-4xl mx-auto",
        "bg-amber-50 border border-amber-200 rounded-2xl shadow-2xl",
        "transform transition-all duration-500 ease-out",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        {/* Notebook Binding */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-red-800 rounded-l-2xl">
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-amber-100/60" />
            ))}
          </div>
        </div>

        {/* Paper Lines Background */}
        <div className="absolute inset-0 ml-12 opacity-30 pointer-events-none">
          <div className="h-full bg-repeat-y bg-[length:100%_24px]" 
               style={{ 
                 backgroundImage: `linear-gradient(transparent 23px, #d1d5db 23px, #d1d5db 24px, transparent 24px)`
               }} />
        </div>

        {/* Content */}
        <div className="relative ml-12 p-8 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BookOpenCheck className="h-6 w-6 text-amber-800" />
              <h2 className="text-2xl font-bold text-amber-900 font-serif">
                Audit Recommendations
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
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

          {/* Date */}
          <div className="mb-4 pb-2 border-b border-gray-300">
            <p className="text-sm text-muted-foreground font-serif italic">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Enter your audit recommendations here..."
                className={cn(
                  "min-h-96 bg-transparent border-none resize-none",
                  "text-amber-800 placeholder:text-amber-500",
                  "font-serif leading-relaxed text-base",
                  "focus:ring-0 focus:outline-none"
                )}
              />
            ) : (
              <div className={cn(
                "prose prose-lg max-w-none font-serif",
                "prose-headings:text-amber-900 prose-headings:font-serif",
                "prose-p:text-amber-800 prose-p:leading-relaxed prose-p:my-3",
                "prose-li:text-amber-800 prose-li:my-1",
                "prose-ul:my-3 prose-ul:space-y-1",
                "prose-strong:text-amber-900 prose-em:italic",
                "prose-code:bg-gray-200 prose-code:px-2 prose-code:py-1 prose-code:rounded",
                "prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-6",
                "prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4"
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h3: ({ node, ...props }) => (
                      <h3 className="text-xl font-bold text-amber-900 mb-2 mt-6 font-serif" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4 className="text-lg font-semibold text-amber-900 mb-2 mt-4 font-serif" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="leading-relaxed my-3 text-amber-800" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="my-3 space-y-1" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-amber-800" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-amber-900" {...props} />
                    ),
                    code: ({ node, inline, ...props }: any) => (
                      inline ? (
                        <code className="bg-gray-200 px-2 py-1 rounded text-amber-800" {...props} />
                      ) : (
                        <code className="block bg-gray-200 p-3 rounded text-amber-800" {...props} />
                      )
                    ),
                  }}
                >
                  {recommendations || "No recommendations have been added yet. Click 'Edit Notes' to get started."}
                </ReactMarkdown>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
export default NotebookInterface