"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCalendar } from "@/lib/hooks/use-calendar"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { MonthView } from "@/components/calendar/month-view"
import { WeekView } from "@/components/calendar/week-view"
import { DayView } from "@/components/calendar/day-view"
import { YearView } from "@/components/calendar/year-view"
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar"
import { SearchFilter } from "@/components/calendar/search-filter"
import { EventDialog } from "@/components/events/event-dialog"
import { EventDetailsDialog } from "@/components/events/event-details-dialog"
import { CalendarDialog } from "@/components/events/calendar-dialog"
import { MassEventDialog } from "@/components/events/mass-event-dialog"
import { MarkAsDoneDialog } from "@/components/events/mark-as-done-dialog"
import { AIEventExtractor } from "@/components/events/ai-event-extractor"
import { HomeworkWorkspace } from "@/components/homework/homework-workspace"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { SubscriptionSettings } from "@/components/settings/subscription-settings"
import { SupportChat } from "@/components/support/support-chat"
import { TrialClaimBanner } from "@/components/trial/trial-claim-banner"
import { OnboardingGuide } from "@/components/onboarding/onboarding-guide"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { SaleBanner } from "@/components/sale-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  LogOut,
  Plus,
  Settings,
  Sparkles,
  SlidersHorizontal,
  X,
  Shield,
  CheckCircle2,
  Brain,
  LayoutDashboard,
  CalendarIcon,
  Sun,
  Moon,
  User,
  Briefcase,
  GraduationCap,
  Code,
  Coffee,
  Music,
  Palette,
  Crown,
  CalendarDays,
  Bell,
  Link2,
  MessageCircle,
  Info,
  BookOpen,
  ClipboardList,
  Trophy,
  Layout,
  Trash2,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import { detectTimezone } from "@/lib/utils/timezone"
import { useAutoSync } from "@/lib/hooks/use-auto-sync"
import { useAppSettings } from "@/lib/hooks/use-app-settings"
import { ensureSchoolCalendars } from "@/lib/school/ensure-school-calendars"
import { AvatarChooser } from "@/components/settings/avatar-chooser"
import { GoogleCalendarConnect } from "@/components/integrations/google-calendar-connect"
import { DiscordConnect } from "@/components/integrations/discord-connect"
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard"
import { HomeworkChat } from "@/components/homework/homework-chat" // Import HomeworkChat
import { UniversityIntegration } from "@/components/university/university-integration" // Import UniversityIntegration
import { SchoolDashboard } from "@/components/school/school-dashboard"
import { SchoolCalendarPanel } from "@/components/school/school-calendar-panel"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { StudyPlanner } from "@/components/study/study-planner"
import { GamificationPanel } from "@/components/gamification/gamification-panel"
import { CalendarTemplates } from "@/components/templates/calendar-templates"
import { AIAssistantPanel } from "@/components/ai/ai-assistant-panel"

type EventType = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string; name?: string }
}
type CalendarType = Database["public"]["Tables"]["calendars"]["Row"]
type ViewType = "day" | "week" | "month" | "year"

type CalendarRow = CalendarType & { is_visible?: boolean }
type EventRow = Database["public"]["Tables"]["events"]["Row"]

