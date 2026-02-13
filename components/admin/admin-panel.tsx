"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UNIVERSITIES } from "@/lib/utils/university-verification"
import { cn } from "@/lib/utils"
import {
  Loader2,
  Users,
  Calendar,
  FileText,
  Link2,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowLeft,
  Server,
  Cpu,
  HardDrive,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  UserX,
  BarChart3,
  History,
  Zap,
  Edit,
  GraduationCap,
  ChevronsUpDown,
  Check,
  Crown,
  Star,
  MessageCircle,
  Settings,
} from "lucide-react"
import { AdminSupportPanel } from "./admin-support-panel"
import { AdminConfigPanel } from "./admin-config-panel"
import { toast } from "sonner"
import Link from "next/link"

interface UserStat {
  id: string
  email: string
  full_name: string | null
  time_zone: string | null
  university: string | null
  university_verified: boolean
  subscription_tier: string
  subscription_status: string
  created_at: string
  calendars_count: number
  events_count: number
  google_connected: boolean
}

interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  changes: Record<string, unknown>
  created_at: string
  user_email?: string
}

interface ActivityStats {
  events_today: number
  events_this_week: number
  events_this_month: number
  active_users_today: number
  active_users_this_week: number
  new_users_this_week: number
  most_active_user: { email: string; events: number } | null
  busiest_day: { day: string; count: number } | null
}

interface AdminStats {
  total_users: number
  total_calendars: number
  total_events: number
  google_connections: number
  users: UserStat[]
  activity?: ActivityStats
  recent_audit_logs?: AuditLog[]
}

interface ServerStats {
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  cpu: {
    user: number
    system: number
  }
  uptime: number
  loadAverage: string[]
  platform: string
  nodeVersion: string
  timestamp: string
}

