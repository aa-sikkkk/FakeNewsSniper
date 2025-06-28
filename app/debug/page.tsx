"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ClaimInput } from "@/components/ClaimInput"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { verifyClaimWithNLI, extractEvidenceWithQA } from "@/lib/huggingface"
import { getWikipediaArticle, searchWikipedia } from "@/lib/wikipedia"
import { Layers, Bug, Search, Database, Code } from "lucide-react"

interface ModelOutput {
  model: string
  input: string
  output: any
  timestamp: string
}

export default function Debug() {
  const [activeTab, setActiveTab] = useState("modelInspector")
  const [query, setQuery] = useState("")
  const [evidence, setEvidence] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([])
  
  const runBartModel = async () => {
    if (!query || !evidence) return
    
    setIsLoading(true)
    try {
      const result = await verifyClaimWithNLI(query, evidence)
      
      setModelOutputs(prev => [
        {
          model: "facebook/bart-large-mnli",
          input: JSON.stringify({ claim: query, evidence: evidence }, null, 2),
          output: JSON.stringify(result, null, 2),
          timestamp: new Date().toISOString()
        },
        ...prev
      ])
    } catch (error) {
      console.error("Error running BART model:", error)
      setModelOutputs(prev => [
        {
          model: "facebook/bart-large-mnli",
          input: JSON.stringify({ claim: query, evidence: evidence }, null, 2),
          output: JSON.stringify({ error: "Model inference failed" }, null, 2),
          timestamp: new Date().toISOString()
        },
        ...prev
      ])
    } finally {
      setIsLoading(false)
    }
  }
  
  const runRobertaModel = async () => {
    if (!query || !evidence) return
    
    setIsLoading(true)
    try {
      const result = await extractEvidenceWithQA(query, evidence)
      
      setModelOutputs(prev => [
        {
          model: "deepset/roberta-base-squad2",
          input: JSON.stringify({ question: query, context: evidence }, null, 2),
          output: JSON.stringify(result, null, 2),
          timestamp: new Date().toISOString()
        },
        ...prev
      ])
    } catch (error) {
      console.error("Error running RoBERTa model:", error)
      setModelOutputs(prev => [
        {
          model: "deepset/roberta-base-squad2",
          input: JSON.stringify({ question: query, context: evidence }, null, 2),
          output: JSON.stringify({ error: "Model inference failed" }, null, 2),
          timestamp: new Date().toISOString()
        },
        ...prev
      ])
    } finally {
      setIsLoading(false)
    }
  }
  
  const searchWikipediaArticle = async () => {
    if (!query) return
    
    setIsLoading(true)
    try {
      const results = await searchWikipedia(query)
      
      setModelOutputs(prev => [
        {
          model: "Wikipedia API",
          input: JSON.stringify({ query }, null, 2),
          output: JSON.stringify(results, null, 2),
          timestamp: new Date().toISOString()
        },
        ...prev
      ])
      
      // If we have results, set the first one as evidence for convenience
      if (results.titles.length > 0) {
        const article = await getWikipediaArticle(results.titles[0])
        setEvidence(article.content)
      }
    } catch (error) {
      console.error("Error searching Wikipedia:", error)
      setModelOutputs(prev => [
        {
          model: "Wikipedia API",
          input: JSON.stringify({ query }, null, 2),
          output: JSON.stringify({ error: "API request failed" }, null, 2),
          timestamp: new Date().toISOString()
        },
        ...prev
      ])
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 pb-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <div className="flex items-center">
              <Bug className="h-6 w-6 mr-3 text-purple-500" />
              <h1 className="text-3xl font-bold">AI Debug Panel</h1>
            </div>
            <p className="text-muted-foreground mt-2">Inspect the internal workings of the AI models and verification pipeline</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="modelInspector" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Model Inspector</span>
            </TabsTrigger>
            <TabsTrigger value="dataExplorer" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Evidence Explorer</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="modelInspector">
            <Card>
              <CardHeader>
                <CardTitle>AI Model Inspector</CardTitle>
                <CardDescription>Test AI models individually with custom inputs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Claim or Question</label>
                    <Input 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter claim or question..."
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Evidence or Context</label>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-xs h-5 px-0"
                        onClick={searchWikipediaArticle}
                      >
                        <Search className="h-3 w-3 mr-1" />
                        Find Evidence
                      </Button>
                    </div>
                    <Textarea 
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      placeholder="Enter evidence or context text..."
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 justify-start">
                  <Button 
                    variant="outline"
                    onClick={runBartModel}
                    disabled={!query || !evidence || isLoading}
                  >
                    Run BART NLI Model
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={runRobertaModel}
                    disabled={!query || !evidence || isLoading}
                  >
                    Run RoBERTa QA Model
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center my-8">
                    <LoadingSpinner text="Running model inference..." />
                  </div>
                ) : (
                  <div className="space-y-6 mt-8">
                    <h3 className="text-lg font-medium">Model Outputs</h3>
                    {modelOutputs.length > 0 ? (
                      <div className="space-y-4">
                        {modelOutputs.map((output, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Card className="bg-muted/30">
                              <CardHeader className="py-3">
                                <div className="flex justify-between items-center">
                                  <CardTitle className="text-base flex items-center">
                                    <Code className="h-4 w-4 mr-2" />
                                    {output.model}
                                  </CardTitle>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(output.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </CardHeader>
                              <CardContent className="py-0">
                                <div className="grid gap-2 md:grid-cols-2 text-xs">
                                  <div>
                                    <h4 className="font-medium mb-1">Input:</h4>
                                    <pre className="bg-background/70 p-2 rounded overflow-x-auto">
                                      {output.input}
                                    </pre>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Output:</h4>
                                    <pre className="bg-background/70 p-2 rounded overflow-x-auto">
                                      {output.output}
                                    </pre>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 border border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                          No model outputs yet. Run a model to see results here.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="dataExplorer">
            <Card>
              <CardHeader>
                <CardTitle>Evidence Explorer</CardTitle>
                <CardDescription>Search Wikipedia and explore evidence sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-grow">
                    <Input 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search for information..."
                      className="w-full"
                    />
                  </div>
                  <Button 
                    onClick={searchWikipediaArticle}
                    disabled={!query || isLoading}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center my-8">
                    <LoadingSpinner text="Searching Wikipedia..." />
                  </div>
                ) : (
                  <div className="mt-8">
                    {evidence ? (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Evidence Content</h3>
                        <Card className="bg-muted/30">
                          <CardContent className="py-4 max-h-96 overflow-y-auto">
                            <p className="whitespace-pre-wrap">{evidence}</p>
                          </CardContent>
                        </Card>
                      </div>
                    ) : modelOutputs.some(o => o.model === "Wikipedia API") ? (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Search Results</h3>
                        <Card className="bg-muted/30">
                          <CardContent className="py-4">
                            {modelOutputs.find(o => o.model === "Wikipedia API")?.output}
                          </CardContent>
                        </Card>
                        <p className="text-sm text-muted-foreground mt-2">
                          Click on a search result to load the article content.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center p-12 border border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                          Search for a topic to see Wikipedia results here.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}