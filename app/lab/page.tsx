"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClaimCard } from "@/components/ClaimCard"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { VerificationStatus } from "@/lib/verification-types"
import { SourceType, ReliabilityLevel } from "@/lib/source-reliability"
import { Brain, Eye, Zap, ArrowRight, Calendar, BadgeInfo } from "lucide-react"

export default function Lab() {
  const [activeTab, setActiveTab] = useState("explainability")
  const [historyYear, setHistoryYear] = useState(2025)
  const [isLoading, setIsLoading] = useState(false)
  
  // Mock verification result for demo purposes
  const mockResult = {
    claim: "Eating chocolate every day prevents heart disease",
    status: VerificationStatus.FALSE,
    confidence: 0.82,
    evidence: [
      {
        id: "evidence-1",
        content: "According to multiple scientific studies, there is no evidence that chocolate directly prevents heart disease.",
        source: {
          id: "nih",
          name: "Effects of Cocoa on Cardiovascular Health - NIH",
          type: SourceType.REFERENCE,
          reliability: ReliabilityLevel.VERIFIED,
          url: "https://example.com/source1",
          lastVerified: new Date(),
          verificationStatus: VerificationStatus.VERIFIED,
          categories: ["health", "research"],
          metadata: {}
        },
        timestamp: new Date(),
        url: "https://example.com/source1",
        confidence: 0.82,
        categories: ["health"],
        metadata: {}
      },
      {
        id: "evidence-2",
        content: "While some compounds in dark chocolate may have heart-healthy properties, the overall effect is minimal and outweighed by sugar content.",
        source: {
          id: "aha",
          name: "Dietary Guidelines - American Heart Association",
          type: SourceType.REFERENCE,
          reliability: ReliabilityLevel.VERIFIED,
          url: "https://example.com/source2",
          lastVerified: new Date(),
          verificationStatus: VerificationStatus.VERIFIED,
          categories: ["health", "nutrition"],
          metadata: {}
        },
        timestamp: new Date(),
        url: "https://example.com/source2",
        confidence: 0.75,
        categories: ["health"],
        metadata: {}
      }
    ],
    sources: [
      {
        id: "nih",
        name: "Effects of Cocoa on Cardiovascular Health - NIH",
        type: SourceType.REFERENCE,
        reliability: ReliabilityLevel.VERIFIED,
        url: "https://example.com/source1",
        lastVerified: new Date(),
        verificationStatus: VerificationStatus.VERIFIED,
        categories: ["health", "research"],
        metadata: {}
      },
      {
        id: "aha",
        name: "Dietary Guidelines - American Heart Association",
        type: SourceType.REFERENCE,
        reliability: ReliabilityLevel.VERIFIED,
        url: "https://example.com/source2",
        lastVerified: new Date(),
        verificationStatus: VerificationStatus.VERIFIED,
        categories: ["health", "nutrition"],
        metadata: {}
      }
    ],
    timestamp: new Date(),
    explanation: "Multiple scientific studies contradict this claim. While dark chocolate contains some beneficial compounds, daily consumption does not prevent heart disease.",
    metadata: {
      isTemporalClaim: false,
      isFactualClaim: true,
      isPredictiveClaim: false,
      categories: ["health", "nutrition"],
      contradictionRatio: 0.8,
      evidenceScores: [0.82, 0.75]
    },
    rebuttal: "While dark chocolate contains flavanols that may have some cardiovascular benefits, claiming it 'prevents heart disease' is misleading. The sugar and fat content in chocolate can actually contribute to heart problems if consumed in excess.",
    modelVerdicts: {
      bart: {
        verdict: "false",
        confidence: 0.82
      },
      roberta: {
        verdict: "false",
        confidence: 0.75
      }
    }
  }
  
  const handleHistoryYearChange = (value: number[]) => {
    setHistoryYear(value[0])
    setIsLoading(true)
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }
  
  // Animation variants for the tree nodes
  const nodeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: i * 0.3,
        duration: 0.5
      }
    })
  }
  
  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay: i * 0.3, type: "spring", duration: 1.5, bounce: 0 },
        opacity: { delay: i * 0.3, duration: 0.01 }
      }
    })
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 pb-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">AI Explainability Lab</h1>
            <p className="text-muted-foreground mt-2">Explore how our AI verifies claims and makes decisions</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="explainability" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Decision Tree</span>
            </TabsTrigger>
            <TabsTrigger value="timeMachine" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Time Machine</span>
            </TabsTrigger>
            <TabsTrigger value="rebuttal" className="flex items-center gap-2">
              <BadgeInfo className="h-4 w-4" />
              <span className="hidden sm:inline">Rebuttal Gen</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="explainability" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Decision Tree</CardTitle>
                <CardDescription>Visualize how our AI models analyze and verify claims</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/30 mb-6">
                  <p className="font-medium">Claim: Eating chocolate every day prevents heart disease</p>
                </div>
                
                <div className="flex justify-center my-8">
                  <svg width="800" height="400" className="max-w-full h-auto">
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                      </marker>
                    </defs>
                    
                    {/* Connection lines */}
                    <motion.path
                      d="M 400,50 L 400,100"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      variants={lineVariants}
                      initial="hidden"
                      animate="visible"
                      custom={0}
                      markerEnd="url(#arrowhead)"
                    />
                    
                    <motion.path
                      d="M 400,150 L 200,200"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      variants={lineVariants}
                      initial="hidden"
                      animate="visible"
                      custom={1}
                      markerEnd="url(#arrowhead)"
                    />
                    
                    <motion.path
                      d="M 400,150 L 600,200"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      variants={lineVariants}
                      initial="hidden"
                      animate="visible"
                      custom={1}
                      markerEnd="url(#arrowhead)"
                    />
                    
                    <motion.path
                      d="M 200,250 L 200,300"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      variants={lineVariants}
                      initial="hidden"
                      animate="visible"
                      custom={2}
                      markerEnd="url(#arrowhead)"
                    />
                    
                    <motion.path
                      d="M 600,250 L 600,300"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      variants={lineVariants}
                      initial="hidden"
                      animate="visible"
                      custom={2}
                      markerEnd="url(#arrowhead)"
                    />
                    
                    <motion.path
                      d="M 200,350 L 400,375"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      variants={lineVariants}
                      initial="hidden"
                      animate="visible"
                      custom={3}
                      markerEnd="url(#arrowhead)"
                    />
                    
                    <motion.path
                      d="M 600,350 L 400,375"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      variants={lineVariants}
                      initial="hidden"
                      animate="visible"
                      custom={3}
                      markerEnd="url(#arrowhead)"
                    />
                    
                    {/* Nodes */}
                    <motion.g 
                      variants={nodeVariants} 
                      initial="hidden" 
                      animate="visible" 
                      custom={0}
                    >
                      <circle cx="400" cy="50" r="30" fill="hsl(var(--primary))" />
                      <text x="400" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">Claim</text>
                    </motion.g>
                    
                    <motion.g 
                      variants={nodeVariants} 
                      initial="hidden" 
                      animate="visible" 
                      custom={1}
                    >
                      <rect x="350" y="100" width="100" height="50" rx="10" fill="hsl(var(--secondary))" />
                      <text x="400" y="125" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">Evidence Gathering</text>
                    </motion.g>
                    
                    <motion.g 
                      variants={nodeVariants} 
                      initial="hidden" 
                      animate="visible" 
                      custom={2}
                    >
                      <rect x="150" y="200" width="100" height="50" rx="10" fill="hsl(var(--chart-1))" />
                      <text x="200" y="225" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">BART NLI</text>
                    </motion.g>
                    
                    <motion.g 
                      variants={nodeVariants} 
                      initial="hidden" 
                      animate="visible" 
                      custom={2}
                    >
                      <rect x="550" y="200" width="100" height="50" rx="10" fill="hsl(var(--chart-2))" />
                      <text x="600" y="225" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">RoBERTa QA</text>
                    </motion.g>
                    
                    <motion.g 
                      variants={nodeVariants} 
                      initial="hidden" 
                      animate="visible" 
                      custom={3}
                    >
                      <rect x="150" y="300" width="100" height="50" rx="10" fill="hsl(var(--chart-1))" opacity="0.8" />
                      <text x="200" y="325" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">
                        <tspan x="200" dy="-10">Contradicted</tspan>
                        <tspan x="200" dy="20">Conf: 82%</tspan>
                      </text>
                    </motion.g>
                    
                    <motion.g 
                      variants={nodeVariants} 
                      initial="hidden" 
                      animate="visible" 
                      custom={3}
                    >
                      <rect x="550" y="300" width="100" height="50" rx="10" fill="hsl(var(--chart-2))" opacity="0.8" />
                      <text x="600" y="325" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">
                        <tspan x="600" dy="-10">Disputed</tspan>
                        <tspan x="600" dy="20">Conf: 75%</tspan>
                      </text>
                    </motion.g>
                    
                    <motion.g 
                      variants={nodeVariants} 
                      initial="hidden" 
                      animate="visible" 
                      custom={4}
                    >
                      <rect x="350" y="375" width="100" height="50" rx="10" fill="#ef4444" />
                      <text x="400" y="400" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">
                        <tspan x="400" dy="-10">False</tspan>
                        <tspan x="400" dy="20">Final Verdict</tspan>
                      </text>
                    </motion.g>
                  </svg>
                </div>
                
                <div className="mt-4 space-y-4">
                  <h3 className="text-lg font-medium">Model Outputs</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-background/60">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-red-500">BART NLI Model</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p><strong>Label:</strong> contradiction</p>
                        <p><strong>Score:</strong> 0.82</p>
                        <p><strong>Interpretation:</strong> The model found strong evidence contradicting the claim</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-background/60">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-teal-500">RoBERTa QA Model</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p><strong>Evidence:</strong> "Studies show limited cardiovascular benefits"</p>
                        <p><strong>Score:</strong> 0.75</p>
                        <p><strong>Confidence:</strong> Medium-high reliability for this answer</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timeMachine" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Claim Time Machine</CardTitle>
                <CardDescription>See how claim verification would change based on historical evidence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/30 mb-6">
                  <p className="font-medium">Claim: Eating chocolate every day prevents heart disease</p>
                </div>
                
                <div className="mb-8 mt-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Year: {historyYear}</span>
                    <span className="text-sm text-muted-foreground">Adjust to see how verification changes over time</span>
                  </div>
                  <Slider
                    defaultValue={[historyYear]}
                    min={1990}
                    max={2025}
                    step={1}
                    onValueChange={handleHistoryYearChange}
                    className="w-full"
                  />
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center my-12">
                    <LoadingSpinner text={`Retrieving historical evidence from ${historyYear}...`} />
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={historyYear}
                  >
                    <ClaimCard 
                      result={mockResult}
                      claimText="Eating chocolate every day prevents heart disease"
                    />
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rebuttal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rebuttal Generator</CardTitle>
                <CardDescription>Generate AI-powered rebuttals for false claims</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter a false claim:</label>
                    <Input 
                      placeholder="Type a false claim here..." 
                      defaultValue="Eating chocolate every day prevents heart disease"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Evidence against the claim:</label>
                    <textarea 
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      defaultValue="Studies show that while dark chocolate contains flavonoids with some cardiovascular benefits, daily consumption, especially of milk chocolate with high sugar content, does not prevent heart disease. The American Heart Association notes that any benefits are outweighed by calories, sugar and fat when consumed in large amounts."
                    />
                  </div>
                  
                  <Button className="w-full">
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Rebuttal
                  </Button>
                  
                  <div className="mt-6 p-4 border border-border rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center">
                      <ArrowRight className="mr-2 h-4 w-4 text-primary" />
                      Generated Rebuttal
                    </h3>
                    <p className="text-muted-foreground">
                      While dark chocolate contains flavanols that may have some cardiovascular benefits, claiming it 'prevents heart disease' is misleading. The sugar and fat content in chocolate can actually contribute to heart problems if consumed in excess. According to the American Heart Association, any potential benefits are outweighed by negative impacts when consumed daily in large amounts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}