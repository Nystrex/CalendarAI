"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Plus,
  Search,
  Brain,
  Sparkles,
  ChevronRight,
  Flame,
  Target,
  TrendingUp,
  Zap,
  CheckCircle2,
  BookOpen,
} from "lucide-react"
import type { Database } from "@/lib/types/database"
import { format, startOfDay, addDays, startOfWeek, endOfWeek, differenceInDays, isSameDay, subDays } from "date-fns"

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string; name?: string }
}
type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"]

interface OverviewDashboardProps {
  events: Event[]
  calendars: CalendarRow[]
  onNewEvent: () => void
  onMassEvent: () => void
  onAIExtract: () => void
  onMarkAsDone: () => void
  onEventClick: (event: Event) => void
  onViewCalendar: () => void
}

export function OverviewDashboard({
  events,
  calendars,
  onNewEvent,
  onMassEvent,
  onAIExtract,
  onMarkAsDone,
  onEventClick,
  onViewCalendar,
}: OverviewDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const today = startOfDay(new Date())
  const weekStart = startOfWeek(today, { weekStartsOn: 0 })

  const streak = useMemo(() => {
    if (!calendars || !Array.isArray(calendars) || !events || !Array.isArray(events)) return 0
    
    const completedCalendar = calendars.find(
      (c) => c.name.toLowerCase().includes("completed") || c.name.toLowerCase().includes("done"),
    )
    if (!completedCalendar) return 0

    const completedEvents = events
      .filter((e) => e.calendar_id === completedCalendar.id)
      .map((e) => startOfDay(new Date(e.start_time)).getTime())

    let currentStreak = 0
    let checkDate = startOfDay(today)

    // Check if today has a completed event, if not start from yesterday
    if (!completedEvents.includes(checkDate.getTime())) {
      checkDate = subDays(checkDate, 1)
    }

    while (completedEvents.includes(checkDate.getTime())) {
      currentStreak++
      checkDate = subDays(checkDate, 1)
    }

    return currentStreak
  }, [events, calendars])

  const weeklyHeatMap = useMemo(() => {
    if (!events || !Array.isArray(events)) return []
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i)
      const dayEvents = events.filter((e) => {
        const eventDate = new Date(e.start_time)
        return isSameDay(eventDate, day)
      })
      days.push({
        date: day,
        count: dayEvents.length,
        isToday: isSameDay(day, today),
      })
    }
    return days
  }, [events, weekStart, today])

  const focusNow = useMemo(() => {
    if (!calendars || !Array.isArray(calendars) || !events || !Array.isArray(events)) return null
    
    const completedCalendar = calendars.find(
      (c) => c.name.toLowerCase().includes("completed") || c.name.toLowerCase().includes("done"),
    )

    const upcoming = events
      .filter((e) => {
        if (completedCalendar && e.calendar_id === completedCalendar.id) return false
        const eventDate = new Date(e.start_time)
        return eventDate >= startOfDay(today)
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    return upcoming[0] || null
  }, [events, calendars, today])

  const workloadBalance = useMemo(() => {
    if (!weeklyHeatMap || !Array.isArray(weeklyHeatMap) || weeklyHeatMap.length === 0) {
      return { maxPerDay: 1, total: 0, isBalanced: true, suggestions: "" }
    }
    const maxPerDay = Math.max(...weeklyHeatMap.map((d) => d.count), 1)
    const total = weeklyHeatMap.reduce((sum, d) => sum + d.count, 0)
    const avg = total / 7
    const variance = weeklyHeatMap.reduce((sum, d) => sum + Math.pow(d.count - avg, 2), 0) / 7
    const isBalanced = maxPerDay <= 3 || maxPerDay <= total / 4

    const suggestions = isBalanced
      ? ""
      : maxPerDay >= 6
        ? "Try spreading tasks out—one day is very overloaded."
        : "Consider moving 1-2 tasks from your busiest day to a lighter day."

    return {
      maxPerDay,
      total,
      isBalanced,
      suggestions,
    }
  }, [weeklyHeatMap])

  // Quick stats
  const stats = useMemo(() => {
    if (!calendars || !Array.isArray(calendars) || !events || !Array.isArray(events)) {
      return { dueToday: 0, dueThisWeek: 0, completed: 0 }
    }
    
    const now = new Date()
    const completedCalendar = calendars.find(
      (c) => c.name.toLowerCase().includes("completed") || c.name.toLowerCase().includes("done"),
    )

    const dueToday = events.filter((e) => {
      if (completedCalendar && e.calendar_id === completedCalendar.id) return false
      return isSameDay(new Date(e.start_time), now)
    }).length

    const dueThisWeek = events.filter((e) => {
      if (completedCalendar && e.calendar_id === completedCalendar.id) return false
      const eventDate = new Date(e.start_time)
      return eventDate >= weekStart && eventDate <= endOfWeek(now, { weekStartsOn: 0 })
    }).length

    const completed = completedCalendar ? events.filter((e) => e.calendar_id === completedCalendar.id).length : 0

    return { dueToday, dueThisWeek, completed }
  }, [events, calendars, weekStart])

  // Upcoming tasks
  const upcomingTasks = useMemo(() => {
    if (!calendars || !Array.isArray(calendars) || !events || !Array.isArray(events)) return []
    
    const completedCalendar = calendars.find(
      (c) => c.name.toLowerCase().includes("completed") || c.name.toLowerCase().includes("done"),
    )

    return events
      .filter((e) => {
        if (completedCalendar && e.calendar_id === completedCalendar.id) return false
        const eventDate = new Date(e.start_time)
        return eventDate >= startOfDay(today)
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 6)
  }, [events, calendars, today])

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!events || !Array.isArray(events) || !searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return events
      .filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.calendar?.name?.toLowerCase().includes(query),
      )
      .slice(0, 5)
  }, [events, searchQuery])

  const getHeatColor = (count: number, max: number) => {
    if (count === 0) return "bg-muted/50 text-muted-foreground"
    const intensity = count / Math.max(max, 1)
    if (intensity > 0.7) return "bg-cyan-500 text-cyan-950"
    if (intensity > 0.4) return "bg-cyan-400/70 text-cyan-950"
    return "bg-cyan-300/50 text-cyan-900"
  }

  const getDaysUntil = (event: Event) => {
    const eventDay = startOfDay(new Date(event.start_time))
    return differenceInDays(eventDay, today)
  }

  return (
    <div className="h-full overflow-y-auto p-3 md:p-6">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-4 lg:grid-cols-6 md:gap-4 md:auto-rows-[minmax(120px,auto)]">
        {/* Focus Now - Large prominent card */}
        <Card className="md:col-span-2 lg:col-span-3 md:row-span-2 p-4 md:p-6 bg-gradient-to-br from-cyan-950/50 to-background border-cyan-800/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-cyan-400 mb-2 md:mb-3">
              <Target className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm font-medium uppercase tracking-wider">Focus Now</span>
            </div>
            {focusNow ? (
              <div className="cursor-pointer group" onClick={() => onEventClick(focusNow)}>
                <h2 className="text-lg md:text-2xl lg:text-3xl font-bold mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                  {focusNow.title}
                </h2>
                {focusNow.description && (
                  <p className="text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2">{focusNow.description}</p>
                )}
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {getDaysUntil(focusNow) === 0
                      ? "Due Today"
                      : getDaysUntil(focusNow) === 1
                        ? "Due Tomorrow"
                        : `${getDaysUntil(focusNow)} days left`}
                  </Badge>
                  {focusNow.calendar && (
                    <Badge variant="outline" className="border-muted-foreground/30 text-xs">
                      <div className="h-2 w-2 rounded-full mr-1" style={{ backgroundColor: focusNow.calendar.color }} />
                      {focusNow.calendar.name}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 md:py-8 text-center">
                <CheckCircle2 className="h-8 w-8 md:h-12 md:w-12 text-cyan-500/50 mb-2 md:mb-3" />
                <p className="text-base md:text-lg font-medium">All caught up!</p>
                <p className="text-xs md:text-sm text-muted-foreground">No pending assignments</p>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Stats Row for Mobile */}
        <Card className="md:hidden p-3 bg-gradient-to-br from-muted/30 to-background border-border/50">
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-2 border border-orange-500/20">
              <Flame className={`h-4 w-4 mb-1 ${streak > 0 ? "text-orange-500" : "text-muted-foreground/50"}`} />
              <span className="text-lg font-bold">{streak}</span>
              <p className="text-[10px] text-muted-foreground">Streak</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 p-2 border border-red-500/20">
              <span className="text-lg font-bold text-red-400">{stats.dueToday}</span>
              <p className="text-[10px] text-muted-foreground">Today</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-2 border border-amber-500/20">
              <span className="text-lg font-bold text-amber-400">{stats.dueThisWeek}</span>
              <p className="text-[10px] text-muted-foreground">Week</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-2 border border-emerald-500/20">
              <span className="text-lg font-bold text-emerald-400">{stats.completed}</span>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </div>
          </div>
        </Card>

        {/* Streak Tracker - Desktop Only */}
        <Card className="hidden md:flex md:col-span-2 lg:col-span-1 p-5 flex-col items-center justify-center text-center bg-gradient-to-br from-orange-950/30 to-background border-orange-800/20">
          <Flame className={`h-8 w-8 mb-2 ${streak > 0 ? "text-orange-500" : "text-muted-foreground/50"}`} />
          <span className="text-3xl font-bold">{streak}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Day Streak</span>
        </Card>

        {/* Quick Stats - Desktop Only */}
        <Card className="hidden md:block lg:col-span-2 p-5 bg-gradient-to-br from-muted/30 to-background border-border/50">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 p-4 border border-red-500/20">
              <span className="text-3xl font-bold text-red-400 mb-2">{stats.dueToday}</span>
              <p className="text-xs text-muted-foreground font-medium mb-3">Today</p>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-red-400" 
                  style={{ width: `${Math.min((stats.dueToday / Math.max(stats.dueThisWeek, 5)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {stats.dueToday === 0 ? "All clear!" : `${stats.dueToday} waiting`}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 border border-amber-500/20">
              <span className="text-3xl font-bold text-amber-400 mb-2">{stats.dueThisWeek}</span>
              <p className="text-xs text-muted-foreground font-medium mb-3">This Week</p>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-amber-400" 
                  style={{ width: "100%" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {stats.dueThisWeek <= 3 ? "Manageable" : "Busy week"}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 border border-emerald-500/20">
              <span className="text-3xl font-bold text-emerald-400 mb-2">{stats.completed}</span>
              <p className="text-xs text-muted-foreground font-medium mb-3">Done</p>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-emerald-400" 
                  style={{ width: `${stats.dueThisWeek > 0 ? Math.min((stats.completed / stats.dueThisWeek) * 100, 100) : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {stats.dueThisWeek > 0 ? `${Math.round((stats.completed / stats.dueThisWeek) * 100)}% complete` : "No tasks"}
              </p>
            </div>
          </div>
        </Card>

        {/* Weekly Heat Map */}
        <Card className="md:col-span-2 lg:col-span-3 p-3 md:p-5">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span className="text-xs md:text-sm font-medium">Weekly Load</span>
            </div>
            <Badge variant={workloadBalance.isBalanced ? "default" : "secondary"} className="text-[10px] md:text-xs">
              {workloadBalance.isBalanced ? "Balanced" : "Uneven"}
            </Badge>
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {weeklyHeatMap.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 md:gap-1">
                <span className="text-[10px] md:text-xs text-muted-foreground">{format(day.date, "EEE").slice(0, 2)}</span>
                <div
                  className={`w-full aspect-square rounded-md md:rounded-lg flex items-center justify-center text-xs md:text-sm font-medium transition-colors border ${getHeatColor(
                    day.count,
                    workloadBalance.maxPerDay,
                  )} ${day.isToday ? "ring-1 md:ring-2 ring-cyan-400 ring-offset-1 md:ring-offset-2 ring-offset-background" : "border-border/50"}`}
                >
                  {day.count}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-muted/50 border border-border/50" />
              <span>None</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-cyan-300/50" />
              <span>Light</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-cyan-400/70" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-cyan-500" />
              <span>Heavy</span>
            </div>
          </div>
          
          {/* Quick Tip - Hidden on mobile */}
          <div className="hidden md:block mt-4 pt-4 border-t border-border/50">
            <div className="flex items-start gap-2 text-sm">
              <div className="rounded-full bg-cyan-400/10 p-1 mt-0.5">
                <Sparkles className="h-3 w-3 text-cyan-400" />
              </div>
              <div>
                <span className="font-medium text-cyan-400">Quick Tip: </span>
                <span className="text-muted-foreground">
                  {workloadBalance.isBalanced 
                    ? "Your week looks well-balanced! Try to maintain this pace."
                    : `${workloadBalance.suggestions}`}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Productivity Insights - Hidden on mobile */}
        <Card className="hidden md:block md:col-span-2 lg:col-span-3 p-5 bg-gradient-to-br from-purple-950/20 to-background border-purple-800/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-full bg-purple-500/10 p-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <span className="font-medium">Productivity Insights</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background/50 p-3 border border-border/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Completion Rate</span>
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {stats.dueThisWeek > 0 ? Math.round((stats.completed / stats.dueThisWeek) * 100) : 0}%
              </div>
            </div>
            <div className="rounded-lg bg-background/50 p-3 border border-border/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Busiest Day</span>
                <Zap className="h-3 w-3 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-amber-400">
                {weeklyHeatMap && weeklyHeatMap.length > 0 && weeklyHeatMap.reduce((max, day) => (day.count > max.count ? day : max), weeklyHeatMap[0]).count > 0
                  ? format(
                      weeklyHeatMap.reduce((max, day) => (day.count > max.count ? day : max), weeklyHeatMap[0]).date,
                      "EEE",
                    )
                  : "None"}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="md:col-span-2 lg:col-span-3 p-3 md:p-5">
          <div className="grid grid-cols-4 gap-1 md:gap-2 h-full">
            <Button
              variant="ghost"
              className="h-full flex-col gap-1 md:gap-2 hover:bg-purple-500/10 hover:text-purple-400 rounded-lg md:rounded-xl p-2"
              onClick={onAIExtract}
            >
              <Brain className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-[10px] md:text-xs">AI Import</span>
            </Button>
            <Button
              variant="ghost"
              className="h-full flex-col gap-1 md:gap-2 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg md:rounded-xl p-2"
              onClick={onMassEvent}
            >
              <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-[10px] md:text-xs">Bulk Add</span>
            </Button>
            <Button
              variant="ghost"
              className="h-full flex-col gap-1 md:gap-2 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg md:rounded-xl p-2"
              onClick={onMarkAsDone}
            >
              <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-[10px] md:text-xs">Done</span>
            </Button>
            <Button
              variant="ghost"
              className="h-full flex-col gap-1 md:gap-2 hover:bg-amber-500/10 hover:text-amber-400 rounded-lg md:rounded-xl p-2"
              onClick={onNewEvent}
            >
              <Plus className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-[10px] md:text-xs">New</span>
            </Button>
          </div>
        </Card>

        {/* Search */}
        <Card className="md:col-span-4 lg:col-span-6 p-3 md:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/30 border-muted text-sm"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 md:mt-3 space-y-1">
              {searchResults.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 md:gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => onEventClick(event)}
                >
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.calendar?.color || "#888" }} />
                  <span className="flex-1 truncate text-xs md:text-sm">{event.title}</span>
                  <span className="text-[10px] md:text-xs text-muted-foreground">{format(new Date(event.start_time), "MMM d")}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Tasks */}
        <Card className="md:col-span-4 lg:col-span-6 p-3 md:p-5">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-sm md:text-base font-medium">Upcoming Tasks</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onViewCalendar} className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3">
              Calendar
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
            </Button>
          </div>
          {upcomingTasks.length > 0 ? (
            <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3">
              {upcomingTasks.map((event) => {
                const daysUntil = getDaysUntil(event)
                const urgency =
                  daysUntil === 0 ? "today" : daysUntil <= 2 ? "urgent" : daysUntil <= 7 ? "soon" : "later"

                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl cursor-pointer transition-all hover:scale-[1.01] md:hover:scale-[1.02] ${
                      urgency === "today"
                        ? "bg-red-500/10 border border-red-500/30"
                        : urgency === "urgent"
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : "bg-muted/30 border border-transparent hover:border-muted"
                    }`}
                    onClick={() => onEventClick(event)}
                  >
                    <div
                      className="h-8 w-8 md:h-10 md:w-10 rounded-md md:rounded-lg flex items-center justify-center text-white font-bold text-xs md:text-sm shrink-0"
                      style={{ backgroundColor: event.calendar?.color || "#888" }}
                    >
                      {daysUntil === 0 ? "!" : daysUntil}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs md:text-sm truncate">{event.title}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {daysUntil === 0 ? "Due today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                        {!event.all_day && ` • ${format(new Date(event.start_time), "h:mm a")}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 md:py-8">
              <BookOpen className="h-8 w-8 md:h-10 md:w-10 mx-auto text-muted-foreground/30 mb-2 md:mb-3" />
              <p className="text-xs md:text-sm text-muted-foreground">No upcoming tasks</p>
              <Button variant="link" size="sm" onClick={onAIExtract} className="mt-1 md:mt-2 text-xs">
                Import from syllabus
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
