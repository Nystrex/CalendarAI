import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const adminPassword = request.headers.get("x-admin-password")
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Delete user's data in order (respecting foreign key constraints)
    // 1. Delete events
    await adminSupabase.from("events").delete().eq("user_id", userId)

    // 2. Delete calendars
    await adminSupabase.from("calendars").delete().eq("user_id", userId)

    // 3. Delete oauth connections
    await adminSupabase.from("oauth_connections").delete().eq("user_id", userId)

    // 4. Delete audit logs
    await adminSupabase.from("audit_logs").delete().eq("user_id", userId)

    // 5. Delete profile
    await adminSupabase.from("profiles").delete().eq("id", userId)

    // 6. Finally delete the auth user
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("[CalendarAI] Error deleting auth user:", deleteError)
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CalendarAI] Delete user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
