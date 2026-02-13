"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useCalendar } from "@/lib/hooks/use-calendar"
import { useDemoMode } from "@/lib/hooks/use-demo-mode"
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
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { detectTimezone } from "@/lib/utils/timezone"
import { useAutoSync } from "@/lib/hooks/use-auto-sync"
import { AvatarChooser } from "@/components/settings/avatar-chooser"
import { GoogleCalendarConnect } from "@/components/integrations/google-calendar-connect"
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard"
import { HomeworkChat } from "@/components/homework/homework-chat" // Import HomeworkChat
import { useAppSettings } from "@/lib/hooks/use-app-settings"

type EventType = Database["public"]["Tables"]["events"]["Row"] & {
  calendar?: { color: string; name: string }
}
type CalendarType = Database["public"]["Tables"]["calendars"]["Row"]
type ViewType = "day" | "week" | "month" | "year"

export default function DashboardPage() {
  const { currentDate, view, dateRange, goToNext, goToPrev, goToToday, changeView: originalChangeView, setCurrentDate } = useCalendar()
  const { settings: appSettings } = useAppSettings()
  const { isDemoMode } = useDemoMode()
  const [allEvents, setAllEvents] = useState<EventType[]>([])
  const [calendars, setCalendars] = useState<CalendarType[]>([])
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
  const [dashboardMode, setDashboardMode] = useState<"overview" | "calendar" | "homework" | "settings">("overview")
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [defaultView, setDefaultView] = useState("month")
  const [weekStartsOn, setWeekStartsOn] = useState("sunday")
  const [timeFormat, setTimeFormat] = useState("12")
  const router = useRouter()
  const { syncNow } = useAutoSync(30)
  const [isAdmin, setIsAdmin] = useState(false) // Declare isAdmin variable
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

        const { data: calendarsData, error: calendarsError } = await supabase
          .from("calendars")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })

        if (calendarsError) {
          throw calendarsError
        }

        // Show all calendars in sidebar, but only auto-select visible ones
        const allCalendars = calendarsData || []
        const visibleCalendars = allCalendars.filter((cal) => cal.is_visible !== false)
        setCalendars(allCalendars)

        let calendarIdsToUse = selectedCalendarIds

        if (selectedCalendarIds.length === 0 && visibleCalendars.length > 0) {
          // Check localStorage first for user preference
          const savedSelection = userId ? localStorage.getItem(`selectedCalendarIds:${userId}`) : null
          if (!savedSelection) {
            // Default: select all visible calendars (excluding hidden ones like "Completed")
            const allIds = visibleCalendars.map((c) => c.id)
            setSelectedCalendarIds(allIds)
            calendarIdsToUse = allIds
          } else {
            try {
              const parsed = JSON.parse(savedSelection)
              if (Array.isArray(parsed)) {
                // Filter to only include calendars that still exist and are visible
                const validIds = parsed.filter((id) => visibleCalendars.some((cal) => cal.id === id))
                setSelectedCalendarIds(validIds)
                calendarIdsToUse = validIds
              }
            } catch {
              const allIds = visibleCalendars.map((c) => c.id)
              setSelectedCalendarIds(allIds)
              calendarIdsToUse = allIds
            }
          }
        } else if (visibleCalendars.length > 0) {
          const validIds = selectedCalendarIds.filter((id) => visibleCalendars.some((cal) => cal.id === id))
          if (validIds.length !== selectedCalendarIds.length) {
            setSelectedCalendarIds(validIds)
            calendarIdsToUse = validIds
          }
        }

        // Use visible calendars for loading events when forcing reload
        const idsForQuery = force ? visibleCalendars.map(c => c.id) : calendarIdsToUse

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

          const eventsWithCalendar = (eventsData || []).map((event) => ({
            ...event,
            calendar: allCalendars.find((c) => c.id === event.calendar_id),
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
        {isDemoMode && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Demo Mode:</span> You&apos;re testing CalendarAI with a shared demo account. Calendars created here are temporary and for demonstration only. <Link href="/auth/sign-up" className="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-200">Create a personal account</Link> to save your data permanently.
            </p>
          </div>
        )}
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
            {isDemoMode ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      You&apos;re using the demo account. Create a personal account to access premium features like Google Calendar sync and advanced scheduling.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <SubscriptionSettings />
            )}
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
            {!isDemoMode && appSettings?.feature_google_calendar !== false && (
              <GoogleCalendarConnect isConnected={isGoogleConnected} onConnectionChange={checkGoogleConnection} />
            )}
            {isDemoMode && (
              <div className="p-4 bg-muted rounded-lg border border-muted-foreground/20">
                <p className="text-sm text-muted-foreground">
                  Google Calendar sync is not available in demo mode. Create an account to enable integrations.
                </p>
              </div>
            )}
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
        return <MonthView currentDate={currentDate} events={filteredEvents} onDateClick={handleDateClick} onEventClick={handleEventClick} />
      case "week":
        return <WeekView currentDate={currentDate} events={filteredEvents} onTimeSlotClick={(date, hour) => handleTimeSlotClick(date, hour)} onEventClick={handleEventClick} />
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
            disabled={appSettings?.feature_homework_ai === false}
          >
            <Brain className="h-4 w-4 shrink-0" />
            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Homework Help</span>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden border-b bg-card/50 backdrop-blur-sm px-3 py-2">
          <div className="flex items-center justify-between">
            {/* Mode Toggle Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
              <Button
                variant={dashboardMode === "overview" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setDashboardMode("overview")}
              >
                <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                Overview
              </Button>
              <Button
                variant={dashboardMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setDashboardMode("calendar")}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                Calendar
              </Button>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1">
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href="/admin">
                    <Shield className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setDashboardMode("homework")}
              >
                <Brain className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setDashboardMode("settings")}
              >
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
                disabled={appSettings?.feature_ai_extraction === false}
                className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                calendarFilter={calendarFilter}
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
            </div>
          </>
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

        {dashboardMode === "homework" && appSettings?.feature_homework_ai !== false && (
          <HomeworkWorkspace userId={userId || ""} userAvatar={userAvatar || undefined} />
        )}
      </div>

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

      {appSettings?.feature_ai_extraction !== false && (
        <AIEventExtractor
          open={aiExtractorOpen}
          onOpenChange={setAiExtractorOpen}
          calendars={calendars}
          onEventsSaved={handleEventSaved}
        />
      )}

      {/* Support Chat */}
      {!isAdmin && <SupportChat />}

      {/* Onboarding Guide */}
      <OnboardingGuide open={showOnboarding} onComplete={handleCompleteOnboarding} />
    </div>
  )
}
