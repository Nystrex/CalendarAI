"use client"

import { getCalendarDays, isSameMonthAs, isToday } from "@/lib/utils/date-utils"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/types/database"

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string }
}

interface MonthViewProps {
  currentDate: Date
  events: Event[]
  onDateClick: (date: Date) => void
  onEventClick: (event: Event) => void
}

export function MonthView({ currentDate, events, onDateClick, onEventClick }: MonthViewProps) {
  const days = getCalendarDays(currentDate)
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const weekDaysMobile = ["S", "M", "T", "W", "T", "F", "S"]

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/50 shrink-0">
        {weekDays.map((day, idx) => (
          <div key={day} className="border-r p-0.5 text-center text-[10px] font-medium last:border-r-0 md:p-2 md:text-sm">
            <span className="md:hidden">{weekDaysMobile[idx]}</span>
            <span className="hidden md:inline">{day}</span>
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 auto-rows-fr overflow-auto">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonthAs(day, currentDate)
          const isDayToday = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "relative min-h-12 border-b border-r p-0.5 last:border-r-0 md:min-h-24 md:p-2",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                "cursor-pointer transition-colors hover:bg-accent/50",
              )}
              onClick={() => onDateClick(day)}
            >
              <div className="flex items-center justify-center md:justify-start md:mb-1">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] md:h-6 md:w-6 md:text-sm",
                    isDayToday && "bg-primary text-primary-foreground font-semibold",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {/* Mobile: show dots, Desktop: show event cards */}
                <div className="md:hidden flex flex-wrap gap-0.5 justify-center">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: event.calendar?.color || "#3b82f6" }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                  )}
                </div>
                <div className="hidden md:block space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="truncate rounded px-1 py-0.5 text-xs text-white"
                      style={{ backgroundColor: event.calendar?.color || "#3b82f6" }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                    >
                      {format(new Date(event.start_time), "h:mm a")} {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
