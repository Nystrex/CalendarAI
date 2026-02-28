"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Sparkles, 
  Brain, 
  CheckCircle2, 
  Calendar,
  Zap,
  Clock,
  Target
} from "lucide-react"

interface QuickActionsProps {
  onNewEvent: () => void
  onMassEvent: () => void
  onAIExtract: () => void
  onMarkAsDone: () => void
  onViewCalendar: () => void
}

export function QuickActions({
  onNewEvent,
  onMassEvent,
  onAIExtract,
  onMarkAsDone,
  onViewCalendar
}: QuickActionsProps) {
  const actions = [
    {
      icon: Plus,
      label: "New Event",
      description: "Create a single event",
      onClick: onNewEvent,
      color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20"
    },
    {
      icon: Sparkles,
      label: "Mass Event",
      description: "Add multiple events",
      onClick: onMassEvent,
      color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20"
    },
    {
      icon: Brain,
      label: "AI Extract",
      description: "Extract from text/image",
      onClick: onAIExtract,
      color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 border-pink-500/20"
    },
    {
      icon: CheckCircle2,
      label: "Mark Done",
      description: "Complete tasks",
      onClick: onMarkAsDone,
      color: "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20"
    },
    {
      icon: Calendar,
      label: "View Calendar",
      description: "Open calendar view",
      onClick: onViewCalendar,
      color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20"
    }
  ]

  return (
    <Card className="overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary animate-pulse" />
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </div>
        <CardDescription>Fast access to common tasks</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {actions.map((action, idx) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-md ${action.color}`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <action.icon className="h-6 w-6 transition-transform group-hover:scale-110" />
              <div className="text-center">
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="text-xs opacity-70 hidden sm:block">{action.description}</p>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
