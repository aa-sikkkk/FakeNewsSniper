"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { VerificationStatus } from "@/lib/verification-pipeline"
import { getVerdictDisplay } from "../lib/verify-claim"

interface LiveConfidenceMeterProps {
  confidence: number
  status: VerificationStatus
  className?: string
}

export function LiveConfidenceMeter({ 
  confidence,
  status,
  className
}: LiveConfidenceMeterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const { 
    textColor,
    borderColor
  } = getVerdictDisplay(status, confidence)

  // Animate the confidence value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(confidence)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [confidence])
  
  const confidencePercent = Math.round(displayValue * 100)
  
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-muted-foreground">Confidence</span>
        <span className={cn("text-sm font-bold", textColor)}>
          {confidencePercent}%
        </span>
      </div>
      
      <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden backdrop-blur-sm">
        <motion.div
          className={cn(
            "h-full rounded-full",
            borderColor.replace('border', 'bg')
          )}
          initial={{ width: "0%" }}
          animate={{ width: `${confidencePercent}%` }}
          transition={{ 
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: 0.2
          }}
        />
      </div>
      
      {/* Confidence labels */}
      <div className="flex justify-between text-xs text-muted-foreground pt-1">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  )
}