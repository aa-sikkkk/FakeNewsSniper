"use client"

import { useState, useCallback } from "react"
import { verifyClaimComprehensive, VerificationResult } from "@/lib/verify-claim"

export function useVerification() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const verifyClaim = useCallback(async (claim: string) => {
    if (!claim.trim()) return
    
    setIsVerifying(true)
    setResult(null)
    setError(null)
    
    try {
      const verificationResult = await verifyClaimComprehensive(claim)
      setResult(verificationResult)
      return verificationResult
    } catch (error) {
      console.error("Error verifying claim:", error)
      setError("Failed to verify claim. Please try again.")
      return null
    } finally {
      setIsVerifying(false)
    }
  }, [])
  
  return {
    verifyClaim,
    isVerifying,
    result,
    error
  }
}