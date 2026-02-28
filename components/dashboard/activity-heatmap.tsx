"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMemo } from "react"
import { format, startOfWeek, addDays, isSameDay, subWeeks } from "date-fns"
import { Flame } from "lucide-react"

interface Event {
  id: string
  start_time: string
  end_time: string
}

interface ActivityHeatmapProps {
  events: Event[]
}

export function ActivityHeatmap({ events }: ActivityHeatmapProps) {
  const heatmapData = useMemo(() => {
    const weeks = 12
    const today = new Date()
    const startDate = startOfWeek(subWeeks(today, weeks - 1))
    
    const grid: { date: Date; count: number }[][] = []
    
    for (let week = 0; week < weeks; week++) {
      const weekData: { date: Date; count: number }[] = []
      for (let day = 0; day < 7; day++) {
        const currentDate = addDays(startDate, week * 7 + day)
        const count = events.filter(e => 
          isSameDay(new Date(e.start_time), currentDate)
        ).length
        weekData.push({ date: currentDate, count })
      }
      grid.push(weekData)
    }
    
    return grid
  }, [events])

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted/30 hover:bg-muted/50"
    if (count <= 2) return "bg-green-200 dark:bg-green-900/40 hover:bg-green-300 dark:hover:bg-green-800/50"
    if (count <= 4) return "bg-green-400 dark:bg-green-700/60 hover:bg-green-500 dark:hover:bg-green-600/70"
    if (count <= 6) return "bg-green-600 dark:bg-green-600/80 hover:bg-green-700 dark:hover:bg-green-500/90"
    return "bg-green-800 dark:bg-green-500 hover:bg-green-900 dark:hover:bg-green-400"
  }

  const totalEvents = events.length
  const currentStreak = useMemo(() => {
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const checkDate = addDays(today, -i)
      const hasEvents = events.some(e => isSameDay(new Date(e.start_time), checkDate))
      if (hasEvents) {
        streak++
      } else {
        break
      }
    }
    return streak
  }, [events])

  return (
    <Card className="overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-green-500/5 to-emerald-500/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Activity Heatmap</CardTitle>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalEvents}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </div>
        </div>
        <CardDescription>Your event activity over the last 12 weeks</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex gap-1 text-xs text-muted-foreground mb-2">
            <span className="w-8"></span>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <span key={day} className="w-3 text-center hidden sm:inline">{day[0]}</span>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`w-3 h-3 rounded-sm transition-all duration-200 cursor-pointer ${getIntensity(day.count)}`}
                    title={`${format(day.date, 'MMM d, yyyy')}: ${day.count} events`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/30" />
              <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/40" />
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700/60" />
              <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-600/80" />
              <div className="w-3 h-3 rounded-sm bg-green-800 dark:bg-green-500" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