export default function DashboardPage() {
  const { currentDate, view, dateRange, goToNext, goToPrev, goToToday, changeView: originalChangeView, setCurrentDate } = useCalendar()
  const { settings } = useAppSettings()
  const isLmsEnabled = settings?.feature_lms !== false
  const searchParams = useSearchParams()
  const router = useRouter()
  const { syncNow } = useAutoSync(30)
  const [isAdmin, setIsAdmin] = useState(false)

  const [allEvents, setAllEvents] = useState<EventType[]>([])
  const [calendars, setCalendars] = useState<CalendarType[]>([])

  // Handle eventId deep-link from Discord
  useEffect(() => {
    const eventId = searchParams.get('eventId')
    if (eventId && allEvents.length > 0) {
      const event = allEvents.find(e => e.id === eventId)
      if (event) {
        setSelectedEvent(event)
        setDetailsDialogOpen(true)
        // Clear the query param
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('eventId')
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
  }, [searchParams, allEvents])

  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null)
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null)
  const [defaultEventDate, setDefaultEventDate] = useState<Date | undefined>()
  const [defaultEventHour, setDefaultEventHour] = useState<number | undefined>()
  const [searchQuery, setSearchQuery] = useState("")
  const [calendarFilter, setCalendarFilter] = useState("all")
  const [massEventDialogOpen, setMassEventDialogOpen] = useState(false)
  const [markAsDoneDialogOpen, setMarkAsDoneDialogOpen] = useState(false)
  const [aiExtractorOpen, setAiExtractorOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userUniversity, setUserUniversity] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("inactive")
  const [trialEligible, setTrialEligible] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [dashboardMode, setDashboardMode] = useState<"overview" | "calendar" | "school" | "homework" | "university" | "settings" | "study" | "achievements" | "templates" | "ai">("overview")
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [defaultView, setDefaultView] = useState("month")
  const [weekStartsOn, setWeekStartsOn] = useState("sunday")
  const [timeFormat, setTimeFormat] = useState("12")

  useEffect(() => {
    if (!isLmsEnabled && dashboardMode === "university") {
      setDashboardMode("overview")
    }
  }, [isLmsEnabled, dashboardMode])
  // Wrapper for changeView with paywall check
  const changeView = (newView: ViewType) => {
    // Check if user is trying to access year view without premium
    if (newView === "year" && subscriptionTier === "free") {
      toast("Year view is a Premium feature", {
        description: "Upgrade to Premium to access Year view and more features.",
        action: {
          label: "View Plans",
          onClick: () => setDashboardMode("settings")
        }
      })
      return
    }
    originalChangeView(newView)
  }

  const isLoadingRef = useRef(false)
  const lastLoadTime = useRef(0)
  const focusDebounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const MIN_LOAD_INTERVAL = 30000

  useEffect(() => {
    detectTimezone()
    checkGoogleConnection()
    
    // Clean up auth tokens from URL hash (from magic link redirects)
    if (window.location.hash) {
      const hash = window.location.hash
      if (hash.includes('access_token') || hash.includes('refresh_token')) {
        // Remove the hash from URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [])

  useEffect(() => {
    const loadUserAndSelection = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)

        // Load saved selection for this specific user
        const savedSelection = userId ? localStorage.getItem(`selectedCalendarIds:${userId}`) : null
        if (savedSelection) {
          try {
            const parsed = JSON.parse(savedSelection)
            if (Array.isArray(parsed)) {
              setSelectedCalendarIds(parsed)
            }
          } catch (error) {
            // Invalid saved selection
          }
        }
      }
    }

    loadUserAndSelection()
  }, [])

  useEffect(() => {
    if (selectedCalendarIds.length > 0 && userId) {
      localStorage.setItem(`selectedCalendarIds:${userId}`, JSON.stringify(selectedCalendarIds))
    }
  }, [selectedCalendarIds, userId])

  const loadCalendarsAndEvents = useCallback(
    async (force = false) => {
      if (isLoadingRef.current) {
        return
      }

      const now = Date.now()
      if (!force && now - lastLoadTime.current < MIN_LOAD_INTERVAL) {
        return
      }

      isLoadingRef.current = true
      lastLoadTime.current = now

      const supabase = createClient()
      setIsLoading(true)

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        try {
          await ensureSchoolCalendars(user.id)
        } catch {
          // Non-blocking
        }

        const { data: calendarsData, error: calendarsError } = await supabase
          .from("calendars")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })

        if (calendarsError) {
          throw calendarsError
        }

        // Show all calendars in sidebar, but only auto-select visible ones
        const allCalendars = (calendarsData || []) as CalendarRow[]
        const visibleCalendars = allCalendars.filter((cal: CalendarRow) => cal.is_visible !== false)
        setCalendars(allCalendars)

        let calendarIdsToUse = selectedCalendarIds

        if (selectedCalendarIds.length === 0 && visibleCalendars.length > 0) {
          // Check localStorage first for user preference
          const savedSelection = userId ? localStorage.getItem(`selectedCalendarIds:${userId}`) : null
          if (!savedSelection) {
            // Default: select all visible calendars (excluding hidden ones like "Completed")
            const allIds = visibleCalendars.map((c: CalendarRow) => c.id)
            setSelectedCalendarIds(allIds)
            calendarIdsToUse = allIds
          } else {
            try {
              const parsed = JSON.parse(savedSelection)
              if (Array.isArray(parsed)) {
                // Filter to only include calendars that still exist and are visible
                const validIds = parsed.filter((id: string) => visibleCalendars.some((cal: CalendarRow) => cal.id === id))
                setSelectedCalendarIds(validIds)
                calendarIdsToUse = validIds
              }
            } catch {
              const allIds = visibleCalendars.map((c: CalendarRow) => c.id)
              setSelectedCalendarIds(allIds)
              calendarIdsToUse = allIds
            }
          }
        } else if (visibleCalendars.length > 0) {
          const validIds = selectedCalendarIds.filter((id: string) => visibleCalendars.some((cal: CalendarRow) => cal.id === id))
          if (validIds.length !== selectedCalendarIds.length) {
            setSelectedCalendarIds(validIds)
            calendarIdsToUse = validIds
          }
        }

        // Use visible calendars for loading events when forcing reload
        const idsForQuery = force ? visibleCalendars.map((c: CalendarRow) => c.id) : calendarIdsToUse

        if (idsForQuery.length > 0) {
          const query = supabase.from("events").select("*").in("calendar_id", idsForQuery).order("start_time")

          if (dashboardMode === "calendar") {
            query.gte("start_time", dateRange.start.toISOString()).lte("start_time", dateRange.end.toISOString())
          } else {
            const overviewStart = new Date()
            overviewStart.setMonth(overviewStart.getMonth() - 1)
            const overviewEnd = new Date()
            overviewEnd.setMonth(overviewEnd.getMonth() + 3)
            query.gte("start_time", overviewStart.toISOString()).lte("start_time", overviewEnd.toISOString())
          }

          const { data: eventsData, error: eventsError } = await query

          if (eventsError) throw eventsError

          const eventsWithCalendar = ((eventsData || []) as EventRow[]).map((event: EventRow) => ({
            ...event,
            calendar: allCalendars.find((c: CalendarRow) => c.id === event.calendar_id),
          }))

          setAllEvents(eventsWithCalendar)
        } else {
          setAllEvents([])
        }
      } catch (error) {
        // Silently handle calendar loading errors
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [router, dateRange, selectedCalendarIds, dashboardMode, userId],
  )

  useEffect(() => {
    loadCalendarsAndEvents(true)
    loadUserEmail()
  }, [dateRange, dashboardMode])

  // ── Notification system for upcoming events ────────────────────────────────
  const notifiedEventsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date()
      const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000)

      allEvents.forEach((event) => {
        const eventStart = new Date(event.start_time)
        const eventId = event.id

        // Only notify once per event, within 15-min window
        if (
          eventStart > now &&
          eventStart <= fifteenMinLater &&
          !notifiedEventsRef.current.has(eventId)
        ) {
          notifiedEventsRef.current.add(eventId)
          const timeStr = eventStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          toast.info(`📅 Upcoming: ${event.title} at ${timeStr}`, {
            description: event.description || "Your event starts in 15 minutes",
          })
        }
      })
    }

    const interval = setInterval(checkUpcomingEvents, 60000) // Check every minute
    checkUpcomingEvents() // Check immediately on load
    return () => clearInterval(interval)
  }, [allEvents])

  useEffect(() => {
    const handleFocus = () => {
      if (focusDebounceTimeout.current) {
        clearTimeout(focusDebounceTimeout.current)
      }

      focusDebounceTimeout.current = setTimeout(() => {
        loadCalendarsAndEvents(false)
      }, 5000)
    }

    window.addEventListener("focus", handleFocus)
    return () => {
      window.removeEventListener("focus", handleFocus)
      if (focusDebounceTimeout.current) {
        clearTimeout(focusDebounceTimeout.current)
      }
    }
  }, [loadCalendarsAndEvents])

  const filteredEvents = useMemo(() => {
    if (!allEvents || !Array.isArray(allEvents)) {
      return []
    }

    let filtered = allEvents

    if (selectedCalendarIds.length > 0) {
      filtered = filtered.filter((e) => selectedCalendarIds.includes(e.calendar_id))
    }

    if (calendarFilter !== "all") {
      filtered = filtered.filter((e) => e.calendar_id === calendarFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.location?.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [allEvents, selectedCalendarIds, calendarFilter, searchQuery])

  const loadUserEmail = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      setUserEmail(user.email || null)
      
      // Check if user is admin
      if (user.email === "mohammedcacouni@gmail.com") {
        setIsAdmin(true)
      }
      
      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
      setUserName(fullName)
      
      // Get avatar from user metadata (set during Google OAuth callback)
      let avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
      setUserAvatar(avatarUrl || null)
      
      // Fetch user's university, avatar, and subscription tier from profiles table
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("university, avatar_url, subscription_tier, subscription_status, trial_used, onboarding_completed, default_view, week_starts_on, time_format")
          .eq("id", user.id)
          .single()

        if (profile?.university) {
          setUserUniversity(profile.university)
        }
        if (profile?.avatar_url) {
          setUserAvatar(profile.avatar_url)
        }
        if (profile?.subscription_tier) {
          setSubscriptionTier(profile.subscription_tier)
        }
        if (profile?.subscription_status) {
          setSubscriptionStatus(profile.subscription_status)
        }
        if (profile?.default_view) {
          setDefaultView(profile.default_view)
        }
        if (profile?.week_starts_on) {
          setWeekStartsOn(profile.week_starts_on)
        }
        if (profile?.time_format) {
          setTimeFormat(profile.time_format)
        }
        // Show onboarding if not completed
        if (profile && !profile.onboarding_completed) {
          setOnboardingCompleted(false)
          setShowOnboarding(true)
        } else {
          setOnboardingCompleted(true)
        }
        // User is eligible for trial if they haven't used it and aren't currently premium
        if (profile && !profile.trial_used && profile.subscription_tier !== "premium") {
          setTrialEligible(true)
        }
      } catch (error) {
        // Silently continue if profile fetch fails
      }
    }
  }

  const handleCompleteOnboarding = async () => {
    const supabase = createClient()
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId)
      setShowOnboarding(false)
      setOnboardingCompleted(true)
    } catch (error) {
      console.error("Failed to mark onboarding as complete:", error)
      setShowOnboarding(false)
    }
  }

  const handlePreferenceChange = async (field: string, value: string) => {
    const supabase = createClient()
    try {
      await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", userId)
      
      toast.success("Preference saved")
    } catch (error) {
      console.error("Failed to save preference:", error)
      toast.error("Failed to save preference")
    }
  }

  const handleCalendarToggle = async (calendarId: string) => {
    const isCurrentlySelected = selectedCalendarIds.includes(calendarId)
    const newVisibility = !isCurrentlySelected

    // Check if user is trying to enable more than 5 calendars without premium
    if (!isCurrentlySelected && selectedCalendarIds.length >= 5 && subscriptionTier === "free") {
      toast("Calendar limit reached", {
        description: "Free users can sync up to 5 calendars. Upgrade to Premium for unlimited calendars.",
        action: {
          label: "View Plans",
          onClick: () => setDashboardMode("settings")
        }
      })
      return
    }

    // Optimistically update selected IDs immediately for instant UI feedback
    const newSelectedIds = isCurrentlySelected
      ? selectedCalendarIds.filter((id) => id !== calendarId)
      : [...selectedCalendarIds, calendarId]
    
    setSelectedCalendarIds(newSelectedIds)

    // Update database first
    try {
      const supabase = createClient()
      const { error } = await supabase.from("calendars").update({ is_visible: newVisibility }).eq("id", calendarId)

      if (error) {
        // Revert on error
        setSelectedCalendarIds(selectedCalendarIds)
        toast.error("Failed to update calendar visibility")
        return
      }

      // Reload calendars and events to reflect changes
      await loadCalendarsAndEvents(true)
    } catch (error) {
      // Revert on error
      setSelectedCalendarIds(selectedCalendarIds)
      toast.error("Failed to update calendar visibility")
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()

    // Clear user-specific calendar selections
    if (userId) {
      localStorage.removeItem(`selectedCalendarIds:${userId}`)
    }

    await supabase.auth.signOut()
    router.push("/")
  }

  const handleDateClick = (date: Date) => {
    // When clicking a day in month view, switch to week view to see all events for that week
    if (view === "month") {
      setCurrentDate(date)
      changeView("week")
    } else {
      // In other views, allow creating a new event
      setDefaultEventDate(date)
      setDefaultEventHour(9)
      setEditingEvent(null)
      setEventDialogOpen(true)
    }
  }

  const handleMonthClick = (date: Date) => {
    // When clicking a month in year view, switch to month view
    setCurrentDate(date)
    changeView("month")
  }

  const handleTimeSlotClick = (dateOrHour: Date | number, hour?: number) => {
    if (typeof dateOrHour === "number") {
      setDefaultEventDate(currentDate)
      setDefaultEventHour(dateOrHour)
    } else {
      setDefaultEventDate(dateOrHour)
      setDefaultEventHour(hour ?? 9)
    }
    setEditingEvent(null)
    setEventDialogOpen(true)
  }

  const handleEventClick = (event: EventType) => {
    setSelectedEvent(event)
    setDetailsDialogOpen(true)
  }

  const handleEditEvent = (event: EventType) => {
    setDetailsDialogOpen(false)
    setEditingEvent(event)
    setDefaultEventDate(undefined)
    setDefaultEventHour(undefined)
    setEventDialogOpen(true)
  }

  const handleNewEvent = () => {
    setDefaultEventDate(currentDate)
    setDefaultEventHour(9)
    setEditingEvent(null)
    setEventDialogOpen(true)
  }

  const handleEventSaved = async () => {
    await loadCalendarsAndEvents(true)
  }

  const handleEventDrop = async (event: EventType, newDate: Date) => {
    try {
      const supabase = createClient()
      const oldStart = new Date(event.start_time)
      const oldEnd = new Date(event.end_time)
      
      // Calculate duration
      const duration = oldEnd.getTime() - oldStart.getTime()
      
      // Set new start/end times preserving duration
      const newStart = new Date(newDate)
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), oldStart.getSeconds())
      const newEnd = new Date(newStart.getTime() + duration)

      // Update in database
      const { error } = await supabase
        .from("events")
        .update({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        })
        .eq("id", event.id)

      if (error) throw error

      // Sync to Google Calendar if connected
      try {
        await fetch("/api/google/events/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id }),
        })
      } catch (err) {
        console.error("Failed to sync to Google:", err)
      }

      toast.success(`${event.title} rescheduled to ${newDate.toLocaleDateString()}`)
      await loadCalendarsAndEvents(true)
    } catch (error) {
      console.error("Error rescheduling event:", error)
      toast.error("Failed to reschedule event")
    }
  }

  const checkGoogleConnection = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("oauth_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .eq("is_active", true)

      if (!error && data && data.length > 0) {
        setIsGoogleConnected(true)
      }
    } catch (error) {
      // Silently handle connection check errors
    }
  }

  const renderSettingsView = () => {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your calendar integrations and preferences</p>
        </div>

        <div className="space-y-8">
          {/* Subscription */}
          <section>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Subscription
            </h2>
            <SubscriptionSettings />
          </section>

          {/* Profile */}
          <section>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <AvatarChooser
                  userId={userId!}
                  currentAvatar={userAvatar}
                  onAvatarChange={(url) => setUserAvatar(url)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input id="display-name" placeholder="Your name" defaultValue={userName || ""} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" disabled defaultValue={userEmail || ""} className="mt-1.5 bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Appearance */}
          <section>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </h2>
            <ThemeSelector />
          </section>

          {/* Calendar Preferences */}
          <section>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendar Preferences
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Default View</p>
                    <p className="text-sm text-muted-foreground">Choose your preferred calendar view</p>
                  </div>
                  <select 
                    value={defaultView}
                    onChange={(e) => {
                      setDefaultView(e.target.value)
                      handlePreferenceChange("default_view", e.target.value)
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Week Starts On</p>
                    <p className="text-sm text-muted-foreground">First day of the week</p>
                  </div>
                  <select 
                    value={weekStartsOn}
                    onChange={(e) => {
                      setWeekStartsOn(e.target.value)
                      handlePreferenceChange("week_starts_on", e.target.value)
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Time Format</p>
                    <p className="text-sm text-muted-foreground">12-hour or 24-hour clock</p>
                  </div>
                  <select 
                    value={timeFormat}
                    onChange={(e) => {
                      setTimeFormat(e.target.value)
                      handlePreferenceChange("time_format", e.target.value)
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="12">12-hour</option>
                    <option value="24">24-hour</option>
                  </select>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-destructive">Delete All Events</p>
                      <p className="text-sm text-muted-foreground">Remove all calendars and events, then recreate default calendars</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={async () => {
                        if (!confirm("Are you sure you want to delete ALL events and calendars? This action cannot be undone.")) {
                          return
                        }
                        try {
                          const response = await fetch("/api/calendars/delete-all", { method: "POST" })
                          const data = await response.json()
                          if (data.success) {
                            toast.success("All events deleted and calendars recreated")
                            window.location.reload()
                          } else {
                            toast.error(data.error || "Failed to delete events")
                          }
                        } catch (error) {
                          console.error("Delete error:", error)
                          toast.error("Failed to delete events")
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Notifications */}
          <section>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Reminders</p>
                    <p className="text-sm text-muted-foreground">Get email notifications for upcoming events</p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-transparent">Enable</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Assignment Deadlines</p>
                    <p className="text-sm text-muted-foreground">Reminders before assignment due dates</p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-transparent">Enable</Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Integrations */}
          <section>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Integrations
            </h2>
            <div className="space-y-4">
              <GoogleCalendarConnect isConnected={isGoogleConnected} onConnectionChange={checkGoogleConnection} />
              {userId && <DiscordConnect userId={userId} />}
            </div>
          </section>

          {/* Support */}
          <section>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Support
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Need Help?</p>
                    <p className="text-sm text-muted-foreground">Chat with our support team anytime</p>
                  </div>
                  <Button onClick={() => {
                    const chatButton = document.querySelector('[data-support-chat]') as HTMLButtonElement
                    if (chatButton) chatButton.click()
                  }}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Open Chat
                  </Button>
                </div>
                <div className="border-t pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Getting Started?</p>
                    <p className="text-sm text-muted-foreground">Replay the onboarding guide</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowOnboarding(true)} className="bg-transparent">
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* About */}
          <section>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <Info className="h-5 w-5" />
              About
            </h2>
            <Card>
              <CardHeader>
                <CardTitle>CalendarAI</CardTitle>
                <CardDescription>
                  A modern calendar application with powerful integrations and intelligent features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Version:</strong> 1.0.0</p>
                  <ul className="ml-4 list-disc space-y-1 mt-2">
                    <li>Multiple calendar views (day, week, month, year)</li>
                    <li>Google Calendar integration with bidirectional sync</li>
                    <li>AI-powered homework assistance</li>
                    <li>Dark mode and theme customization</li>
                    <li>Secure authentication with Supabase</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    )
  }

  const renderCalendarView = () => {
    switch (view) {
      case "month":
        return <MonthView currentDate={currentDate} events={filteredEvents} onDateClick={handleDateClick} onEventClick={handleEventClick} onEventDrop={handleEventDrop} />
      case "week":
        return <WeekView currentDate={currentDate} events={filteredEvents} onTimeSlotClick={(date, hour) => handleTimeSlotClick(date, hour)} onEventClick={handleEventClick} onEventDrop={handleEventDrop} />
      case "day":
        return <DayView currentDate={currentDate} events={filteredEvents} onTimeSlotClick={handleTimeSlotClick} onEventClick={handleEventClick} />
      case "year":
        return <YearView currentDate={currentDate} events={filteredEvents} onDateClick={handleDateClick} onEventClick={handleEventClick} onMonthClick={handleMonthClick} />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-16 hover:w-64 border-r bg-gradient-to-b from-card/80 to-card/50 backdrop-blur-sm transition-all duration-300 group overflow-hidden">
        {/* User Section */}
        <div className="p-4 border-b border-border/50 min-h-[72px] flex items-center">
          <div className="flex items-center gap-3 min-w-[224px]">
            {userAvatar ? (
              <img src={userAvatar || "/placeholder.svg"} alt="Avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20 ring-offset-2 ring-offset-background" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                <User className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-sm font-semibold truncate">{userName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {isAdmin ? "Admin" : subscriptionTier === "premium" ? "Premium User" : userUniversity || "Welcome back"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <Button
            variant={dashboardMode === "overview" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "overview" ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("overview")}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Overview</span>
          </Button>
          <Button
            variant={dashboardMode === "calendar" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "calendar" ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("calendar")}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Calendar</span>
          </Button>
          <Button
            variant={dashboardMode === "school" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "school" ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("school")}
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">School</span>
          </Button>
          {isAdmin && (
            <Button variant="ghost" className="w-full justify-start hover:bg-amber-500/10 hover:text-amber-500" asChild>
              <Link href="/admin">
                <Shield className="h-4 w-4 shrink-0" />
                <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Admin</span>
              </Link>
            </Button>
          )}
          <Button
            variant={dashboardMode === "homework" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "homework" ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("homework")}
          >
            <Brain className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Homework Help</span>
          </Button>
          {isLmsEnabled && (
            <Button
              variant={dashboardMode === "university" ? "secondary" : "ghost"}
              className={`w-full justify-start transition-all ${dashboardMode === "university" ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15" : "hover:bg-muted/50"}`}
              onClick={() => setDashboardMode("university")}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">University</span>
            </Button>
          )}
          <Button
            variant={dashboardMode === "study" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "study" ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("study")}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Study Planner</span>
          </Button>
          <Button
            variant={dashboardMode === "achievements" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "achievements" ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("achievements")}
          >
            <Trophy className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Achievements</span>
          </Button>
          <Button
            variant={dashboardMode === "ai" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "ai" ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 hover:from-purple-500/15 hover:to-pink-500/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("ai")}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">AI Assistant</span>
          </Button>
          <Button
            variant={dashboardMode === "templates" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "templates" ? "bg-pink-500/10 text-pink-400 hover:bg-pink-500/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("templates")}
          >
            <Layout className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Templates</span>
          </Button>
          <Button
            variant={dashboardMode === "settings" ? "secondary" : "ghost"}
            className={`w-full justify-start transition-all ${dashboardMode === "settings" ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-muted/50"}`}
            onClick={() => setDashboardMode("settings")}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Settings</span>
          </Button>
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-border/50 space-y-1">
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b bg-card/50 backdrop-blur-sm px-2 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Primary nav — scrollable pill row */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg shrink-0">
              {([
                { mode: "overview" as const, Icon: LayoutDashboard, label: "Home" },
                { mode: "calendar" as const, Icon: CalendarIcon, label: "Calendar" },
                { mode: "school" as const, Icon: ClipboardList, label: "School" },
                { mode: "homework" as const, Icon: Brain, label: "AI" },
                ...(isLmsEnabled ? [{ mode: "university" as const, Icon: GraduationCap, label: "Uni" }] : []),
              ] as { mode: typeof dashboardMode; Icon: React.ElementType; label: string }[]).map(({ mode, Icon, label }) => (
                <Button
                  key={mode}
                  variant={dashboardMode === mode ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-2.5 text-xs shrink-0"
                  onClick={() => setDashboardMode(mode)}
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href="/admin"><Shield className="h-4 w-4" /></Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDashboardMode("settings")}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {dashboardMode === "calendar" && (
          <>
            {/* Calendar Actions Bar - Hidden on mobile */}
            <div className="hidden md:flex border-b bg-card/30 px-4 py-2 items-center gap-2 overflow-x-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiExtractorOpen(true)}
                className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50"
              >
                <Brain className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-purple-700 dark:text-purple-300">AI Extract</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMarkAsDoneDialogOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as Done
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMassEventDialogOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Mass Event
              </Button>
              <Button onClick={handleNewEvent} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
            </div>

            <CalendarHeader
              currentDate={currentDate}
              view={view}
              onNext={goToNext}
              onPrev={goToPrev}
              onToday={goToToday}
              onViewChange={changeView}
            />

            <div className="hidden md:block">
              <SearchFilter
                searchQuery={searchQuery}
                selectedCalendarFilter={calendarFilter}
                calendars={calendars}
                onSearchChange={setSearchQuery}
                onCalendarFilterChange={setCalendarFilter}
              />
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="hidden lg:block">
                <CalendarSidebar
                  calendars={calendars}
                  selectedCalendarIds={selectedCalendarIds}
                  onCalendarToggle={handleCalendarToggle}
                  onNewCalendar={() => setCalendarDialogOpen(true)}
                  onCalendarsChanged={() => loadCalendarsAndEvents(true)}
                />
              </div>
              <div className="flex-1 overflow-auto relative">{renderCalendarView()}</div>
              <div className="hidden xl:block">
                <SchoolCalendarPanel userId={userId} />
              </div>
            </div>
          </>
        )}

        {dashboardMode === "school" && (
          <div className="flex-1 overflow-auto">
            <SchoolDashboard />
          </div>
        )}

        {dashboardMode === "overview" && (
          <div className="flex-1 overflow-auto">
            {/* Banners */}
            <div className="p-3 md:p-6 pb-0 space-y-3">
              <AnnouncementBanner />
              <SaleBanner />
              {trialEligible && subscriptionStatus !== "trialing" && (
                <TrialClaimBanner />
              )}
            </div>
            
            <OverviewDashboard
              events={allEvents}
              calendars={calendars}
              onNewEvent={handleNewEvent}
              onMassEvent={() => setMassEventDialogOpen(true)}
              onAIExtract={() => setAiExtractorOpen(true)}
              onMarkAsDone={() => setMarkAsDoneDialogOpen(true)}
              onEventClick={handleEventClick}
              onViewCalendar={() => setDashboardMode("calendar")}
            />
          </div>
        )}

        {dashboardMode === "settings" && (
          <div className="flex-1 overflow-auto">
            {renderSettingsView()}
          </div>
        )}

        {dashboardMode === "homework" && (
          <HomeworkWorkspace userId={userId || ""} userAvatar={userAvatar || undefined} />
        )}

        {isLmsEnabled && dashboardMode === "university" && (
          <div className="flex-1 overflow-auto">
            <UniversityIntegration />
          </div>
        )}

        {dashboardMode === "study" && (
          <div className="flex-1 overflow-auto">
            <StudyPlanner />
          </div>
        )}

        {dashboardMode === "achievements" && (
          <div className="flex-1 overflow-auto">
            <GamificationPanel />
          </div>
        )}

        {dashboardMode === "templates" && (
          <div className="flex-1 overflow-auto">
            <CalendarTemplates />
          </div>
        )}

        {dashboardMode === "ai" && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto h-full">
              <AIAssistantPanel />
            </div>
          </div>
        )}
      </main>

      {dashboardMode === "calendar" && (
        <div className="md:hidden fixed bottom-4 right-4 flex flex-col gap-2 z-40">
          <Button 
            size="icon" 
            variant="outline"
            className="h-12 w-12 rounded-full shadow-lg bg-card"
            onClick={() => setSidebarOpen(true)}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={handleNewEvent}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      )}



      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-background shadow-lg">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="font-semibold">My Calendars</h3>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CalendarSidebar
                  calendars={calendars}
                  selectedCalendarIds={selectedCalendarIds}
                  onCalendarToggle={handleCalendarToggle}
                  onNewCalendar={() => {
                    setCalendarDialogOpen(true)
                    setSidebarOpen(false)
                  }}
                  onCalendarsChanged={() => loadCalendarsAndEvents(true)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={editingEvent}
        calendars={calendars}
        defaultDate={defaultEventDate}
        defaultHour={defaultEventHour}
        onEventSaved={handleEventSaved}
      />

      <EventDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        event={selectedEvent}
        calendars={calendars}
        onEdit={handleEditEvent}
        onDelete={() => loadCalendarsAndEvents(true)}
      />

      <CalendarDialog
        open={calendarDialogOpen}
        onOpenChange={setCalendarDialogOpen}
        onCalendarCreated={(newCalendarId) => {
          // Add the newly created calendar to selectedCalendarIds
          setSelectedCalendarIds((prev) => [...prev, newCalendarId])
          loadCalendarsAndEvents(true)
        }}
      />

      <MassEventDialog
        open={massEventDialogOpen}
        onOpenChange={setMassEventDialogOpen}
        calendars={calendars}
        existingEvents={allEvents}
        onEventsSaved={handleEventSaved}
      />

      <MarkAsDoneDialog
        open={markAsDoneDialogOpen}
        onOpenChange={setMarkAsDoneDialogOpen}
        calendars={calendars}
        existingEvents={allEvents}
        onEventsSaved={handleEventSaved}
      />

      <AIEventExtractor
        open={aiExtractorOpen}
        onOpenChange={setAiExtractorOpen}
        calendars={calendars}
        onEventsSaved={handleEventSaved}
      />

      {/* Support Chat */}
      {!isAdmin && <SupportChat />}

      {/* Onboarding Guide */}
      <OnboardingGuide open={showOnboarding} onComplete={handleCompleteOnboarding} />

      {/* Mobile Bottom Navigation */}
      <MobileNav 
        dashboardMode={dashboardMode} 
        setDashboardMode={setDashboardMode}
        isLmsEnabled={isLmsEnabled}
      />
    </div>
  )
}
