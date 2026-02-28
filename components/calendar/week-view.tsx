"use client"

import { getWeekDays, getDayHours, formatTimeSlot, isToday } from "@/lib/utils/date-utils"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/types/database"

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string }
}

interface WeekViewProps {
  currentDate: Date
  events: Event[]
  onTimeSlotClick: (date: Date, hour: number) => void
  onEventClick: (event: Event) => void
  onEventDrop?: (event: Event, newDate: Date) => void
}

export function WeekView({ currentDate, events, onTimeSlotClick, onEventClick, onEventDrop }: WeekViewProps) {
  const weekDays = getWeekDays(currentDate)
  const hours = getDayHours()

  const getEventsForDayAndHour = (date: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start_time)
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getHours() === hour
      )
    })
  }

  const handleDragStart = (e: React.DragEvent, event: Event) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("eventId", event.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    const eventId = e.dataTransfer.getData("eventId")
    const event = events.find((ev) => ev.id === eventId)
    if (event && onEventDrop) {
      onEventDrop(event, targetDate)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b bg-muted/50">
        <div className="w-20 border-r p-2" />
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="border-r p-2 text-center last:border-r-0">
            <div className={cn("text-sm font-medium", isToday(day) && "text-primary")}>{format(day, "EEE")}</div>
            <div
              className={cn(
                "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg",
                isToday(day) && "bg-primary text-primary-foreground font-semibold",
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[auto_repeat(7,1fr)] border-b">
            <div className="w-20 border-r p-2 text-right text-xs text-muted-foreground">{formatTimeSlot(hour)}</div>
            {weekDays.map((day) => {
              const dayEvents = getEventsForDayAndHour(day, hour)
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="relative min-h-16 border-r p-1 last:border-r-0 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onTimeSlotClick(day, hour)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event)}
                      className="mb-1 rounded p-1 text-xs text-white cursor-move hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: event.calendar?.color || "#3b82f6" }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-[10px]">
                        {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
