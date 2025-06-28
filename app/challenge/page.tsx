"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ClaimInput } from "@/components/ClaimInput"
import { ClaimCard } from "@/components/ClaimCard"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { verifyClaimComprehensive } from "@/lib/verify-claim"
import { VerificationResult } from "@/lib/verification-pipeline"
import { TowerControl as GameController, Zap, Award } from "lucide-react"

// Mock game claims for demo purposes
const mockClaims = [
  "The Great Wall of China is visible from the moon with the naked eye",
  "Bananas grow on trees",
  "A goldfish's memory lasts only three seconds",
  "Humans only use 10% of their brains",
  "Bulls are angered by the color red",
  "Vikings wore horned helmets in battle",
  "Napoleon Bonaparte was extremely short",
  "You need to wait 24 hours before filing a missing person report"
]

export default function Challenge() {
  const [activeTab, setActiveTab] = useState("foolTheAI")
  const [claimText, setClaimText] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [score, setScore] = useState(0)
  const [gameFeedback, setGameFeedback] = useState<string | null>(null)
  const [suggestedClaim, setSuggestedClaim] = useState<string | null>(null)
  
  const handleClaimSubmit = async (claim: string) => {
    setClaimText(claim)
    setIsVerifying(true)
    setResult(null)
    setGameFeedback(null)
    
    try {
      // Verify the claim
      const verificationResult = await verifyClaimComprehensive(claim)
      setResult(verificationResult)
      
      // Game logic for "Fool the AI"
      if (activeTab === "foolTheAI") {
        if (verificationResult.status === "unverified") {
          setScore(prev => prev + 10)
          setGameFeedback("You fooled the AI! +10 points")
        } else if (verificationResult.confidence < 0.7) {
          setScore(prev => prev + 5)
          setGameFeedback("The AI is uncertain! +5 points")
        } else {
          setGameFeedback("The AI confidently verified your claim. Try to be more creative!")
        }
      }
    } catch (error) {
      console.error("Error verifying claim:", error)
    } finally {
      setIsVerifying(false)
    }
  }
  
  const getRandomClaim = () => {
    const randomIndex = Math.floor(Math.random() * mockClaims.length)
    setSuggestedClaim(mockClaims[randomIndex])
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 pb-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <div className="flex items-center">
              <GameController className="h-6 w-6 mr-3 text-purple-500" />
              <h1 className="text-3xl font-bold">Claim Challenge Mode</h1>
            </div>
            <p className="text-muted-foreground mt-2">Test your skills in creating believable false claims or verifying tricky ones</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-none">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 mr-2 text-yellow-500" />
                    <span className="font-bold">Score:</span>
                    <span className="text-xl font-bold ml-2">{score}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="foolTheAI" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Fool the AI</span>
            </TabsTrigger>
            <TabsTrigger value="verifyChallenge" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Verification Challenge</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="foolTheAI">
            <Card>
              <CardHeader>
                <CardTitle>Fool the AI Challenge</CardTitle>
                <CardDescription>Create a claim that sounds true but the AI can't verify or confirm. The more uncertain the AI is, the more points you get!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {suggestedClaim && (
                  <Alert className="bg-indigo-500/10 border-indigo-500/50">
                    <AlertDescription className="flex items-center">
                      <span className="font-medium">Suggestion:</span>
                      <span className="ml-2">{suggestedClaim}</span>
                      <Button 
                        variant="link" 
                        onClick={() => {
                          setClaimText(suggestedClaim)
                          handleClaimSubmit(suggestedClaim)
                        }}
                        className="ml-auto"
                      >
                        Try This
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Enter your claim:</h3>
                    <p className="text-sm text-muted-foreground">Be creative! Make it sound believable but hard to verify.</p>
                  </div>
                  <Button variant="outline" onClick={getRandomClaim}>
                    Get Inspiration
                  </Button>
                </div>
                
                <ClaimInput 
                  onSubmit={handleClaimSubmit}
                  isProcessing={isVerifying}
                />
                
                <AnimatePresence>
                  {gameFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <Alert className="bg-purple-500/10 border-purple-500/50">
                        <AlertDescription>{gameFeedback}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {isVerifying ? (
                  <div className="flex justify-center my-12">
                    <LoadingSpinner text="AI is analyzing your claim..." />
                  </div>
                ) : result && (
                  <ClaimCard 
                    result={result}
                    claimText={claimText}
                  />
                )}
                
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-2">Tips to fool the AI:</h3>
                  <ul className="space-y-1 text-sm list-disc pl-5">
                    <li>Use claims that mix true and false elements</li>
                    <li>Include technical terms or obscure references</li>
                    <li>Use recent events that may not be in the AI's knowledge</li>
                    <li>Create plausible but fictional statistics</li>
                    <li>Make claims about subjective topics</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verifyChallenge">
            <Card>
              <CardHeader>
                <CardTitle>Verification Challenge</CardTitle>
                <CardDescription>
                  Try to guess if these claims are true or false before the AI verifies them
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center my-12 space-y-8">
                  <Badge variant="outline" className="px-4 py-1.5 text-lg mb-4">Coming Soon</Badge>
                  <p>This challenge mode is currently in development!</p>
                  <p className="text-sm text-muted-foreground">
                    Soon you'll be able to test your fact-checking skills against our AI and earn points for correct verdicts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}