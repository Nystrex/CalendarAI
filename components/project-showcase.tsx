import { Github, ExternalLink, Code2, Zap, Clock, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProjectShowcase() {
  return (
    <Card className="w-full max-w-2xl mx-auto p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CalendarAI</h1>
              <p className="text-sm text-slate-400">Modern Calendar Web Application</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <p className="text-slate-200 leading-relaxed">
            A full-stack calendar application with Google Calendar integration, intelligent event management, and natural language processing. Built with Next.js, React, Tailwind CSS, and Supabase.
          </p>
          <p className="text-sm text-slate-400">
            Built with: Next.js 16 • React 19 • TypeScript • Supabase • Tailwind CSS
          </p>
        </div>

        {/* Current Features */}
        <div className="space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-400" />
            Current Features
          </h3>
          <ul className="text-slate-300 space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Multiple calendar views (Month, Week, Day) with seamless navigation</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Google Calendar OAuth 2.0 integration with bidirectional sync</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Natural language event creation ("Meeting tomorrow at 3pm")</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Event conflict detection & smart reminders</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Dark mode • Search & filter • Timezone auto-detection</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Row Level Security (RLS) • Audit logs • Homework AI tutor</span>
            </li>
          </ul>
        </div>

        {/* Future Plans */}
        <div className="space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            Planned Features
          </h3>
          <ul className="text-slate-300 space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-cyan-400">•</span>
              <span>Event recurrence patterns & advanced scheduling</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400">•</span>
              <span>iCloud/CalDAV support for multi-provider sync</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400">•</span>
              <span>Team calendars & event sharing with permissions</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400">•</span>
              <span>Push notifications & offline-first service worker</span>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            className="gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
          >
            <Github className="h-4 w-4" />
            GitHub
          </Button>
          <Button 
            className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
          >
            <ExternalLink className="h-4 w-4" />
            View Live
          </Button>
        </div>
      </div>
    </Card>
  )
}
