import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.headers.get("x-admin-password")
    
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    
    // Get all events
    const { data: events, error } = await supabase
      .from("events")
      .select("id, title, description, start_time, end_time, user_id")
      .order("start_time", { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format response
    const formattedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      user_id: event.user_id,
      user_email: event.profiles?.email || "Unknown",
    }))

    return NextResponse.json({
      total: formattedEvents.length,
      events: formattedEvents,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
