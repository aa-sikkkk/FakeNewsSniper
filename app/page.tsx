"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Crosshair, Sparkles, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ClaimInput } from "@/components/ClaimInput"
import { ClaimCard } from "@/components/ClaimCard"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { verificationService } from "@/lib/verification-service"
import { VerificationResult } from "@/lib/verification-pipeline"
import { VerificationStatus } from "@/lib/verification-types"
import { Evidence } from '@/lib/types'
import { Source, SourceType, ReliabilityLevel } from "@/lib/source-reliability"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { saveClaim } from "@/lib/supabase"

// Error result factory function
const createErrorResult = (claim: string, errorMessage: string): VerificationResult => ({
  claim,
  status: VerificationStatus.UNVERIFIED,
  confidence: 0,
  evidence: [{
    id: `error-${Date.now()}-${Math.random()}`,
    content: errorMessage,
    source: {
      id: 'system-error-source',
      name: 'System Error',
      type: SourceType.OTHER,
      reliability: ReliabilityLevel.UNVERIFIED,
      url: '',
      lastVerified: new Date(),
      verificationStatus: VerificationStatus.FAILED,
      categories: [],
      metadata: {}
    } as Source,
    timestamp: new Date(),
    url: '',
    confidence: 0,
    categories: [],
    metadata: {}
  } as Evidence],
  sources: [],
  timestamp: new Date(),
  explanation: errorMessage,
  metadata: {
    isTemporalClaim: false,
    isFactualClaim: false,
    isPredictiveClaim: false,
    categories: [],
    contradictionRatio: 0,
    evidenceScores: []
  }
})

export default function Home() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialClaim = searchParams?.get("claim") ?? ""
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  
  const [claimText, setClaimText] = useState(initialClaim)
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  // Handle URL updates
  useEffect(() => {
    if (initialClaim) {
      handleClaimSubmit(initialClaim)
    }
  }, [initialClaim])
  
  const handleClaimSubmit = async (claim: string) => {
    if (!claim.trim()) {
      toast({
        title: "Empty Claim",
        description: "Please enter a claim to verify",
        variant: "destructive"
      })
      return
    }

    setClaimText(claim)
    setIsVerifying(true)
    setResult(null)
    setError(null)
    
    try {
      // Update URL with the claim for shareability
      const url = new URL(window.location.href)
      url.searchParams.set("claim", claim)
      window.history.pushState({}, "", url)
      
      // Verify the claim using the service
      const verificationResult = await verificationService.verifyClaim(claim)
      setResult(verificationResult)

      // Save the verification result to Supabase
      const { data: { session } } = await supabase.auth.getSession()
      console.log("Current session:", session)
      
      if (!session) {
        console.error("User not authenticated. Cannot save claim.")
        toast({
          title: "Authentication Required",
          description: "Please log in to save your verification results.",
          variant: "destructive"
        })
        return
      }

      console.log("Saving claim with data:", {
        text: claim,
        user_id: session.user.id,
        status: verificationResult.status,
        confidence: verificationResult.confidence
      })

      const savedClaim = await saveClaim({
        text: claim,
        user_id: session.user.id,
        status: verificationResult.status === 'FALSE' ? 'FALSE' : 'VERIFIED',
        confidence: Math.round(verificationResult.confidence * 100),
        evidence: verificationResult.evidence.map(e => e.content || ''),
        sources: verificationResult.sources.map(s => s.url || ''),
        votes_up: 0,
        votes_down: 0,
        model_verdicts: {
          bart: {
            verdict: verificationResult.explanation || '',
            confidence: Math.round(verificationResult.confidence * 100)
          },
          roberta: {
            verdict: verificationResult.explanation || '',
            confidence: Math.round(verificationResult.confidence * 100)
          }
        },
        categories: verificationResult.metadata.categories || [],
        is_temporal: verificationResult.metadata.isTemporalClaim || false,
        is_factual: verificationResult.metadata.isFactualClaim || false,
        is_predictive: verificationResult.metadata.isPredictiveClaim || false,
        contradiction_ratio: verificationResult.metadata.contradictionRatio || 0,
        evidence_scores: verificationResult.metadata.evidenceScores || [],
        source_reliability: verificationResult.sources.map(s => ({
          name: s.name || '',
          type: s.type || '',
          reliability: s.reliability || '',
          verification_status: s.verificationStatus || ''
        }))
      })

      if (!savedClaim) {
        console.error("Failed to save claim to database")
        toast({
          title: "Error",
          description: "Failed to save your verification result. Please try again.",
          variant: "destructive"
        })
      } else {
        console.log("Successfully saved claim:", savedClaim)
        if (verificationResult.status === 'FALSE') {
          toast({
            title: "Claim Debunked",
            description: "This claim has been identified as false.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Claim Verified",
            description: "This claim has been verified as true.",
            variant: "default"
          })
        }
      }
    } catch (error) {
      console.error("Error verifying claim:", error)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while verifying this claim'
      setError(errorMessage)
      setResult(createErrorResult(claim, errorMessage))
      
      toast({
        title: "Verification Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsVerifying(false)
    }
  }
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    handleClaimSubmit(claimText)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 pb-16">
      <div className="relative overflow-hidden">
        {/* Hero section with glassmorphism */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 z-0" />
          
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl" />
          <div className="absolute -top-16 right-24 w-48 h-48 bg-purple-500/20 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-10 w-40 h-40 bg-green-500/10 rounded-full filter blur-3xl" />
          
          <div className="container mx-auto px-4 py-16 relative z-10">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <div className="flex items-center justify-center mb-4">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
                >
                  <Crosshair className="h-12 w-12 text-primary mr-2" />
                </motion.div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
                  Fake News Sniper
                </h1>
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="ml-2"
                >
                  <Sparkles className="h-8 w-8 text-purple-500" />
                </motion.div>
              </div>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Verify claims instantly using AI-powered fact checking and evidence retrieval
              </p>
            </motion.div>
            
            <ClaimInput 
              onSubmit={handleClaimSubmit}
              isProcessing={isVerifying}
            />
          </div>
        </div>
        
        {/* Results section */}
        <div className="container mx-auto px-4 mt-4 relative z-10">
          <AnimatePresence mode="wait">
            {isVerifying ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="my-20 flex justify-center"
              >
                <LoadingSpinner 
                  size="lg" 
                  text="Verifying claim... retrieving evidence from reliable sources" 
                />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="my-8"
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription className="flex flex-col gap-4">
                    <p>{error}</p>
                    <Button 
                      onClick={handleRetry}
                      variant="outline"
                      className="w-fit"
                    >
                      Try Again
                    </Button>
                  </AlertDescription>
                </Alert>
              </motion.div>
            ) : result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ClaimCard 
                  result={result}
                  claimText={claimText}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}