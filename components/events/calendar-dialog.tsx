"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const CALENDAR_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
]

interface CalendarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCalendarCreated: (newCalendarId: string) => void
}

export function CalendarDialog({ open, onOpenChange, onCalendarCreated }: CalendarDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [selectedColor, setSelectedColor] = useState(CALENDAR_COLORS[0])
  const [syncToGoogle, setSyncToGoogle] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Automatically create the calendar in Google Calendar
      let googleCalendarId = null
      try {
        const response = await fetch("/api/google/calendars/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color: selectedColor }),
        })
        const result = await response.json()
        
        if (result.success && result.calendarId) {
          googleCalendarId = result.calendarId
        } else {
          if (result.needsReauth) {
            toast.error("Google authorization expired. Calendar will be created locally.")
          } else {
            toast.error(result.error || "Failed to create calendar in Google. Creating local calendar instead.")
          }
        }
      } catch (error) {
        console.error("Error creating Google Calendar:", error)
        toast.error("Failed to connect to Google. Creating local calendar instead.")
      }

      const { data, error } = await supabase.from("calendars").insert({
        user_id: user.id,
        name,
        color: selectedColor,
        is_default: false,
        provider: googleCalendarId ? "google" : "local",
        provider_calendar_id: googleCalendarId,
      }).select()

      if (error) {
        console.error("Error creating calendar:", error)
        throw error
      }

      const newCalendarId = data?.[0]?.id
      if (!newCalendarId) {
        throw new Error("Failed to get new calendar ID")
      }

      toast.success(googleCalendarId ? "Calendar created and synced to Google" : "Calendar created successfully")
      onCalendarCreated(newCalendarId)
      onOpenChange(false)
      setName("")
      setSelectedColor(CALENDAR_COLORS[0])
    } catch (error) {
      console.error("Error creating calendar:", error)
      toast.error("Failed to create calendar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Calendar</DialogTitle>
          <DialogDescription>Add a new calendar to organize your events</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Calendar Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Calendar"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CALENDAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-10 w-10 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? "currentColor" : "transparent",
                    }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Calendar will automatically sync with Google Calendar
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Calendar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
