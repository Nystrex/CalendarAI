"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Loader2,
  GraduationCap,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle,
  Link2,
  Search
} from "lucide-react"

interface LMSIntegration {
  id: string
  user_id: string
  user_email?: string
  university: {
    id: string
    name: string
    domain: string
    lms_type: string
    lms_url: string
  }
  lms_user_id: string
  is_active: boolean
  last_sync_at: string | null
  created_at: string
  courses_count?: number
  assignments_count?: number
}

interface SyncLog {
  id: string
  integration_id: string
  sync_type: string
  status: string
  message: string | null
  courses_synced: number
  assignments_synced: number
  created_at: string
}

export function AdminLMSPanel() {
  const [integrations, setIntegrations] = useState<LMSIntegration[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState<"integrations" | "logs">("integrations")
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load all integrations with user and university info
      const { data: intData, error: intError } = await supabase
        .from('lms_integrations')
        .select(`
          *,
          university:universities(*),
          courses_count:lms_courses(count),
          assignments_count:lms_assignments(count)
        `)
        .order('created_at', { ascending: false })

      if (intError) throw intError

      // Get user emails for each integration
      const userIds = intData?.map(i => i.user_id) || []
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      const userMap = new Map(profiles?.map(p => [p.id, p.email]) || [])

      const enrichedIntegrations = intData?.map(int => ({
        ...int,
        user_email: userMap.get(int.user_id) || int.user_id
      })) || []

      setIntegrations(enrichedIntegrations)

      // Load recent sync logs
      const { data: logs, error: logsError } = await supabase
        .from('lms_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (logsError) throw logsError
      setSyncLogs(logs || [])
    } catch (error) {
      console.error('Error loading LMS data:', error)
      toast.error('Failed to load LMS data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDisconnect = async (integrationId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to disconnect ${userEmail}'s university connection?`)) {
      return
    }

    setIsDisconnecting(integrationId)
    try {
      const { error } = await supabase
        .from('lms_integrations')
        .delete()
        .eq('id', integrationId)

      if (error) throw error

      toast.success(`Disconnected ${userEmail}'s university`)
      loadData()
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Failed to disconnect')
    } finally {
      setIsDisconnecting(null)
    }
  }

  const handleSync = async (integrationId: string) => {
    setIsSyncing(integrationId)
    try {
      // Get integration details
      const { data: integration, error } = await supabase
        .from('lms_integrations')
        .select('*, university:universities(*)')
        .eq('id', integrationId)
        .single()

      if (error || !integration) {
        toast.error('Integration not found')
        return
      }

      // For now, simulate sync (in production, call actual D2L service)
      toast.success('Sync initiated (simulated)')
      loadData()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Failed to sync')
    } finally {
      setIsSyncing(null)
    }
  }

  const filteredIntegrations = integrations.filter(
    int =>
      int.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.university.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.university.domain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getLMSTypeBadge = (type: string) => {
    switch (type) {
      case 'd2l':
        return <Badge className="bg-orange-500">D2L</Badge>
      case 'canvas':
        return <Badge className="bg-red-500">Canvas</Badge>
      case 'moodle':
        return <Badge className="bg-blue-600">Moodle</Badge>
      case 'blackboard':
        return <Badge className="bg-gray-700">Blackboard</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getStatusBadge = (isActive: boolean, lastSync: string | null) => {
    if (!isActive) {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
          <XCircle className="mr-1 h-3 w-3" />
          Inactive
        </Badge>
      )
    }
    if (!lastSync) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
          <Clock className="mr-1 h-3 w-3" />
          Never Synced
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-500">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Active
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">LMS Integration Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage university LMS connections and sync status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === "integrations" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("integrations")}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Integrations
          </Button>
          <Button
            variant={activeView === "logs" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("logs")}
          >
            <Clock className="mr-2 h-4 w-4" />
            Sync Logs
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <GraduationCap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Connections</p>
              <p className="text-2xl font-bold">{integrations.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">
                {integrations.filter(i => i.is_active).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <BookOpen className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Courses</p>
              <p className="text-2xl font-bold">
                {integrations.reduce((sum, i) => sum + (i.courses_count || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assignments</p>
              <p className="text-2xl font-bold">
                {integrations.reduce((sum, i) => sum + (i.assignments_count || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {activeView === "integrations" && (
        <>
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or university..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Integrations List */}
          <Card>
            <CardHeader>
              <CardTitle>University Connections</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredIntegrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No university connections found</p>
                  <p className="text-sm mt-1">
                    Users will appear here when they connect their university accounts
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIntegrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{integration.user_email}</p>
                            {getStatusBadge(integration.is_active, integration.last_sync_at)}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {getLMSTypeBadge(integration.university.lms_type)}
                            <span className="text-sm text-muted-foreground">
                              {integration.university.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {integration.courses_count || 0} courses
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {integration.assignments_count || 0} assignments
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {integration.last_sync_at
                                ? `Last sync: ${new Date(integration.last_sync_at).toLocaleDateString()}`
                                : 'Never synced'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(integration.id)}
                          disabled={isSyncing === integration.id || !integration.is_active}
                        >
                          {isSyncing === integration.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">Sync</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => handleDisconnect(integration.id, integration.user_email || '')}
                          disabled={isDisconnecting === integration.id}
                        >
                          {isDisconnecting === integration.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeView === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {syncLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sync logs yet</p>
                <p className="text-sm mt-1">
                  Logs will appear here when users sync their assignments
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        log.status === 'success'
                          ? 'bg-green-500/10 text-green-500'
                          : log.status === 'error'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : log.status === 'error' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">
                          {log.sync_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`capitalize ${
                            log.status === 'success'
                              ? 'text-green-500 border-green-500/20'
                              : log.status === 'error'
                              ? 'text-red-500 border-red-500/20'
                              : 'text-yellow-500 border-yellow-500/20'
                          }`}
                        >
                          {log.status}
                        </Badge>
                      </div>
                      {log.message && (
                        <p className="text-sm mt-1">{log.message}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{log.courses_synced} courses synced</span>
                        <span>{log.assignments_synced} assignments synced</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
