"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Eye,
  KeyRound,
  Megaphone,
  Crown,
  UserX,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Send,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface UserStat {
  id: string
  email: string
  full_name: string | null
  university: string | null
  university_verified: boolean
  subscription_tier: string
  subscription_status: string
  created_at: string
  calendars_count: number
  events_count: number
  google_connected: boolean
}

interface AdminImpersonationPanelProps {
  users: UserStat[]
  currentAdminEmail: string
}

export function AdminImpersonationPanel({ users, currentAdminEmail }: AdminImpersonationPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserStat | null>(null)
  const [userDetailOpen, setUserDetailOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [isImpersonating, setIsImpersonating] = useState<string | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState<string | null>(null)
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  const storedPassword = () => sessionStorage.getItem("admin_password") || ""

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  )

  const handleViewAsUser = async (user: UserStat) => {
    if (!confirm(`You are about to impersonate ${user.email}.\n\nThis will open a magic link in a new tab to sign in as them. Proceed?`)) return

    setIsImpersonating(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/impersonate`, {
        method: "POST",
        headers: { "x-admin-password": storedPassword() },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")

      toast.success(`Magic link generated for ${data.email}`)
      window.open(data.link, "_blank")
    } catch (e: any) {
      toast.error(e.message || "Failed to impersonate user")
    } finally {
      setIsImpersonating(null)
    }
  }

  const handleResetPassword = async (user: UserStat) => {
    if (!confirm(`Send a password reset email to ${user.email}?`)) return

    setIsResettingPassword(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "x-admin-password": storedPassword() },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast.success(`Password reset email sent to ${data.email}`)
    } catch (e: any) {
      toast.error(e.message || "Failed to send reset email")
    } finally {
      setIsResettingPassword(null)
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) { toast.error("Message is required"); return }
    setIsBroadcasting(true)
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": storedPassword(),
        },
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast.success(`Announcement sent to ${data.recipients} users`)
      setBroadcastOpen(false)
      setBroadcastTitle("")
      setBroadcastMessage("")
    } catch (e: any) {
      toast.error(e.message || "Failed to send broadcast")
    } finally {
      setIsBroadcasting(false)
    }
  }

  const openUserDetail = (user: UserStat) => {
    setSelectedUser(user)
    setUserDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Top actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            User Controls &amp; Impersonation
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View-as-user, reset passwords, manage access
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setBroadcastOpen(true)}
          className="gap-2 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600"
        >
          <Megaphone className="h-4 w-4" />
          Broadcast Announcement
        </Button>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-amber-600 dark:text-amber-400">Admin impersonation is logged</p>
          <p className="text-muted-foreground mt-0.5">
            All view-as-user and password reset actions are recorded in the audit log with your admin email.
          </p>
        </div>
      </div>

      {/* User list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">All Users ({users.length})</CardTitle>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 pb-3 text-left text-xs font-medium text-muted-foreground">User</th>
                  <th className="px-4 pb-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
                  <th className="px-4 pb-3 text-center text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 pb-3 text-center text-xs font-medium text-muted-foreground hidden md:table-cell">Events</th>
                  <th className="px-4 pb-3 text-center text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <button
                          className="font-medium text-sm hover:text-primary transition-colors text-left"
                          onClick={() => openUserDetail(user)}
                        >
                          {user.email}
                        </button>
                        {user.full_name && (
                          <p className="text-xs text-muted-foreground">{user.full_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.subscription_tier === "premium" ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                          <Crown className="h-2.5 w-2.5 mr-1" />Premium
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Free</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm hidden md:table-cell">{user.events_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* View as user */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                          title="View as this user (impersonate)"
                          onClick={() => handleViewAsUser(user)}
                          disabled={isImpersonating === user.id || user.email === currentAdminEmail}
                        >
                          {isImpersonating === user.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        {/* Reset password */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                          title="Send password reset email"
                          onClick={() => handleResetPassword(user)}
                          disabled={isResettingPassword === user.id}
                        >
                          {isResettingPassword === user.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <KeyRound className="h-3.5 w-3.5" />}
                        </Button>
                        {/* Detail */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="View details"
                          onClick={() => openUserDetail(user)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No users found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              User Details
            </DialogTitle>
            <DialogDescription>
              Full profile and admin controls for this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2">
              {/* Profile */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{selectedUser.email}</p>
                    {selectedUser.full_name && (
                      <p className="text-sm text-muted-foreground">{selectedUser.full_name}</p>
                    )}
                  </div>
                  {selectedUser.subscription_tier === "premium" ? (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <Crown className="h-3 w-3 mr-1" />Premium
                    </Badge>
                  ) : (
                    <Badge variant="outline">Free</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-3">
                  <div className="text-muted-foreground">Joined</div>
                  <div>{formatDistanceToNow(new Date(selectedUser.created_at), { addSuffix: true })}</div>
                  <div className="text-muted-foreground">University</div>
                  <div className="flex items-center gap-1">
                    {selectedUser.university || "—"}
                    {selectedUser.university_verified && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                  <div className="text-muted-foreground">Calendars</div>
                  <div>{selectedUser.calendars_count}</div>
                  <div className="text-muted-foreground">Events</div>
                  <div>{selectedUser.events_count}</div>
                  <div className="text-muted-foreground">Google</div>
                  <div className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${selectedUser.google_connected ? "bg-green-500" : "bg-gray-300"}`} />
                    {selectedUser.google_connected ? "Connected" : "Not connected"}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Admin Actions
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => { setUserDetailOpen(false); handleViewAsUser(selectedUser) }}
                    disabled={selectedUser.email === currentAdminEmail || isImpersonating === selectedUser.id}
                  >
                    {isImpersonating === selectedUser.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Eye className="h-4 w-4 text-blue-500" />}
                    View as User
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => { setUserDetailOpen(false); handleResetPassword(selectedUser) }}
                    disabled={isResettingPassword === selectedUser.id}
                  >
                    {isResettingPassword === selectedUser.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <KeyRound className="h-4 w-4 text-orange-500" />}
                    Reset Password
                  </Button>
                </div>
              </div>

              {selectedUser.email === currentAdminEmail && (
                <p className="text-xs text-muted-foreground text-center">
                  Some actions are disabled for your own account.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-amber-500" />
              Broadcast Announcement
            </DialogTitle>
            <DialogDescription>
              Send an announcement to all users. Logged in their audit history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="broadcast-title">Title (optional)</Label>
              <Input
                id="broadcast-title"
                placeholder="e.g. Scheduled Maintenance"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broadcast-message">Message *</Label>
              <Textarea
                id="broadcast-message"
                placeholder="Write your announcement here..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setBroadcastOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleBroadcast}
                disabled={isBroadcasting || !broadcastMessage.trim()}
              >
                {isBroadcasting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                  : <><Send className="h-4 w-4" />Send to All Users</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
