"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Sparkles,
  Crown,
  ArrowRight,
  X,
  ChevronRight,
  ChevronLeft,
  Brain,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Lock,
  CheckCircle2,
  Clock,
  BookOpen,
  Zap,
  Globe,
  CalendarDays,
  Bell,
  Star,
  Play,
  ClipboardList,
} from "lucide-react"

// ── Demo data ────────────────────────────────────────────────────────────────
const TODAY = new Date()
const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

const addDays = (d: Date, n: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const DEMO_EVENTS = [
  { id: "1", title: "Calculus Lecture", color: "#6366f1", date: TODAY, start: "09:00", end: "10:30", calendar: "University" },
  { id: "2", title: "Study Group – PHYS 201", color: "#10b981", date: TODAY, start: "14:00", end: "15:30", calendar: "Personal" },
  { id: "3", title: "Assignment Due: Essay", color: "#f59e0b", date: addDays(TODAY, 1), start: "23:59", end: "23:59", calendar: "School" },
  { id: "4", title: "Office Hours – Prof. Smith", color: "#6366f1", date: addDays(TODAY, 2), start: "11:00", end: "12:00", calendar: "University" },
  { id: "5", title: "Gym", color: "#10b981", date: addDays(TODAY, 2), start: "17:00", end: "18:00", calendar: "Personal" },
  { id: "6", title: "Midterm Exam – MATH 201", color: "#ef4444", date: addDays(TODAY, 4), start: "09:00", end: "11:00", calendar: "School" },
  { id: "7", title: "Project Presentation", color: "#8b5cf6", date: addDays(TODAY, 6), start: "13:00", end: "14:30", calendar: "University" },
  { id: "8", title: "Library – Research Session", color: "#6366f1", date: addDays(TODAY, 8), start: "15:00", end: "17:00", calendar: "University" },
]

const DEMO_CALENDARS = [
  { name: "University", color: "#6366f1", count: 4 },
  { name: "Personal", color: "#10b981", count: 2 },
  { name: "School", color: "#f59e0b", count: 2 },
]

const DEMO_GRADES = [
  { course: "MATH 201", grade: "A−", pct: 91, trend: "+3%" },
  { course: "PHYS 201", grade: "B+", pct: 88, trend: "+1%" },
  { course: "ENG 102", grade: "A", pct: 95, trend: "+5%" },
  { course: "CS 301", grade: "B", pct: 84, trend: "−2%" },
]

// ── Tour steps ────────────────────────────────────────────────────────────────
interface TourStep {
  id: string
  title: string
  description: string
  targetMode: string
  premium?: boolean
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    title: "Your Dashboard Overview",
    description: "See everything at a glance — upcoming events, grades, and pending tasks. Your command center for the semester.",
    targetMode: "overview",
  },
  {
    id: "calendar",
    title: "Smart Calendar",
    description: "Manage all your events in one place. Free users get Day, Week, and Month views. Switch between them with one click.",
    targetMode: "calendar",
  },
  {
    id: "calendar-premium",
    title: "Year View & AI Extract (Premium)",
    description: "Premium users unlock the Year view to plan the full semester at a glance, plus AI Event Extraction — paste your syllabus and watch events appear automatically.",
    targetMode: "calendar",
    premium: true,
  },
  {
    id: "school",
    title: "School Tracker",
    description: "Track assignments, quizzes, and exams. Add grades per course and see your GPA calculated in real time.",
    targetMode: "school",
  },
  {
    id: "homework",
    title: "AI Homework Helper",
    description: "Ask anything about your coursework. Free users get 5 queries per day. Premium users get unlimited help.",
    targetMode: "homework",
  },
  {
    id: "premium-cta",
    title: "Ready to unlock everything?",
    description: "Start a 14-day Premium trial — no credit card required. Get unlimited AI, Year view, recurring events, and more.",
    targetMode: "overview",
    premium: true,
  },
]

