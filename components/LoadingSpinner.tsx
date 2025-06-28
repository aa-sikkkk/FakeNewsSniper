"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function LoadingSpinner({ className, size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  }
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center",
      className
    )}>
      <div className="relative">
        <motion.div
          className={cn(
            "rounded-full border-t-2 border-b-2 border-primary",
            sizeClasses[size]
          )}
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "linear" 
          }}
        />
        <motion.div
          className={cn(
            "absolute top-0 rounded-full border-t-2 border-l-2 border-primary/30",
            sizeClasses[size]
          )}
          animate={{ rotate: -180 }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "linear"
          }}
        />
      </div>
      
      {text && (
        <motion.p 
          className="mt-4 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}