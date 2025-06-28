"use client"

import { useState, useRef } from "react"
import { Mic, Search, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { transcribeAudio } from "@/lib/huggingface"

interface ClaimInputProps {
  onSubmit: (claim: string) => void
  isProcessing: boolean
}

export function ClaimInput({ onSubmit, isProcessing }: ClaimInputProps) {
  const [claim, setClaim] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (claim.trim() && !isProcessing) {
      onSubmit(claim.trim())
    }
  }
  
  const clearInput = () => {
    setClaim("")
  }
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      
      mediaRecorder.onstop = async () => {
        setIsTranscribing(true)
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        
        try {
          const transcription = await transcribeAudio(audioBlob)
          setClaim(transcription)
        } catch (error) {
          console.error("Transcription failed:", error)
        } finally {
          setIsTranscribing(false)
          setIsRecording(false)
        }
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="relative backdrop-blur-lg bg-background/70 border-none shadow-lg mb-8">
        <div className="p-4 flex flex-col space-y-4">
          <h3 className="text-lg font-medium">Enter a claim to verify</h3>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <Input
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="Type or speak a claim to verify..."
                className="pl-4 pr-10 py-6 bg-background/50 border-border/50 rounded-full shadow-inner"
                disabled={isProcessing || isRecording || isTranscribing}
              />
              {claim && !isProcessing && !isRecording && !isTranscribing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearInput}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button 
                    type="button" 
                    onClick={stopRecording}
                    size="icon"
                    className="rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Mic className="h-5 w-5" />
                    </motion.div>
                  </Button>
                </motion.div>
              ) : isTranscribing ? (
                <Button 
                  disabled
                  size="icon"
                  className="rounded-full"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                </Button>
              ) : (
                <motion.div
                  key="mic"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button 
                    type="button" 
                    onClick={startRecording}
                    size="icon"
                    variant="outline"
                    className="rounded-full"
                    disabled={isProcessing}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <Button 
              type="submit"
              className="rounded-full"
              disabled={!claim.trim() || isProcessing || isRecording || isTranscribing}
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Search className="h-5 w-5 mr-2" />
              )}
              Verify
            </Button>
          </div>
        </div>
      </Card>
    </form>
  )
}