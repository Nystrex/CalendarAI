"use client"

import type React from "react"

import { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types/database"
import { toast } from "sonner"
import { format, parse } from "date-fns"
import { Sparkles, Upload, FileText, ImageIcon, X, Loader2, Brain, CheckCircle2, Key } from "lucide-react"

type Calendar = Database["public"]["Tables"]["calendars"]["Row"]

interface ExtractedEvent {
  title: string
  description?: string
  date?: string
  time?: string
  endTime?: string
  isAllDay?: boolean
  itemType?: "assignment" | "quiz" | "exam" | null
  courseCode?: string
  selected: boolean
  autoMatchedCalendarId?: string
}

type SaveMode = "calendar" | "school"

interface AIEventExtractorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendars: Calendar[]
  onEventsSaved: () => void
}

export function AIEventExtractor({ open, onOpenChange, calendars, onEventsSaved }: AIEventExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [requiresApiKey, setRequiresApiKey] = useState(false)
  const [saveMode, setSaveMode] = useState<SaveMode>("calendar")
  const [selectedCalendarId, setSelectedCalendarId] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ai-extractor-calendar")
      return saved || ""
    }
    return ""
  })
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Set default calendar when calendars load
  useState(() => {
    if (!selectedCalendarId && calendars.length > 0) {
      const defaultCal = calendars.find((c) => c.is_default)?.id || calendars[0]?.id
      if (defaultCal) setSelectedCalendarId(defaultCal)
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setUploadedFile(file)
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }
    }
  }

  const findMatchingCalendar = (courseCode: string | undefined, title: string): string | undefined => {
    if (!courseCode && !title && !uploadedFile) return undefined

    const codeToMatch = courseCode || ""
    const normalizedCode = codeToMatch.toUpperCase().replace(/\s+/g, " ").trim()

    const titleMatch = title.match(/\[?([A-Z]{2,4})\s*(\d{3,4})\]?/i)
    const titleCode = titleMatch ? `${titleMatch[1].toUpperCase()} ${titleMatch[2]}` : ""

    // Extract course code from filename (e.g., "CIS2500-W26-Course-Outline.pdf" -> "CIS 2500")
    let filenameCode = ""
    if (uploadedFile) {
      const filenameMatch = uploadedFile.name.match(/([A-Z]{2,4})\s*(\d{3,4})/i)
      if (filenameMatch) {
        filenameCode = `${filenameMatch[1].toUpperCase()} ${filenameMatch[2]}`
      }
    }

    for (const calendar of calendars) {
      const calendarName = calendar.name.toUpperCase().replace(/\s+/g, " ").trim()

      // Check filename match first (highest priority)
      if (filenameCode && calendarName.includes(filenameCode)) {
        return calendar.id
      }

      if (normalizedCode && calendarName.includes(normalizedCode)) {
        return calendar.id
      }
      if (titleCode && calendarName.includes(titleCode)) {
        return calendar.id
      }

      const calendarMatch = calendarName.match(/([A-Z]{2,4})\s*(\d{3,4})/)
      if (calendarMatch) {
        const calendarCode = `${calendarMatch[1]} ${calendarMatch[2]}`
        if (filenameCode === calendarCode || normalizedCode === calendarCode || titleCode === calendarCode) {
          return calendar.id
        }
      }
    }

    return undefined
  }

  const handleSyllabusImport = async () => {
    if (!uploadedFile || !uploadedFile.type.includes("pdf")) {
      toast.error("Please upload a PDF syllabus file")
      return
    }

    setIsExtracting(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)

      const response = await fetch("/api/ai/extract-syllabus", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to import syllabus")
      }

      toast.success(`Syllabus imported! Created ${data.eventsCreated} events for ${data.courseCode}`)
      setUploadedFile(null)
      setTextInput("")
      setPreviewUrl(null)
      onEventsSaved()
      onOpenChange(false)
    } catch (error) {
      console.error("[syllabus] import error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to import syllabus")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleExtract = async () => {
    if (!uploadedFile && !textInput.trim()) {
      toast.error("Please upload a file or enter text to extract events from")
      return
    }

    setIsExtracting(true)
    setExtractedEvents([])
    setRequiresApiKey(false)

    try {
      const formData = new FormData()
      if (uploadedFile) {
        formData.append("file", uploadedFile)
      }
      if (textInput.trim()) {
        formData.append("text", textInput.trim())
      }

      const response = await fetch("/api/ai/extract-events", {
        method: "POST",
        body: formData,
      })

      const contentType = response.headers.get("content-type")
      let data: any

      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        throw new Error(text || "Server error - please try again")
      }

      if (data.requiresApiKey) {
        setRequiresApiKey(true)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract events")
      }

      if (data.events && data.events.length > 0) {
        const eventsWithCalendars = data.events.map((e: any) => {
          const autoMatchedCalendarId = findMatchingCalendar(e.courseCode, e.title)
          return {
            ...e,
            selected: true,
            autoMatchedCalendarId,
          }
        })
        setExtractedEvents(eventsWithCalendars)

        const matchedCount = eventsWithCalendars.filter((e: ExtractedEvent) => e.autoMatchedCalendarId).length
        if (matchedCount > 0) {
          toast.success(
            `Found ${data.events.length} event${data.events.length > 1 ? "s" : ""}! ${matchedCount} auto-matched to calendars.`,
          )
        } else {
          toast.success(`Found ${data.events.length} event${data.events.length > 1 ? "s" : ""}!`)
        }
      } else {
        toast.info("No events found in the provided content")
      }
    } catch (error) {
      console.error("[v0] Extraction error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to extract events")
    } finally {
      setIsExtracting(false)
    }
  }

  const supabase = useMemo(() => createClient(), [])

  const parseEventDateTime = (event: ExtractedEvent) => {
    let startDateTime: Date
    let endDateTime: Date

    if (event.date) {
      const dateParts = event.date.split("-")
      const year = Number.parseInt(dateParts[0])
      const month = Number.parseInt(dateParts[1]) - 1
      const day = Number.parseInt(dateParts[2])

      if (event.time) {
        const [hours, minutes] = event.time.split(":").map(Number)
        startDateTime = new Date(year, month, day, hours, minutes)

        if (event.endTime) {
          const [endHours, endMinutes] = event.endTime.split(":").map(Number)
          endDateTime = new Date(year, month, day, endHours, endMinutes)
        } else {
          endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)
        }
      } else {
        startDateTime = new Date(year, month, day, 23, 59)
        endDateTime = new Date(year, month, day, 23, 59)
      }
    } else {
      const today = new Date()
      startDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59)
      endDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59)
    }

    return { startDateTime, endDateTime }
  }

  const normalizeCourseCode = (courseCode: string | undefined) => {
    if (!courseCode) return null
    const m = courseCode.trim().match(/([A-Za-z]{2,6})\s*(\d{3,4})/)
    if (!m) return courseCode.trim().toUpperCase()
    return `${m[1].toUpperCase()} ${m[2]}`
  }

  const inferItemType = (event: ExtractedEvent): "assignment" | "quiz" | "exam" => {
    if (event.itemType === "assignment" || event.itemType === "quiz" || event.itemType === "exam") return event.itemType
    const t = `${event.title} ${event.description || ""}`.toLowerCase()
    if (/(final|exam|midterm)\b/.test(t)) return "exam"
    if (/\bquiz\b|\btest\b/.test(t)) return "quiz"
    return "assignment"
  }

  const calendarNameForItemType = (t: "assignment" | "quiz" | "exam") => {
    if (t === "assignment") return "Assignments"
    if (t === "quiz") return "Quizzes"
    return "Exams"
  }

  const handleSaveEvents = async () => {
    const eventsToSave = extractedEvents.filter((e) => e.selected)

    if (eventsToSave.length === 0) {
      toast.error("No events selected")
      return
    }

    const eventsWithoutCalendar = eventsToSave.filter((e) => !e.autoMatchedCalendarId && !selectedCalendarId)
    if (eventsWithoutCalendar.length > 0 && !selectedCalendarId) {
      toast.error("Please select a default calendar for events without a matching course calendar")
      return
    }

    setIsSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const eventsData = eventsToSave.map((event) => {
        const { startDateTime, endDateTime } = parseEventDateTime(event)

        const calendarId = event.autoMatchedCalendarId || selectedCalendarId

        return {
          title: event.title,
          description: event.description || null,
          calendar_id: calendarId,
          user_id: user.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          all_day: event.isAllDay || !event.time,
          location: null,
          reminder_minutes: 120,
        }
      })

      const { error, data } = await supabase.from("events").insert(eventsData).select()
      if (error) throw error

      for (const event of data || []) {
        try {
          await fetch("/api/google/events/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: event.id }),
          })
        } catch (err) {
          console.error("Failed to sync to Google:", err)
        }
      }

      localStorage.setItem("ai-extractor-calendar", selectedCalendarId)

      toast.success(`Created ${eventsToSave.length} event${eventsToSave.length > 1 ? "s" : ""}!`)

      setExtractedEvents([])
      setUploadedFile(null)
      setTextInput("")
      setPreviewUrl(null)

      onEventsSaved()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error saving events:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save events")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSchoolItems = async () => {
    const eventsToSave = extractedEvents.filter((e) => e.selected)

    if (eventsToSave.length === 0) {
      toast.error("No events selected")
      return
    }

    setIsSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: existingCourses, error: coursesError } = await supabase
        .from("school_courses")
        .select("id,code,name,term")
        .eq("user_id", user.id)

      if (coursesError) throw coursesError

      const courseRows = (existingCourses || []) as Array<{ id: string; code: string; name: string; term: string | null }>
      const courseMap = new Map(courseRows.map((c) => [c.code.toUpperCase(), c]))

      const getOrCreateCourseId = async (courseCode: string | null) => {
        const normalized = normalizeCourseCode(courseCode || undefined)
        if (!normalized) return null

        const cached = courseMap.get(normalized.toUpperCase())
        if (cached) return cached.id

        const { data: inserted, error } = await supabase
          .from("school_courses")
          .insert({
            user_id: user.id,
            code: normalized.toUpperCase(),
            name: normalized.toUpperCase(),
            term: null,
          })
          .select("id,code,name,term")
          .single()

        if (error) throw error
        const row = inserted as { id: string; code: string; name: string; term: string | null }
        courseMap.set(row.code.toUpperCase(), row)
        return row.id
      }

      const { data: cals, error: calError } = await supabase
        .from("calendars")
        .select("id,name")
        .eq("user_id", user.id)

      if (calError) throw calError
      const calendarsByName = new Map(((cals || []) as Array<{ id: string; name: string }>).map((c) => [c.name.toLowerCase(), c.id]))

      let createdCount = 0

      for (const ev of eventsToSave) {
        const courseId = await getOrCreateCourseId(ev.courseCode || null)
        if (!courseId) {
          continue
        }

        const itemType = inferItemType(ev)
        const { startDateTime } = parseEventDateTime(ev)
        const dueAtIso = ev.date ? startDateTime.toISOString() : null

        const { data: insertedItem, error: itemError } = await supabase
          .from("school_items")
          .insert({
            user_id: user.id,
            course_id: courseId,
            item_type: itemType,
            title: ev.title,
            description: ev.description || null,
            due_at: dueAtIso,
            reminder_1_minutes: 1440,
            reminder_2_minutes: 120,
          })
          .select("id")
          .single()

        if (itemError) throw itemError

        const calName = calendarNameForItemType(itemType)
        const schoolCalendarId = calendarsByName.get(calName.toLowerCase())

        if (schoolCalendarId && dueAtIso) {
          const { endDateTime } = parseEventDateTime(ev)
          const { data: newEvent, error: evError } = await supabase
            .from("events")
            .insert({
              title: ev.title,
              description: ev.description || null,
              calendar_id: schoolCalendarId,
              user_id: user.id,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              all_day: ev.isAllDay || !ev.time,
              location: null,
              reminder_minutes: 120,
              provider: "local",
              provider_event_id: null,
            })
            .select("id")
            .single()

          if (evError) throw evError

          const { error: linkErr } = await supabase
            .from("school_items")
            .update({ event_id: (newEvent as { id: string }).id })
            .eq("id", (insertedItem as { id: string }).id)

          if (linkErr) throw linkErr
        }

        createdCount++
      }

      toast.success(`Created ${createdCount} school item${createdCount === 1 ? "" : "s"}!`)

      setExtractedEvents([])
      setUploadedFile(null)
      setTextInput("")
      setPreviewUrl(null)

      onEventsSaved()
      onOpenChange(false)
    } catch (e) {
      console.error("[v0] Error saving school items:", e)
      toast.error(e instanceof Error ? e.message : "Failed to save school items")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleEventSelection = (index: number) => {
    setExtractedEvents((prev) => prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e)))
  }

  const clearFile = () => {
    setUploadedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatEventDate = (event: ExtractedEvent) => {
    if (!event.date) return "No date"
    try {
      const date = parse(event.date, "yyyy-MM-dd", new Date())
      return format(date, "MMM dd, yyyy")
    } catch {
      return event.date
    }
  }

  const formatEventTime = (event: ExtractedEvent) => {
    if (!event.time) return event.isAllDay ? "All day" : "11:59 PM"

    try {
      const [hours, minutes] = event.time.split(":").map(Number)
      const date = new Date()
      date.setHours(hours, minutes)

      if (event.endTime) {
        const [endHours, endMinutes] = event.endTime.split(":").map(Number)
        const endDate = new Date()
        endDate.setHours(endHours, endMinutes)
        return `${format(date, "h:mm a")} - ${format(endDate, "h:mm a")}`
      }

      return format(date, "h:mm a")
    } catch {
      return event.time
    }
  }

  const getCalendarName = (calendarId: string | undefined): string | undefined => {
    if (!calendarId) return undefined
    return calendars.find((c) => c.id === calendarId)?.name
  }

  const getCalendarColor = (calendarId: string | undefined): string | undefined => {
    if (!calendarId) return undefined
    return calendars.find((c) => c.id === calendarId)?.color
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col border-purple-500/20 bg-gradient-to-b from-background to-purple-950/5">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-500/10 p-1.5">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent font-bold">AI Event Extractor</span>
          </DialogTitle>
          <DialogDescription>
            Upload a screenshot, PDF, or paste text to automatically extract events and due dates
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-4">
          {requiresApiKey && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
              <Key className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>OpenAI API Key Required</strong>
                <p className="mt-1 text-sm">
                  To use AI event extraction, please add your OpenAI API key as an environment variable:
                </p>
                <code className="mt-2 block rounded bg-amber-100 dark:bg-amber-900/50 px-2 py-1 text-xs">
                  OPENAI_API_KEY=sk-your-key-here
                </code>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  You can get an API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    platform.openai.com
                  </a>
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label>Save extracted results as</Label>
            <Select value={saveMode} onValueChange={(v) => setSaveMode(v as SaveMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar events</SelectItem>
                <SelectItem value="school">School items (Assignments/Quizzes/Exams)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Default calendar for unmatched events</Label>
            <p className="text-xs text-muted-foreground">
              Events with course codes (like SPMT 1020) will auto-match to calendars with matching names
            </p>
            <Select
              value={selectedCalendarId}
              onValueChange={(val) => {
                setSelectedCalendarId(val)
                localStorage.setItem("ai-extractor-calendar", val)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a fallback calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                      {calendar.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Upload Image or PDF</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploadedFile
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {uploadedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {uploadedFile.type.startsWith("image/") ? (
                      <ImageIcon className="h-8 w-8 text-green-600" />
                    ) : (
                      <FileText className="h-8 w-8 text-green-600" />
                    )}
                    <span className="font-medium text-green-700 dark:text-green-400">{uploadedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearFile()
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {previewUrl && (
                    <div className="mt-2 flex justify-center">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="max-h-32 rounded-md border shadow-sm"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Click to upload</span> or drag and drop
                  </div>
                  <div className="text-xs text-muted-foreground">PNG, JPG, PDF, or TXT files</div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Or paste text directly</Label>
            <Textarea
              placeholder={`Paste your syllabus, assignment list, or any text with due dates...

Example:
MATH 101 - Homework 3 due Jan 20th
CS 201 - Final Exam Feb 15 2:30 PM - 4:30 PM
Assignment 5 due tomorrow at 11:59 PM`}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>

          <Button
            onClick={handleExtract}
            disabled={isExtracting || (!uploadedFile && !textInput.trim())}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/20 transition-all"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Extract Events with AI
              </>
            )}
          </Button>

          {extractedEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <Label className="text-sm font-semibold">
                  Extracted Events ({extractedEvents.filter((e) => e.selected).length} of {extractedEvents.length}{" "}
                  selected)
                </Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setExtractedEvents((prev) => prev.map((e) => ({ ...e, selected: true })))}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setExtractedEvents((prev) => prev.map((e) => ({ ...e, selected: false })))}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 space-y-2">
                {extractedEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                      event.selected
                        ? "bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/15"
                        : "bg-card/50 border-border/50 opacity-50 hover:opacity-70"
                    }`}
                    onClick={() => toggleEventSelection(idx)}
                  >
                    <div
                      className={`mt-0.5 flex-shrink-0 rounded-full p-1 transition-colors ${
                        event.selected ? "bg-emerald-500 text-white" : "bg-muted border border-border"
                      }`}
                    >
                      {event.selected ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium text-sm text-foreground ${!event.selected ? "line-through text-muted-foreground" : ""}`}
                      >
                        {event.title}
                      </div>
                      {event.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {event.autoMatchedCalendarId ? (
                          <Badge
                            variant="secondary"
                            className="text-xs border"
                            style={{
                              backgroundColor: `${getCalendarColor(event.autoMatchedCalendarId)}20`,
                              borderColor: `${getCalendarColor(event.autoMatchedCalendarId)}50`,
                              color: getCalendarColor(event.autoMatchedCalendarId),
                            }}
                          >
                            <div
                              className="h-2 w-2 rounded-full mr-1"
                              style={{ backgroundColor: getCalendarColor(event.autoMatchedCalendarId) }}
                            />
                            {getCalendarName(event.autoMatchedCalendarId)}
                          </Badge>
                        ) : selectedCalendarId ? (
                          <Badge
                            variant="secondary"
                            className="text-xs border opacity-60"
                            style={{
                              backgroundColor: `${getCalendarColor(selectedCalendarId)}20`,
                              borderColor: `${getCalendarColor(selectedCalendarId)}50`,
                              color: getCalendarColor(selectedCalendarId),
                            }}
                          >
                            <div
                              className="h-2 w-2 rounded-full mr-1"
                              style={{ backgroundColor: getCalendarColor(selectedCalendarId) }}
                            />
                            {getCalendarName(selectedCalendarId)} (default)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            No calendar
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                        >
                          {formatEventDate(event)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"
                        >
                          {formatEventTime(event)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {extractedEvents.length > 0 && (
            <Button
              onClick={saveMode === "school" ? handleSaveSchoolItems : handleSaveEvents}
              disabled={isSaving || extractedEvents.filter((e) => e.selected).length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {saveMode === "school"
                    ? `Add ${extractedEvents.filter((e) => e.selected).length} School Items`
                    : `Add ${extractedEvents.filter((e) => e.selected).length} Events`}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