// ── Week calendar strip ───────────────────────────────────────────────────────
function WeekStrip({ events }: { events: typeof DEMO_EVENTS }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i))
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, i) => {
        const dayEvents = events.filter(
          (e) => e.date.toDateString() === day.toDateString(),
        )
        const isToday = day.toDateString() === TODAY.toDateString()
        return (
          <div key={i} className={`rounded-xl border p-2 min-h-[120px] ${isToday ? "border-primary/50 bg-primary/5" : "bg-card"}`}>
            <div className="text-center mb-2">
              <p className="text-xs text-muted-foreground">{day.toLocaleDateString("en-US", { weekday: "short" })}</p>
              <div className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                {day.getDate()}
              </div>
            </div>
            <div className="space-y-1">
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded px-1.5 py-0.5 text-xs font-medium truncate text-white"
                  style={{ backgroundColor: ev.color }}
                >
                  {ev.title}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Lock overlay for premium features ─────────────────────────────────────────
function PremiumOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm bg-background/80 border border-primary/20">
      <div className="text-center space-y-3 p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <Crown className="h-7 w-7 text-amber-500" />
        </div>
        <p className="font-semibold text-lg">Premium Feature</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Upgrade to unlock this feature and everything else Premium has to offer.
        </p>
        <Button onClick={onUpgrade} className="gap-2 mt-2">
          <Crown className="h-4 w-4" />
          Try Premium Free
        </Button>
      </div>
    </div>
  )
}

