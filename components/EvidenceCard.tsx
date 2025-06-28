"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EvidenceCardProps {
  title: string
  text: string
  source?: { title: string; url: string }
  index: number
  className?: string
}

export function EvidenceCard({ 
  title, 
  text, 
  source,
  index,
  className 
}: EvidenceCardProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        duration: 0.4, 
        ease: "easeOut",
        delay: 0.1 * (index + 1)
      }}
    >
      <Card className={cn(
        "overflow-hidden backdrop-blur-lg bg-background/70 border-border/50 shadow-md hover:shadow-lg transition-shadow",
        className
      )}>
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
        </CardHeader>
        
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground mb-4">{text}</p>
          
          {source && (
            <div className="flex justify-between items-center">
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs flex items-center text-primary hover:underline"
              >
                Source: {source.title}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}