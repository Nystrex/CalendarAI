"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatDateHeader, type ViewType } from "@/lib/utils/date-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CalendarHeaderProps {
  currentDate: Date
  view: ViewType
  onNext: () => void
  onPrev: () => void
  onToday: () => void
  onViewChange: (view: ViewType) => void
}

export function CalendarHeader({ currentDate, view, onNext, onPrev, onToday, onViewChange }: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-card/50 backdrop-blur-sm p-2 md:gap-4 md:p-4">
      <div className="flex items-center gap-2 md:gap-3">
        <Button variant="outline" size="sm" onClick={onToday} className="text-xs md:text-sm bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
          Today
        </Button>
        <div className="flex items-center rounded-lg bg-muted/50 p-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 hover:bg-background/80" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 hover:bg-background/80" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-sm font-bold md:text-lg text-foreground">{formatDateHeader(currentDate, view)}</h2>
      </div>
      <Select value={view} onValueChange={(value) => onViewChange(value as ViewType)}>
        <SelectTrigger className="w-24 text-xs md:w-32 md:text-sm border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Day</SelectItem>
          <SelectItem value="week">Week</SelectItem>
          <SelectItem value="month">Month</SelectItem>
          <SelectItem value="year">Year</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
