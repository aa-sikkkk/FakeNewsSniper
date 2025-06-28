"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { VerdictBadge } from "@/components/VerdictBadge"
import { ThumbsUp, ThumbsDown, ExternalLink, AlertTriangle, Info, FileSearch, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { VerificationResult } from "@/lib/verification-pipeline"
import { Evidence } from "@/lib/types"
import { Source } from "@/lib/source-reliability"
import { cn } from "@/lib/utils"
import { voteClaim } from "@/lib/supabase"

interface ClaimCardProps {
  result: VerificationResult
  claimText: string
  claimId?: string
  userId?: string
  className?: string
}

export function ClaimCard({ 
  result, 
  claimText,
  claimId,
  userId,
  className 
}: ClaimCardProps) {
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [localVotes, setLocalVotes] = useState({ up: 0, down: 0 })
  
  const handleVote = async (voteType: 'up' | 'down') => {
    if (!claimId || !userId || isVoting) return
    
    setIsVoting(true)
    try {
      // Update local state optimistically
      setUserVote(voteType)
      setLocalVotes(prev => ({
        ...prev,
        [voteType]: prev[voteType] + 1,
        [voteType === 'up' ? 'down' : 'up']: 
          userVote === (voteType === 'up' ? 'down' : 'up') 
            ? prev[voteType === 'up' ? 'down' : 'up'] - 1 
            : prev[voteType === 'up' ? 'down' : 'up']
      }))
      
      // Send to API
      await voteClaim(claimId, voteType, userId)
    } catch (error) {
      console.error("Error voting on claim:", error)
      // Revert on error
      setUserVote(null)
    } finally {
      setIsVoting(false)
    }
  }
  
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className={cn(
        "overflow-hidden backdrop-blur-lg bg-background/70 border-border/50 shadow-lg",
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <h2 className="text-xl font-bold">Claim Verification</h2>
          <VerdictBadge status={result.status} confidence={result.confidence} />
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Claim Text */}
          <div className="prose dark:prose-invert bg-muted/50 p-4 rounded-lg">
            <blockquote className="border-l-4 border-primary pl-4 italic m-0">
              "{claimText}"
            </blockquote>
          </div>

          {/* Future Claim Warning */}
          {claimText.toLowerCase().includes('will') || 
           claimText.toLowerCase().includes('going to') || 
           /\d{4}/.test(claimText) ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
              <p className="text-sm text-amber-500 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                Future claim detected - verification may be limited
              </p>
            </div>
          ) : null}

          {/* Confidence Meter */}
          <div className="space-y-2 bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{Math.round(result.confidence * 100)}%</span>
                <span className={cn(
                  'px-2 py-0.5 text-xs rounded-full',
                  result.confidence > 0.7
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : result.confidence > 0.4
                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                )}>
                  {result.confidence > 0.7 ? 'High' : result.confidence > 0.4 ? 'Medium' : 'Low'}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  result.confidence > 0.7
                    ? 'bg-green-500'
                    : result.confidence > 0.4
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${Math.round(result.confidence * 100)}%` }}
              />
            </div>
          </div>

          {/* Analysis */}
          {result.explanation && (
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-medium flex items-center">
                <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                Analysis
              </h3>
              <div className="prose prose-sm dark:prose-invert prose-p:my-1">
                {result.explanation.split('\n').map((line, i) => (
                  <p key={i} className="leading-relaxed">{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Evidence */}
          {result.evidence.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center">
                <FileSearch className="h-4 w-4 mr-2 text-muted-foreground" />
                Supporting Evidence
              </h3>
              <div className="space-y-3">
                {result.evidence.map((item, i) => (
                  <div key={i} className="border rounded-lg p-4 bg-card">
                    <p className="text-sm mb-2">{item.content}</p>
                    {item.source?.url && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>Source: </span>
                        <a
                          href={item.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-primary hover:underline flex items-center"
                        >
                          {item.source.name || 'View source'}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Sources Section */}
          {result.sources && result.sources.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center">
                <Link2 className="h-4 w-4 mr-2 text-muted-foreground" />
                Sources
              </h3>
              <div className="space-y-1">
                {result.sources.map((source: Source, i: number) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{source.name || source.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        
        {/* Voting Section */}
        {claimId && userId && (
          <>
            <Separator />
            <CardFooter className="px-4 py-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">Was this verdict helpful?</span>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleVote('up')}
                    disabled={isVoting}
                    className={cn(
                      "rounded-full",
                      userVote === 'up' && "bg-emerald-500/20 text-emerald-500"
                    )}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    <span>{localVotes.up}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleVote('down')}
                    disabled={isVoting}
                    className={cn(
                      "rounded-full",
                      userVote === 'down' && "bg-red-500/20 text-red-500"
                    )}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    <span>{localVotes.down}</span>
                  </Button>
                </div>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </motion.div>
  )
}