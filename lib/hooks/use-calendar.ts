"use client"

import { useState, useMemo } from "react"
import { type ViewType, navigateDate, getDateRange } from "@/lib/utils/date-utils"

export function useCalendar(initialDate: Date = new Date(), initialView: ViewType = "month") {
  const [currentDate, setCurrentDate] = useState(initialDate)
  const [view, setView] = useState<ViewType>(initialView)

  const dateRange = useMemo(() => getDateRange(currentDate, view), [currentDate, view])

  const goToNext = () => {
    setCurrentDate((prev) => navigateDate(prev, view, "next"))
  }

  const goToPrev = () => {
    setCurrentDate((prev) => navigateDate(prev, view, "prev"))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const changeView = (newView: ViewType) => {
    setView(newView)
  }

  return {
    currentDate,
    view,
    dateRange,
    goToNext,
    goToPrev,
    goToToday,
    changeView,
    setCurrentDate,
  }
}
