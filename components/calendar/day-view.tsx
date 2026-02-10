"use client"

import { getDayHours, formatTimeSlot, isToday } from "@/lib/utils/date-utils"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/types/database"

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string }
}

interface DayViewProps {
  currentDate: Date
  events: Event[]
  onTimeSlotClick: (hour: number) => void
  onEventClick: (event: Event) => void
}

export function DayView({ currentDate, events, onTimeSlotClick, onEventClick }: DayViewProps) {
  const hours = getDayHours()

  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start_time)
      return (
        eventStart.getDate() === currentDate.getDate() &&
        eventStart.getMonth() === currentDate.getMonth() &&
        eventStart.getFullYear() === currentDate.getFullYear() &&
        eventStart.getHours() === hour
      )
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day header */}
      <div className="border-b bg-muted/50 p-4 text-center">
        <div className={cn("text-sm font-medium", isToday(currentDate) && "text-primary")}>
          {format(currentDate, "EEEE")}
        </div>
        <div
          className={cn(
            "mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-full text-2xl",
            isToday(currentDate) && "bg-primary text-primary-foreground font-semibold",
          )}
        >
          {format(currentDate, "d")}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour)
          return (
            <div key={hour} className="flex border-b">
              <div className="w-20 border-r p-2 text-right text-xs text-muted-foreground">{formatTimeSlot(hour)}</div>
              <div
                className="relative flex-1 min-h-20 p-2 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onTimeSlotClick(hour)}
              >
                {hourEvents.map((event) => (
                  <div
                    key={event.id}
                    className="mb-2 rounded p-2 text-sm text-white cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: event.calendar?.color || "#3b82f6" }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                  >
                    <div className="font-semibold">{event.title}</div>
                    <div className="text-xs">
                      {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                    </div>
                    {event.location && <div className="mt-1 text-xs">{event.location}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
