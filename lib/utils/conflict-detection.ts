import type { Database } from "@/lib/types/database"

type Event = Database["public"]["Tables"]["events"]["Row"]

export interface ConflictInfo {
  hasConflict: boolean
  conflictingEvents: Event[]
  message?: string
}

export function detectConflicts(
  newEvent: { start_time: string; end_time: string; id?: string },
  existingEvents: Event[],
): ConflictInfo {
  const newStart = new Date(newEvent.start_time)
  const newEnd = new Date(newEvent.end_time)

  const conflictingEvents = existingEvents.filter((event) => {
    // Skip comparing with itself when editing
    if (newEvent.id && event.id === newEvent.id) {
      return false
    }

    const eventStart = new Date(event.start_time)
    const eventEnd = new Date(event.end_time)

    // Check if events overlap
    return (
      (newStart >= eventStart && newStart < eventEnd) || // New event starts during existing event
      (newEnd > eventStart && newEnd <= eventEnd) || // New event ends during existing event
      (newStart <= eventStart && newEnd >= eventEnd) // New event completely encompasses existing event
    )
  })

  if (conflictingEvents.length > 0) {
    return {
      hasConflict: true,
      conflictingEvents,
      message: `This event conflicts with ${conflictingEvents.length} other event${conflictingEvents.length > 1 ? "s" : ""}`,
    }
  }

  return {
    hasConflict: false,
    conflictingEvents: [],
  }
}
