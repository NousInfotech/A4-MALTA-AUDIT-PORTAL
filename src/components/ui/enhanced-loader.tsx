"use client"

import { cn } from "@/lib/utils"
import Lottie from "lottie-react"
import loadingSearch from "@/../public/Free Searching Animation.json"

interface EnhancedLoaderProps {
  size?: "sm" | "md" | "lg"
  className?: string
  variant?: "default" | "dots" | "pulse" | "bounce"
  text?: string
}

export function EnhancedLoader({ size = "md", className }: EnhancedLoaderProps) {
  const sizePx: Record<NonNullable<EnhancedLoaderProps["size"]>, number> = {
    sm: 64,
    md: 80,
    lg: 200,
  }

  const dimension = sizePx[size]

  return (
    <div
      className={cn(
        // Centered in both axes by default; callers can override with className
        "flex flex-col items-center justify-center",
        className
      )}
    >
      <div
        style={{
          width: dimension,
          height: dimension,
        }}
      >
        <Lottie animationData={loadingSearch} loop autoplay />
      </div>
      <span className="mt-3 text-sm text-muted-foreground text-center px-4">
        Please wait a moment while we prepare your data…
      </span>
    </div>
  )
}
