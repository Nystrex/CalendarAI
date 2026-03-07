"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Layout, 
  Plus, 
  Download,
  Star,
  Clock,
  Calendar,
  Sparkles,
  Copy
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { addDays, setHours, setMinutes, format } from "date-fns"

interface Template {
  id: string
  name: string
  description: string
  category: string
  is_public: boolean
  is_official: boolean
  use_count: number
  tags: string[]
  event_count?: number
}

interface TemplateEvent {
  id: string
  template_id: string
  title: string
  description: string
  duration_minutes: number
  recurrence_pattern: string
  day_of_week: number
  time_of_day: string
  color: string
  category: string
}

export function CalendarTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [myTemplates, setMyTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load public/official templates
      const { data: publicTemplates } = await supabase
        .from("calendar_templates")
        .select("*, template_events(count)")
        .or("is_public.eq.true,is_official.eq.true")
        .order("use_count", { ascending: false })

      // Load user's templates
      const { data: userTemplates } = await supabase
        .from("calendar_templates")
        .select("*, template_events(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (publicTemplates) {
        setTemplates(publicTemplates.map((t: any) => ({
          ...t,
          event_count: t.template_events?.[0]?.count || 0
        })))
      }

      if (userTemplates) {
        setMyTemplates(userTemplates.map((t: any) => ({
          ...t,
          event_count: t.template_events?.[0]?.count || 0
        })))
      }
    } catch (error) {
      console.error("Error loading templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = async (templateId: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get template events
      const { data: templateEvents } = await supabase
        .from("template_events")
        .select("*")
        .eq("template_id", templateId)

      if (!templateEvents || templateEvents.length === 0) {
        toast.error("This template has no events")
        return
      }

      // Get or create default calendar
      let { data: calendars } = await supabase
        .from("calendars")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)

      let calendarId = calendars?.[0]?.id

      if (!calendarId) {
        const { data: newCalendar } = await supabase
          .from("calendars")
          .insert({ user_id: user.id, name: "My Calendar", color: "#3b82f6" })
          .select()
          .single()
        calendarId = newCalendar?.id
      }

      // Create events from template
      const now = new Date()
      const eventsToCreate = templateEvents.map((te: any) => {
        let eventDate = now
        
        // Calculate date based on day_of_week
        if (te.day_of_week !== null) {
          const daysUntil = (te.day_of_week - now.getDay() + 7) % 7
          eventDate = addDays(now, daysUntil || 7) // If today, schedule for next week
        }

        // Set time
        if (te.time_of_day) {
          const [hours, minutes] = te.time_of_day.split(':').map(Number)
          eventDate = setHours(setMinutes(eventDate, minutes), hours)
        }

        const endDate = addDays(eventDate, 0)
        endDate.setMinutes(endDate.getMinutes() + (te.duration_minutes || 60))

        return {
          user_id: user.id,
          calendar_id: calendarId,
          title: te.title,
          description: te.description,
          start_time: eventDate.toISOString(),
          end_time: endDate.toISOString(),
          all_day: false,
          color: te.color || "#3b82f6"
        }
      })

      const { error } = await supabase
        .from("events")
        .insert(eventsToCreate)

      if (error) throw error

      // Increment use count
      await supabase
        .from("calendar_templates")
        .update({ use_count: supabase.raw("use_count + 1") })
        .eq("id", templateId)

      toast.success(`Template applied! ${eventsToCreate.length} events created`)
      
    } catch (error) {
      console.error("Error applying template:", error)
      toast.error("Failed to apply template")
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tags = (formData.get("tags") as string)
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)

      const { data, error } = await supabase
        .from("calendar_templates")
        .insert({
          user_id: user.id,
          name: formData.get("name") as string,
          description: formData.get("description") as string,
          category: formData.get("category") as string,
          is_public: formData.get("is_public") === "true",
          tags
        })
        .select()
        .single()

      if (error) throw error

      toast.success("Template created! Add events to it from your calendar")
      setCreateOpen(false)
      loadTemplates()
      e.currentTarget.reset()
    } catch (error) {
      console.error("Error creating template:", error)
      toast.error("Failed to create template")
    }
  }

  const officialTemplates = [
    {
      id: "semester",
      name: "University Semester",
      description: "Standard 15-week semester with common class times",
      category: "academic",
      is_official: true,
      use_count: 1250,
      tags: ["university", "semester", "classes"],
      event_count: 45
    },
    {
      id: "exam-prep",
      name: "Exam Preparation",
      description: "2-week intensive study schedule with breaks",
      category: "academic",
      is_official: true,
      use_count: 890,
      tags: ["exam", "study", "finals"],
      event_count: 28
    },
    {
      id: "work-week",
      name: "Standard Work Week",
      description: "9-5 work schedule with lunch breaks",
      category: "work",
      is_official: true,
      use_count: 2100,
      tags: ["work", "9-5", "professional"],
      event_count: 25
    }
  ]

  if (loading) {
    return <div className="p-6">Loading templates...</div>
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Templates</h2>
          <p className="text-sm text-muted-foreground">Quick-start your calendar with pre-built schedules</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Calendar Template</DialogTitle>
              <DialogDescription>Save your schedule as a reusable template</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input id="name" name="name" required placeholder="My Study Schedule" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Describe this template..." rows={3} />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue="custom">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" name="tags" placeholder="study, university, winter" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_public" name="is_public" value="true" className="rounded" />
                <Label htmlFor="is_public">Make public (share with community)</Label>
              </div>
              <Button type="submit" className="w-full">Create Template</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Official Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Official Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {officialTemplates.map(template => (
            <Card key={template.id} className="border-2 hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                        <Star className="h-3 w-3 mr-1" />
                        Official
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {template.event_count} events
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {template.use_count}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button onClick={() => applyTemplate(template.id)} className="w-full" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Community Templates */}
      {templates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Community Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(template => (
              <Card key={template.id} className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {template.event_count} events
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {template.use_count}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">{template.category}</Badge>
                  </div>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button onClick={() => applyTemplate(template.id)} className="w-full" size="sm" variant="outline">
                    <Copy className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* My Templates */}
      {myTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Layout className="h-5 w-5 text-blue-500" />
            My Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myTemplates.map(template => (
              <Card key={template.id} className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {template.event_count} events
                      </span>
                      {template.is_public && (
                        <Badge variant="secondary" className="text-xs">Public</Badge>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => applyTemplate(template.id)} className="w-full" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {myTemplates.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layout className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No templates yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first template to reuse schedules</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
