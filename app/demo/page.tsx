"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MonthView } from "@/components/calendar/month-view"
import { WeekView } from "@/components/calendar/week-view"
import { DayView } from "@/components/calendar/day-view"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard"
import { useCalendar } from "@/lib/hooks/use-calendar"
import type { Database } from "@/lib/types/database"
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
  Zap,
  CalendarDays,
  Play,
  ClipboardList,
  Plus,
  LogOut,
} from "lucide-react"

type DemoEvent = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string; name?: string }
}
type DemoCalendar = Database["public"]["Tables"]["calendars"]["Row"]

// ── Helpers ───────────────────────────────────────────────────────────────────
const d = (offsetDays: number, h: number, m = 0) => {
  const dt = new Date()
  dt.setDate(dt.getDate() + offsetDays)
  dt.setHours(h, m, 0, 0)
  return dt.toISOString()
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

// ── Typed mock data ────────────────────────────────────────────────────────────
const CAL_UNI: DemoCalendar  = { id: "cal-1", user_id: "demo", name: "University", color: "#6366f1", is_default: true,  provider: "local", provider_calendar_id: null, created_at: "", updated_at: "" }
const CAL_PER: DemoCalendar  = { id: "cal-2", user_id: "demo", name: "Personal",   color: "#10b981", is_default: false, provider: "local", provider_calendar_id: null, created_at: "", updated_at: "" }
const CAL_SCH: DemoCalendar  = { id: "cal-3", user_id: "demo", name: "School",     color: "#f59e0b", is_default: false, provider: "local", provider_calendar_id: null, created_at: "", updated_at: "" }
const DEMO_CALENDARS: DemoCalendar[] = [CAL_UNI, CAL_PER, CAL_SCH]

const mkEvent = (id: string, title: string, cal: DemoCalendar, startIso: string, endIso: string, allDay = false): DemoEvent => ({
  id,
  calendar_id: cal.id,
  user_id: "demo",
  title,
  description: null,
  start_time: startIso,
  end_time: endIso,
  all_day: allDay,
  location: null,
  reminder_minutes: null,
  provider: "local",
  provider_event_id: null,
  recurrence_rule: null,
  recurrence_end_date: null,
  recurrence_parent_id: null,
  created_at: "",
  updated_at: "",
  calendar: { color: cal.color, name: cal.name },
})

const DEMO_EVENTS: DemoEvent[] = [
  mkEvent("e1", "Calculus Lecture",          CAL_UNI, d(0,  9,  0), d(0, 10, 30)),
  mkEvent("e2", "Study Group – PHYS 201",    CAL_PER, d(0, 14,  0), d(0, 15, 30)),
  mkEvent("e3", "Assignment Due: Essay",     CAL_SCH, d(1, 23, 59), d(1, 23, 59), true),
  mkEvent("e4", "Office Hours – Prof. Smith",CAL_UNI, d(2, 11,  0), d(2, 12,  0)),
  mkEvent("e5", "Gym",                       CAL_PER, d(2, 17,  0), d(2, 18,  0)),
  mkEvent("e6", "Midterm Exam – MATH 201",   CAL_SCH, d(4,  9,  0), d(4, 11,  0)),
  mkEvent("e7", "Project Presentation",      CAL_UNI, d(6, 13,  0), d(6, 14, 30)),
  mkEvent("e8", "Library – Research Session",CAL_UNI, d(8, 15,  0), d(8, 17,  0)),
  mkEvent("e9", "Yoga",                      CAL_PER, d(-1,7,  0), d(-1, 8,  0)),
  mkEvent("e10","Lecture – CS 301",          CAL_UNI, d(1, 10,  0), d(1, 11, 30)),
]

const DEMO_GRADES = [
  { course: "MATH 201", grade: "A−", pct: 91, trend: "+3%" },
  { course: "PHYS 201", grade: "B+", pct: 88, trend: "+1%" },
  { course: "ENG 102",  grade: "A",  pct: 95, trend: "+5%" },
  { course: "CS 301",   grade: "B",  pct: 84, trend: "−2%" },
]

// ── Tour ──────────────────────────────────────────────────────────────────────
interface TourStep { id: string; title: string; description: string; targetMode: string; premium?: boolean }

const TOUR_STEPS: TourStep[] = [
  { id: "overview",  title: "Dashboard Overview",           description: "See upcoming events, your streak, workload balance, and quick stats — your semester command centre.", targetMode: "overview" },
  { id: "calendar",  title: "Real Calendar Views",          description: "Full Month, Week, and Day views — exactly what you get after signing up. Click dates, drag to create events.", targetMode: "calendar" },
  { id: "cal-prem",  title: "Year View + AI Extract (Premium)", description: "See the entire year at a glance. Paste a syllabus and AI auto-creates all your events instantly.", targetMode: "calendar", premium: true },
  { id: "school",    title: "School Tracker",               description: "Track assignments, quizzes, exams. See per-course grades and live GPA calculation.", targetMode: "school" },
  { id: "homework",  title: "AI Homework Helper",           description: "Ask anything about your coursework. Free: 5 queries/day. Premium: unlimited.", targetMode: "homework" },
  { id: "cta",       title: "Ready to get started?",        description: "14-day Premium trial, no credit card. Everything you just saw — plus real AI, real sync, real grades.", targetMode: "overview", premium: true },
]

// ── Premium lock overlay ───────────────────────────────────────────────────────
function PremiumOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm bg-background/80 border border-amber-500/20">
      <div className="text-center space-y-3 p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <Crown className="h-7 w-7 text-amber-500" />
        </div>
        <p className="font-semibold">Premium Feature</p>
        <p className="text-sm text-muted-foreground max-w-xs">Switch to Premium view above to preview this feature, or sign up for a free trial.</p>
        <Button onClick={onUpgrade} size="sm" className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
          <Crown className="h-4 w-4" />Preview Premium
        </Button>
      </div>
    </div>
  )
}

