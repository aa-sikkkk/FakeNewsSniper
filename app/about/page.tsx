import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Shield, Brain, Zap, Database, Check, UserCheck, BookOpen, Sparkles } from "lucide-react"

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 pb-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">How Fake News Sniper Works</h1>
          
          <p className="text-muted-foreground mb-12 text-center">
            Our AI-powered platform helps you verify claims, detect misinformation, and stay informed with evidence-based analysis
          </p>
          
          <div className="space-y-16">
            {/* Verification Process */}
            <section>
              <div className="flex items-center mb-6">
                <Shield className="h-8 w-8 mr-3 text-primary" />
                <h2 className="text-2xl font-bold">The Verification Process</h2>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <ol className="relative border-l border-muted-foreground/20">
                    {[
                      {
                        title: "Claim Submission",
                        description: "Enter any claim you want to verify - from news headlines to social media posts or even voice input."
                      },
                      {
                        title: "Evidence Gathering",
                        description: "Our system searches Wikipedia and other reliable sources to find relevant information about your claim."
                      },
                      {
                        title: "AI Analysis",
                        description: "Multiple AI models analyze the claim and evidence to determine if the claim is supported, contradicted, or unverifiable."
                      },
                      {
                        title: "Verdict Generation",
                        description: "A final verdict is created with a confidence score, supporting evidence, and sources."
                      },
                      {
                        title: "User Feedback",
                        description: "Community feedback helps improve our system and identifies areas where the AI may need human guidance."
                      }
                    ].map((step, index) => (
                      <li key={index} className="mb-10 ml-6">
                        <span className="absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-8 ring-background bg-primary text-primary-foreground">
                          {index + 1}
                        </span>
                        <h3 className="flex items-center text-lg font-semibold">
                          {step.title}
                        </h3>
                        <p className="text-base text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </section>
            
            {/* AI Technology */}
            <section>
              <div className="flex items-center mb-6">
                <Brain className="h-8 w-8 mr-3 text-primary" />
                <h2 className="text-2xl font-bold">AI Technology</h2>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-amber-500" />
                      Claim Verification (BART NLI)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      We use the BART-large-mnli model from Facebook AI to perform Natural Language Inference. This model analyzes whether the evidence entails, contradicts, or is neutral towards the claim.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-teal-500" />
                      Evidence Extraction (RoBERTa QA)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Our system uses RoBERTa-base-squad2 to extract relevant evidence from source documents. This Question-Answering model finds the most pertinent information for verification.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                      Voice Transcription (Whisper)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      We use OpenAI's Whisper model to convert spoken claims into text, allowing for easy verification of audio or voice-based claims.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="h-5 w-5 mr-2 text-indigo-500" />
                      Knowledge Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Our primary source of evidence is Wikipedia, one of the most comprehensive and monitored knowledge bases. We also incorporate other reliable reference databases when available.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>
            
            {/* AI Enhancements */}
            <section>
              <div className="flex items-center mb-6">
                <UserCheck className="h-8 w-8 mr-3 text-primary" />
                <h2 className="text-2xl font-bold">Advanced Features</h2>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <ul className="space-y-4">
                    {[
                      {
                        title: "Multi-model Ensemble",
                        description: "We combine results from multiple AI models for more accurate verdicts and higher confidence."
                      },
                      {
                        title: "Contextual Scoring",
                        description: "Our confidence scores take into account evidence quality and source credibility."
                      },
                      {
                        title: "Fallback Strategy",
                        description: "If one model fails, we have backup approaches to ensure you always get a response."
                      },
                      {
                        title: "Community Feedback",
                        description: "User votes help us improve accuracy and identify challenging cases."
                      },
                      {
                        title: "Explainability",
                        description: "We provide transparent reasoning for each verdict in the AI Lab section."
                      }
                    ].map((feature, index) => (
                      <li key={index} className="flex">
                        <Check className="h-5 w-5 mr-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-medium">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
            
            {/* Limitations */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Limitations & Disclaimer</h2>
              
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">
                    While Fake News Sniper uses advanced AI to verify claims, please be aware of these limitations:
                  </p>
                  
                  <ul className="space-y-2 list-disc pl-5 text-sm">
                    <li>AI models can make mistakes and have biases</li>
                    <li>Verdicts are based on available evidence which may be incomplete</li>
                    <li>The system's knowledge cutoff means very recent events may not be accurately verified</li>
                    <li>Some complex claims require human expertise and nuanced analysis</li>
                    <li>Always cross-check important information with multiple trusted sources</li>
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}