"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { CalendarDays, CheckCircle2, ClipboardList, Download, GraduationCap, Pencil, PenLine, Plus, Timer, Trash2, X, BookOpen, FileText, FlaskConical, TrendingUp, Target, Award, BarChart3, Sparkles } from "lucide-react"

type ItemType = "assignment" | "quiz" | "exam"

type Course = {
  id: string
  code: string
  name: string
  term: string | null
}

type SchoolItem = {
  id: string
  course_id: string
  item_type: ItemType
  title: string
  description: string | null
  due_at: string | null
  points_possible: number | null
  weight_percent: number | null
  is_completed: boolean
  event_id: string | null
  reminder_1_minutes: number
  reminder_2_minutes: number
  course?: Course
}

type GradeCategory = {
  id: string
  course_id: string
  name: string
  weight_percent: number
  drop_lowest: number
}

type GradeEntry = {
  id: string
  course_id: string
  category_id: string | null
  item_id: string | null
  title: string | null
  score: number | null
  out_of: number | null
  graded_at: string | null
  notes: string | null
}

function calendarNameForItemType(itemType: ItemType) {
  if (itemType === "assignment") return "Assignments"
  if (itemType === "quiz") return "Quizzes"
  return "Exams"
}

function letterGrade(pct: number): string {
  if (pct >= 90) return "A+"
  if (pct >= 85) return "A"
  if (pct >= 80) return "A-"
  if (pct >= 77) return "B+"
  if (pct >= 73) return "B"
  if (pct >= 70) return "B-"
  if (pct >= 67) return "C+"
  if (pct >= 63) return "C"
  if (pct >= 60) return "C-"
  if (pct >= 57) return "D+"
  if (pct >= 53) return "D"
  if (pct >= 50) return "D-"
  return "F"
}

function letterGradeColor(letter: string): string {
  if (letter.startsWith("A")) return "text-green-600"
  if (letter.startsWith("B")) return "text-blue-600"
  if (letter.startsWith("C")) return "text-yellow-600"
  if (letter.startsWith("D")) return "text-orange-600"
  return "text-red-600"
}

function gradePointValue(pct: number): number {
  if (pct >= 90) return 4.0
  if (pct >= 85) return 3.9
  if (pct >= 80) return 3.7
  if (pct >= 77) return 3.3
  if (pct >= 73) return 3.0
  if (pct >= 70) return 2.7
  if (pct >= 67) return 2.3
  if (pct >= 63) return 2.0
  if (pct >= 60) return 1.7
  if (pct >= 57) return 1.3
  if (pct >= 53) return 1.0
  if (pct >= 50) return 0.7
  return 0.0
}

