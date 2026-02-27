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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types/database"
import { toast } from "sonner"
import { format } from "date-fns"
import { detectConflicts } from "@/lib/utils/conflict-detection"
import { parseNaturalLanguage, parseTimeString } from "@/lib/utils/natural-language"
import { AlertCircle, Sparkles } from "lucide-react"

type Event = Database["public"]["Tables"]["events"]["Row"]
type Calendar = Database["public"]["Tables"]["calendars"]["Row"]

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event | null
  calendars: Calendar[]
  defaultDate?: Date
  defaultHour?: number
  onEventSaved: () => void
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  calendars,
  defaultDate,
  defaultHour,
  onEventSaved,
}: EventDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [conflicts, setConflicts] = useState<Event[]>([])
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("")
  const prevOpenRef = useRef(open)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    calendar_id: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    all_day: false,
    location: "",
    reminder_minutes: "120",
    recurrence_rule: "none",
    recurrence_end_date: "",
  })

  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    // Only reset if dialog is opening (was closed, now open)
    if (!wasOpen && open) {
      if (event) {
        const startDate = new Date(event.start_time)
        const endDate = new Date(event.end_time)
        setFormData({
          title: event.title,
          description: event.description || "",
          calendar_id: event.calendar_id,
          start_date: format(startDate, "yyyy-MM-dd"),
          start_time: format(startDate, "HH:mm"),
          end_date: format(endDate, "yyyy-MM-dd"),
          end_time: format(endDate, "HH:mm"),
          all_day: event.all_day,
          location: event.location || "",
          reminder_minutes: event.reminder_minutes?.toString() || "120",
          recurrence_rule: (event as any).recurrence_rule || "none",
          recurrence_end_date: (event as any).recurrence_end_date || "",
        })
      } else if (defaultDate) {
        const hour = defaultHour ?? 9
        const startTime = new Date(defaultDate)
        startTime.setHours(hour, 0, 0, 0)
        const endTime = new Date(startTime)
        endTime.setHours(hour + 1, 0, 0, 0)

        setFormData({
          title: "",
          description: "",
          calendar_id: calendars.find((c) => c.is_default)?.id || calendars[0]?.id || "",
          start_date: format(startTime, "yyyy-MM-dd"),
          start_time: format(startTime, "HH:mm"),
          end_date: format(endTime, "yyyy-MM-dd"),
          end_time: format(endTime, "HH:mm"),
          all_day: false,
          location: "",
          reminder_minutes: "120",
          recurrence_rule: "none",
          recurrence_end_date: "",
        })
      } else {
        setFormData({
          title: "",
          description: "",
          calendar_id: calendars.find((c) => c.is_default)?.id || calendars[0]?.id || "",
          start_date: format(new Date(), "yyyy-MM-dd"),
          start_time: "09:00",
          end_date: format(new Date(), "yyyy-MM-dd"),
          end_time: "10:00",
          all_day: false,
          location: "",
          reminder_minutes: "120",
          recurrence_rule: "none",
          recurrence_end_date: "",
        })
      }
      setNaturalLanguageInput("")
      setConflicts([])
    }
  }, [open, event, defaultDate, defaultHour, calendars])

  useEffect(() => {
    if (formData.start_date && formData.start_time && formData.end_date && formData.end_time) {
      checkConflicts()
    }
  }, [formData.start_date, formData.start_time, formData.end_date, formData.end_time, formData.calendar_id])

  const checkConflicts = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`)

      // Get all events for the user
      const { data: allEvents } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", startDateTime.toISOString())
        .lte("start_time", endDateTime.toISOString())

      if (allEvents) {
        const conflictInfo = detectConflicts(
          {
            id: event?.id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
          },
          allEvents,
        )

        setConflicts(conflictInfo.conflictingEvents)
      }
    } catch (error) {
      console.error("[v0] Error checking conflicts:", error)
    }
  }

  const handleNaturalLanguageParse = () => {
    if (!naturalLanguageInput.trim()) return

    const parsed = parseNaturalLanguage(naturalLanguageInput)

    const updates: Partial<typeof formData> = {
      title: parsed.title || formData.title,
    }

    if (parsed.hasDate && parsed.date) {
      updates.start_date = format(parsed.date, "yyyy-MM-dd")
      updates.end_date = format(parsed.date, "yyyy-MM-dd")
    }

    if (parsed.hasTime && parsed.time) {
      const timeResult = parseTimeString(parsed.time)
      if (timeResult) {
        const startTime = `${timeResult.hours.toString().padStart(2, "0")}:${timeResult.minutes.toString().padStart(2, "0")}`
        updates.start_time = startTime

        // Set end time to 1 hour later
        const endHour = (timeResult.hours + 1) % 24
        const endTime = `${endHour.toString().padStart(2, "0")}:${timeResult.minutes.toString().padStart(2, "0")}`
        updates.end_time = endTime
      }
    }

    if (parsed.reminderMinutes !== undefined) {
      updates.reminder_minutes = parsed.reminderMinutes.toString()
    }

    setFormData({ ...formData, ...updates })
    toast.success("Parsed event details from natural language")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        // Try to refresh the session
        const {
          data: { session },
          error: refreshError,
        } = await supabase.auth.getSession()
        if (refreshError || !session?.user) {
          throw new Error("Your session has expired. Please refresh the page and try again.")
        }
        // Use the user from the refreshed session
        const currentUser = session.user

        const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
        const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`)

        const eventData = {
          title: formData.title,
          description: formData.description || null,
          calendar_id: formData.calendar_id,
          user_id: currentUser.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          all_day: formData.all_day,
          location: formData.location || null,
          reminder_minutes: Number.parseInt(formData.reminder_minutes) || null,
        }

        if (event) {
          const { error } = await supabase.from("events").update(eventData).eq("id", event.id)
          if (error) throw error

          await supabase.from("audit_logs").insert({
            user_id: currentUser.id,
            action: "updated",
            entity_type: "event",
            entity_id: event.id,
            changes: { before: event, after: eventData },
          })

          try {
            await fetch("/api/google/events/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventId: event.id }),
            })
          } catch (error) {
            console.error("Failed to sync update to Google:", error)
          }

          toast.success("Event updated successfully")
        } else {
          const { data: newEvent, error } = await supabase.from("events").insert(eventData).select().single()
          if (error) throw error

          try {
            await fetch("/api/google/events/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventId: newEvent.id }),
            })
          } catch (error) {
            console.error("Failed to sync to Google:", error)
          }

          toast.success("Event created successfully")
        }

        onEventSaved()
        onOpenChange(false)
        return
      }

      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`)

      const recurrenceRule = formData.recurrence_rule !== "none" ? formData.recurrence_rule : null
      const recurrenceEndDate = formData.recurrence_end_date || null

      const eventData = {
        title: formData.title,
        description: formData.description || null,
        calendar_id: formData.calendar_id,
        user_id: user.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: formData.all_day,
        location: formData.location || null,
        reminder_minutes: Number.parseInt(formData.reminder_minutes) || null,
        recurrence_rule: recurrenceRule,
        recurrence_end_date: recurrenceEndDate,
      }

      let eventId: string

      if (event) {
        const { error } = await supabase.from("events").update(eventData).eq("id", event.id)
        if (error) throw error
        eventId = event.id

        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: "updated",
          entity_type: "event",
          entity_id: event.id,
          changes: { before: event, after: eventData },
        })

        console.log("[v0] Event updated:", event.id, "Calendar:", formData.calendar_id)
        
        try {
          console.log("[v0] Syncing updated event to Google Calendar...")
          const response = await fetch("/api/google/events/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: event.id }),
          })
          const result = await response.json()
          console.log("[v0] Google sync response:", result)
          
          if (result.warning) {
            console.warn("[v0] Google sync warning:", result.warning)
          }
          if (result.error) {
            console.error("[v0] Google sync error:", result.error)
          }
        } catch (error) {
          console.error("[v0] Failed to sync update to Google:", error)
        }

        toast.success("Event updated successfully")
      } else {
        const { data: newEvent, error } = await supabase.from("events").insert(eventData).select().single()
        if (error) throw error
        eventId = newEvent.id

        // Expand recurring instances
        if (recurrenceRule) {
          await expandRecurringEvent(supabase, newEvent, recurrenceRule, recurrenceEndDate)
        }

        console.log("[v0] New event created:", newEvent.id, "Calendar:", formData.calendar_id)
        
        try {
          const response = await fetch("/api/google/events/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: newEvent.id }),
          })
          const result = await response.json()
          if (result.warning) console.warn("[v0] Google sync warning:", result.warning)
          if (result.error) console.error("[v0] Google sync error:", result.error)
        } catch (error) {
          console.error("[v0] Failed to sync to Google:", error)
        }

        toast.success(recurrenceRule ? "Recurring event created" : "Event created successfully")
      }

      onEventSaved()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error saving event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save event")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>
            {event ? "Update the event details below" : "Add a new event to your calendar"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 md:space-y-4">
            {!event && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <Label htmlFor="natural-language" className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Quick Create (Natural Language)
                </Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="natural-language"
                    placeholder='Try "Meeting tomorrow at 3pm" or "Lunch on Friday"'
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleNaturalLanguageParse()
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleNaturalLanguageParse}>
                    Parse
                  </Button>
                </div>
              </div>
            )}

            {conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This event conflicts with {conflicts.length} other event{conflicts.length > 1 ? "s" : ""}:{" "}
                  {conflicts.map((e) => e.title).join(", ")}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="calendar">Calendar *</Label>
              <Select
                value={formData.calendar_id}
                onValueChange={(value) => setFormData({ ...formData, calendar_id: value })}
              >
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

            <div className="flex items-center gap-2">
              <Switch
                id="all-day"
                checked={formData.all_day}
                onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
              />
              <Label htmlFor="all-day">All day event</Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              {!formData.all_day && (
                <div className="grid gap-2">
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
              {!formData.all_day && (
                <div className="grid gap-2">
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Add location"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add description"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="recurrence">Repeat</Label>
              <Select
                value={formData.recurrence_rule}
                onValueChange={(value) => setFormData({ ...formData, recurrence_rule: value })}
              >
                <SelectTrigger id="recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekdays">Every weekday (Mon–Fri)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.recurrence_rule !== "none" && (
              <div className="grid gap-2">
                <Label htmlFor="recurrence-end">Repeat until (optional)</Label>
                <Input
                  id="recurrence-end"
                  type="date"
                  value={formData.recurrence_end_date}
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  min={formData.start_date}
                />
                <p className="text-xs text-muted-foreground">Leave blank to repeat for 1 year</p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="reminder">Reminder</Label>
              <Select
                value={formData.reminder_minutes}
                onValueChange={(value) => setFormData({ ...formData, reminder_minutes: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">At time of event</SelectItem>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="120">2 hours before (Default)</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 flex-col gap-2 md:mt-6 md:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading ? "Saving..." : event ? "Update Event" : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function expandRecurringEvent(
  supabase: ReturnType<typeof createClient>,
  parentEvent: { id: string; title: string; description: string | null; calendar_id: string; user_id: string; start_time: string; end_time: string; all_day: boolean; location: string | null; reminder_minutes: number | null },
  rule: string,
  endDateStr: string | null,
) {
  const start = new Date(parentEvent.start_time)
  const end = new Date(parentEvent.end_time)
  const durationMs = end.getTime() - start.getTime()

  const endDate = endDateStr ? new Date(endDateStr) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate())
  endDate.setHours(23, 59, 59, 999)

  const instances: Array<typeof parentEvent & { recurrence_rule: string; recurrence_parent_id: string }> = []
  const cursor = new Date(start)

  const advance = () => {
    switch (rule) {
      case "daily":    cursor.setDate(cursor.getDate() + 1); break
      case "weekdays": {
        cursor.setDate(cursor.getDate() + 1)
        while (cursor.getDay() === 0 || cursor.getDay() === 6) cursor.setDate(cursor.getDate() + 1)
        break
      }
      case "weekly":   cursor.setDate(cursor.getDate() + 7); break
      case "biweekly": cursor.setDate(cursor.getDate() + 14); break
      case "monthly":  cursor.setMonth(cursor.getMonth() + 1); break
    }
  }

  advance()
  let safetyLimit = 365
  while (cursor <= endDate && safetyLimit-- > 0) {
    const instStart = new Date(cursor)
    const instEnd = new Date(cursor.getTime() + durationMs)
    instances.push({
      ...parentEvent,
      id: undefined as unknown as string,
      start_time: instStart.toISOString(),
      end_time: instEnd.toISOString(),
      recurrence_rule: rule,
      recurrence_parent_id: parentEvent.id,
    })
    advance()
  }

  if (instances.length === 0) return

  // Insert in batches of 50
  for (let i = 0; i < instances.length; i += 50) {
    const batch = instances.slice(i, i + 50).map(({ id: _id, ...rest }) => rest)
    await supabase.from("events").insert(batch)
  }
}
