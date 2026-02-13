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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types/database"
import { toast } from "sonner"
import { format } from "date-fns"
import { parseTimeString, parseMultipleEvents } from "@/lib/utils/natural-language"
import { Sparkles, Trash2, Plus } from "lucide-react"

type Event = Database["public"]["Tables"]["events"]["Row"]
type Calendar = Database["public"]["Tables"]["calendars"]["Row"]

interface ParsedEventPreview {
  title: string
  date: Date | null
  time: string | null
  startTime: string | null
  hasDate: boolean
  hasTime: boolean
  rawInput: string
  reminderMinutes: number
  description?: string
}

interface MassEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendars: Calendar[]
  onEventsSaved: () => void
  existingEvents?: Event[]
}

export function MassEventDialog({
  open,
  onOpenChange,
  calendars,
  onEventsSaved,
  existingEvents = [],
}: MassEventDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<"add" | "delete" | "move">("add")
  const [inputText, setInputText] = useState("")
  const [parsedEvents, setParsedEvents] = useState<ParsedEventPreview[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState("")
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [targetCalendarId, setTargetCalendarId] = useState("")

  useEffect(() => {
    const savedDraft = localStorage.getItem("mass-event-draft")
    const savedCalendarId = localStorage.getItem("mass-event-calendar")

    if (savedDraft) {
      setInputText(savedDraft)
    }

    if (savedCalendarId && calendars.some((c) => c.id === savedCalendarId)) {
      setSelectedCalendarId(savedCalendarId)
    } else {
      setSelectedCalendarId(calendars.find((c) => c.is_default)?.id || calendars[0]?.id || "")
    }
  }, [calendars])

  useEffect(() => {
    if (inputText) {
      localStorage.setItem("mass-event-draft", inputText)
    } else {
      localStorage.removeItem("mass-event-draft")
    }
  }, [inputText])

  useEffect(() => {
    if (selectedCalendarId) {
      localStorage.setItem("mass-event-calendar", selectedCalendarId)
    }
  }, [selectedCalendarId])

  useEffect(() => {
    if (open) {
      setSelectedEventIds([])
      setTargetCalendarId("")
    }
  }, [open])

  useEffect(() => {
    if (!inputText.trim()) {
      setParsedEvents([])
      return
    }

    const parsed = parseMultipleEvents(inputText)
    const previews: ParsedEventPreview[] = parsed.map((event, idx) => ({
      title: event.title || `Event ${idx + 1}`,
      date: event.date || null,
      time: event.time || null,
      startTime: event.startTime || null,
      hasDate: event.hasDate,
      hasTime: event.hasTime,
      rawInput: inputText,
      reminderMinutes: event.reminderMinutes || 120,
      description: event.description,
    }))

    setParsedEvents(previews)
  }, [inputText])

  const handleAddEvents = async () => {
    if (parsedEvents.length === 0) {
      toast.error("No events to add")
      return
    }

    if (!selectedCalendarId) {
      toast.error("Please select a calendar")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const eventsToCreate = parsedEvents.map((parsed) => {
        let startDate = new Date()
        let startTime = "00:00"
        let endTime = "23:59"

        if (parsed.date) {
          startDate = parsed.date
        }

        if (parsed.hasTime) {
          if (parsed.startTime && parsed.time) {
            // We have both start and end time from a range like "2:30 PM to 4:30 PM"
            const startResult = parseTimeString(parsed.startTime)
            const endResult = parseTimeString(parsed.time)

            if (startResult && endResult) {
              startTime = `${startResult.hours.toString().padStart(2, "0")}:${startResult.minutes.toString().padStart(2, "0")}`
              endTime = `${endResult.hours.toString().padStart(2, "0")}:${endResult.minutes.toString().padStart(2, "0")}`
            }
          } else if (parsed.time) {
            // Single time - treat as deadline (end time)
            const timeResult = parseTimeString(parsed.time)
            if (timeResult) {
              endTime = `${timeResult.hours.toString().padStart(2, "0")}:${timeResult.minutes.toString().padStart(2, "0")}`
              const startHour = timeResult.hours - 2
              startTime = `${((startHour + 24) % 24).toString().padStart(2, "0")}:${timeResult.minutes.toString().padStart(2, "0")}`
            }
          }
        }

        const startDateTime = new Date(`${format(startDate, "yyyy-MM-dd")}T${startTime}`)
        const endDateTime = new Date(`${format(startDate, "yyyy-MM-dd")}T${endTime}`)

        if (endDateTime <= startDateTime) {
          endDateTime.setHours(startDateTime.getHours() + 1)
        }

        return {
          title: parsed.title,
          description: parsed.description || null,
          calendar_id: selectedCalendarId,
          user_id: user.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          all_day: !parsed.hasTime,
          location: null,
          reminder_minutes: parsed.reminderMinutes,
        }
      })

      const { error, data } = await supabase.from("events").insert(eventsToCreate).select()
      if (error) throw error

      for (const event of data || []) {
        try {
          const response = await fetch("/api/google/events/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: event.id }),
          })

          if (!response.ok) {
            const errorData = await response.json()

            // Check if it's an authorization error
            if (errorData.error === "Unauthorized" || response.status === 401) {
              console.error(`Authorization error syncing "${event.title}". Please reconnect your Google Calendar.`)
              toast.error("Google Calendar authorization expired. Please reconnect in settings.")
              break // Stop trying to sync more events
            } else {
              console.error(`Failed to sync event "${event.title}" to Google:`, errorData)
            }
          }
        } catch (error) {
          console.error(`Failed to sync event "${event.title}" to Google:`, error)
        }
      }

      toast.success(`Successfully created ${parsedEvents.length} event${parsedEvents.length > 1 ? "s" : ""}`)
      setInputText("")
      localStorage.removeItem("mass-event-draft")
      onEventsSaved()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating events:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create events")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEvents = async () => {
    if (selectedEventIds.length === 0) {
      toast.error("No events selected")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      for (const eventId of selectedEventIds) {
        try {
          await fetch("/api/google/events/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId }),
          })
        } catch (error) {
          console.error("Failed to sync deletion to Google:", error)
        }
      }

      const { error } = await supabase.from("events").delete().in("id", selectedEventIds)
      if (error) throw error

      toast.success(`Successfully deleted ${selectedEventIds.length} event${selectedEventIds.length > 1 ? "s" : ""}`)
      onEventsSaved()
      onOpenChange(false)
    } catch (error) {
      console.error("Error deleting events:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete events")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMoveEvents = async () => {
    if (selectedEventIds.length === 0) {
      toast.error("No events selected")
      return
    }

    if (!targetCalendarId) {
      toast.error("Please select a target calendar")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("events")
        .update({ calendar_id: targetCalendarId })
        .in("id", selectedEventIds)

      if (error) throw error

      for (const eventId of selectedEventIds) {
        const event = existingEvents.find((e) => e.id === eventId)
        const sourceCalendar = calendars.find((c) => c.id === event?.calendar_id)
        
        try {
          await fetch("/api/google/events/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId,
              sourceGoogleCalendarId: sourceCalendar?.provider_calendar_id,
            }),
          })
        } catch (error) {
          // Silently continue - sync failures shouldn't block move
        }
      }

      toast.success(`Successfully moved ${selectedEventIds.length} event${selectedEventIds.length > 1 ? "s" : ""}`)
      onEventsSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move events")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds((prev) => (prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Mass Event Manager</DialogTitle>
          <DialogDescription>Add multiple events at once or manage existing events in bulk</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b">
          <Button
            variant={mode === "add" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("add")}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Events
          </Button>
          <Button
            variant={mode === "move" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("move")}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Move Events
          </Button>
          <Button
            variant={mode === "delete" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("delete")}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Events
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {mode === "add" ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="calendar">Calendar *</Label>
                <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                          {calendar.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="events-input" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Enter multiple events (one per line or separated by commas)
                </Label>
                <Textarea
                  id="events-input"
                  placeholder={`Examples:
Math test 10pm Jan 20th d: (Chapter 5-7)
Math Test Jan 21st 8pm d: Final exam
Assignment due tomorrow at 5pm d: (Submit on Canvas)
Team meeting Friday at 2pm d: (Discuss project updates)`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[120px] font-mono text-sm"
                />
                {inputText && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInputText("")
                      localStorage.removeItem("mass-event-draft")
                    }}
                    className="self-start"
                  >
                    Clear draft
                  </Button>
                )}
              </div>

              {parsedEvents.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview ({parsedEvents.length} events)</Label>
                  <div className="max-h-[200px] overflow-y-auto rounded-md border p-4 space-y-3">
                    {parsedEvents.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                        <Sparkles className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{event.title}</div>
                          {event.description && (
                            <div className="text-xs text-muted-foreground mt-1">{event.description}</div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-1">
                            {event.hasDate && event.date ? (
                              <Badge variant="outline" className="text-xs">
                                {format(event.date, "MMM dd, yyyy")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                No date (using today)
                              </Badge>
                            )}
                            {event.hasTime && event.time ? (
                              <Badge variant="outline" className="text-xs">
                                {event.time}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                All day
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700"
                            >
                              {event.reminderMinutes >= 60
                                ? `Remind ${event.reminderMinutes / 60}h before`
                                : `Remind ${event.reminderMinutes}m before`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {parsedEvents.some((e) => !e.hasDate) && (
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        Some events don't have a specific date and will be created for today. Add dates like "Jan 20th"
                        or "tomorrow" for specific dates.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          ) : mode === "move" ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="target-calendar">Move to Calendar *</Label>
                <Select value={targetCalendarId} onValueChange={setTargetCalendarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                          {calendar.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Select events to move ({selectedEventIds.length} selected)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEventIds(existingEvents.map((e) => e.id))}
                    disabled={selectedEventIds.length === existingEvents.length || existingEvents.length === 0}
                  >
                    Select all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEventIds([])}
                    disabled={selectedEventIds.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="max-h-[450px] overflow-y-auto rounded-md border p-4 space-y-2">
                {existingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No events to display</div>
                ) : (
                  existingEvents.map((event) => {
                    const eventCalendar = calendars.find((c) => c.id === event.calendar_id)
                    return (
                      <div
                        key={event.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedEventIds.includes(event.id) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                        }`}
                        onClick={() => toggleEventSelection(event.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEventIds.includes(event.id)}
                          onChange={() => toggleEventSelection(event.id)}
                          className="h-4 w-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: eventCalendar?.color || "#666" }}
                            />
                            <div className="font-medium text-sm truncate">{event.title}</div>
                          </div>
                          {event.description && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.start_time), "MMM dd, yyyy 'at' h:mm a")}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              {selectedEventIds.length > 0 && targetCalendarId && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    You are about to move {selectedEventIds.length} event{selectedEventIds.length > 1 ? "s" : ""} to{" "}
                    {calendars.find((c) => c.id === targetCalendarId)?.name}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select events to delete ({selectedEventIds.length} selected)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEventIds(existingEvents.map((e) => e.id))}
                    disabled={selectedEventIds.length === existingEvents.length || existingEvents.length === 0}
                  >
                    Select all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEventIds([])}
                    disabled={selectedEventIds.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="max-h-[450px] overflow-y-auto rounded-md border p-4 space-y-2">
                {existingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No events to display</div>
                ) : (
                  existingEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedEventIds.includes(event.id) ? "bg-destructive/10 border-destructive" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleEventSelection(event.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEventIds.includes(event.id)}
                        onChange={() => toggleEventSelection(event.id)}
                        className="h-4 w-4 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{event.title}</div>
                        {event.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.start_time), "MMM dd, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {selectedEventIds.length > 0 && (
                <Alert variant="destructive">
                  <Trash2 className="h-4 w-4" />
                  <AlertDescription>
                    You are about to delete {selectedEventIds.length} event{selectedEventIds.length > 1 ? "s" : ""}.
                    This action cannot be undone.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 md:flex-row flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            Cancel
          </Button>
          {mode === "add" ? (
            <Button
              type="button"
              onClick={handleAddEvents}
              disabled={isLoading || parsedEvents.length === 0 || !selectedCalendarId}
              className="w-full md:w-auto"
            >
              {isLoading ? "Creating..." : `Create ${parsedEvents.length} Event${parsedEvents.length !== 1 ? "s" : ""}`}
            </Button>
          ) : mode === "move" ? (
            <Button
              type="button"
              onClick={handleMoveEvents}
              disabled={isLoading || selectedEventIds.length === 0 || !targetCalendarId}
              className="w-full md:w-auto"
            >
              {isLoading
                ? "Moving..."
                : `Move ${selectedEventIds.length} Event${selectedEventIds.length !== 1 ? "s" : ""}`}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteEvents}
              disabled={isLoading || selectedEventIds.length === 0}
              className="w-full md:w-auto"
            >
              {isLoading
                ? "Deleting..."
                : `Delete ${selectedEventIds.length} Event${selectedEventIds.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
