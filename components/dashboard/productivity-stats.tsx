"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMemo } from "react"
import { 
  TrendingUp, 
  Target, 
  Award, 
  Calendar,
  CheckCircle2,
  Clock
} from "lucide-react"
import { format, isAfter, isBefore, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

interface Event {
  id: string
  title: string
  start_time: string
  end_time: string
  completed?: boolean
}

interface ProductivityStatsProps {
  events: Event[]
}

export function ProductivityStats({ events }: ProductivityStatsProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = endOfWeek(now)
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const thisWeekEvents = events.filter(e => {
      const eventDate = new Date(e.start_time)
      return isAfter(eventDate, weekStart) && isBefore(eventDate, weekEnd)
    })

    const thisMonthEvents = events.filter(e => {
      const eventDate = new Date(e.start_time)
      return isAfter(eventDate, monthStart) && isBefore(eventDate, monthEnd)
    })

    const completedEvents = events.filter(e => e.completed).length
    const completionRate = events.length > 0 ? Math.round((completedEvents / events.length) * 100) : 0

    const upcomingEvents = events.filter(e => isAfter(new Date(e.start_time), now))
    const pastEvents = events.filter(e => isBefore(new Date(e.end_time), now))

    return {
      thisWeek: thisWeekEvents.length,
      thisMonth: thisMonthEvents.length,
      completed: completedEvents,
      completionRate,
      upcoming: upcomingEvents.length,
      past: pastEvents.length,
      total: events.length
    }
  }, [events])

  const statCards = [
    {
      icon: Calendar,
      label: "This Week",
      value: stats.thisWeek,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: Target,
      label: "This Month",
      value: stats.thisMonth,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10"
    },
    {
      icon: CheckCircle2,
      label: "Completed",
      value: stats.completed,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10"
    },
    {
      icon: TrendingUp,
      label: "Completion Rate",
      value: `${stats.completionRate}%`,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10"
    },
    {
      icon: Clock,
      label: "Upcoming",
      value: stats.upcoming,
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-500/10"
    },
    {
      icon: Award,
      label: "Total Events",
      value: stats.total,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10"
    }
  ]

  return (
    <Card className="overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-purple-500/10 border-b">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Productivity Insights</CardTitle>
        </div>
        <CardDescription>Your activity and completion metrics</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((stat, idx) => (
            <div
              key={stat.label}
              className={`group relative p-4 rounded-xl border-2 ${stat.bgColor} border-transparent hover:border-current transition-all duration-300 hover:scale-105 hover:shadow-md`}
              style={{ animationDelay: `${idx * 75}ms` }}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
