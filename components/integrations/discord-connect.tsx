"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { MessageCircle, Unlink, CheckCircle2, AlertCircle } from "lucide-react"

interface DiscordProfile {
  discord_id: string | null
  discord_username: string | null
  discord_avatar_url: string | null
  discord_notifications_enabled: boolean
}

export function DiscordConnect({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<DiscordProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("discord_id, discord_username, discord_avatar_url, discord_notifications_enabled")
        .eq("id", userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("[discord] load profile error:", error)
      toast.error("Failed to load Discord settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    if (!clientId) {
      toast.error("Discord client ID not configured. Please contact support.")
      return
    }

    const redirectUri = `${window.location.origin}/api/auth/discord/callback`
    const scopes = ["identify", "email", "guilds.members.read"]
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
    })

    const discordOAuthUrl = `https://discord.com/oauth2/authorize?${params.toString()}`
    window.location.href = discordOAuthUrl
  }

  const handleDisconnect = async () => {
    try {
      setIsToggling(true)
      const supabase = createClient()
      const { error } = await supabase
        .from("profiles")
        .update({
          discord_id: null,
          discord_username: null,
          discord_avatar_url: null,
          discord_access_token: null,
          discord_refresh_token: null,
          discord_notifications_enabled: false,
        })
        .eq("id", userId)

      if (error) throw error
      setProfile(null)
      toast.success("Discord disconnected")
      await loadProfile()
    } catch (error) {
      console.error("[discord] disconnect error:", error)
      toast.error("Failed to disconnect Discord")
    } finally {
      setIsToggling(false)
    }
  }

  const handleToggleNotifications = async () => {
    try {
      setIsToggling(true)
      const supabase = createClient()
      const newState = !profile?.discord_notifications_enabled
      const { error } = await supabase
        .from("profiles")
        .update({ discord_notifications_enabled: newState })
        .eq("id", userId)

      if (error) throw error
      setProfile(prev => prev ? { ...prev, discord_notifications_enabled: newState } : null)
      toast.success(newState ? "Discord notifications enabled" : "Discord notifications disabled")
    } catch (error) {
      console.error("[discord] toggle notifications error:", error)
      toast.error("Failed to update notification settings")
    } finally {
      setIsToggling(false)
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading Discord settings...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Discord Integration
        </CardTitle>
        <CardDescription>
          Connect your Discord account to receive event notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.discord_id ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              {profile.discord_avatar_url && (
                <img
                  src={profile.discord_avatar_url}
                  alt={profile.discord_username || "Discord avatar"}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{profile.discord_username}</p>
                <p className="text-xs text-muted-foreground">Connected to Discord</p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Event Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive Discord DM reminders for upcoming events
                  </p>
                </div>
                <Button
                  variant={profile.discord_notifications_enabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleNotifications}
                  disabled={isToggling}
                >
                  {profile.discord_notifications_enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isToggling}
                  className="flex-1"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You must be a member of our Discord server to enable notifications
              </p>
            </div>

            <Button onClick={handleConnect} disabled={isLoading} className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Connect Discord
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
