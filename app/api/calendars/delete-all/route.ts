import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all calendars for the user
    const { data: calendars, error: calendarsError } = await supabase
      .from("calendars")
      .select("id, name, color")
      .eq("user_id", user.id)

    if (calendarsError) {
      console.error("Error fetching calendars:", calendarsError)
      return NextResponse.json({ error: "Failed to fetch calendars" }, { status: 500 })
    }

    // Delete all events first (cascade should handle this, but being explicit)
    const { error: eventsError } = await supabase
      .from("events")
      .delete()
      .eq("user_id", user.id)

    if (eventsError) {
      console.error("Error deleting events:", eventsError)
      return NextResponse.json({ error: "Failed to delete events" }, { status: 500 })
    }

    // Delete all calendars
    const { error: deleteError } = await supabase
      .from("calendars")
      .delete()
      .eq("user_id", user.id)

    if (deleteError) {
      console.error("Error deleting calendars:", deleteError)
      return NextResponse.json({ error: "Failed to delete calendars" }, { status: 500 })
    }

    // Recreate default calendars
    const defaultCalendars = [
      { name: "Personal", color: "#3b82f6" },
      { name: "Work", color: "#8b5cf6" },
      { name: "School", color: "#10b981" },
      { name: "Assignments", color: "#f59e0b" },
      { name: "Quizzes", color: "#ec4899" },
      { name: "Exams", color: "#ef4444" },
    ]

    const calendarsToInsert = defaultCalendars.map((cal) => ({
      user_id: user.id,
      name: cal.name,
      color: cal.color,
      is_visible: true,
    }))

    const { error: insertError } = await supabase
      .from("calendars")
      .insert(calendarsToInsert)

    if (insertError) {
      console.error("Error recreating calendars:", insertError)
      return NextResponse.json({ error: "Failed to recreate calendars" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "All events deleted and calendars recreated successfully",
      deletedCalendars: calendars?.length || 0
    })
  } catch (error) {
    console.error("Error in delete-all route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
