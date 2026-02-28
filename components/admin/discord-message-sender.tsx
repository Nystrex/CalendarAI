"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { MessageCircle, Send, Loader2 } from "lucide-react"

interface DiscordMessageSenderProps {
  adminPassword: string
}

interface Event {
  id: string
  title: string
  user_email: string
  start_time: string
}

interface User {
  id: string
  email: string
  full_name: string | null
  discord_id: string | null
  discord_username: string | null
}

export function DiscordMessageSender({ adminPassword }: DiscordMessageSenderProps) {
  const [userId, setUserId] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [eventId, setEventId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showEventList, setShowEventList] = useState(false)
  const [showUserList, setShowUserList] = useState(false)

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([])
      return
    }

    setLoadingUsers(true)
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`, {
        headers: { "x-admin-password": adminPassword },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to search users")
      }

      setUsers(data.users || [])
      setShowUserList(true)
    } catch (error) {
      console.error("[discord-message-sender] error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to search users")
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSelectUser = (user: User) => {
    setUserId(user.id)
    setUserEmail(user.email)
    setShowUserList(false)
  }

  const loadEvents = async () => {
    setLoadingEvents(true)
    try {
      const response = await fetch("/api/admin/events/list", {
        headers: { "x-admin-password": adminPassword },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load events")
      }

      setEvents(data.events || [])
      setShowEventList(true)
    } catch (error) {
      console.error("[discord-message-sender] error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load events")
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleSelectEvent = (event: Event) => {
    setEventId(event.id)
    setShowEventList(false)
  }

  const handleSendMessage = async () => {
    if (!userId.trim() || !eventId.trim()) {
      toast.error("Please enter both User ID and Event ID")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/discord/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          eventId,
          adminPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[discord-message-sender] Full error response:", JSON.stringify(data, null, 2))
        const errorMsg = data.discord_error 
          ? `${data.error}: ${data.discord_error}` 
          : data.details 
            ? `${data.error}: ${data.details}`
            : data.error || "Failed to send message"
        toast.error(errorMsg, { duration: 10000 })
        if (data.steps) {
          console.log("[discord-message-sender] Steps completed:", data.steps)
        }
        return
      }

      toast.success(`Message sent to ${data.message}`)
      setUserId("")
      setUserEmail("")
      setEventId("")
    } catch (error) {
      console.error("[discord-message-sender] error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Force Discord Message
        </CardTitle>
        <CardDescription>
          Send a test Discord message to a user for a specific event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Search User by Email</label>
          <Input
            placeholder="Type user email (e.g., user@example.com)"
            value={userEmail}
            onChange={(e) => {
              setUserEmail(e.target.value)
              searchUsers(e.target.value)
            }}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">Start typing to search for users</p>

          {showUserList && users.length > 0 && (
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-muted/30 mt-2">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Found {users.length} user(s)</p>
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left p-2 rounded border border-muted hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.email}</p>
                        {user.full_name && (
                          <p className="text-xs text-muted-foreground truncate">{user.full_name}</p>
                        )}
                      </div>
                      {user.discord_id ? (
                        <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded ml-2 shrink-0">
                          ✓ Discord
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-500/20 text-gray-600 px-2 py-1 rounded ml-2 shrink-0">
                          No Discord
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {userId && (
            <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs font-mono text-blue-600">ID: {userId}</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Event ID</label>
          <div className="flex gap-2 mt-1.5">
            <Input
              placeholder="Enter event UUID or click Load Events"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={loadEvents}
              disabled={loadingEvents}
              size="sm"
              className="shrink-0"
            >
              {loadingEvents ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Load Events"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Click "Load Events" to see a list of recent events</p>
        </div>

        {showEventList && events.length > 0 && (
          <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-muted/30">
            <p className="text-xs font-medium mb-2 text-muted-foreground">Recent Events ({events.length})</p>
            <div className="space-y-2">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="w-full text-left p-2 rounded border border-muted hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.start_time).toLocaleString()}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{event.id}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !userId.trim() || !eventId.trim()}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {isLoading ? "Sending..." : "Send Discord Message"}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• User must have Discord connected</p>
          <p>• Event must exist in the database</p>
          <p>• Message will be sent via Discord DM</p>
        </div>
      </CardContent>
    </Card>
  )
}
