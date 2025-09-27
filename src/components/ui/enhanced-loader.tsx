"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedLoaderProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
  variant?: "default" | "dots" | "pulse" | "bounce"
}

export function EnhancedLoader({ size = "md", text, className, variant = "default" }: EnhancedLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  // Simplified loader for better performance
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn(sizeClasses[size], "animate-spin text-gray-600")} />
      {text && (
        <span className="ml-3 text-muted-foreground">
          {text}
        </span>
      )}
    </div>
  )
}
