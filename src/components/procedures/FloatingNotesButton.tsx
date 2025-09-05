import React from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingNotesButtonProps {
  onClick: () => void
  isOpen?: boolean
}

const FloatingNotesButton: React.FC<FloatingNotesButtonProps> = ({ 
  onClick, 
  isOpen = false 
}) => {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full",
        "bg-amber-600 hover:bg-amber-700 hover:scale-110 active:scale-95",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-300 ease-out",
        "border-0 text-white",
        isOpen && "rotate-12 scale-110"
      )}
      size="icon"
    >
      <BookOpen 
        className={cn(
          "h-6 w-6 transition-transform duration-300",
          isOpen && "rotate-12"
        )} 
      />
    </Button>)
}
export default FloatingNotesButton