// ── Tour tooltip ──────────────────────────────────────────────────────────────
function TourTooltip({
  step,
  stepIndex,
  total,
  onNext,
  onPrev,
  onDismiss,
}: {
  step: TourStep
  stepIndex: number
  total: number
  onNext: () => void
  onPrev: () => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border bg-card shadow-2xl shadow-black/20 p-5 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 mb-1">
          {step.premium && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs gap-1">
              <Crown className="h-3 w-3" />Premium
            </Badge>
          )}
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      <h3 className="font-bold text-base mb-1.5">{step.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

      <div className="flex items-center justify-between">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <Button variant="ghost" size="sm" onClick={onPrev} className="h-8 px-3">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {stepIndex < total - 1 ? (
            <Button size="sm" onClick={onNext} className="h-8 px-4 gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" asChild className="h-8 px-4 gap-1 bg-amber-500 hover:bg-amber-600 text-white">
              <Link href="/auth/sign-up">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Demo Page ─────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [tierView, setTierView] = useState<"free" | "premium">("free")
  const [mode, setMode] = useState<"overview" | "calendar" | "school" | "homework">("overview")
  const [tourStep, setTourStep] = useState(0)
  const [tourActive, setTourActive] = useState(true)
  const [aiInput, setAiInput] = useState("")
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hi! I'm your AI homework helper. Ask me anything about your coursework. (This is a demo — sign up for real answers!)" },
  ])

  const isPremium = tierView === "premium"

  // Sync tour step → mode
  useEffect(() => {
    if (!tourActive) return
    const step = TOUR_STEPS[tourStep]
    if (step?.targetMode) setMode(step.targetMode as typeof mode)
  }, [tourStep, tourActive])

  const handleTourNext = () => {
    if (tourStep < TOUR_STEPS.length - 1) setTourStep((s) => s + 1)
  }
  const handleTourPrev = () => {
    if (tourStep > 0) setTourStep((s) => s - 1)
  }

  const handleAiSend = () => {
    if (!aiInput.trim()) return
    const question = aiInput.trim()
    setAiInput("")
    setAiMessages((prev) => [
      ...prev,
      { role: "user", text: question },
      {
        role: "assistant",
        text: isPremium
          ? "Great question! In the real app I'd give you a full answer. Sign up to get started — your first 14 days are Premium free!"
          : "Free users get 5 queries per day. Sign up now to start using real AI homework help!",
      },
    ])
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background flex-col">
      {/* ── Top demo banner ── */}
      <div className={`shrink-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${isPremium ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <Play className="h-4 w-4 shrink-0" />
          <span className="font-medium">Demo Mode</span>
          <span className="opacity-80 hidden sm:inline">— no account needed. Explore freely!</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Free / Premium toggle */}
          <div className="flex items-center rounded-full bg-white/20 p-0.5 gap-0.5">
            <button
              onClick={() => setTierView("free")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${tierView === "free" ? "bg-white text-black shadow" : "text-white/80 hover:text-white"}`}
            >
              Free
            </button>
            <button
              onClick={() => setTierView("premium")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all flex items-center gap-1 ${tierView === "premium" ? "bg-white text-amber-600 shadow" : "text-white/80 hover:text-white"}`}
            >
              <Crown className="h-3 w-3" />Premium
            </button>
          </div>
          <Button asChild size="sm" variant="secondary" className="h-7 text-xs gap-1 shrink-0">
            <Link href="/auth/sign-up">
              Sign up free <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── App shell ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-16 hover:w-60 border-r bg-card/50 transition-all duration-300 group overflow-hidden shrink-0">
          <div className="p-4 border-b flex items-center gap-3 min-h-[64px]">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">D</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity min-w-0">
              <p className="text-sm font-semibold truncate">Demo User</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {isPremium ? <><Crown className="h-3 w-3 text-amber-500" />Premium</> : "Free Plan"}
              </p>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-1 pt-3">
            {([
              { id: "overview", Icon: LayoutDashboard, label: "Overview" },
              { id: "calendar", Icon: CalendarDays, label: "Calendar" },
              { id: "school", Icon: ClipboardList, label: "School" },
              { id: "homework", Icon: Brain, label: "Homework AI" },
            ] as const).map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => { setMode(id); setTourActive(false) }}
                className={`w-full flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors ${mode === id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{label}</span>
              </button>
            ))}
          </nav>
          <div className="p-2 border-t">
            <button className="w-full flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Settings</span>
            </button>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden shrink-0 border-b bg-card/50 px-2 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {([
              { id: "overview", Icon: LayoutDashboard, label: "Home" },
              { id: "calendar", Icon: CalendarDays, label: "Calendar" },
              { id: "school", Icon: ClipboardList, label: "School" },
              { id: "homework", Icon: Brain, label: "AI" },
            ] as const).map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => { setMode(id); setTourActive(false) }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${mode === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 pb-32">

          {/* ── OVERVIEW ── */}
          {mode === "overview" && (
            <div className="space-y-5 max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Good morning, Demo! 👋</h1>
                  <p className="text-muted-foreground text-sm mt-0.5">{fmt(TODAY)}</p>
                </div>
                {isPremium && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                    <Crown className="h-3.5 w-3.5" />Premium
                  </Badge>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Events this week", value: "8", icon: CalendarDays, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Assignments due", value: "3", icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-500/10" },
                  { label: "GPA (est.)", value: "3.6", icon: GraduationCap, color: "text-green-500", bg: "bg-green-500/10" },
                  { label: "AI queries left", value: isPremium ? "∞" : "5/day", icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <Card key={label} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                        <Icon className={`h-5 w-5 ${color}`} />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Upcoming events */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {DEMO_EVENTS.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/40 transition-colors">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{fmt(ev.date)} · {ev.start}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{ev.calendar}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Premium feature: Year view teaser */}
              {!isPremium && (
                <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Crown className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Switch to Premium view to see Year View, unlimited AI & more</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Toggle "Premium" in the bar above, or sign up for a free trial.</p>
                  </div>
                  <button
                    onClick={() => setTierView("premium")}
                    className="shrink-0 text-xs font-medium text-amber-600 hover:text-amber-700 underline"
                  >
                    Preview it
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── CALENDAR ── */}
          {mode === "calendar" && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-bold">Calendar</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex rounded-lg border overflow-hidden">
                    {["Day", "Week", "Month"].map((v) => (
                      <button key={v} className={`px-3 py-1.5 text-xs font-medium transition-colors ${v === "Week" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}>
                        {v}
                      </button>
                    ))}
                    <div className="relative">
                      <button className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${!isPremium ? "text-muted-foreground" : "hover:bg-muted/50"}`}>
                        {!isPremium && <Lock className="h-3 w-3" />}
                        Year
                      </button>
                    </div>
                  </div>
                  {isPremium && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs border-purple-500/30 text-purple-600 hover:bg-purple-500/10">
                      <Zap className="h-3.5 w-3.5" />AI Extract
                    </Button>
                  )}
                  <Button size="sm" className="gap-1.5 text-xs">
                    + New Event
                  </Button>
                </div>
              </div>

              {/* Week strip */}
              <WeekStrip events={DEMO_EVENTS} />

              {/* Calendars sidebar */}
              <Card className="p-4">
                <p className="text-sm font-semibold mb-3">My Calendars</p>
                <div className="space-y-2">
                  {DEMO_CALENDARS.map((cal) => (
                    <div key={cal.name} className="flex items-center gap-2.5">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
                      <span className="text-sm flex-1">{cal.name}</span>
                      <Badge variant="outline" className="text-xs">{cal.count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Year view lock if free */}
              {!isPremium && (
                <div className="relative rounded-2xl border bg-card overflow-hidden">
                  <div className="p-4 opacity-30 pointer-events-none select-none">
                    <p className="font-semibold mb-3">Year View – 2026</p>
                    <div className="grid grid-cols-4 gap-2">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                        <div key={m} className="rounded-lg border p-2 text-center">
                          <p className="text-xs font-medium">{m}</p>
                          <div className="mt-1 grid grid-cols-7 gap-0.5">
                            {Array.from({ length: 28 }).map((_, i) => (
                              <div key={i} className={`h-1.5 w-1.5 rounded-full ${Math.random() > 0.85 ? "bg-primary" : "bg-muted"}`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <PremiumOverlay onUpgrade={() => setTierView("premium")} />
                </div>
              )}

              {isPremium && (
                <Card className="p-4">
                  <p className="font-semibold mb-3 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />Year View – 2026
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, mi) => (
                      <div key={m} className={`rounded-lg border p-2 text-center ${mi === TODAY.getMonth() ? "border-primary/50 bg-primary/5" : ""}`}>
                        <p className="text-xs font-medium">{m}</p>
                        <div className="mt-1 grid grid-cols-7 gap-0.5">
                          {Array.from({ length: 28 }).map((_, i) => (
                            <div key={i} className={`h-1.5 w-1.5 rounded-full ${[2, 5, 9, 14, 19, 24].includes(i) ? "bg-primary" : "bg-muted"}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── SCHOOL ── */}
          {mode === "school" && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <h2 className="text-xl font-bold">School Tracker</h2>
              <Tabs defaultValue="assignments">
                <div className="overflow-x-auto pb-1">
                  <TabsList className="inline-flex w-max">
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                    <TabsTrigger value="grades">Grades</TabsTrigger>
                    <TabsTrigger value="gpa">GPA</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="assignments" className="mt-4 space-y-3">
                  {[
                    { title: "Essay – ENG 102", due: addDays(TODAY, 1), type: "assignment", done: false },
                    { title: "Problem Set 4 – MATH 201", due: addDays(TODAY, 3), type: "assignment", done: true },
                    { title: "Lab Report – PHYS 201", due: addDays(TODAY, 5), type: "assignment", done: false },
                    { title: "Midterm Exam – MATH 201", due: addDays(TODAY, 4), type: "exam", done: false },
                    { title: "Quiz 3 – CS 301", due: addDays(TODAY, 7), type: "quiz", done: false },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 ${item.done ? "opacity-50" : ""}`}>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${item.done ? "bg-green-500 border-green-500" : "border-muted-foreground/30"}`}>
                        {item.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.done ? "line-through" : ""}`}>{item.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />Due {fmt(item.due)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="grades" className="mt-4 space-y-3">
                  {DEMO_GRADES.map((g) => (
                    <div key={g.course} className="flex items-center gap-4 rounded-lg border p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{g.course}</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${g.pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg">{g.grade}</p>
                        <p className="text-xs text-muted-foreground">{g.pct}%</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${g.trend.startsWith("+") ? "text-green-600" : "text-red-500"}`}>
                        {g.trend}
                      </Badge>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="gpa" className="mt-4">
                  <Card className="p-6 text-center space-y-4">
                    <div>
                      <p className="text-muted-foreground text-sm">Cumulative GPA</p>
                      <p className="text-6xl font-bold text-primary mt-1">3.6</p>
                      <p className="text-sm text-muted-foreground mt-1">Based on 4 courses</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-left">
                      {DEMO_GRADES.map((g) => (
                        <div key={g.course} className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">{g.course}</p>
                          <p className="font-bold text-lg">{g.grade}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* ── HOMEWORK AI ── */}
          {mode === "homework" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  AI Homework Helper
                </h2>
                <Badge variant="outline" className="text-xs gap-1">
                  {isPremium ? (
                    <><Crown className="h-3 w-3 text-amber-500" />Unlimited</>
                  ) : (
                    <><Clock className="h-3 w-3" />5/day free</>
                  )}
                </Badge>
              </div>

              {/* Chat messages */}
              <Card className="p-4 space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </Card>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about your homework..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiSend()}
                  className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button onClick={handleAiSend} disabled={!aiInput.trim()} className="gap-1.5">
                  <Sparkles className="h-4 w-4" />Send
                </Button>
              </div>

              {!isPremium && (
                <p className="text-xs text-center text-muted-foreground">
                  Free: 5 questions/day ·{" "}
                  <button onClick={() => setTierView("premium")} className="text-amber-600 underline">Preview Premium (unlimited)</button>
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Tour tooltip ── */}
      {tourActive && (
        <TourTooltip
          step={TOUR_STEPS[tourStep]}
          stepIndex={tourStep}
          total={TOUR_STEPS.length}
          onNext={handleTourNext}
          onPrev={handleTourPrev}
          onDismiss={() => setTourActive(false)}
        />
      )}

      {/* ── Restart tour fab (when dismissed) ── */}
      {!tourActive && (
        <button
          onClick={() => { setTourStep(0); setTourActive(true) }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Play className="h-4 w-4" />
          Take the Tour
        </button>
      )}
    </div>
  )
}
