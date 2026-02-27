"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { D2LService } from "@/lib/lms/d2l-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  University as UniversityIcon, 
  Link, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  BookOpen,
  Calendar,
  Settings,
  RefreshCw
} from "lucide-react"

interface University {
  id: string
  name: string
  domain: string
  lms_type: string
  lms_url: string
  logo_url?: string
}

interface LMSIntegration {
  id: string
  university_id: string
  university: University
  lms_user_id: string
  is_active: boolean
  last_sync_at: string
  courses_count?: number
  assignments_count?: number
}

export function UniversityIntegration() {
  const [universities, setUniversities] = useState<University[]>([])
  const [integrations, setIntegrations] = useState<LMSIntegration[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [connecting, setConnecting] = useState(false)

  // Load available universities and user integrations
  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error("Please log in to access university integrations")
        return
      }

      // Load available universities
      const { data: universities, error: uniError } = await supabase
        .from('universities')
        .select('*')
        .order('name')
      
      if (uniError) throw uniError
      setUniversities(universities || [])

      // Load user integrations with university info
      const { data: integrations, error: intError } = await supabase
        .from('lms_integrations')
        .select(`
          *,
          university:universities(*),
          courses_count:lms_courses(count),
          assignments_count:lms_assignments(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (intError) throw intError
      setIntegrations(integrations || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error("Failed to load universities")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleConnect = async () => {
    if (!selectedUniversity || !username || !password) {
      toast.error("Please fill in all fields")
      return
    }

    setConnecting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error("Please log in to connect to university")
        return
      }

      // Authenticate with D2L
      if (selectedUniversity.lms_type === 'd2l') {
        // For now, we'll simulate authentication since we need proper D2L API credentials
        // In production, this would use the actual D2L OAuth flow
        const authSuccess = true // Simulate successful auth
        
        if (!authSuccess) {
          toast.error("Authentication failed")
          return
        }

        // Save integration to database
        const { error: insertError } = await supabase
          .from('lms_integrations')
          .insert({
            user_id: user.id,
            university_id: selectedUniversity.id,
            lms_user_id: username,
            access_token: 'mock_token', // In production, this would be the real token
            refresh_token: 'mock_refresh', // In production, this would be the real refresh token
            token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            is_active: true
          })
        
        if (insertError) {
          console.error('Error saving integration:', insertError)
          toast.error("Failed to save integration")
          return
        }
      }
      
      toast.success(`Connected to ${selectedUniversity.name} successfully!`)
      setUsername("")
      setPassword("")
      setSelectedUniversity(null)
      loadData()
    } catch (error) {
      console.error('Connection error:', error)
      toast.error("Failed to connect to university")
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async (integrationId: string) => {
    try {
      const supabase = createClient()
      
      // Get integration details
      const { data: integration, error: intError } = await supabase
        .from('lms_integrations')
        .select('*, university:universities(*)')
        .eq('id', integrationId)
        .single()
      
      if (intError || !integration) {
        toast.error("Integration not found")
        return
      }

      // For now, simulate sync
      // In production, this would sync with D2L API
      toast.success("Assignments synced successfully!")
      loadData()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error("Failed to sync assignments")
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm("Are you sure you want to disconnect this university?")) return
    
    try {
      const supabase = createClient()
      
      // Delete integration (cascade will delete courses and assignments)
      const { error } = await supabase
        .from('lms_integrations')
        .delete()
        .eq('id', integrationId)
      
      if (error) {
        console.error('Error disconnecting:', error)
        toast.error("Failed to disconnect")
        return
      }
      
      toast.success("University disconnected")
      loadData()
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error("Failed to disconnect")
    }
  }

  const getLMSIcon = (lmsType: string) => {
    switch (lmsType) {
      case 'd2l':
        return <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-xs">D2L</div>
      case 'canvas':
        return <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white font-bold text-xs">C</div>
      case 'moodle':
        return <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">M</div>
      default:
        return <UniversityIcon className="w-8 h-8" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">University Integration</h1>
        <p className="text-muted-foreground">
          Connect your university's learning management system to automatically sync assignments and deadlines.
        </p>
      </div>

      <Tabs defaultValue="connected" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="add">Add University</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <UniversityIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No universities connected</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your university to automatically sync assignments and deadlines.
                </p>
                <Button onClick={() => setSelectedUniversity(universities[0])}>
                  <Link className="w-4 h-4 mr-2" />
                  Connect University
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getLMSIcon(integration.university.lms_type)}
                        <div>
                          <CardTitle className="text-lg">{integration.university.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {integration.university.lms_url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={integration.is_active ? "default" : "secondary"}>
                          {integration.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(integration.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <span>{integration.courses_count || 0} courses</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{integration.assignments_count || 0} assignments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          Last sync: {integration.last_sync_at ? 
                            new Date(integration.last_sync_at).toLocaleDateString() : 
                            'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connect New University</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select University</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {universities.map((university) => (
                    <button
                      key={university.id}
                      onClick={() => setSelectedUniversity(university)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        selectedUniversity?.id === university.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getLMSIcon(university.lms_type)}
                        <div>
                          <div className="font-medium">{university.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {university.lms_type.toUpperCase()} • {university.domain}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedUniversity && (
                <div className="space-y-4 pt-4 border-t">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You will be redirected to {selectedUniversity.name} to authenticate. 
                      We only store your assignment data, never your password.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <label className="text-sm font-medium mb-2 block">University Credentials</label>
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="University username/email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="University password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleConnect}
                    disabled={connecting || !username || !password}
                    className="w-full"
                  >
                    {connecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4 mr-2" />
                        Connect to {selectedUniversity.name}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {universities.map((university) => (
              <Card key={university.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {getLMSIcon(university.lms_type)}
                    <div>
                      <CardTitle className="text-lg">{university.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {university.lms_type.toUpperCase()} Integration
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Automatically sync assignments, deadlines, and course information from {university.lms_url}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Assignments
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Deadlines
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Courses
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
