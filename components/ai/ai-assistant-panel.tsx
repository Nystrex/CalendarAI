"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Send, Loader2, Upload, X, Calendar, CheckCircle2, AlertCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface ExtractedEvent {
  title: string
  description: string | null
  date: string | null
  time: string | null
  endTime: string | null
  isAllDay: boolean
  itemType: "assignment" | "quiz" | "exam" | null
  courseCode: string | null
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  events?: ExtractedEvent[]
  createdEvents?: any[]
}

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const extractEventsFromFile = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/ai/extract-events", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      setExtractedEvents(data.events)
      
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: `Uploaded: ${file.name}`,
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I found ${data.events.length} events in your file. Review them below and I'll create them in the correct calendars.`,
        events: data.events,
      }

      setMessages([...messages, userMessage, assistantMessage])
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""

      toast.success(`Extracted ${data.events.length} events!`)
    } catch (error) {
      console.error("Extraction error:", error)
      toast.error("Failed to extract events")
    } finally {
      setIsProcessing(false)
    }
  }

  const createEventsInCalendar = async (events: ExtractedEvent[]) => {
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Get user's calendars
      const { data: calendars } = await supabase
        .from("calendars")
        .select("id, name")
        .eq("user_id", user.id)

      if (!calendars) throw new Error("No calendars found")

      const createdEvents = []

      for (const event of events) {
        // Determine which calendar to use
        let calendarName = "Personal"
        if (event.itemType === "assignment") calendarName = "Assignments"
        else if (event.itemType === "quiz") calendarName = "Quizzes"
        else if (event.itemType === "exam") calendarName = "Exams"

        const calendar = calendars.find((c: any) => c.name === calendarName)
        if (!calendar) continue

        // Create the event
        const startTime = event.date && event.time 
          ? `${event.date}T${event.time}:00`
          : event.date
          ? `${event.date}T23:59:00`
          : new Date().toISOString()

        const endTime = event.date && event.endTime
          ? `${event.date}T${event.endTime}:00`
          : startTime

        const { data: newEvent, error } = await supabase
          .from("events")
          .insert({
            user_id: user.id,
            calendar_id: calendar.id,
            title: event.courseCode ? `[${event.courseCode}] ${event.title}` : event.title,
            description: event.description,
            start_time: startTime,
            end_time: endTime,
            all_day: event.isAllDay,
            reminder_minutes: 120,
            provider: "local",
          })
          .select()
          .single()

        if (!error && newEvent) {
          createdEvents.push(newEvent)

          // If it's a school item, create in school_items too
          if (event.itemType && event.courseCode) {
            // Find or create course
            const { data: courses } = await supabase
              .from("school_courses")
              .select("id")
              .eq("user_id", user.id)
              .eq("code", event.courseCode.toUpperCase())
              .limit(1)

            let courseId = courses?.[0]?.id

            if (!courseId) {
              const { data: newCourse } = await supabase
                .from("school_courses")
                .insert({
                  user_id: user.id,
                  code: event.courseCode.toUpperCase(),
                  name: event.courseCode,
                  term: null,
                })
                .select("id")
                .single()

              courseId = newCourse?.id
            }

            if (courseId) {
              await supabase.from("school_items").insert({
                user_id: user.id,
                course_id: courseId,
                item_type: event.itemType,
                title: event.title,
                due_at: startTime,
                description: event.description,
                is_completed: false,
                event_id: newEvent.id,
                reminder_1_minutes: 1440,
                reminder_2_minutes: 120,
              })
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `✅ Successfully created ${createdEvents.length} events in your calendar!`,
        createdEvents,
      }

      setMessages([...messages, assistantMessage])
      setExtractedEvents([])
      toast.success(`Created ${createdEvents.length} events!`)

      // Reload the page to show new events
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      console.error("Create events error:", error)
      toast.error("Failed to create events")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages([...messages, userMessage])
    setInput("")

    // Simple command processing
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes("create") && extractedEvents.length > 0) {
      await createEventsInCalendar(extractedEvents)
    } else if (lowerInput.includes("help")) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I can help you with:
• Upload a syllabus or screenshot to extract events
• Create assignments, quizzes, and exams automatically
• Organize events into the correct calendars
• Manage your schedule

Try uploading a file or ask me to create the extracted events!`,
      }
      setMessages([...messages, userMessage, assistantMessage])
    } else {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I understand! Upload a syllabus or screenshot and I'll extract all the events for you. Then just say 'create them' and I'll add them to your calendar.",
      }
      setMessages([...messages, userMessage, assistantMessage])
    }
  }

  const removeEvent = (index: number) => {
    setExtractedEvents(extractedEvents.filter((_, i) => i !== index))
  }

  return (
    <Card className="flex flex-col h-full border-2">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          AI Assistant
          <Badge variant="secondary" className="ml-auto">Smart Extraction</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium mb-2">
                  Upload your syllabus and I'll extract everything!
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>✓ Recognizes assignments, quizzes, and exams</p>
                  <p>✓ Automatically categorizes to correct calendars</p>
                  <p>✓ Extracts course codes and due dates</p>
                  <p>✓ Creates school items and calendar events</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.events && message.events.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.events.map((event, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-background border">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {event.itemType && (
                                  <Badge variant="outline" className="text-xs">
                                    {event.itemType}
                                  </Badge>
                                )}
                                {event.courseCode && (
                                  <Badge variant="secondary" className="text-xs">
                                    {event.courseCode}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium text-sm">{event.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.date || "No date"} {event.time && `at ${event.time}`}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => removeEvent(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {message.createdEvents && message.createdEvents.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Events added to calendar
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-4 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Extracted Events Actions */}
        {extractedEvents.length > 0 && !isProcessing && (
          <div className="px-4 py-3 border-t bg-green-500/5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {extractedEvents.length} events ready to create
              </p>
              <Button
                size="sm"
                onClick={() => createEventsInCalendar(extractedEvents)}
                className="bg-green-500 hover:bg-green-600"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Create All Events
              </Button>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        {file && (
          <div className="px-4 py-2 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4 text-primary" />
                <span className="truncate">{file.name}</span>
              </div>
              <Button
                size="sm"
                onClick={extractEventsFromFile}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Extract Events"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Upload a syllabus or ask me anything..."
              disabled={isProcessing}
              className="flex-1"
            />
            <Button type="submit" disabled={isProcessing || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
