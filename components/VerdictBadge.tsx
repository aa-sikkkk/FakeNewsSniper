"use client"

import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { getVerdictDisplay } from "@/lib/verify-claim"
import { VerificationStatus } from "@/lib/verification-types"

interface VerdictBadgeProps {
  status: VerificationStatus
  confidence: number
  large?: boolean
  className?: string
}

export function VerdictBadge({ 
  status, 
  confidence,
  large = false,
  className
}: VerdictBadgeProps) {
  const { 
    text, 
    icon: iconName, 
    bgColor,
    textColor,
    glowClass
  } = getVerdictDisplay(status, confidence)
  
  const Icon = 
    iconName === 'CheckCircle' ? CheckCircle :
    iconName === 'XCircle' ? XCircle :
    iconName === 'AlertTriangle' ? AlertTriangle :
    HelpCircle
    
  const glowStyles = {
    'glow-green': 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    'glow-red': 'shadow-[0_0_15px_rgba(239,68,68,0.5)]',
    'glow-amber': 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
    'glow-gray': 'shadow-[0_0_15px_rgba(148,163,184,0.3)]'
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30 
      }}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1",
        bgColor,
        glowStyles[glowClass as keyof typeof glowStyles],
        large ? "text-lg px-4 py-2" : "text-sm",
        className
      )}
    >
      <Icon className={cn(
        "mr-1",
        large ? "h-5 w-5" : "h-4 w-4"
      )} />
      <span className="font-medium">{text}</span>
    </motion.div>
  )
}