export function AdminPanel({ userEmail }: { userEmail: string }) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [serverStats, setServerStats] = useState<ServerStats | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<UserStat | null>(null)
  const [selectedUniversity, setSelectedUniversity] = useState<string>("")
  const [universityVerified, setUniversityVerified] = useState(false)
  const [universitySearchOpen, setUniversitySearchOpen] = useState(false)
  const [universitySearchQuery, setUniversitySearchQuery] = useState("")
  const [isSavingUniversity, setIsSavingUniversity] = useState(false)
  const [isGrantingPremium, setIsGrantingPremium] = useState<string | null>(null)

  useEffect(() => {
    const storedPassword = sessionStorage.getItem("admin_password")
    if (storedPassword) {
      setPassword(storedPassword)
      authenticateWithPassword(storedPassword)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchServerStats = async () => {
      const storedPassword = sessionStorage.getItem("admin_password")
      if (!storedPassword) return

      try {
        const response = await fetch("/api/admin/server-stats", {
          headers: {
            "x-admin-password": storedPassword,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setServerStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch server stats:", error)
      }
    }

    fetchServerStats()
    const interval = setInterval(fetchServerStats, 5000)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  const authenticateWithPassword = async (pwd: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/stats", {
        headers: {
          "x-admin-password": pwd,
        },
      })

      if (response.status === 401) {
        toast.error("Invalid password")
        sessionStorage.removeItem("admin_password")
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: "Unknown server error" }))
        throw new Error(errBody.error || `Server error ${response.status}`)
      }

      const data = await response.json()
      setStats(data)
      setIsAuthenticated(true)
      sessionStorage.setItem("admin_password", pwd)
      toast.success("Admin access granted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to authenticate")
      sessionStorage.removeItem("admin_password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthenticate = async () => {
    if (!password) {
      toast.error("Please enter admin password")
      return
    }
    await authenticateWithPassword(password)
  }

  const handleRefresh = async () => {
    const storedPassword = sessionStorage.getItem("admin_password")
    if (!storedPassword) return

    setIsRefreshing(true)
    try {
      const response = await fetch("/api/admin/stats", {
        headers: {
          "x-admin-password": storedPassword,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch admin data")
      }

      const data = await response.json()
      setStats(data)
      toast.success("Admin data refreshed")
    } catch (error) {
      console.error("Admin refresh error:", error)
      toast.error("Failed to refresh data")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This will delete all their data.`)) {
      return
    }

    setIsDeletingUser(userId)
    const storedPassword = sessionStorage.getItem("admin_password")

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": storedPassword || "",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete user")
      }

      toast.success(`User ${email} deleted successfully`)
      handleRefresh()
    } catch (error) {
      console.error("Delete user error:", error)
      toast.error("Failed to delete user")
    } finally {
      setIsDeletingUser(null)
    }
  }

  const handleEditUniversity = (user: UserStat) => {
    setEditingUser(user)
    setSelectedUniversity(user.university || "none")
    setUniversityVerified(user.university_verified || false)
    setUniversitySearchQuery("")
  }

  const handleCloseUniversityDialog = () => {
    setEditingUser(null)
    setSelectedUniversity("")
    setUniversityVerified(false)
    setUniversitySearchQuery("")
    setUniversitySearchOpen(false)
  }

  const handleTogglePremium = async (userId: string, email: string, currentTier: string) => {
    const action = currentTier === "premium" ? "revoke" : "grant"
    
    let duration = 12 // default 12 months
    
    if (action === "grant") {
      const durationInput = prompt(
        `Grant Premium access to ${email}\n\nHow many months should Premium last? (Enter a number)`,
        "12"
      )
      
      if (durationInput === null) {
        return // User cancelled
      }
      
      duration = parseInt(durationInput, 10)
      
      if (isNaN(duration) || duration < 1) {
        toast.error("Invalid duration. Please enter a positive number.")
        return
      }
      
      const confirmMessage = `Grant Premium access to ${email} for ${duration} month${duration > 1 ? "s" : ""}?`
      if (!confirm(confirmMessage)) {
        return
      }
    } else {
      const confirmMessage = `Revoke Premium access from ${email}? They will be downgraded to the free tier.`
      if (!confirm(confirmMessage)) {
        return
      }
    }

    setIsGrantingPremium(userId)
    const storedPassword = sessionStorage.getItem("admin_password")

    try {
      const response = await fetch(`/api/admin/users/${userId}/premium`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": storedPassword || "",
        },
        body: JSON.stringify({ action, duration }),
      })

      if (!response.ok) {
        throw new Error("Failed to update premium status")
      }

      const result = await response.json()
      console.log("[CalendarAI] Premium toggle result:", result)
      toast.success(result.message)
      await handleRefresh()
      console.log("[CalendarAI] Stats refreshed after premium toggle")
    } catch (error) {
      console.error("Toggle premium error:", error)
      toast.error("Failed to update premium status")
    } finally {
      setIsGrantingPremium(null)
    }
  }

  const handleSaveUniversity = async () => {
    if (!editingUser) {
      console.error("[CalendarAI] No editing user set")
      return
    }

  if (!editingUser.id) {
  toast.error("Cannot update university: user ID is missing")
  return
  }

    setIsSavingUniversity(true)
    const storedPassword = sessionStorage.getItem("admin_password")

  const updatePayload = {
  university: selectedUniversity === "none" ? null : selectedUniversity,
  university_verified: selectedUniversity !== "none" && selectedUniversity !== "other" ? universityVerified : false,
  }

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}/university`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": storedPassword || "",
        },
        body: JSON.stringify(updatePayload),
      })

      const responseData = await response.json()
      console.log("[CalendarAI] University update response:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to update university")
      }

      toast.success("University affiliation updated successfully")
      console.log("[CalendarAI] Closing dialog and refreshing...")
      handleCloseUniversityDialog()
      await handleRefresh()
      console.log("[CalendarAI] Refresh complete")
    } catch (error) {
      console.error("[CalendarAI] Update university error:", error)
      toast.error("Failed to update university affiliation")
    } finally {
      setIsSavingUniversity(false)
    }
  }

  const filteredUsers = stats?.users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getHealthStatus = () => {
    if (!serverStats) return { status: "unknown", color: "gray" }

    const heapUsagePercent = (serverStats.memory.heapUsed / serverStats.memory.heapTotal) * 100

    if (heapUsagePercent > 90) return { status: "critical", color: "red" }
    if (heapUsagePercent > 75) return { status: "warning", color: "yellow" }
    return { status: "healthy", color: "green" }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Logged in as: {userEmail}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                  placeholder="Enter admin password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button onClick={handleAuthenticate} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Admin Panel"
              )}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        {stats && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
<TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
  <TabsTrigger value="overview" className="gap-2">
  <BarChart3 className="h-4 w-4" />
  <span className="hidden sm:inline">Overview</span>
  </TabsTrigger>
  <TabsTrigger value="users" className="gap-2">
  <Users className="h-4 w-4" />
  <span className="hidden sm:inline">Users</span>
  </TabsTrigger>
  <TabsTrigger value="config" className="gap-2">
  <Settings className="h-4 w-4" />
  <span className="hidden sm:inline">Config</span>
  </TabsTrigger>
  <TabsTrigger value="support" className="gap-2">
  <MessageCircle className="h-4 w-4" />
  <span className="hidden sm:inline">Support</span>
  </TabsTrigger>
  <TabsTrigger value="activity" className="gap-2">
  <History className="h-4 w-4" />
  <span className="hidden sm:inline">Activity</span>
  </TabsTrigger>
  <TabsTrigger value="system" className="gap-2">
  <Server className="h-4 w-4" />
  <span className="hidden sm:inline">System</span>
  </TabsTrigger>
  </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                        <Users className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold">{stats.total_users}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                        <Calendar className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Calendars</p>
                        <p className="text-2xl font-bold">{stats.total_calendars}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                        <FileText className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Events</p>
                        <p className="text-2xl font-bold">{stats.total_events}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                        <Link2 className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Google Connected</p>
                        <p className="text-2xl font-bold">{stats.google_connections}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {stats.activity && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-6 border-l-4 border-l-emerald-500">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">Events Created</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-2xl font-bold">{stats.activity.events_today}</p>
                            <p className="text-xs text-muted-foreground">Today</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stats.activity.events_this_week}</p>
                            <p className="text-xs text-muted-foreground">This Week</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stats.activity.events_this_month}</p>
                            <p className="text-xs text-muted-foreground">This Month</p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 border-l-4 border-l-blue-500">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-500">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm font-medium">Active Users</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-2xl font-bold">{stats.activity.active_users_today}</p>
                            <p className="text-xs text-muted-foreground">Today</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stats.activity.active_users_this_week}</p>
                            <p className="text-xs text-muted-foreground">This Week</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stats.activity.new_users_this_week}</p>
                            <p className="text-xs text-muted-foreground">New Users</p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 border-l-4 border-l-amber-500">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-500">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Highlights</span>
                        </div>
                        <div className="space-y-3">
                          {stats.activity.most_active_user && (
                            <div>
                              <p className="text-xs text-muted-foreground">Most Active</p>
                              <p className="text-sm font-medium truncate">{stats.activity.most_active_user.email}</p>
                              <p className="text-xs text-muted-foreground">
                                {stats.activity.most_active_user.events} events
                              </p>
                            </div>
                          )}
                          {stats.activity.busiest_day && (
                            <div>
                              <p className="text-xs text-muted-foreground">Busiest Day</p>
                              <p className="text-sm font-medium">{stats.activity.busiest_day.day}</p>
                              <p className="text-xs text-muted-foreground">{stats.activity.busiest_day.count} events</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Quick User Overview */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Recent Users</h2>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("users")}>
                        View All
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                            <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
                            <th className="pb-3 text-center text-sm font-medium text-muted-foreground">Events</th>
                            <th className="pb-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.users.slice(0, 5).map((user) => (
                            <tr key={user.id} className="border-b last:border-0">
                              <td className="py-3 text-sm">{user.email}</td>
                              <td className="py-3 text-sm text-muted-foreground">
                                {new Date(user.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-3 text-center text-sm">{user.events_count}</td>
                              <td className="py-3 text-center">
                                {user.google_connected ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-500/10 text-green-500 border-green-500/20"
                                  >
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Connected
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Local Only
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <h2 className="text-xl font-semibold">All Users ({stats.total_users})</h2>
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                            <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                            <th className="pb-3 text-center text-sm font-medium text-muted-foreground">Plan</th>
                            <th className="pb-3 text-left text-sm font-medium text-muted-foreground">University/College</th>
                            <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
                            <th className="pb-3 text-center text-sm font-medium text-muted-foreground">Calendars</th>
                            <th className="pb-3 text-center text-sm font-medium text-muted-foreground">Events</th>
                            <th className="pb-3 text-center text-sm font-medium text-muted-foreground">Google</th>
                            <th className="pb-3 text-center text-sm font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers?.map((user) => (
                            <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-3 text-sm">{user.email}</td>
                              <td className="py-3 text-sm">{user.full_name || "-"}</td>
                              <td className="py-3 text-center">
                                {user.subscription_tier === "premium" ? (
                                  <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Premium
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Free</Badge>
                                )}
                              </td>
                              <td className="py-3 text-sm">
                                {user.university ? (
                                  <div className="flex items-center gap-1">
                                    <span>{user.university}</span>
                                    {user.university_verified && (
                                      <CheckCircle2 className="h-3 w-3 text-green-500" title="Verified" />
                                    )}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="py-3 text-sm">
                                {new Date(user.created_at).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="py-3 text-center text-sm">{user.calendars_count}</td>
                              <td className="py-3 text-center text-sm">{user.events_count}</td>
                              <td className="py-3 text-center">
                                <span
                                  className={`inline-flex h-2 w-2 rounded-full ${
                                    user.google_connected ? "bg-green-500" : "bg-gray-300"
                                  }`}
                                />
                              </td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={
                                      user.subscription_tier === "premium"
                                        ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                        : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                                    }
                                    onClick={() => handleTogglePremium(user.id, user.email, user.subscription_tier)}
                                    disabled={isGrantingPremium === user.id}
                                    title={user.subscription_tier === "premium" ? "Revoke Premium" : "Grant Premium"}
                                  >
                                    {isGrantingPremium === user.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Star className={`h-4 w-4 ${user.subscription_tier === "premium" ? "fill-amber-500" : ""}`} />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                    onClick={() => handleEditUniversity(user)}
                                    title="Edit University"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {user.email !== userEmail && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      onClick={() => handleDeleteUser(user.id, user.email)}
                                      disabled={isDeletingUser === user.id}
                                      title="Delete User"
                                    >
                                      {isDeletingUser === user.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <UserX className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {filteredUsers?.length === 0 && (
                        <div className="py-8 text-center text-sm text-muted-foreground">No users found</div>
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-purple-500" />
                      <h2 className="text-xl font-semibold">Recent Activity</h2>
                    </div>

                    {stats.recent_audit_logs && stats.recent_audit_logs.length > 0 ? (
                      <div className="space-y-3">
                        {stats.recent_audit_logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                log.action === "create"
                                  ? "bg-green-500/10 text-green-500"
                                  : log.action === "update"
                                    ? "bg-blue-500/10 text-blue-500"
                                    : log.action === "delete"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-gray-500/10 text-gray-500"
                              }`}
                            >
                              {log.action === "create" && <FileText className="h-5 w-5" />}
                              {log.action === "update" && <RefreshCw className="h-5 w-5" />}
                              {log.action === "delete" && <Trash2 className="h-5 w-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="capitalize">
                                  {log.action}
                                </Badge>
                                <Badge variant="secondary" className="capitalize">
                                  {log.entity_type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {log.user_email || log.user_id}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No recent activity logged</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Activity will appear here as users interact with the app
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              {/* Config Tab */}
              <TabsContent value="config" className="space-y-6">
                <AdminConfigPanel />
              </TabsContent>

              {/* Support Tab */}
              <TabsContent value="support" className="space-y-6">
                <AdminSupportPanel />
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system" className="space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-blue-500" />
                        <h2 className="text-xl font-semibold">Server Statistics</h2>
                      </div>
                      {serverStats && (
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full bg-${getHealthStatus().color}-500 animate-pulse`} />
                          <span className="text-sm text-muted-foreground capitalize">{getHealthStatus().status}</span>
                        </div>
                      )}
                    </div>

                    {serverStats ? (
                      <div className="grid gap-4 md:grid-cols-3">
                        {/* Memory Usage */}
                        <Card className="p-4 border-2">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4 text-purple-500" />
                              <h3 className="text-sm font-medium">Memory Usage</h3>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Heap Used</span>
                                <span className="font-mono font-medium">{serverStats.memory.heapUsed} MB</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 transition-all"
                                  style={{
                                    width: `${(serverStats.memory.heapUsed / serverStats.memory.heapTotal) * 100}%`,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Total: {serverStats.memory.heapTotal} MB</span>
                                <span>
                                  {Math.round((serverStats.memory.heapUsed / serverStats.memory.heapTotal) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>

                        {/* CPU Usage */}
                        <Card className="p-4 border-2">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Cpu className="h-4 w-4 text-orange-500" />
                              <h3 className="text-sm font-medium">CPU Usage</h3>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">User</span>
                                <span className="font-mono font-medium">{serverStats.cpu.user} ms</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">System</span>
                                <span className="font-mono font-medium">{serverStats.cpu.system} ms</span>
                              </div>
                              <div className="pt-2 text-xs text-muted-foreground">
                                Load Avg: {serverStats.loadAverage.join(", ")}
                              </div>
                            </div>
                          </div>
                        </Card>

                        {/* System Info */}
                        <Card className="p-4 border-2">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-green-500" />
                              <h3 className="text-sm font-medium">System Info</h3>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Uptime</span>
                                <span className="font-mono font-medium">{formatUptime(serverStats.uptime)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Platform</span>
                                <span className="font-mono font-medium capitalize">{serverStats.platform}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Node</span>
                                <span className="font-mono font-medium">{serverStats.nodeVersion}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading server statistics...
                      </div>
                    )}
                  </div>
                </Card>

                {/* Danger Zone */}
                <Card className="p-6 border-red-500/20">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-5 w-5" />
                      <h2 className="text-xl font-semibold">Danger Zone</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">These actions are irreversible. Please be careful.</p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10 bg-transparent"
                        onClick={() => toast.info("This feature is coming soon")}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All Audit Logs
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10 bg-transparent"
                        onClick={() => toast.info("This feature is coming soon")}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset All Google Connections
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Edit University Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCloseUniversityDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Edit University/College Affiliation
            </DialogTitle>
            <DialogDescription>
              Manually set the university/college for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>University/College</Label>
              <Popover open={universitySearchOpen} onOpenChange={setUniversitySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={universitySearchOpen}
                    className="w-full justify-between font-normal bg-transparent"
                  >
                    {selectedUniversity
                      ? selectedUniversity === "none"
                        ? "Not in university/college"
                        : selectedUniversity === "other"
                          ? "Other university/college"
                          : UNIVERSITIES.find((uni) => uni.name === selectedUniversity)?.name
                      : "Search university/college..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start" side="bottom" sideOffset={4}>
                  <div className="border-b p-2">
                    <Input
                      placeholder="Search..."
                      value={universitySearchQuery}
                      onChange={(e) => setUniversitySearchQuery(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <div className="p-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start font-normal"
                        onClick={() => {
                          setSelectedUniversity("none")
                          setUniversitySearchOpen(false)
                          setUniversitySearchQuery("")
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedUniversity === "none" ? "opacity-100" : "opacity-0",
                          )}
                        />
                        Not in university/college
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start font-normal"
                        onClick={() => {
                          setSelectedUniversity("other")
                          setUniversitySearchOpen(false)
                          setUniversitySearchQuery("")
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedUniversity === "other" ? "opacity-100" : "opacity-0",
                          )}
                        />
                        Other university/college
                      </Button>
                      <div className="my-1 border-t" />
                      {UNIVERSITIES.filter(
                        (uni) =>
                          uni.name.toLowerCase().includes(universitySearchQuery.toLowerCase()) ||
                          uni.country.toLowerCase().includes(universitySearchQuery.toLowerCase()),
                      ).map((uni) => (
                        <Button
                          key={uni.name}
                          variant="ghost"
                          className="w-full justify-start font-normal"
                          onClick={() => {
                            setSelectedUniversity(uni.name)
                            setUniversitySearchOpen(false)
                            setUniversitySearchQuery("")
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUniversity === uni.name ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {uni.name} ({uni.country})
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {selectedUniversity && selectedUniversity !== "none" && selectedUniversity !== "other" && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="university-verified"
                  checked={universityVerified}
                  onChange={(e) => setUniversityVerified(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="university-verified" className="text-sm font-normal cursor-pointer">
                  Mark as verified
                </Label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCloseUniversityDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveUniversity} disabled={isSavingUniversity}>
              {isSavingUniversity ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