export function SchoolDashboard() {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [items, setItems] = useState<SchoolItem[]>([])

  const [gradesLoading, setGradesLoading] = useState(false)
  const [selectedGradesCourseId, setSelectedGradesCourseId] = useState<string>("")
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([])
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([])

  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryWeight, setNewCategoryWeight] = useState("")

  const [newEntryTitle, setNewEntryTitle] = useState("")
  const [newEntryItemId, setNewEntryItemId] = useState<string>("__none__")
  const [newEntryCategoryId, setNewEntryCategoryId] = useState<string>("")
  const [newEntryScore, setNewEntryScore] = useState("")
  const [newEntryOutOf, setNewEntryOutOf] = useState("")

  const [whatIfCategoryId, setWhatIfCategoryId] = useState<string>("")
  const [whatIfScore, setWhatIfScore] = useState("")
  const [whatIfOutOf, setWhatIfOutOf] = useState("")

  const [newCourseCode, setNewCourseCode] = useState("")
  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseTerm, setNewCourseTerm] = useState("")

  const [newItemType, setNewItemType] = useState<ItemType>("assignment")
  const [newItemCourseId, setNewItemCourseId] = useState<string>("")
  const [newItemTitle, setNewItemTitle] = useState("")
  const [newItemDue, setNewItemDue] = useState("")
  const [newItemWeight, setNewItemWeight] = useState("")
  const [newItemPoints, setNewItemPoints] = useState("")
  const [creating, setCreating] = useState(false)

  const [editingItem, setEditingItem] = useState<SchoolItem | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDue, setEditDue] = useState("")
  const [editPoints, setEditPoints] = useState("")
  const [editWeight, setEditWeight] = useState("")
  const [saving, setSaving] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: coursesData, error: coursesError } = await supabase
        .from("school_courses")
        .select("id,code,name,term")
        .order("created_at", { ascending: false })

      if (coursesError) throw coursesError

      const typedCourses = (coursesData || []) as Course[]
      setCourses(typedCourses)

      const { data: itemsData, error: itemsError } = await supabase
        .from("school_items")
        .select(
          "id,course_id,item_type,title,description,due_at,points_possible,weight_percent,is_completed,event_id,reminder_1_minutes,reminder_2_minutes,created_at",
        )
        .order("due_at", { ascending: true, nullsFirst: false })

      if (itemsError) throw itemsError

      const courseMap = new Map(typedCourses.map((c) => [c.id, c]))
      const typedItems = ((itemsData || []) as SchoolItem[]).map((i) => ({ ...i, course: courseMap.get(i.course_id) }))
      setItems(typedItems)

      if (!newItemCourseId && typedCourses.length > 0) {
        setNewItemCourseId(typedCourses[0].id)
      }

      if (!selectedGradesCourseId && typedCourses.length > 0) {
        setSelectedGradesCourseId(typedCourses[0].id)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to load school data")
    } finally {
      setLoading(false)
    }
  }

  const loadGradesForCourse = async (courseId: string) => {
    if (!courseId) return

    setGradesLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: categoriesData, error: catError } = await supabase
        .from("grade_categories")
        .select("id,course_id,name,weight_percent,drop_lowest")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .order("created_at", { ascending: true })

      if (catError) throw catError
      const cats = (categoriesData || []) as GradeCategory[]
      setGradeCategories(cats)

      const { data: entriesData, error: entryError } = await supabase
        .from("grade_entries")
        .select("id,course_id,category_id,item_id,title,score,out_of,graded_at,notes")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })

      if (entryError) throw entryError
      setGradeEntries((entriesData || []) as GradeEntry[])

      if (!newEntryCategoryId && cats.length > 0) {
        setNewEntryCategoryId(cats[0].id)
      }

      if (!whatIfCategoryId && cats.length > 0) {
        setWhatIfCategoryId(cats[0].id)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to load grades")
    } finally {
      setGradesLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedGradesCourseId) {
      loadGradesForCourse(selectedGradesCourseId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGradesCourseId])

  const createCourse = async () => {
    if (!newCourseCode.trim() || !newCourseName.trim()) {
      toast.error("Course code and name are required")
      return
    }

    setCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const payload = {
        user_id: user.id,
        code: newCourseCode.trim().toUpperCase(),
        name: newCourseName.trim(),
        term: newCourseTerm.trim() ? newCourseTerm.trim() : null,
      }

      const { error } = await supabase.from("school_courses").insert(payload)
      if (error) throw error

      setNewCourseCode("")
      setNewCourseName("")
      setNewCourseTerm("")
      toast.success("Course created")
      await loadAll()
    } catch (e) {
      console.error(e)
      toast.error("Failed to create course")
    } finally {
      setCreating(false)
    }
  }

  const createItem = async () => {
    if (!newItemCourseId || !newItemTitle.trim()) {
      toast.error("Course and title are required")
      return
    }

    setCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const dueAt = newItemDue ? new Date(newItemDue) : null
      const dueIso = dueAt ? dueAt.toISOString() : null

      const { data: insertedItem, error: itemError } = await supabase
        .from("school_items")
        .insert({
          user_id: user.id,
          course_id: newItemCourseId,
          item_type: newItemType,
          title: newItemTitle.trim(),
          due_at: dueIso,
          points_possible: newItemPoints.trim() ? Number.parseFloat(newItemPoints) : null,
          weight_percent: newItemWeight.trim() ? Number.parseFloat(newItemWeight) : null,
          reminder_1_minutes: 1440,
          reminder_2_minutes: 120,
        })
        .select("id")
        .single()

      if (itemError) throw itemError

      const calendarName = calendarNameForItemType(newItemType)
      const { data: calData, error: calError } = await supabase
        .from("calendars")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", calendarName)
        .limit(1)
        .maybeSingle()

      if (calError) throw calError

      if (calData?.id && dueAt) {
        const start = new Date(dueAt)
        const end = new Date(dueAt)

        const { data: newEvent, error: evError } = await supabase
          .from("events")
          .insert({
            user_id: user.id,
            calendar_id: calData.id,
            title: newItemTitle.trim(),
            description: null,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            all_day: false,
            reminder_minutes: 120,
            location: null,
            provider: "local",
            provider_event_id: null,
          })
          .select("id")
          .single()

        if (evError) throw evError

        const { error: linkErr } = await supabase
          .from("school_items")
          .update({ event_id: newEvent.id })
          .eq("id", insertedItem.id)

        if (linkErr) throw linkErr
      }

      setNewItemTitle("")
      setNewItemDue("")
      setNewItemWeight("")
      setNewItemPoints("")
      toast.success("Item created")
      await loadAll()
    } catch (e) {
      console.error(e)
      toast.error("Failed to create item")
    } finally {
      setCreating(false)
    }
  }

  const toggleCompleted = async (item: SchoolItem) => {
    try {
      const { error } = await supabase.from("school_items").update({ is_completed: !item.is_completed }).eq("id", item.id)
      if (error) throw error
      await loadAll()
    } catch (e) {
      console.error(e)
      toast.error("Failed to update")
    }
  }

  const deleteItem = async (item: SchoolItem) => {
    try {
      const { error } = await supabase.from("school_items").delete().eq("id", item.id)
      if (error) throw error
      toast.success("Deleted")
      await loadAll()
    } catch (e) {
      console.error(e)
      toast.error("Failed to delete")
    }
  }

  const deleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase.from("school_courses").delete().eq("id", courseId)
      if (error) throw error
      toast.success("Course deleted")
      await loadAll()
    } catch (e) {
      console.error(e)
      toast.error("Failed to delete course")
    }
  }

  const deleteGradeEntry = async (entryId: string) => {
    try {
      const { error } = await supabase.from("grade_entries").delete().eq("id", entryId)
      if (error) throw error
      toast.success("Grade entry deleted")
      await loadGradesForCourse(selectedGradesCourseId)
    } catch (e) {
      console.error(e)
      toast.error("Failed to delete grade entry")
    }
  }

  const deleteGradeCategory = async (catId: string) => {
    try {
      const { error } = await supabase.from("grade_categories").delete().eq("id", catId)
      if (error) throw error
      toast.success("Category deleted")
      await loadGradesForCourse(selectedGradesCourseId)
    } catch (e) {
      console.error(e)
      toast.error("Failed to delete category")
    }
  }

  const startEditItem = (item: SchoolItem) => {
    setEditingItem(item)
    setEditTitle(item.title)
    setEditDue(item.due_at ? new Date(item.due_at).toISOString().slice(0, 16) : "")
    setEditPoints(item.points_possible != null ? String(item.points_possible) : "")
    setEditWeight(item.weight_percent != null ? String(item.weight_percent) : "")
  }

  const saveEditItem = async () => {
    if (!editingItem) return
    setSaving(true)
    try {
      const { error } = await supabase.from("school_items").update({
        title: editTitle.trim(),
        due_at: editDue ? new Date(editDue).toISOString() : null,
        points_possible: editPoints.trim() ? Number.parseFloat(editPoints) : null,
        weight_percent: editWeight.trim() ? Number.parseFloat(editWeight) : null,
      }).eq("id", editingItem.id)
      if (error) throw error
      toast.success("Saved")
      setEditingItem(null)
      await loadAll()
    } catch (e) {
      console.error(e)
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const exportGradesCSV = () => {
    if (!selectedGradesCourseId) return
    const course = courses.find((c) => c.id === selectedGradesCourseId)
    const rows: string[][] = [["Title", "Category", "Score", "Out Of", "Percent", "Item Weight%"]]
    for (const e of gradeEntries) {
      const item = e.item_id ? itemById.get(e.item_id) : undefined
      const cat = gradeCategories.find((c) => c.id === e.category_id)
      const pct = typeof e.score === "number" && typeof e.out_of === "number" && (e.out_of || 0) > 0
        ? ((e.score / e.out_of) * 100).toFixed(1)
        : ""
      rows.push([
        item?.title || e.title || "",
        cat?.name || "",
        String(e.score ?? ""),
        String(e.out_of ?? ""),
        pct,
        item?.weight_percent != null ? String(item.weight_percent) : "",
      ])
    }
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `grades_${course?.code || "course"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const createGradeCategory = async () => {
    if (!selectedGradesCourseId) {
      toast.error("Select a course")
      return
    }
    if (!newCategoryName.trim()) {
      toast.error("Category name required")
      return
    }
    const weight = Number.parseFloat(newCategoryWeight)
    if (Number.isNaN(weight) || weight < 0 || weight > 100) {
      toast.error("Weight must be 0-100")
      return
    }

    setCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("grade_categories").insert({
        user_id: user.id,
        course_id: selectedGradesCourseId,
        name: newCategoryName.trim(),
        weight_percent: weight,
        drop_lowest: 0,
      })

      if (error) throw error

      setNewCategoryName("")
      setNewCategoryWeight("")
      toast.success("Category created")
      await loadGradesForCourse(selectedGradesCourseId)
    } catch (e) {
      console.error(e)
      toast.error("Failed to create category")
    } finally {
      setCreating(false)
    }
  }

  const createGradeEntry = async () => {
    if (!selectedGradesCourseId) {
      toast.error("Select a course")
      return
    }
    if (!newEntryCategoryId) {
      toast.error("Select a category")
      return
    }

    const resolvedAssignment = newEntryItemId !== "__none__" ? itemById.get(newEntryItemId) : undefined

    const score = Number.parseFloat(newEntryScore)
    const outOf = Number.parseFloat(newEntryOutOf)
    if (Number.isNaN(score) || Number.isNaN(outOf) || outOf <= 0) {
      toast.error("Enter a valid score and out-of")
      return
    }

    setCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const entryTitle = (resolvedAssignment?.title || newEntryTitle).trim() || null
      const itemId = resolvedAssignment?.id ?? null

      if (itemId) {
        const existing = gradeEntries.find((e) => e.item_id === itemId)
        if (existing) {
          const { error } = await supabase
            .from("grade_entries")
            .update({ score, out_of: outOf, category_id: newEntryCategoryId })
            .eq("id", existing.id)
          if (error) throw error
          toast.success("Grade updated")
          setNewEntryTitle("")
          setNewEntryItemId("__none__")
          setNewEntryScore("")
          setNewEntryOutOf("")
          await loadGradesForCourse(selectedGradesCourseId)
          return
        }
      }

      const { error } = await supabase.from("grade_entries").insert({
        user_id: user.id,
        course_id: selectedGradesCourseId,
        category_id: newEntryCategoryId,
        item_id: itemId,
        title: entryTitle,
        score,
        out_of: outOf,
        graded_at: null,
        notes: null,
      })

      if (error) throw error

      setNewEntryTitle("")
      setNewEntryItemId("__none__")
      setNewEntryScore("")
      setNewEntryOutOf("")
      toast.success("Grade added")
      await loadGradesForCourse(selectedGradesCourseId)
    } catch (e) {
      console.error(e)
      toast.error("Failed to add grade")
    } finally {
      setCreating(false)
    }
  }

  const grouped = useMemo(() => {
    const byType: Record<ItemType, SchoolItem[]> = {
      assignment: [],
      quiz: [],
      exam: [],
    }
    for (const i of items) byType[i.item_type].push(i)
    return byType
  }, [items])

  const itemById = useMemo(() => {
    const m = new Map<string, SchoolItem>()
    for (const i of items) m.set(i.id, i)
    return m
  }, [items])

  const itemsForSelectedGradesCourse = useMemo(() => {
    if (!selectedGradesCourseId) return []
    return items
      .filter((i) => i.course_id === selectedGradesCourseId)
      .sort((a, b) => {
        const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY
        const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY
        return aDue - bDue
      })
  }, [items, selectedGradesCourseId])

  const gpaStats = useMemo(() => {
    const courseGrades: { course: Course; pct: number; gpa: number }[] = []
    for (const course of courses) {
      const courseEntries = gradeEntries.filter((e) => e.course_id === course.id)
      const courseCategories = gradeCategories.filter((c) => c.course_id === course.id)
      if (courseEntries.length === 0 || courseCategories.length === 0) continue

      const byCategory = new Map<string, { totalScore: number; totalOutOf: number }>()
      for (const c of courseCategories) byCategory.set(c.id, { totalScore: 0, totalOutOf: 0 })

      for (const e of courseEntries) {
        if (!e.category_id) continue
        if (typeof e.score !== "number" || typeof e.out_of !== "number" || (e.out_of || 0) <= 0) continue
        const agg = byCategory.get(e.category_id)
        if (!agg) continue
        agg.totalScore += e.score
        agg.totalOutOf += e.out_of
      }

      const totalWeight = courseCategories.reduce((s, c) => s + c.weight_percent, 0)
      if (totalWeight === 0) continue

      const weighted = courseCategories.reduce((s, c) => {
        const agg = byCategory.get(c.id)
        if (!agg || agg.totalOutOf === 0) return s
        return s + (c.weight_percent / 100) * (agg.totalScore / agg.totalOutOf)
      }, 0)

      const pct = weighted * 100
      courseGrades.push({ course, pct, gpa: gradePointValue(pct) })
    }

    if (courseGrades.length === 0) return null
    const cumGpa = courseGrades.reduce((s, cg) => s + cg.gpa, 0) / courseGrades.length
    return { courseGrades, cumGpa }
  }, [courses, gradeEntries, gradeCategories])

  const gradeSummary = useMemo(() => {
    const categories = gradeCategories
    const entries = gradeEntries

    // Separate entries: those with a per-item weight vs those pooled into a category
    const directEntries = entries.filter((e) => {
      const item = e.item_id ? itemById.get(e.item_id) : undefined
      return item && typeof item.weight_percent === "number"
    })
    const directItemIds = new Set(directEntries.map((e) => e.item_id))

    const pooledEntries = entries.filter((e) => !directItemIds.has(e.item_id))

    const byCategory = new Map<string, GradeEntry[]>()
    for (const e of pooledEntries) {
      if (!e.category_id) continue
      if (!byCategory.has(e.category_id)) byCategory.set(e.category_id, [])
      byCategory.get(e.category_id)!.push(e)
    }

    const categoryAverages = categories.map((c) => {
      const ents = byCategory.get(c.id) || []
      const valid = ents.filter((e) => typeof e.score === "number" && typeof e.out_of === "number" && (e.out_of || 0) > 0)

      const totalScore = valid.reduce((sum, e) => sum + (e.score || 0), 0)
      const totalOutOf = valid.reduce((sum, e) => sum + (e.out_of || 0), 0)

      const pct = totalOutOf > 0 ? totalScore / totalOutOf : null

      return {
        category: c,
        percent: pct,
        count: valid.length,
      }
    })

    // Direct-weighted entries contribute their own weight_percent directly
    const directWeightUsed = directEntries.reduce((sum, e) => {
      const item = e.item_id ? itemById.get(e.item_id) : undefined
      return sum + (item?.weight_percent || 0)
    }, 0)

    const directContribution = directEntries.reduce((sum, e) => {
      const item = e.item_id ? itemById.get(e.item_id) : undefined
      if (!item || typeof item.weight_percent !== "number") return sum
      if (typeof e.score !== "number" || typeof e.out_of !== "number" || (e.out_of || 0) <= 0) return sum
      return sum + (item.weight_percent / 100) * (e.score / e.out_of)
    }, 0)

    const categoryWeightTotal = categories.reduce((sum, c) => sum + (c.weight_percent || 0), 0)
    const totalWeight = categoryWeightTotal + directWeightUsed

    const categoryContribution = categoryAverages.reduce((sum, ca) => {
      if (ca.percent === null) return sum
      return sum + (ca.category.weight_percent / 100) * ca.percent
    }, 0)

    const currentPercent = totalWeight > 0 ? (categoryContribution + directContribution) * 100 : null

    return { categoryAverages, totalWeight, currentPercent, directEntries }
  }, [gradeCategories, gradeEntries, itemById])

  const whatIfProjectedPercent = useMemo(() => {
    if (!whatIfCategoryId) return null
    const score = Number.parseFloat(whatIfScore)
    const outOf = Number.parseFloat(whatIfOutOf)
    if (Number.isNaN(score) || Number.isNaN(outOf) || outOf <= 0) return null

    const byCategory = new Map<string, { totalScore: number; totalOutOf: number }>()
    for (const c of gradeCategories) {
      byCategory.set(c.id, { totalScore: 0, totalOutOf: 0 })
    }

    for (const e of gradeEntries) {
      if (!e.category_id) continue
      if (typeof e.score !== "number" || typeof e.out_of !== "number" || (e.out_of || 0) <= 0) continue
      const agg = byCategory.get(e.category_id)
      if (!agg) continue
      agg.totalScore += e.score || 0
      agg.totalOutOf += e.out_of || 0
    }

    const agg = byCategory.get(whatIfCategoryId)
    if (agg) {
      agg.totalScore += score
      agg.totalOutOf += outOf
    }

    const projectedWeighted = gradeCategories.reduce((sum, c) => {
      const a = byCategory.get(c.id)
      if (!a || a.totalOutOf <= 0) return sum
      const pct = a.totalScore / a.totalOutOf
      return sum + (c.weight_percent / 100) * pct
    }, 0)

    return projectedWeighted * 100
  }, [gradeCategories, gradeEntries, whatIfCategoryId, whatIfScore, whatIfOutOf])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">Loading...</CardContent>
        </Card>
      </div>
    )
  }

  const totalItems = items.length
  const completedItems = items.filter((i) => i.is_completed).length
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const upcomingItems = items.filter((i) => !i.is_completed && i.due_at && new Date(i.due_at) > new Date()).length

  const courseColors = ['from-blue-500/20 to-blue-600/5 border-blue-500/30', 'from-purple-500/20 to-purple-600/5 border-purple-500/30', 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30', 'from-amber-500/20 to-amber-600/5 border-amber-500/30', 'from-pink-500/20 to-pink-600/5 border-pink-500/30', 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30']
  const courseAccents = ['text-blue-500', 'text-purple-500', 'text-emerald-500', 'text-amber-500', 'text-pink-500', 'text-cyan-500']

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            School
          </h1>
          <p className="text-muted-foreground mt-1">Manage assignments, quizzes, exams, and grades</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-2 bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Courses</p>
            </div>
            <p className="text-2xl font-bold">{courses.length}</p>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-purple-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-green-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <p className="text-2xl font-bold">{completionRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-2 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
            <p className="text-2xl font-bold">{upcomingItems}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Courses Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Courses
            </CardTitle>
            <CardDescription>Your enrolled courses this semester</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label>Code</Label>
                <Input value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value)} placeholder="CIS*1500" />
              </div>
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} placeholder="Intro to Programming" />
              </div>
              <div className="sm:col-span-3">
                <Label>Term (optional)</Label>
                <Input value={newCourseTerm} onChange={(e) => setNewCourseTerm(e.target.value)} placeholder="W26" />
              </div>
            </div>
            <Button onClick={createCourse} disabled={creating} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>

            <div className="space-y-2">
              {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No courses yet</p>
                  <p className="text-xs text-muted-foreground/70">Add your first course above</p>
                </div>
              ) : (
                courses.map((c, idx) => {
                  const colorClass = courseColors[idx % courseColors.length]
                  const accentClass = courseAccents[idx % courseAccents.length]
                  const courseItemCount = items.filter((i) => i.course_id === c.id).length
                  const courseCompletedCount = items.filter((i) => i.course_id === c.id && i.is_completed).length
                  return (
                    <div key={c.id} className={`flex items-center justify-between rounded-xl border-2 p-3 bg-gradient-to-r ${colorClass} transition-all hover:scale-[1.01]`}>
                      <div className="min-w-0 flex-1">
                        <div className={`font-semibold ${accentClass}`}>{c.code}</div>
                        <div className="text-sm text-muted-foreground">{c.name}</div>
                        {courseItemCount > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {courseCompletedCount}/{courseItemCount} items done
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {c.term && <Badge variant="secondary" className="font-medium">{c.term}</Badge>}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteCourse(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Add Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Quick Add
            </CardTitle>
            <CardDescription>Create a new assignment, quiz, or exam</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={newItemType} onValueChange={(v) => setNewItemType(v as ItemType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">📝 Assignment</SelectItem>
                    <SelectItem value="quiz">📋 Quiz</SelectItem>
                    <SelectItem value="exam">📖 Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Course</Label>
                <Select value={newItemCourseId} onValueChange={setNewItemCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="Homework 1" />
              </div>

              <div className="grid gap-2">
                <Label>Due at (optional)</Label>
                <Input type="datetime-local" value={newItemDue} onChange={(e) => setNewItemDue(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Points possible</Label>
                  <Input value={newItemPoints} onChange={(e) => setNewItemPoints(e.target.value)} placeholder="20" />
                </div>
                <div className="grid gap-2">
                  <Label>Item weight %</Label>
                  <Input
                    value={newItemWeight}
                    onChange={(e) => setNewItemWeight(e.target.value)}
                    placeholder="5 (optional)"
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground -mt-1">
                Set a weight % to grade this item independently instead of pooling it into its category.
              </div>

              <Button onClick={createItem} disabled={creating || courses.length === 0} className="w-full">
                <PenLine className="h-4 w-4 mr-2" />
                Create
              </Button>

              <div className="rounded-xl border-2 bg-muted/20 p-3 text-sm text-muted-foreground flex items-start gap-2">
                <Timer className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  Default reminders:
                  <div className="font-medium text-foreground">1 day + 2 hours</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {editingItem && (
        <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                Edit: {editingItem.title}
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingItem(null)}><X className="h-4 w-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Due at</Label>
              <Input type="datetime-local" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label>Points</Label>
                <Input value={editPoints} onChange={(e) => setEditPoints(e.target.value)} placeholder="20" />
              </div>
              <div className="grid gap-2">
                <Label>Weight %</Label>
                <Input value={editWeight} onChange={(e) => setEditWeight(e.target.value)} placeholder="5" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEditItem} disabled={saving} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => setEditingItem(null)} className="flex-1">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="assignments" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex w-max h-auto p-1 gap-1">
            <TabsTrigger value="assignments" className="flex items-center gap-1.5 px-3 py-2">
              <FileText className="h-3.5 w-3.5" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-1.5 px-3 py-2">
              <FlaskConical className="h-3.5 w-3.5" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="exams" className="flex items-center gap-1.5 px-3 py-2">
              <BookOpen className="h-3.5 w-3.5" />
              Exams
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-1.5 px-3 py-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Grades
            </TabsTrigger>
            <TabsTrigger value="gpa" className="flex items-center gap-1.5 px-3 py-2">
              <Award className="h-3.5 w-3.5" />
              GPA
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="assignments">
          <ItemsList items={grouped.assignment} onToggle={toggleCompleted} onEdit={startEditItem} onDelete={deleteItem} />
        </TabsContent>
        <TabsContent value="quizzes">
          <ItemsList items={grouped.quiz} onToggle={toggleCompleted} onEdit={startEditItem} onDelete={deleteItem} />
        </TabsContent>
        <TabsContent value="exams">
          <ItemsList items={grouped.exam} onToggle={toggleCompleted} onEdit={startEditItem} onDelete={deleteItem} />
        </TabsContent>
        <TabsContent value="grades">
          <div className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Grades
                </CardTitle>
                <CardDescription>Track your grades by course and category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Course</Label>
                  <Select value={selectedGradesCourseId} onValueChange={setSelectedGradesCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-2 bg-gradient-to-br from-green-500/5 to-transparent">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total weight</span>
                        <Badge variant={gradeSummary.totalWeight === 100 ? "default" : "secondary"} className={gradeSummary.totalWeight === 100 ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}>
                          {gradeSummary.totalWeight.toFixed(0)}%
                        </Badge>
                      </div>
                      {gradeSummary.totalWeight > 0 && (
                        <Progress value={gradeSummary.totalWeight} className="h-1.5" />
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm text-muted-foreground">Current grade</span>
                        <span className="font-semibold flex items-center gap-2">
                          {gradeSummary.currentPercent === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <>
                              <span className="text-lg">{gradeSummary.currentPercent.toFixed(1)}%</span>
                              <Badge className={`text-xs font-bold ${
                                letterGrade(gradeSummary.currentPercent).startsWith("A") ? "bg-green-500/20 text-green-500 border-green-500/30" :
                                letterGrade(gradeSummary.currentPercent).startsWith("B") ? "bg-blue-500/20 text-blue-500 border-blue-500/30" :
                                letterGrade(gradeSummary.currentPercent).startsWith("C") ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" :
                                "bg-red-500/20 text-red-500 border-red-500/30"
                              }`}>
                                {letterGrade(gradeSummary.currentPercent)}
                              </Badge>
                            </>
                          )}
                        </span>
                      </div>
                      {whatIfProjectedPercent !== null && (
                        <div className="flex items-center justify-between border-t pt-2">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            What-if projection
                          </span>
                          <span className="font-semibold text-amber-500">{whatIfProjectedPercent.toFixed(1)}%</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-2 bg-gradient-to-br from-amber-500/5 to-transparent">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        What-if Calculator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2">
                        <Label>Category</Label>
                        <Select value={whatIfCategoryId} onValueChange={setWhatIfCategoryId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {gradeCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} ({c.weight_percent}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-2">
                          <Label>Score</Label>
                          <Input value={whatIfScore} onChange={(e) => setWhatIfScore(e.target.value)} placeholder="18" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Out of</Label>
                          <Input value={whatIfOutOf} onChange={(e) => setWhatIfOutOf(e.target.value)} placeholder="20" />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground/80 italic">
                        Add a hypothetical grade to see how it affects your overall mark.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    Categories (weights)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    {gradeCategories.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <Target className="h-8 w-8 text-muted-foreground/30 mb-1" />
                        <p className="text-sm text-muted-foreground">No categories yet</p>
                      </div>
                    ) : (
                      gradeSummary.categoryAverages.map((ca) => (
                        <div key={ca.category.id} className="flex items-center justify-between rounded-xl border-2 p-3 hover:bg-muted/30 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{ca.category.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {ca.count === 0 ? "No grades" : (
                                <span className={letterGradeColor(letterGrade(ca.percent! * 100))}>
                                  {(ca.percent! * 100).toFixed(1)}% ({ca.count} entries)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-semibold">{ca.category.weight_percent}%</Badge>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteGradeCategory(ca.category.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="rounded-xl border-2 border-dashed p-3 space-y-2">
                    <div className="grid gap-2">
                      <Label>New category</Label>
                      <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Labs" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Weight %</Label>
                      <Input value={newCategoryWeight} onChange={(e) => setNewCategoryWeight(e.target.value)} placeholder="20" />
                    </div>
                    <Button onClick={createGradeCategory} disabled={creating || gradesLoading || !selectedGradesCourseId} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                    {gradesLoading && <div className="text-xs text-muted-foreground animate-pulse">Loading…</div>}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-blue-500" />
                      Grade Entries
                    </span>
                    <Button variant="outline" size="sm" onClick={exportGradesCSV} disabled={gradeEntries.length === 0} className="h-7">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      CSV
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {gradeEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <ClipboardList className="h-8 w-8 text-muted-foreground/30 mb-1" />
                        <p className="text-sm text-muted-foreground">No grades yet</p>
                      </div>
                    ) : (
                      gradeEntries.slice(0, 20).map((e) => {
                        const item = e.item_id ? itemById.get(e.item_id) : undefined
                        const pct = typeof e.score === "number" && typeof e.out_of === "number" && (e.out_of || 0) > 0
                          ? (e.score / e.out_of) * 100
                          : null
                        return (
                          <div key={e.id} className="flex items-center justify-between rounded-xl border-2 p-3 hover:bg-muted/30 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{item?.title || e.title || "Grade"}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {e.category_id ? gradeCategories.find((c) => c.id === e.category_id)?.name || "Category" : "Uncategorized"}
                                {item?.weight_percent != null && (
                                  <span className="ml-1 text-blue-500 font-medium">{item.weight_percent}% weight</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-sm font-semibold">
                                  {typeof e.score === "number" && typeof e.out_of === "number" && (e.out_of || 0) > 0
                                    ? `${e.score}/${e.out_of}`
                                    : "—"}
                                </div>
                                {pct !== null && (
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                    letterGrade(pct).startsWith("A") ? "bg-green-500/10 text-green-500 border-green-500/30" :
                                    letterGrade(pct).startsWith("B") ? "bg-blue-500/10 text-blue-500 border-blue-500/30" :
                                    letterGrade(pct).startsWith("C") ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                                    "bg-red-500/10 text-red-500 border-red-500/30"
                                  }`}>
                                    {letterGrade(pct)}
                                  </Badge>
                                )}
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteGradeEntry(e.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="grid gap-2">
                      <Label>Link to item (optional)</Label>
                      <Select
                        value={newEntryItemId}
                        onValueChange={(v) => {
                          setNewEntryItemId(v)

                          if (v === "__none__") {
                            setNewEntryTitle("")
                            setNewEntryOutOf("")
                            return
                          }

                          const assignment = itemById.get(v)
                          if (!assignment) return

                          setNewEntryTitle(assignment.title)

                          if ((!newEntryOutOf || newEntryOutOf.trim() === "") && typeof assignment.points_possible === "number") {
                            setNewEntryOutOf(String(assignment.points_possible))
                          }

                          const titleLower = assignment.title.toLowerCase()
                          const suggested = gradeCategories.find((c) => {
                            const catLower = c.name.toLowerCase()
                            return titleLower.includes(catLower) || catLower.split(" ").some((w) => w.length > 2 && titleLower.includes(w))
                          })
                          if (suggested && !newEntryCategoryId) {
                            setNewEntryCategoryId(suggested.id)
                          }

                          const existing = gradeEntries.find((e) => e.item_id === assignment.id)
                          if (existing) {
                            toast.info(`Already graded: ${existing.score}/${existing.out_of} — saving will update it`)
                            setNewEntryScore(String(existing.score ?? ""))
                            setNewEntryOutOf(String(existing.out_of ?? ""))
                            if (existing.category_id) setNewEntryCategoryId(existing.category_id)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={itemsForSelectedGradesCourse.length === 0 ? "No items" : "Select an item"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Custom / not linked</SelectItem>
                          {(["assignment", "quiz", "exam"] as ItemType[]).map((type) => {
                            const typeItems = itemsForSelectedGradesCourse.filter((i) => i.item_type === type)
                            if (typeItems.length === 0) return null
                            return (
                              <span key={type}>
                                <SelectItem value={`__header_${type}`} disabled>
                                  ── {type.charAt(0).toUpperCase() + type.slice(1)}s ──
                                </SelectItem>
                                {typeItems.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.title}
                                  </SelectItem>
                                ))}
                              </span>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Title (optional)</Label>
                      <Input
                        value={newEntryTitle}
                        onChange={(e) => setNewEntryTitle(e.target.value)}
                        placeholder="Midterm"
                        disabled={newEntryItemId !== "__none__"}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Select value={newEntryCategoryId} onValueChange={setNewEntryCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.weight_percent}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label>Score</Label>
                        <Input value={newEntryScore} onChange={(e) => setNewEntryScore(e.target.value)} placeholder="18" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Out of</Label>
                        <Input value={newEntryOutOf} onChange={(e) => setNewEntryOutOf(e.target.value)} placeholder="20" />
                      </div>
                    </div>
                    <Button onClick={createGradeEntry} disabled={creating || gradesLoading || gradeCategories.length === 0} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Grade
                    </Button>
                    {gradeCategories.length === 0 && (
                      <div className="text-xs text-muted-foreground">Create a category first.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="gpa">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                GPA Calculator
              </CardTitle>
              <CardDescription>Your cumulative grade point average across all courses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!gpaStats ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Award className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No GPA data yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Add grade entries to your courses to see GPA estimates</p>
                </div>
              ) : (
                <>
                  {/* GPA Hero Card */}
                  <div className="rounded-xl border-2 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Cumulative GPA</p>
                      <p className="text-4xl font-bold tracking-tight">{gpaStats.cumGpa.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        across {gpaStats.courseGrades.length} course{gpaStats.courseGrades.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20">
                      <GraduationCap className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  {/* Course Grades */}
                  <div className="space-y-2">
                    {gpaStats.courseGrades.map(({ course, pct, gpa }, idx) => {
                      const letter = letterGrade(pct)
                      const colorClass = courseColors[idx % courseColors.length]
                      return (
                        <div key={course.id} className={`flex items-center justify-between rounded-xl border-2 p-3 bg-gradient-to-r ${colorClass} transition-all hover:scale-[1.01]`}>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate">{course.code}</div>
                            <div className="text-xs text-muted-foreground">{course.name}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{pct.toFixed(1)}%</span>
                            <Badge className={`font-bold ${
                              letter.startsWith("A") ? "bg-green-500/20 text-green-500 border-green-500/30" :
                              letter.startsWith("B") ? "bg-blue-500/20 text-blue-500 border-blue-500/30" :
                              letter.startsWith("C") ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" :
                              "bg-red-500/20 text-red-500 border-red-500/30"
                            }`}>
                              {letter}
                            </Badge>
                            <Badge variant="outline" className="font-semibold">{gpa.toFixed(1)}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ItemsList({
  items,
  onToggle,
  onEdit,
  onDelete,
}: {
  items: SchoolItem[]
  onToggle: (item: SchoolItem) => void
  onEdit: (item: SchoolItem) => void
  onDelete: (item: SchoolItem) => void
}) {
  const now = new Date()

  function getDueStatus(dueAt: string | null): { label: string; color: string } {
    if (!dueAt) return { label: "", color: "" }
    const due = new Date(dueAt)
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffMs < 0) return { label: "Overdue", color: "bg-red-500/15 text-red-500 border-red-500/30" }
    if (diffDays <= 1) return { label: "Due today", color: "bg-amber-500/15 text-amber-500 border-amber-500/30" }
    if (diffDays <= 3) return { label: `${diffDays}d left`, color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" }
    if (diffDays <= 7) return { label: `${diffDays}d left`, color: "bg-blue-500/15 text-blue-500 border-blue-500/30" }
    return { label: `${diffDays}d left`, color: "bg-muted text-muted-foreground" }
  }

  const pending = items.filter((i) => !i.is_completed)
  const completed = items.filter((i) => i.is_completed)

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Upcoming</span>
          {items.length > 0 && (
            <Badge variant="secondary" className="font-normal">
              {pending.length} pending · {completed.length} done
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No items yet</p>
            <p className="text-xs text-muted-foreground/70">Use Quick Add to create your first item</p>
          </div>
        ) : (
          <>
            {pending.map((i) => {
              const dueStatus = getDueStatus(i.due_at)
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border-2 p-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{i.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs font-normal">
                        {i.course?.code || "Course"}
                      </Badge>
                      {i.due_at && (
                        <Badge variant="outline" className={`text-xs font-normal ${dueStatus.color}`}>
                          {dueStatus.label} · {new Date(i.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </Badge>
                      )}
                      {i.weight_percent != null && (
                        <Badge variant="outline" className="text-xs font-normal bg-blue-500/10 text-blue-500 border-blue-500/30">
                          {i.weight_percent}% weight
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onToggle(i)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Done
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(i)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
            {completed.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {completed.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 opacity-60 hover:opacity-80 transition-opacity">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate line-through">{i.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-normal">
                          {i.course?.code || "Course"}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-normal bg-green-500/10 text-green-500 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onToggle(i)}>
                        Undo
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
