"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, EyeOff } from "lucide-react"
import type { Database } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
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
import { useState } from "react"

type Calendar = Database["public"]["Tables"]["calendars"]["Row"]

interface CalendarSidebarProps {
  calendars: Calendar[]
  selectedCalendarIds: string[]
  onCalendarToggle: (calendarId: string) => void
  onNewCalendar: () => void
  onCalendarsChanged: () => void
}

export function CalendarSidebar({
  calendars,
  selectedCalendarIds,
  onCalendarToggle,
  onNewCalendar,
  onCalendarsChanged,
}: CalendarSidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [calendarToDelete, setCalendarToDelete] = useState<Calendar | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent, calendar: Calendar) => {
    e.stopPropagation()
    setCalendarToDelete(calendar)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!calendarToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      if (calendarToDelete.provider === "google") {
        // Delete from Google Calendar
        try {
          const response = await fetch("/api/google/calendars/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ calendarId: calendarToDelete.provider_calendar_id }),
          })
          const result = await response.json()
          
          if (!result.success) {
            toast.warning("Could not delete from Google Calendar, but local copy removed")
          }
        } catch (error) {
          toast.warning("Could not delete from Google Calendar, but local copy removed")
        }

        // Delete from local database
        const { error } = await supabase.from("calendars").delete().eq("id", calendarToDelete.id)
        if (error) throw error

        toast.success(`Calendar "${calendarToDelete.name}" deleted`)
      } else {
        // For local calendars, actually delete them
        const { error } = await supabase.from("calendars").delete().eq("id", calendarToDelete.id)

        if (error) throw error

        toast.success(`Calendar "${calendarToDelete.name}" deleted`)
      }

      onCalendarsChanged()
    } catch (error) {
      console.error("Error deleting calendar:", error)
      toast.error("Failed to delete calendar")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setCalendarToDelete(null)
    }
  }

  return (
    <>
      <div className="h-full border-r border-border/50 bg-gradient-to-b from-card/80 to-card/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">My Calendars</h3>
          <Button size="icon" variant="ghost" onClick={onNewCalendar} className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {calendars.map((calendar) => (
            <div key={calendar.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox
                id={calendar.id}
                checked={selectedCalendarIds.includes(calendar.id)}
                onCheckedChange={() => onCalendarToggle(calendar.id)}
                className="border-border/70"
              />
              <label htmlFor={calendar.id} className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: calendar.color }} />
                <span className="truncate font-medium">{calendar.name}</span>
              </label>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => handleDeleteClick(e, calendar)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calendar</AlertDialogTitle>
            <AlertDialogDescription>
              {calendarToDelete?.provider === "google" ? (
                <>
                  Are you sure you want to delete "{calendarToDelete?.name}"? This will permanently delete it from both
                  this app and your Google Calendar. All events in this calendar will also be deleted. This action cannot
                  be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete "{calendarToDelete?.name}"? This will also delete all events in this
                  calendar. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