// ── Tour tooltip ───────────────────────────────────────────────────────────────
function TourTooltip({ step, stepIndex, total, onNext, onPrev, onDismiss }: {
  step: TourStep; stepIndex: number; total: number
  onNext: () => void; onPrev: () => void; onDismiss: () => void
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border bg-card shadow-2xl p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {step.premium && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs gap-1"><Crown className="h-3 w-3" />Premium</Badge>}
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <h3 className="font-bold text-base mb-1">{step.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && <Button variant="ghost" size="sm" onClick={onPrev} className="h-8 px-3"><ChevronLeft className="h-4 w-4" /></Button>}
          {stepIndex < total - 1
            ? <Button size="sm" onClick={onNext} className="h-8 px-4 gap-1">Next <ChevronRight className="h-4 w-4" /></Button>
            : <Button size="sm" asChild className="h-8 px-4 gap-1 bg-amber-500 hover:bg-amber-600 text-white"><Link href="/auth/sign-up">Start Free Trial <ArrowRight className="h-4 w-4" /></Link></Button>
          }
        </div>
      </div>
    </div>
  )
}

// ── Main Demo Page ─────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [tierView, setTierView]   = useState<"free" | "premium">("free")
  const [mode, setMode]           = useState<"overview" | "calendar" | "school" | "homework">("overview")
  const [tourStep, setTourStep]   = useState(0)
  const [tourActive, setTourActive] = useState(true)
  const [aiInput, setAiInput]     = useState("")
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hi! I'm your AI homework helper. Ask me anything about your coursework. (This is a demo — sign up for real AI answers!)" },
  ])

  const { currentDate, view, goToNext, goToPrev, goToToday, changeView } = useCalendar()
  const isPremium = tierView === "premium"

  // Restrict year view to premium
  const handleChangeView = (v: Parameters<typeof changeView>[0]) => {
    if (v === "year" && !isPremium) { setTierView("premium"); return }
    changeView(v)
  }

  // Sync tour → mode
  useEffect(() => {
    if (!tourActive) return
    const s = TOUR_STEPS[tourStep]
    if (s?.targetMode) setMode(s.targetMode as typeof mode)
  }, [tourStep, tourActive])

  const handleAiSend = () => {
    if (!aiInput.trim()) return
    const q = aiInput.trim()
    setAiInput("")
    setAiMessages(prev => [...prev,
      { role: "user", text: q },
      { role: "assistant", text: isPremium
        ? "Great question! In the real app I'd give you a detailed answer with step-by-step explanations. Sign up — your first 14 days are Premium free!"
        : "Sign up to get real AI answers! Free plan includes 5 queries/day." },
    ])
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background flex-col">

      {/* ── Demo banner ── */}
      <div className={`shrink-0 z-40 flex items-center justify-between gap-3 px-4 py-2 text-sm ${isPremium ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"}`}>
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 shrink-0" />
          <span className="font-medium">Demo Mode</span>
          <span className="opacity-80 hidden sm:inline">— explore the real product, no account needed</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-full bg-white/20 p-0.5 gap-0.5">
            <button onClick={() => setTierView("free")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${tierView === "free" ? "bg-white text-black shadow" : "text-white/80 hover:text-white"}`}>
              Free
            </button>
            <button onClick={() => setTierView("premium")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all flex items-center gap-1 ${tierView === "premium" ? "bg-white text-amber-600 shadow" : "text-white/80 hover:text-white"}`}>
              <Crown className="h-3 w-3" />Premium
            </button>
          </div>
          <Button asChild size="sm" variant="secondary" className="h-7 text-xs gap-1 shrink-0">
            <Link href="/auth/sign-up">Sign up free <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </div>
      </div>

      {/* ── App shell — identical layout to real dashboard ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-16 hover:w-64 border-r bg-gradient-to-b from-card/80 to-card/50 backdrop-blur-sm transition-all duration-300 group overflow-hidden shrink-0">
          <div className="p-4 border-b border-border/50 min-h-[72px] flex items-center">
            <div className="flex items-center gap-3 min-w-[224px]">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                <span className="text-base font-bold text-primary">D</span>
              </div>
              <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-sm font-semibold truncate">Demo User</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {isPremium ? <><Crown className="h-3 w-3 text-amber-500" />Premium</> : "Free Plan"}
                </p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {([
              { id: "overview",  Icon: LayoutDashboard, label: "Overview" },
              { id: "calendar",  Icon: CalendarDays,    label: "Calendar" },
              { id: "school",    Icon: ClipboardList,   label: "School" },
              { id: "homework",  Icon: Brain,           label: "Homework Help" },
            ] as const).map(({ id, Icon, label }) => (
              <Button key={id}
                variant={mode === id ? "secondary" : "ghost"}
                className={`w-full justify-start transition-all ${mode === id ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-muted/50"}`}
                onClick={() => { setMode(id); setTourActive(false) }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{label}</span>
              </Button>
            ))}
          </nav>
          <div className="p-3 border-t border-border/50 space-y-1">
            <Button variant="ghost" className="w-full justify-start hover:bg-muted/50 transition-all">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Settings</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all" asChild>
              <Link href="/auth/sign-up">
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Sign Up to Save</span>
              </Link>
            </Button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden shrink-0 w-full">
          <header className="border-b bg-card/50 backdrop-blur-sm px-2 py-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg shrink-0">
                {([
                  { id: "overview", Icon: LayoutDashboard, label: "Home" },
                  { id: "calendar", Icon: CalendarDays,    label: "Calendar" },
                  { id: "school",   Icon: ClipboardList,   label: "School" },
                  { id: "homework", Icon: Brain,           label: "AI" },
                ] as const).map(({ id, Icon, label }) => (
                  <Button key={id} variant={mode === id ? "secondary" : "ghost"} size="sm"
                    className="h-8 px-2.5 text-xs shrink-0"
                    onClick={() => { setMode(id); setTourActive(false) }}>
                    <Icon className="h-3.5 w-3.5 mr-1" />{label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href="/auth/sign-up"><ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </header>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── OVERVIEW — uses real OverviewDashboard component ── */}
          {mode === "overview" && (
            <div className="flex-1 overflow-auto">
              {!isPremium && (
                <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
                  <Crown className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-sm flex-1">
                    <span className="font-medium">Switch to Premium view</span>
                    <span className="text-muted-foreground ml-1">to see Year View, unlimited AI, and more.</span>
                  </p>
                  <button onClick={() => setTierView("premium")} className="text-xs text-amber-600 underline shrink-0">Preview</button>
                </div>
              )}
              <OverviewDashboard
                events={DEMO_EVENTS}
                calendars={DEMO_CALENDARS}
                onNewEvent={() => {}}
                onMassEvent={() => {}}
                onAIExtract={() => {}}
                onMarkAsDone={() => {}}
                onEventClick={() => {}}
                onViewCalendar={() => { setMode("calendar"); setTourActive(false) }}
              />
            </div>
          )}

          {/* ── CALENDAR — uses real CalendarHeader + Month/Week/Day/YearView ── */}
          {mode === "calendar" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Action bar */}
              <div className="hidden md:flex border-b bg-card/30 px-4 py-2 items-center gap-2">
                {isPremium && (
                  <Button variant="outline" size="sm"
                    className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50">
                    <Zap className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-purple-700 dark:text-purple-300">AI Extract</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => {}}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />Mark as Done
                </Button>
                <Button size="sm" onClick={() => {}}>
                  <Plus className="mr-2 h-4 w-4" />New Event
                </Button>
              </div>

              <CalendarHeader
                currentDate={currentDate}
                view={view}
                onNext={goToNext}
                onPrev={goToPrev}
                onToday={goToToday}
                onViewChange={handleChangeView}
              />

              {/* Calendar grid */}
              <div className="flex flex-1 overflow-hidden">
                {/* Calendar sidebar (read-only) */}
                <aside className="hidden md:block w-56 border-r overflow-y-auto p-3 space-y-4 shrink-0">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">My Calendars</p>
                    <div className="space-y-1.5">
                      {DEMO_CALENDARS.map((cal) => (
                        <div key={cal.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                          <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: cal.color }} />
                          <span className="text-sm flex-1 truncate">{cal.name}</span>
                        </div>
                      ))}
                      <button className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                        <Plus className="h-3.5 w-3.5" />Add calendar
                      </button>
                    </div>
                  </div>
                </aside>

                <div className="flex-1 overflow-hidden relative">
                  {view === "month" && <MonthView currentDate={currentDate} events={DEMO_EVENTS} onDateClick={() => {}} onEventClick={() => {}} />}
                  {view === "week"  && <WeekView  currentDate={currentDate} events={DEMO_EVENTS} onTimeSlotClick={() => {}} onEventClick={() => {}} />}
                  {view === "day"   && <DayView   currentDate={currentDate} events={DEMO_EVENTS} onTimeSlotClick={() => {}} onEventClick={() => {}} />}
                  {view === "year"  && !isPremium && (
                    <div className="relative h-full">
                      <div className="opacity-20 pointer-events-none p-4 grid grid-cols-4 gap-3">
                        {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => (
                          <div key={m} className="rounded-lg border p-2 text-center">
                            <p className="text-xs font-medium mb-1">{m}</p>
                            <div className="grid grid-cols-7 gap-0.5">
                              {Array.from({ length: 28 }).map((_, i) => (
                                <div key={i} className={`h-1.5 w-1.5 rounded-full ${[3,8,15,22].includes(i) ? "bg-primary" : "bg-muted"}`} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <PremiumOverlay onUpgrade={() => setTierView("premium")} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SCHOOL ── */}
          {mode === "school" && (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                <h2 className="text-xl font-bold">School Tracker</h2>
                <Tabs defaultValue="assignments">
                  <div className="overflow-x-auto pb-1">
                    <TabsList className="inline-flex w-max">
                      <TabsTrigger value="assignments">Assignments</TabsTrigger>
                      <TabsTrigger value="grades">Grades</TabsTrigger>
                      <TabsTrigger value="gpa">GPA</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="assignments" className="mt-4 space-y-2">
                    {[
                      { title: "Essay – ENG 102",          due: d(1,23,59), type: "assignment", done: false },
                      { title: "Problem Set 4 – MATH 201", due: d(3,23,59), type: "assignment", done: true  },
                      { title: "Lab Report – PHYS 201",    due: d(5,23,59), type: "assignment", done: false },
                      { title: "Midterm Exam – MATH 201",  due: d(4, 9, 0), type: "exam",       done: false },
                      { title: "Quiz 3 – CS 301",          due: d(7,10, 0), type: "quiz",       done: false },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 ${item.done ? "opacity-50" : ""}`}>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${item.done ? "bg-green-500 border-green-500" : "border-muted-foreground/30"}`}>
                          {item.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.done ? "line-through" : ""}`}>{item.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Due {fmt(item.due)}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="grades" className="mt-4 space-y-2">
                    {DEMO_GRADES.map((g) => (
                      <div key={g.course} className="flex items-center gap-4 rounded-lg border p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{g.course}</p>
                          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${g.pct}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-lg">{g.grade}</p>
                          <p className="text-xs text-muted-foreground">{g.pct}%</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${g.trend.startsWith("+") ? "text-green-600" : "text-red-500"}`}>{g.trend}</Badge>
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
            </div>
          )}

          {/* ── HOMEWORK AI ── */}
          {mode === "homework" && (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />AI Homework Helper
                  </h2>
                  <Badge variant="outline" className="text-xs gap-1">
                    {isPremium ? <><Crown className="h-3 w-3 text-amber-500" />Unlimited</> : <><Clock className="h-3 w-3" />5/day free</>}
                  </Badge>
                </div>
                <Card className="p-4 space-y-3 min-h-[300px] max-h-[420px] overflow-y-auto">
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </Card>
                <div className="flex gap-2">
                  <input type="text" placeholder="Ask a question about your homework..."
                    value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAiSend()}
                    className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button onClick={handleAiSend} disabled={!aiInput.trim()} className="gap-1.5">
                    <Sparkles className="h-4 w-4" />Send
                  </Button>
                </div>
                {!isPremium && (
                  <p className="text-xs text-center text-muted-foreground">
                    Free: 5 questions/day · <button onClick={() => setTierView("premium")} className="text-amber-600 underline">Preview Premium (unlimited)</button>
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Tour tooltip ── */}
      {tourActive && (
        <TourTooltip step={TOUR_STEPS[tourStep]} stepIndex={tourStep} total={TOUR_STEPS.length}
          onNext={() => setTourStep(s => Math.min(s + 1, TOUR_STEPS.length - 1))}
          onPrev={() => setTourStep(s => Math.max(s - 1, 0))}
          onDismiss={() => setTourActive(false)}
        />
      )}

      {/* ── Restart tour FAB ── */}
      {!tourActive && (
        <button onClick={() => { setTourStep(0); setTourActive(true) }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
          <Play className="h-4 w-4" />Take the Tour
        </button>
      )}
    </div>
  )
}
