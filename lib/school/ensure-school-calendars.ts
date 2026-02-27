import { createClient } from "@/lib/supabase/client"

const SCHOOL_CALENDARS: { name: string; color: string }[] = [
  { name: "Assignments", color: "#8b5cf6" },
  { name: "Quizzes", color: "#ef4444" },
  { name: "Exams", color: "#f59e0b" },
]

export async function ensureSchoolCalendars(userId: string) {
  const supabase = createClient()

  const { data: existing, error } = await supabase
    .from("calendars")
    .select("id,name")
    .eq("user_id", userId)

  if (error) {
    throw error
  }

  const existingNames = new Set((existing || []).map((c: { id: string; name: string }) => c.name.trim().toLowerCase()))
  const missing = SCHOOL_CALENDARS.filter((c) => !existingNames.has(c.name.toLowerCase()))

  if (missing.length === 0) return

  const { error: insertError } = await supabase.from("calendars").insert(
    missing.map((c) => ({
      user_id: userId,
      name: c.name,
      color: c.color,
      is_default: false,
      provider: "local",
      provider_calendar_id: null,
    })),
  )

  if (insertError) {
    throw insertError
  }
}
