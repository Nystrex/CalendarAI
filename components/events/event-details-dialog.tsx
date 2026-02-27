"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { Database } from "@/lib/types/database"
import { format } from "date-fns"
import { Clock, MapPin, Trash2, Edit, Bell, FolderInput } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string; name?: string }
}
type Calendar = Database["public"]["Tables"]["calendars"]["Row"]

interface EventDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event | null
  calendars: Calendar[] // Added calendars prop
  onEdit: (event: Event) => void
  onDelete: () => void
}

export function EventDetailsDialog({
  open,
  onOpenChange,
  event,
  calendars,
  onEdit,
  onDelete,
}: EventDetailsDialogProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [selectedCalendarId, setSelectedCalendarId] = useState("")
  const [isMoving, setIsMoving] = useState(false)

  if (!event) return null

  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  const handleMove = async () => {
    if (!selectedCalendarId) {
      toast.error("Please select a calendar")
      return
    }

    setIsMoving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Update the event's calendar_id
      const { error } = await supabase.from("events").update({ calendar_id: selectedCalendarId }).eq("id", event.id)

      if (error) throw error

      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "updated",
        entity_type: "event",
        entity_id: event.id,
        changes: {
          before: { calendar_id: event.calendar_id },
          after: { calendar_id: selectedCalendarId },
        },
      })

      // Sync with Google Calendar if applicable
      try {
        await fetch("/api/google/events/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id }),
        })
      } catch (error) {
        console.error("Failed to sync move to Google:", error)
      }

      toast.success("Event moved successfully")
      onDelete() // Trigger refresh
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error moving event:", error)
      toast.error("Failed to move event")
    } finally {
      setIsMoving(false)
      setShowMoveDialog(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      if (event.provider === "google" && event.provider_event_id) {
        try {
          await fetch("/api/google/events/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: event.id,
            }),
          })
        } catch (error) {
          console.error("Failed to delete from Google Calendar:", error)
        }
      }

      const { error } = await supabase.from("events").delete().eq("id", event.id)
      if (error) throw error

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "deleted",
        entity_type: "event",
        entity_id: event.id,
        changes: { deleted: event },
      })

      toast.success("Event deleted successfully")
      onDelete()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error deleting event:", error)
      toast.error("Failed to delete event")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">{event.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {event.calendar && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: event.calendar.color }} />
                <span className="text-sm text-muted-foreground">{event.calendar.name}</span>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                {event.all_day ? (
                  <p className="text-sm">
                    {format(startDate, "EEEE, MMMM d, yyyy")}
                    {startDate.getDate() !== endDate.getDate() && ` - ${format(endDate, "EEEE, MMMM d, yyyy")}`}
                  </p>
                ) : (
                  <>
                    <p className="text-sm">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                    </p>
                  </>
                )}
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{event.location}</p>
              </div>
            )}

            {event.reminder_minutes !== null && (
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {event.reminder_minutes === 0
                    ? "At time of event"
                    : event.reminder_minutes < 60
                      ? `${event.reminder_minutes} minutes before`
                      : event.reminder_minutes < 1440
                        ? `${event.reminder_minutes / 60} hour${event.reminder_minutes / 60 > 1 ? "s" : ""} before`
                        : `${event.reminder_minutes / 1440} day${event.reminder_minutes / 1440 > 1 ? "s" : ""} before`}
                </p>
              </div>
            )}

            {event.description && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Description</h4>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4 md:flex-row">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => onEdit(event)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => {
                setSelectedCalendarId(event.calendar_id)
                setShowMoveDialog(true)
              }}
            >
              <FolderInput className="mr-2 h-4 w-4" />
              Move
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Event</AlertDialogTitle>
            <AlertDialogDescription>Move "{event.title}" to a different calendar</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="move-calendar">Select Calendar</Label>
            <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
              <SelectTrigger id="move-calendar" className="mt-2">
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
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMove} disabled={isMoving}>
              {isMoving ? "Moving..." : "Move"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
