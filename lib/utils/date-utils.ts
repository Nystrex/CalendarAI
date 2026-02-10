import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
} from "date-fns"

export type ViewType = "day" | "week" | "month" | "year"

export function getCalendarDays(date: Date) {
  const start = startOfWeek(startOfMonth(date))
  const end = endOfWeek(endOfMonth(date))
  return eachDayOfInterval({ start, end })
}

export function getWeekDays(date: Date) {
  const start = startOfWeek(date)
  const end = endOfWeek(date)
  return eachDayOfInterval({ start, end })
}

export function getDayHours() {
  return Array.from({ length: 24 }, (_, i) => i)
}

export function formatTimeSlot(hour: number) {
  const isPM = hour >= 12
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}${isPM ? "PM" : "AM"}`
}

export function navigateDate(date: Date, view: ViewType, direction: "prev" | "next") {
  const operation =
    direction === "next"
      ? { day: addDays, week: addWeeks, month: addMonths, year: addYears }
      : { day: subDays, week: subWeeks, month: subMonths, year: subYears }
  return operation[view](date, 1)
}

export function isToday(date: Date) {
  return isSameDay(date, new Date())
}

export function isSameMonthAs(date: Date, referenceDate: Date) {
  return isSameMonth(date, referenceDate)
}

export function getYearMonths(date: Date) {
  const start = startOfYear(date)
  const end = endOfYear(date)
  return eachMonthOfInterval({ start, end })
}

export function getDateRange(date: Date, view: ViewType) {
  switch (view) {
    case "day":
      return { start: startOfDay(date), end: endOfDay(date) }
    case "week":
      return { start: startOfWeek(date), end: endOfWeek(date) }
    case "month":
      return { start: startOfMonth(date), end: endOfMonth(date) }
    case "year":
      return { start: startOfYear(date), end: endOfYear(date) }
  }
}

export function formatDateHeader(date: Date, view: ViewType) {
  switch (view) {
    case "day":
      return format(date, "EEEE, MMMM d, yyyy")
    case "week":
      const weekStart = startOfWeek(date)
      const weekEnd = endOfWeek(date)
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    case "month":
      return format(date, "MMMM yyyy")
    case "year":
      return format(date, "yyyy")
  }
}
