"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Database } from "@/lib/types/database"

type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"]

interface SearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  calendars: CalendarRow[]
  selectedCalendarFilter: string
  onCalendarFilterChange: (calendarId: string) => void
}

export function SearchFilter({
  searchQuery,
  onSearchChange,
  calendars,
  selectedCalendarFilter,
  onCalendarFilterChange,
}: SearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  return (
    <div className="flex items-center gap-1 border-b bg-card p-2 md:gap-2 md:p-4">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-7 pr-7 text-xs md:h-10 md:pl-9 md:pr-9 md:text-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 h-6 w-6 -translate-y-1/2 md:right-1 md:h-7 md:w-7"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        )}
      </div>

      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10 bg-transparent">
            <SlidersHorizontal className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div>
              <h4 className="mb-3 font-medium">Filter Events</h4>
              <div className="space-y-2">
                <Label htmlFor="calendar-filter">Calendar</Label>
                <Select value={selectedCalendarFilter} onValueChange={onCalendarFilterChange}>
                  <SelectTrigger id="calendar-filter">
                    <SelectValue placeholder="All calendars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All calendars</SelectItem>
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
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
