"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, ClipboardList } from "lucide-react"

type ItemType = "assignment" | "quiz" | "exam"

type SchoolItemRow = {
  id: string
  item_type: ItemType
  title: string
  due_at: string | null
  is_completed: boolean
}

type CourseRow = {
  id: string
  code: string
}

export function SchoolCalendarPanel({ userId }: { userId: string | null }) {
  const [items, setItems] = useState<(SchoolItemRow & { course?: CourseRow })[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const load = async () => {
      if (!userId) return

      const { data: courses } = await supabase.from("school_courses").select("id,code")
      const courseMap = new Map(((courses || []) as CourseRow[]).map((c) => [c.id, c]))

      const now = new Date()
      const end = new Date()
      end.setDate(end.getDate() + 14)

      const { data } = await supabase
        .from("school_items")
        .select("id,course_id,item_type,title,due_at,is_completed")
        .eq("user_id", userId)
        .eq("is_completed", false)
        .gte("due_at", now.toISOString())
        .lte("due_at", end.toISOString())
        .order("due_at", { ascending: true })
        .limit(20)

      const typed = ((data || []) as any[]).map((r) => ({
        ...r,
        course: courseMap.get(r.course_id),
      }))

      setItems(typed)
    }

    load()
  }, [supabase, userId])

  const label = (t: ItemType) => {
    if (t === "assignment") return "Assignment"
    if (t === "quiz") return "Quiz"
    return "Exam"
  }

  return (
    <div className="w-80 border-l border-border/50 bg-gradient-to-b from-card/80 to-card/50 p-4 overflow-y-auto">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          School
        </h3>
        <Badge variant="secondary" className="gap-1">
          <CalendarDays className="h-3 w-3" />
          Next 14d
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No upcoming items</div>
          ) : (
            items.map((i) => (
              <div key={i.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{i.title}</div>
                  <Badge variant="outline" className="text-xs">
                    {label(i.item_type)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(i.course?.code || "Course") + (i.due_at ? ` • ${new Date(i.due_at).toLocaleString()}` : "")}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
