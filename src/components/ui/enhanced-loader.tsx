"use client"

import { motion } from "framer-motion"
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

  if (variant === "dots") {
    return (
      <motion.div
        className={cn("flex items-center justify-center space-x-2", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn("bg-primary rounded-full", {
              "w-2 h-2": size === "sm",
              "w-3 h-3": size === "md",
              "w-4 h-4": size === "lg",
            })}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.2,
            }}
          />
        ))}
        {text && (
          <motion.span
            className="ml-3 text-muted-foreground"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          >
            {text}
          </motion.span>
        )}
      </motion.div>
    )
  }

  if (variant === "pulse") {
    return (
      <motion.div
        className={cn("flex flex-col items-center justify-center space-y-3", className)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <motion.div
          className={cn("bg-primary/20 rounded-full flex items-center justify-center", {
            "w-16 h-16": size === "sm",
            "w-20 h-20": size === "md",
            "w-24 h-24": size === "lg",
          })}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <Loader2 className={cn(sizeClasses[size], "animate-spin text-primary")} />
        </motion.div>
        {text && (
          <motion.p
            className="text-sm text-muted-foreground text-center"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          >
            {text}
          </motion.p>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn("flex items-center justify-center", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      >
        <Loader2 className={cn(sizeClasses[size], "text-primary")} />
      </motion.div>
      {text && (
        <motion.span
          className="ml-3 text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          {text}
        </motion.span>
      )}
    </motion.div>
  )
}
