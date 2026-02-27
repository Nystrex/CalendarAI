import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const adminPassword = request.headers.get("x-admin-password")
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    const { message, title } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get all user profiles
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("id")

    if (profilesError) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Insert announcements for all users into audit_logs as "announcement" action
    // (reuses existing infra — no new table needed)
    const announcements = (profiles || []).map((p) => ({
      user_id: p.id,
      action: "announcement",
      entity_type: "broadcast",
      entity_id: user.id,
      changes: { title: title || "Admin Announcement", message, from: user.email, sent_at: new Date().toISOString() },
    }))

    // Insert in batches of 100
    for (let i = 0; i < announcements.length; i += 100) {
      await adminSupabase.from("audit_logs").insert(announcements.slice(i, i + 100))
    }

    await adminSupabase.from("audit_logs").insert({
      user_id: user.id,
      action: "broadcast_sent",
      entity_type: "broadcast",
      entity_id: user.id,
      changes: { title, message, recipients: profiles?.length || 0 },
    })

    return NextResponse.json({ success: true, recipients: profiles?.length || 0 })
  } catch (error) {
    console.error("[CalendarAI] Broadcast error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
