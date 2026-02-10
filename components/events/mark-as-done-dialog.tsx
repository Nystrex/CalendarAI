"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types/database"
import { toast } from "sonner"
import { format } from "date-fns"
import { CheckCircle2, Circle } from "lucide-react"
import { Input } from "@/components/ui/input"

type Event = Database["public"]["Tables"]["events"]["Row"]
type Calendar = Database["public"]["Tables"]["calendars"]["Row"]

const MARK_DONE_CALENDAR_KEY = "mark-as-done-calendar-id"
const MARK_DONE_CALENDAR_NAME_KEY = "mark-as-done-calendar-name"

interface MarkAsDoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendars: Calendar[]
  existingEvents: Event[]
  onEventsSaved: () => void
}

export function MarkAsDoneDialog({
  open,
  onOpenChange,
  calendars,
  existingEvents = [],
  onEventsSaved,
}: MarkAsDoneDialogProps) {
  const [targetCalendarId, setTargetCalendarId] = useState<string>("")
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [newCalendarName, setNewCalendarName] = useState<string>("Completed")

  useEffect(() => {
    const savedCalendarId = localStorage.getItem(MARK_DONE_CALENDAR_KEY)
    const savedCalendarName = localStorage.getItem(MARK_DONE_CALENDAR_NAME_KEY)
    
    if (savedCalendarName) {
      setNewCalendarName(savedCalendarName)
    }
    
    if (savedCalendarId) {
      const calendarExists = calendars.some((c) => c.id === savedCalendarId) || savedCalendarId === "create-new"
      if (calendarExists) {
        setTargetCalendarId(savedCalendarId)
      } else {
        setTargetCalendarId("create-new")
      }
    } else {
      setTargetCalendarId("create-new")
    }
  }, [calendars])

  const handleCalendarChange = (value: string) => {
    setTargetCalendarId(value)
    localStorage.setItem(MARK_DONE_CALENDAR_KEY, value)
  }

  const handleMarkAsDone = async () => {
    if (selectedEventIds.size === 0) {
      toast.error("Please select at least one event to mark as done")
      return
    }

    setIsProcessing(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      let completedCalendarId = targetCalendarId

      if (targetCalendarId === "create-new") {
        if (!newCalendarName.trim()) {
          toast.error("Please enter a calendar name")
          setIsProcessing(false)
          return
        }

        // Check if calendar exists locally
        const { data: existingCalendar } = await supabase
          .from("calendars")
          .select("id, provider_calendar_id")
          .eq("user_id", user.id)
          .eq("name", newCalendarName.trim())
          .single()

        if (existingCalendar) {
          completedCalendarId = existingCalendar.id
          localStorage.setItem(MARK_DONE_CALENDAR_KEY, existingCalendar.id)
        } else {
          console.log("[v0] Creating calendar:", newCalendarName.trim(), "for mark-as-done")
          
          // Create calendar on Google first
          let providerCalendarId = null
          try {
            console.log("[v0] Attempting to create Google Calendar...")
            const googleRes = await fetch("/api/google/calendars/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: newCalendarName.trim(),
                color: "#22c55e",
              }),
            })

            const googleData = await googleRes.json()
            console.log("[v0] Google Calendar creation response:", googleData)

            if (googleRes.ok && googleData.success && googleData.calendarId) {
              providerCalendarId = googleData.calendarId
              console.log("[v0] Successfully created Google Calendar:", providerCalendarId)
            } else {
              console.error("[v0] Failed to create Google Calendar:", googleData.error)
              if (googleData.needsReauth) {
                toast.error("Google authorization expired. Calendar will be created locally.")
              } else {
                toast.error("Failed to create calendar in Google. Creating local calendar instead.")
              }
            }
          } catch (error) {
            console.error("[v0] Error creating Google Calendar:", error)
            toast.error("Failed to connect to Google. Creating local calendar instead.")
          }

          // Create calendar locally
          console.log("[v0] Creating local calendar entry...")
          const { data: newCalendar, error: calendarError } = await supabase
            .from("calendars")
            .insert({
              user_id: user.id,
              name: newCalendarName.trim(),
              color: "#22c55e",
              is_visible: false,
              provider: providerCalendarId ? "google" : "local",
              provider_calendar_id: providerCalendarId,
            })
            .select()
            .single()

          if (calendarError) {
            console.error("[v0] Error creating local calendar:", calendarError)
            throw calendarError
          }
          
          console.log("[v0] Calendar created successfully:", newCalendar)
          completedCalendarId = newCalendar.id
          localStorage.setItem(MARK_DONE_CALENDAR_KEY, newCalendar.id)
          localStorage.setItem(MARK_DONE_CALENDAR_NAME_KEY, newCalendarName.trim())
          toast.success(`Created "${newCalendarName.trim()}" calendar`)
        }
      }

      // Get the target calendar's Google ID
      const { data: targetCalendar } = await supabase
        .from("calendars")
        .select("provider_calendar_id")
        .eq("id", completedCalendarId)
        .single()

      const eventsToMove = Array.from(selectedEventIds)
      
      const { error: moveError } = await supabase
        .from("events")
        .update({ calendar_id: completedCalendarId })
        .in("id", eventsToMove)

      if (moveError) throw moveError

      // Move events on Google Calendar
      for (const eventId of eventsToMove) {
        const event = existingEvents.find((e) => e.id === eventId)
        if (event?.provider_event_id && targetCalendar?.provider_calendar_id) {
          // Get the source calendar's Google ID
          const sourceCalendar = calendars.find((c) => c.id === event.calendar_id)
          
          try {
            // Move the event to the new Google calendar
            await fetch("/api/google/events/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventId: event.id,
                sourceGoogleCalendarId: sourceCalendar?.provider_calendar_id,
              }),
            })
          } catch {
            // Silently continue - sync failures shouldn't block marking as done
          }
        }
      }

      toast.success(`Marked ${selectedEventIds.size} event(s) as done`)
      setSelectedEventIds(new Set())
      onEventsSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to mark events as done")
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEventIds)
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId)
    } else {
      newSelection.add(eventId)
    }
    setSelectedEventIds(newSelection)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Mark Events as Done</DialogTitle>
          <DialogDescription>
            Select events to mark as completed. They will be moved to the selected calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Move completed events to</Label>
            <Select value={targetCalendarId} onValueChange={handleCalendarChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create-new">+ Create new calendar</SelectItem>
                {calendars.map((cal) => (
                  <SelectItem key={cal.id} value={cal.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cal.color }} />
                      {cal.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetCalendarId === "create-new" && (
            <div className="space-y-2">
              <Label htmlFor="new-calendar-name">Calendar Name</Label>
              <Input
                id="new-calendar-name"
                value={newCalendarName}
                onChange={(e) => {
                  setNewCalendarName(e.target.value)
                  localStorage.setItem(MARK_DONE_CALENDAR_NAME_KEY, e.target.value)
                }}
                placeholder="Enter calendar name (e.g., Completed, Done, Archive)"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select events to mark as done ({selectedEventIds.size} selected)</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allIds = new Set(existingEvents.map((e) => e.id))
                    setSelectedEventIds(allIds)
                  }}
                  disabled={selectedEventIds.size === existingEvents.length || existingEvents.length === 0}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEventIds(new Set())}
                  disabled={selectedEventIds.size === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[400px] space-y-3 border rounded-lg p-3 bg-muted/30">
              {existingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No events found</p>
              ) : (
                existingEvents.map((event) => {
                  const calendar = calendars.find((c) => c.id === event.calendar_id)
                  const isSelected = selectedEventIds.has(event.id)

                  return (
                    <div
                      key={event.id}
                      onClick={() => toggleEventSelection(event.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${
                        isSelected 
                          ? "border-green-500 bg-green-500/10 dark:bg-green-500/20" 
                          : "border-border bg-background hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <Circle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <h4 className={`font-semibold text-base ${isSelected ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                              {event.title}
                            </h4>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {calendar && (
                              <Badge 
                                className="text-xs flex items-center gap-1.5 font-medium"
                                style={{ 
                                  backgroundColor: `${calendar.color}20`, 
                                  color: calendar.color,
                                  borderColor: calendar.color 
                                }}
                              >
                                <span
                                  className="h-2 w-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: calendar.color }}
                                />
                                <span>{calendar.name}</span>
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs font-medium">
                              {format(new Date(event.start_time), "MMM d, yyyy")}
                            </Badge>
                            {!event.all_day && (
                              <Badge variant="secondary" className="text-xs font-medium">
                                {format(new Date(event.start_time), "h:mm a")}
                              </Badge>
                            )}
                            {event.all_day && (
                              <Badge variant="secondary" className="text-xs font-medium">
                                All day
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleMarkAsDone} disabled={isProcessing || selectedEventIds.size === 0}>
            {isProcessing ? "Processing..." : `Mark ${selectedEventIds.size} Event(s) as Done`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
