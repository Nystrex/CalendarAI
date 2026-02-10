"use client"

import { getYearMonths, getCalendarDays, isToday, isSameMonthAs } from "@/lib/utils/date-utils"
import { format, isSameDay, startOfMonth } from "date-fns"
import type { Database } from "@/lib/types/database"

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string; name: string }
}

interface YearViewProps {
  currentDate: Date
  events: Event[]
  onDateClick: (date: Date) => void
  onEventClick: (event: Event) => void
  onMonthClick: (date: Date) => void
}

export function YearView({ currentDate, events, onDateClick, onEventClick, onMonthClick }: YearViewProps) {
  const months = getYearMonths(currentDate)

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      return isSameDay(eventDate, date)
    })
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => {
          const monthStart = startOfMonth(month)
          const days = getCalendarDays(month)

          return (
            <div key={month.toString()} className="rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onMonthClick(month)}>
              <h3 className="mb-2 text-center text-sm font-semibold">{format(month, "MMMM")}</h3>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div key={i} className="text-center font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                {days.map((day) => {
                  const dayEvents = getEventsForDate(day)
                  const isCurrentMonth = isSameMonthAs(day, month)
                  const isTodayDate = isToday(day)

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => onDateClick(day)}
                      className={`
                        aspect-square rounded p-1 text-center text-xs transition-colors
                        ${!isCurrentMonth ? "text-muted-foreground/40" : ""}
                        ${isTodayDate ? "bg-primary text-primary-foreground font-bold" : ""}
                        ${dayEvents.length > 0 && !isTodayDate ? "bg-accent font-medium" : ""}
                        ${!isTodayDate && dayEvents.length === 0 ? "hover:bg-muted" : ""}
                      `}
                    >
                      {format(day, "d")}
                      {dayEvents.length > 0 && (
                        <div className="mt-0.5 flex justify-center gap-0.5">
                          {dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              className="h-1 w-1 rounded-full"
                              style={{ backgroundColor: event.calendar?.color || "#3b82f6" }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
