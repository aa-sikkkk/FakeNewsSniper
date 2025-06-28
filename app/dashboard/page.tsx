"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { getUserClaims, getClaimStats } from "@/lib/supabase"
import { Claim } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function Dashboard() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    verified: number;
    false: number;
    averageConfidence: number;
    history: any[];
    confidence: { range: string; count: number; }[];
    categories: any[];
  }>({
    verified: 0,
    false: 0,
    averageConfidence: 0,
    history: [],
    confidence: [],
    categories: []
  })
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log("Dashboard - Current session:", session)
      
      if (error || !session) {
        console.error("Dashboard - Auth error:", error)
        toast({
          title: "Authentication Required",
          description: "Please log in to access the dashboard",
          variant: "destructive"
        })
        router.push('/login')
        return
      }

      fetchDashboardData(session.user.id)
    }

    checkAuth()
  }, [router, toast])

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true)
      console.log("Dashboard - Fetching data for user:", userId)
      
      // Fetch user claims
      const userClaims = await getUserClaims(userId)
      console.log("Dashboard - Fetched claims:", userClaims)
      setClaims(userClaims)

      // Fetch claim statistics
      const claimStats = await getClaimStats(userId)
      console.log("Dashboard - Fetched stats:", claimStats)
      setStats(claimStats)

      setLoading(false)
    } catch (error) {
      console.error("Dashboard - Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 pb-16">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Stats Dashboard</h1>
        
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Verified Claims</CardTitle>
              <CardDescription>Total verified claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-emerald-500">{stats.verified}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>False Claims</CardTitle>
              <CardDescription>Total debunked claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-500">{stats.false}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Average Confidence</CardTitle>
              <CardDescription>Across all verifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-500">{stats.averageConfidence}%</div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="history">
          <TabsList className="mb-6">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="confidence">Confidence</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Verification History</CardTitle>
                <CardDescription>Trend of claim verifications over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(17, 17, 17, 0.8)', 
                          border: '1px solid #333',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="verified" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2} 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="false" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={2} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="unverified" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={2} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="confidence" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Distribution</CardTitle>
                <CardDescription>Distribution of confidence scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.confidence}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="range" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(17, 17, 17, 0.8)', 
                          border: '1px solid #333',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--chart-2))" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Claim Categories</CardTitle>
                <CardDescription>Distribution by topic category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={stats.categories}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" stroke="#888" />
                      <YAxis dataKey="name" type="category" stroke="#888" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(17, 17, 17, 0.8)', 
                          border: '1px solid #333',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar 
                        dataKey="value" 
                        fill="hsl(var(--chart-4))" 
                        radius={[0, 4, 4, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <h2 className="text-2xl font-bold mt-12 mb-6">Recent Claims</h2>
        {loading ? (
          <div className="flex justify-center my-12">
            <LoadingSpinner text="Loading your claim history..." />
          </div>
        ) : claims.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {claims.map((claim) => (
              <Card key={claim.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{claim.text}</CardTitle>
                  <CardDescription>
                    {new Date(claim.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      claim.status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : claim.status === 'FALSE'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {claim.status === 'VERIFIED' ? 'Verified' : 
                       claim.status === 'FALSE' ? 'False' : 'Unverified'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Confidence: {claim.confidence}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">You haven't verified any claims yet.</p>
            <p>Try verifying a claim on the home page to see your history here.</p>
          </Card>
        )}
      </div>
    </div>
  )
}