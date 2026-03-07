"use client"

import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  CalendarIcon,
  ClipboardList,
  Brain,
  GraduationCap,
  Settings,
} from "lucide-react"

interface MobileNavProps {
  dashboardMode: "overview" | "calendar" | "school" | "homework" | "university" | "settings" | "study" | "achievements" | "templates" | "ai"
  setDashboardMode: (mode: "overview" | "calendar" | "school" | "homework" | "university" | "settings" | "study" | "achievements" | "templates" | "ai") => void
  isLmsEnabled: boolean
}

export function MobileNav({ dashboardMode, setDashboardMode, isLmsEnabled }: MobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-auto py-2 px-3 gap-1 ${
            dashboardMode === "overview" ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
          onClick={() => setDashboardMode("overview")}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-xs">Overview</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-auto py-2 px-3 gap-1 ${
            dashboardMode === "calendar" ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
          onClick={() => setDashboardMode("calendar")}
        >
          <CalendarIcon className="h-5 w-5" />
          <span className="text-xs">Calendar</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-auto py-2 px-3 gap-1 ${
            dashboardMode === "school" ? "text-emerald-400 bg-emerald-500/10" : "text-muted-foreground"
          }`}
          onClick={() => setDashboardMode("school")}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs">School</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-auto py-2 px-3 gap-1 ${
            dashboardMode === "homework" ? "text-purple-400 bg-purple-500/10" : "text-muted-foreground"
          }`}
          onClick={() => setDashboardMode("homework")}
        >
          <Brain className="h-5 w-5" />
          <span className="text-xs">Homework</span>
        </Button>
        
        {isLmsEnabled && (
          <Button
            variant="ghost"
            size="sm"
            className={`flex-col h-auto py-2 px-3 gap-1 ${
              dashboardMode === "university" ? "text-blue-400 bg-blue-500/10" : "text-muted-foreground"
            }`}
            onClick={() => setDashboardMode("university")}
          >
            <GraduationCap className="h-5 w-5" />
            <span className="text-xs">University</span>
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-auto py-2 px-3 gap-1 ${
            dashboardMode === "settings" ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
          onClick={() => setDashboardMode("settings")}
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs">Settings</span>
        </Button>
      </div>
    </nav>
  )
}
