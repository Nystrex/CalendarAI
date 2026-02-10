"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { toast } from "sonner"
import { Calendar, RefreshCw, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface GoogleCalendarConnectProps {
  isConnected: boolean
  onConnectionChange: () => void
}

export function GoogleCalendarConnect({ isConnected, onConnectionChange }: GoogleCalendarConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  const handleConnect = async () => {
    setIsConnecting(true)
    setConfigError(null)
    try {
      const response = await fetch("/api/auth/google")
      const data = await response.json()

      if (response.status === 503) {
        setConfigError(data.error)
        toast.error("Google Calendar is not configured")
        setIsConnecting(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to get auth URL")
      }
    } catch (error) {
      console.error("[v0] Error connecting to Google:", error)
      toast.error("Failed to connect to Google Calendar")
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/google/sync", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Synced ${data.synced} events from Google Calendar`)
        onConnectionChange()
      } else {
        throw new Error(data.error || "Sync failed")
      }
    } catch (error) {
      console.error("[v0] Error syncing with Google:", error)
      toast.error("Failed to sync with Google Calendar")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch("/api/google/disconnect", {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Disconnected from Google Calendar")
        onConnectionChange()
        // Refresh the page to update all components
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error("Disconnect failed")
      }
    } catch (error) {
      console.error("[v0] Error disconnecting from Google:", error)
      toast.error("Failed to disconnect from Google Calendar")
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Google Calendar</CardTitle>
        </div>
        <CardDescription>
          {isConnected
            ? "Your Google Calendar is connected and syncing"
            : "Connect your Google Calendar to sync events automatically"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Configuration Required:</strong> Please add Google OAuth credentials to your environment variables
              to enable this feature.
            </AlertDescription>
          </Alert>
        )}

        {isConnected ? (
          <div className="flex gap-2">
            <Button onClick={handleSync} disabled={isSyncing} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Button onClick={handleDisconnect} disabled={isDisconnecting} variant="destructive">
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={isConnecting || !!configError}>
            {isConnecting ? "Connecting..." : "Connect Google Calendar"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
